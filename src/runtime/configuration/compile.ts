import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, normalize, relative, resolve } from 'node:path'
import MarkdownIt from 'markdown-it'
import { z } from 'zod'
import { ComponentProps, LandmarkParams } from './landmark-params.ts'
import type {
  CompiledFormation,
  CompiledFormationIsland,
  CompiledLandmark,
  CompiledLocation,
  CompiledSection,
  CompiledTerrain,
  Vec3,
  WorldRegistry,
} from './registry-types.ts'
import {
  AnnouncementsFile,
  AssetManifest,
  CameraSettings,
  CategoriesFile,
  ContentFrontMatter,
  ControlsSettings,
  DestinationPanelLayout,
  DiscoverySettings,
  EnvironmentSettings,
  ExplorerLayout,
  FeatureSettings,
  FormationFile,
  FormationIndex,
  GlobeSettings,
  ItemsFile,
  LandmarkFile,
  LocaleFile,
  LocationFile,
  LocationIndex,
  NavigationLayout,
  TerrainFile,
  ThemeFile,
  WorldFile,
} from './schema.ts'
import { UI_KEYS } from '../localization/ui-keys.ts'
import { fromLatLon, offsetOnSphere, tangentBasis, unit } from './sphere.ts'

export { fromLatLon, offsetOnSphere, tangentBasis } from './sphere.ts'

/**
 * Turns the `world/` folder into the registry the app runs on.
 *
 * Source files → schema validation → reference resolution → content compilation → registry.
 *
 * It never throws on bad configuration: every problem becomes a diagnostic with the file it
 * came from, so `world:validate` can list them all at once. Any error means no registry.
 */

export type Diagnostic = { level: 'error' | 'warning'; file: string; message: string }
export type CompileResult = { registry: WorldRegistry | null; diagnostics: Diagnostic[] }

const DEG = Math.PI / 180

function rotate([x, y]: [number, number], angle: number): [number, number] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [x * cos - y * sin, x * sin + y * cos]
}

// ── Markdown ─────────────────────────────────────────────────────────────────────────────

/** Links may only go to the web, to email, to a registered asset, or within the page. */
const SAFE_LINK = /^(?:https?:\/\/|mailto:|asset:|#)/i

type Markdown = InstanceType<typeof MarkdownIt>

function createMarkdown(): Markdown {
  // `html: false` escapes any raw HTML in the source, so content can never inject markup or script.
  const md = new MarkdownIt({ html: false, linkify: false, typographer: true })
  md.validateLink = (url) => SAFE_LINK.test(url.trim())
  const renderLink = md.renderer.rules.link_open ?? ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index]
    const href = String(token?.attrGet('href') ?? '')
    if (token && /^https?:\/\//i.test(href)) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noopener noreferrer')
    }
    return renderLink(tokens, index, options, env, self)
  }
  return md
}

/** A small, strict front-matter reader: `key: value`, `key: "quoted"`, and `key: [a, b]`. */
export function parseFrontMatter(source: string): { data: Record<string, unknown>; body: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!match) return null
  const data: Record<string, unknown> = {}
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const pair = /^([a-zA-Z][\w-]*):\s*(.*)$/.exec(line)
    if (!pair) throw new Error(`cannot read front matter line: ${line}`)
    const key = pair[1] ?? ''
    const raw = (pair[2] ?? '').trim()
    const unquote = (value: string) => value.replace(/^(['"])(.*)\1$/, '$2')
    if (raw.startsWith('[')) {
      if (!raw.endsWith(']')) throw new Error(`unclosed list in front matter: ${line}`)
      data[key] = raw
        .slice(1, -1)
        .split(',')
        .map((item) => unquote(item.trim()))
        .filter(Boolean)
    } else {
      data[key] = unquote(raw)
    }
  }
  return { data, body: source.slice(match[0].length) }
}

// ── The compiler ─────────────────────────────────────────────────────────────────────────

export function compileWorld(worldDir: string, projectDir = resolve(worldDir, '..')): CompileResult {
  const diagnostics: Diagnostic[] = []
  const shortName = (file: string) => relative(projectDir, file) || file
  const error = (file: string, message: string) => diagnostics.push({ level: 'error', file: shortName(file), message })
  const warn = (file: string, message: string) => diagnostics.push({ level: 'warning', file: shortName(file), message })

  /** Reads and validates one JSON file. Returns null (with diagnostics) if it is missing or invalid. */
  function load<T extends z.ZodType>(file: string, schema: T): z.output<T> | null {
    if (!existsSync(file)) {
      error(file, 'file not found')
      return null
    }
    let json: unknown
    try {
      json = JSON.parse(readFileSync(file, 'utf8'))
    } catch (cause) {
      error(file, `not valid JSON: ${(cause as Error).message}`)
      return null
    }
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) error(file, `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      return null
    }
    return parsed.data
  }

  /** Resolves a configuration path against the file that mentions it, refusing anything outside the world folder. */
  function at(from: string, path: string): string {
    const target = normalize(join(dirname(from), path))
    if (relative(worldDir, target).startsWith('..')) error(from, `${path} points outside the world folder`)
    return target
  }

  const worldFile = join(worldDir, 'world.json')
  const world = load(worldFile, WorldFile)
  if (!world) return { registry: null, diagnostics }

  const globe = load(at(worldFile, world.settings.globe), GlobeSettings)
  const camera = load(at(worldFile, world.settings.camera), CameraSettings)
  const controls = load(at(worldFile, world.settings.controls), ControlsSettings)
  const environment = load(at(worldFile, world.settings.environment), EnvironmentSettings)
  const features = load(at(worldFile, world.settings.features), FeatureSettings)
  const discovery = load(at(worldFile, world.settings.discovery), DiscoverySettings)
  const categoriesFile = at(worldFile, world.settings.categories)
  const categories = load(categoriesFile, CategoriesFile)
  const explorerFile = at(worldFile, world.layouts.explorer)
  const explorer = load(explorerFile, ExplorerLayout)
  const destinationPanel = load(at(worldFile, world.layouts.destinationPanel), DestinationPanelLayout)
  const navigationFile = at(worldFile, world.layouts.navigation)
  const navigation = load(navigationFile, NavigationLayout)
  const messagesFile = at(worldFile, world.messages)
  const messages = load(messagesFile, AnnouncementsFile)
  const manifestFile = at(worldFile, world.assets)
  const manifest = load(manifestFile, AssetManifest)

  // Bounds that depend on more than one value.
  if (camera && !(camera.minDistance <= camera.defaultDistance && camera.defaultDistance <= camera.maxDistance)) {
    error(at(worldFile, world.settings.camera), 'defaultDistance must lie between minDistance and maxDistance')
  }
  if (camera && globe && camera.minDistance <= globe.radius * 1.2) {
    error(at(worldFile, world.settings.camera), `minDistance must stay well outside the globe (radius ${globe.radius})`)
  }
  if (controls && !controls.autoRotate.speeds.includes(controls.autoRotate.defaultSpeed)) {
    error(at(worldFile, world.settings.controls), 'autoRotate.defaultSpeed must be one of autoRotate.speeds')
  }

  // ── Text ──
  const locales: Record<string, Record<string, string>> = {}
  if (!world.locales.includes(world.defaultLocale)) error(worldFile, 'defaultLocale must be listed in locales')
  for (const locale of world.locales) {
    const table = load(join(worldDir, 'locales', `${locale}.json`), LocaleFile)
    if (table) locales[locale] = table
  }
  const defaultText = locales[world.defaultLocale] ?? {}
  const usedKeys = new Set<string>(UI_KEYS)
  /** Records a key as used and checks the default locale has it. */
  function needText(file: string, key: string | null | undefined, required = true) {
    if (!key) return
    usedKeys.add(key)
    if (!(key in defaultText)) (required ? error : warn)(file, `text key "${key}" is missing from locales/${world!.defaultLocale}.json`)
  }
  needText(worldFile, world.nameKey)
  needText(worldFile, world.descriptionKey)
  for (const key of UI_KEYS) needText(join(worldDir, 'locales', `${world.defaultLocale}.json`), key)

  // ── Themes ──
  const themes = new Map<string, z.output<typeof ThemeFile>>()
  for (const [id, path] of Object.entries(world.themes)) {
    const theme = load(at(worldFile, path), ThemeFile)
    if (theme && theme.id !== id) error(at(worldFile, path), `theme id "${theme.id}" does not match its key "${id}" in world.json`)
    if (theme) themes.set(id, theme)
  }
  const theme = themes.get(world.defaultTheme)
  if (!theme) error(worldFile, `defaultTheme "${world.defaultTheme}" is not listed in themes`)

  // ── Assets ──
  const assets: WorldRegistry['assets'] = {}
  const assetRoot = manifest ? join(projectDir, manifest.root) : ''
  if (manifest) {
    for (const asset of manifest.assets) {
      if (assets[asset.id]) error(manifestFile, `duplicate asset id "${asset.id}"`)
      if (!existsSync(join(assetRoot, asset.path))) error(manifestFile, `asset "${asset.id}" file not found: ${manifest.root}/${asset.path}`)
      if (asset.status === 'active' && asset.license !== 'original' && !asset.attribution) {
        error(manifestFile, `asset "${asset.id}" has license "${asset.license}" but no attribution`)
      }
      assets[asset.id] = {
        id: asset.id,
        type: asset.type,
        // Served from the site root; relative so the build works from a subfolder too.
        path: `${relative(join(projectDir, 'public'), assetRoot)}/${asset.path}`.replace(/\\/g, '/'),
        displayName: asset.displayName,
      }
    }
  }
  const usedAssets = new Set<string>()
  function needAsset(file: string, id: string, types: readonly string[]): string | null {
    const asset = assets[id]
    if (!asset) {
      error(file, `asset "${id}" is not in the asset manifest`)
      return null
    }
    if (!types.includes(asset.type)) error(file, `asset "${id}" is a ${asset.type}, expected ${types.join(' or ')}`)
    usedAssets.add(id)
    return asset.path
  }

  // ── Categories ──
  const categoryIds = new Set<string>()
  for (const category of categories?.categories ?? []) {
    if (categoryIds.has(category.id)) error(categoriesFile, `duplicate category "${category.id}"`)
    categoryIds.add(category.id)
    needText(categoriesFile, category.labelKey)
    needText(categoriesFile, category.pluralKey)
  }

  // ── Locations ──
  const md = createMarkdown()
  const indexFile = at(worldFile, world.locations)
  const index = load(indexFile, LocationIndex)
  const locations: CompiledLocation[] = []
  const seenIds = new Map<string, string>()
  function claimId(file: string, id: string) {
    const previous = seenIds.get(id)
    if (previous) error(file, `id "${id}" is already used by ${previous}`)
    else seenIds.set(id, shortName(file))
  }

  function compileContent(locationDir: string, itemsPath: string, published: boolean): CompiledSection[] {
    const items = load(itemsPath, ItemsFile)
    if (!items) return []
    const sections: CompiledSection[] = []
    const sectionIds = new Set<string>()
    for (const section of items.sections) {
      if (sectionIds.has(section.id)) error(itemsPath, `duplicate section "${section.id}"`)
      sectionIds.add(section.id)
      const source = section.source.startsWith('shared/') ? join(worldDir, section.source) : at(itemsPath, section.source)
      if (relative(worldDir, source).startsWith('..')) continue
      if (!existsSync(source)) {
        ;(published ? error : warn)(itemsPath, `content file not found: ${section.source}`)
        continue
      }
      if (!section.visible) continue
      let parsed: ReturnType<typeof parseFrontMatter>
      try {
        parsed = parseFrontMatter(readFileSync(source, 'utf8'))
      } catch (cause) {
        error(source, (cause as Error).message)
        continue
      }
      if (!parsed) {
        error(source, 'missing front matter (a block between --- lines at the top)')
        continue
      }
      const front = ContentFrontMatter.safeParse(parsed.data)
      if (!front.success) {
        for (const issue of front.error.issues) error(source, `front matter ${issue.path.join('.')}: ${issue.message}`)
        continue
      }
      const meta = front.data
      if (!meta.title && !meta.titleKey) error(source, 'front matter needs a title or a titleKey')
      if (meta.titleKey) needText(source, meta.titleKey)
      if (meta.status !== 'published') {
        if (meta.status === 'draft') warn(source, 'draft content is left out of the build')
        continue
      }
      // Resolve images to registered assets before rendering.
      const env = {}
      const tokens = md.parse(parsed.body, env)
      const images: CompiledSection['images'] = []
      const links: CompiledSection['links'] = []
      const walk = (list: typeof tokens) => {
        for (const token of list) {
          if (token.type === 'image') {
            const src = String(token.attrGet('src') ?? '')
            const alt = token.children?.map((child) => child.content).join('') ?? ''
            if (!src.startsWith('asset:')) {
              error(source, `images must use registered assets (asset:<id>), not "${src}"`)
              token.attrSet('src', '')
              continue
            }
            const path = needAsset(source, src.slice('asset:'.length), ['image', 'thumbnail', 'icon'])
            token.attrSet('src', path ?? '')
            if (!alt) warn(source, `image ${src} has no alt text`)
            images.push({ src: path ?? '', alt })
          }
          if (token.type === 'link_open') {
            const href = String(token.attrGet('href') ?? '')
            if (href.startsWith('asset:')) token.attrSet('href', needAsset(source, href.slice(6), ['image', 'thumbnail', 'icon', 'audio']) ?? '#')
          }
          if (token.children) walk(token.children)
        }
      }
      walk(tokens)
      // Collect link text after resolution, for link collections.
      tokens.forEach((token) => {
        token.children?.forEach((child, index, list) => {
          if (child.type !== 'link_open') return
          const text = list[index + 1]?.type === 'text' ? (list[index + 1]?.content ?? '') : ''
          links.push({ href: String(child.attrGet('href') ?? ''), text })
        })
      })
      const html = md.renderer.render(tokens, md.options, env)
      sections.push({
        id: section.id,
        display: section.display,
        order: section.order,
        title: meta.title ?? null,
        titleKey: meta.titleKey ?? null,
        summary: meta.summary ?? null,
        coverPath: meta.cover ? needAsset(source, meta.cover.replace(/^asset:/, ''), ['image', 'thumbnail']) : null,
        tags: meta.tags ?? [],
        author: meta.author ?? null,
        updated: meta.updated ?? null,
        html,
        images,
        links,
      })
      if (section.display === 'gallery' && images.length === 0) warn(source, 'gallery section has no images')
    }
    void locationDir
    return sections.sort((a, b) => a.order - b.order)
  }

  for (const entry of index?.locations ?? []) {
    const locationDir = at(indexFile, entry)
    const locationFile = join(locationDir, 'location.json')
    const location = load(locationFile, LocationFile)
    if (!location) continue
    if (entry.split('/').at(-1) !== location.id) error(locationFile, `folder name "${entry}" should end with the location id "${location.id}"`)
    claimId(locationFile, location.id)
    if (location.status !== 'published') {
      warn(locationFile, `status "${location.status}": left out of the build`)
      continue
    }
    if (!categoryIds.has(location.category)) error(locationFile, `unknown category "${location.category}"`)
    for (const key of [location.display.nameKey, location.display.shortNameKey, location.display.descriptionKey]) needText(locationFile, key)

    const position = fromLatLon(location.placement.latitude, location.placement.longitude)
    const scale = location.placement.scale
    const heading = location.placement.headingDeg * DEG

    // Terrain
    let terrain: CompiledTerrain = { type: 'none' }
    if (location.references.terrain) {
      const terrainFile = at(locationFile, location.references.terrain)
      const file = load(terrainFile, TerrainFile)
      if (file && file.locationId !== location.id) error(terrainFile, `locationId "${file.locationId}" should be "${location.id}"`)
      const shape = file?.shape
      if (shape?.type === 'oval') {
        terrain = {
          type: 'oval',
          rx: shape.radiusDeg[0] * DEG * scale,
          ry: shape.radiusDeg[1] * DEG * scale,
          heading: shape.headingDeg * DEG - heading,
          flat: shape.flatRadiusDeg * DEG * scale,
        }
      } else if (shape?.type === 'outline') {
        const [ax, ay] = shape.anchor
        terrain = {
          type: 'outline',
          parts: shape.parts.map((part) =>
            part.map(([x, y]) => rotate([(x - ax) * shape.scaleDeg * DEG * scale, (y - ay) * shape.scaleDeg * DEG * scale], -heading)),
          ),
          flat: shape.flatRadiusDeg * DEG * scale,
        }
      } else if (shape?.type === 'lobes') {
        const lobeIds = new Set<string>()
        for (const lobe of shape.lobes) {
          if (lobeIds.has(lobe.id)) error(terrainFile, `duplicate lobe "${lobe.id}"`)
          lobeIds.add(lobe.id)
        }
        for (const [a, b] of shape.bridges) {
          if (a >= shape.lobes.length || b >= shape.lobes.length || a === b) error(terrainFile, `bridge [${a}, ${b}] does not join two lobes`)
        }
        terrain = {
          type: 'lobes',
          lobeRadius: shape.lobeRadiusDeg * DEG * scale,
          bridgeHalfWidth: shape.bridgeHalfWidthDeg * DEG * scale,
          flat: shape.flatRadiusDeg * DEG * scale,
          lobes: shape.lobes.map((lobe) => {
            const at = rotate([lobe.atDeg[0] * DEG * scale, lobe.atDeg[1] * DEG * scale], -heading)
            return { id: lobe.id, at, ground: lobe.ground, position: offsetOnSphere(position, at[0], at[1]) }
          }),
          bridges: shape.bridges,
        }
      }
    }

    // Landmarks
    const landmarks: CompiledLandmark[] = []
    if (location.references.landmarks) {
      const landmarksFile = at(locationFile, location.references.landmarks)
      const file = load(landmarksFile, LandmarkFile)
      if (file && file.locationId !== location.id) error(landmarksFile, `locationId "${file.locationId}" should be "${location.id}"`)
      const landmarkIds = new Set<string>()
      for (const landmark of file?.landmarks ?? []) {
        if (landmarkIds.has(landmark.id)) error(landmarksFile, `duplicate landmark "${landmark.id}"`)
        landmarkIds.add(landmark.id)
        if (!landmark.visible) continue
        const params = LandmarkParams[landmark.preset].safeParse(landmark.params)
        if (!params.success) {
          for (const issue of params.error.issues) error(landmarksFile, `${landmark.id} params.${issue.path.join('.')}: ${issue.message}`)
          continue
        }
        needText(landmarksFile, landmark.labelKey)
        let assetPath: string | null = null
        if (landmark.preset === 'model' && !landmark.assetId) error(landmarksFile, `${landmark.id}: a model landmark needs an assetId`)
        if (landmark.assetId) assetPath = needAsset(landmarksFile, landmark.assetId, landmark.preset === 'model' ? ['model'] : ['model', 'texture', 'image'])
        let anchor = position
        if (landmark.lobe) {
          const lobe = terrain.type === 'lobes' ? terrain.lobes.find((item) => item.id === landmark.lobe) : undefined
          if (!lobe) error(landmarksFile, `${landmark.id}: no lobe "${landmark.lobe}" in this location's terrain`)
          else anchor = lobe.position
        }
        const [east, up, north] = landmark.position
        const offset = rotate([east * scale, north * scale], -heading)
        landmarks.push({
          id: landmark.id,
          preset: landmark.preset,
          assetPath,
          labelKey: landmark.labelKey,
          anchor,
          position: [offset[0], up * scale + location.placement.altitude, offset[1]],
          rotation: [landmark.rotationDeg[0] * DEG, landmark.rotationDeg[1] * DEG - heading, landmark.rotationDeg[2] * DEG],
          scale: landmark.scale * scale,
          animate: landmark.animation === 'default',
          params: params.data as Record<string, unknown>,
        })
      }
    }

    const sections = location.references.items ? compileContent(locationDir, at(locationFile, location.references.items), true) : []

    locations.push({
      id: location.id,
      category: location.category,
      display: location.display,
      position,
      latitude: location.placement.latitude,
      longitude: location.placement.longitude,
      altitude: location.placement.altitude,
      scale,
      heading,
      appearance: location.appearance,
      terrain,
      landmarks,
      sections,
      interaction: { ...location.interaction, markerRadius: location.interaction.markerRadius * scale },
      tags: location.tags,
      parent: location.parent,
      related: location.related,
    })
  }
  const locationIds = new Set(locations.map((location) => location.id))
  for (const location of locations) {
    for (const id of [location.parent, ...location.related]) {
      if (id && !locationIds.has(id)) error(join(worldDir, 'locations'), `${location.id} refers to unknown location "${id}"`)
    }
  }
  locations.sort((a, b) => a.display.sortOrder - b.display.sortOrder)

  // ── Formations ──
  const formationsIndexFile = at(worldFile, world.formations)
  const formationsIndex = load(formationsIndexFile, FormationIndex)
  const formations: CompiledFormation[] = []
  const tilt = (globe?.axialTiltDeg ?? 0) * DEG
  for (const entry of formationsIndex?.formations ?? []) {
    const file = at(formationsIndexFile, entry)
    const formation = load(file, FormationFile)
    if (!formation) continue
    claimId(file, formation.id)
    if (formation.status !== 'published') {
      warn(file, `status "${formation.status}": left out of the build`)
      continue
    }
    const islands: CompiledFormationIsland[] = []
    const islandIds = new Set<string>()
    const claimIsland = (id: string) => {
      if (islandIds.has(id) || seenIds.has(id)) error(file, `island id "${id}" is already used`)
      islandIds.add(id)
    }
    if (formation.type === 'islets') {
      for (const island of formation.islands) {
        claimIsland(island.id)
        islands.push({
          id: island.id,
          role: 'islet',
          position: fromLatLon(island.latitude, island.longitude),
          rx: island.radiusDeg[0] * DEG,
          ry: island.radiusDeg[1] * DEG,
          heading: island.headingDeg * DEG,
          ground: null,
          dress: island.dress,
          flat: island.flatRadiusDeg * DEG,
        })
      }
      formations.push({ id: formation.id, type: 'islets', center: null, clearance: 0, islands, frame: null })
      continue
    }
    const center = fromLatLon(formation.center.latitude, formation.center.longitude)
    const base = tangentBasis(center)
    const turn = formation.uprightAgainstTilt ? tilt : 0
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    const east: Vec3 = [0, 1, 2].map((i) => base.east[i]! * cos + base.north[i]! * sin) as Vec3
    const north: Vec3 = [0, 1, 2].map((i) => base.north[i]! * cos - base.east[i]! * sin) as Vec3
    const place = (a: number, b: number): Vec3 =>
      unit([0, 1, 2].map((i) => center[i]! + a * east[i]! + b * north[i]!) as Vec3)
    for (const island of formation.islands) {
      claimIsland(island.id)
      islands.push({
        id: island.id,
        role: island.role,
        position: place(island.atDeg[0] * DEG, island.atDeg[1] * DEG),
        rx: island.radiusDeg[0] * DEG,
        ry: island.radiusDeg[1] * DEG,
        heading: island.headingDeg * DEG + turn,
        ground: island.ground,
        dress: island.dress,
        flat: 0,
      })
    }
    for (const arc of formation.arcs) {
      if (arc.jitterDeg.length !== arc.lengthsDeg.length) error(file, `arc "${arc.id}": jitterDeg needs one entry per island`)
      const count = arc.lengthsDeg.length
      for (let index = 0; index < count; index++) {
        const angle = (arc.fromDeg + (index / (count - 1)) * (arc.toDeg - arc.fromDeg)) * DEG
        const radius = (arc.radiusDeg + (arc.jitterDeg[index] ?? 0)) * DEG
        const x = arc.centerDeg[0] * DEG + Math.cos(angle) * radius
        const y = arc.centerDeg[1] * DEG + Math.sin(angle) * radius
        const dressed = arc.dressEvery > 0 && index % arc.dressEvery === (arc.dressEvery > 1 ? 1 : 0)
        const id = `${arc.id}-${index}`
        claimIsland(id)
        islands.push({
          id,
          role: arc.role,
          position: place(x, y),
          rx: (arc.lengthsDeg[index] ?? arc.widthDeg) * DEG,
          ry: arc.widthDeg * DEG,
          // Along the arc: a circle's tangent is 90° from its radius.
          heading: angle + Math.PI / 2 + turn,
          ground: arc.ground,
          dress: dressed ? arc.dress : null,
          flat: 0,
        })
      }
    }
    formations.push({
      id: formation.id,
      type: 'island-arrangement',
      center,
      clearance: formation.clearanceDeg * DEG,
      islands,
      frame: { east, north },
    })
  }

  // ── Layouts and navigation ──
  const sectionsOf = (layout: z.output<typeof ExplorerLayout>) => [
    ...layout.regions.top,
    ...layout.regions.bottomLeft,
    ...layout.regions.bottomRight,
    ...layout.leftPanel.sections,
    ...layout.rightPanel.sections,
  ]
  if (explorer) {
    const sectionIds = new Set<string>()
    for (const section of sectionsOf(explorer)) {
      if (sectionIds.has(section.id)) error(explorerFile, `duplicate section id "${section.id}"`)
      sectionIds.add(section.id)
      const props = ComponentProps[section.component].safeParse(section.props)
      if (!props.success) {
        for (const issue of props.error.issues) error(explorerFile, `${section.id} props.${issue.path.join('.')}: ${issue.message}`)
      }
    }
  }
  if (navigation) {
    for (const filter of navigation.filters) {
      needText(navigationFile, filter.labelKey)
      if (filter.categories !== 'all') {
        for (const id of filter.categories) if (!categoryIds.has(id)) error(navigationFile, `filter "${filter.id}" names unknown category "${id}"`)
      }
    }
  }
  if (destinationPanel) needText(at(worldFile, world.layouts.destinationPanel), destinationPanel.emptyMessageKey)
  if (discovery) {
    needText(at(worldFile, world.settings.discovery), discovery.smileGreeting.messageKey)
    if (!formations.some((formation) => formation.id === discovery.smileGreeting.formation)) {
      ;(discovery.smileGreeting.enabled ? error : warn)(at(worldFile, world.settings.discovery), `unknown formation "${discovery.smileGreeting.formation}"`)
    }
  }
  if (camera?.initialOrientation.face) {
    const face = camera.initialOrientation.face
    if (!locationIds.has(face) && !formations.some((formation) => formation.id === face)) {
      error(at(worldFile, world.settings.camera), `initialOrientation.face names unknown location or formation "${face}"`)
    }
  }
  for (const announcement of messages?.announcements ?? []) {
    needText(messagesFile, announcement.messageKey)
    if (announcement.startsAt && announcement.endsAt && announcement.startsAt > announcement.endsAt) {
      error(messagesFile, `announcement "${announcement.id}" ends before it starts`)
    }
  }

  // ── Placement rules ──
  if (globe) {
    const shores = locations.filter((location) => location.interaction.selectable && location.terrain.type !== 'none')
    const minimum = globe.placementRules.minShoreSeparationDeg * DEG
    const poles: Vec3[] = [
      [0, 1, 0],
      [0, -1, 0],
    ]
    const angle = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))
    for (let i = 0; i < shores.length; i++) {
      const shore = shores[i]!
      for (let j = i + 1; j < shores.length; j++) {
        const other = shores[j]!
        const distance = angle(shore.position, other.position)
        if (distance < minimum) {
          error(join(worldDir, 'locations'), `${shore.id} and ${other.id} are ${(distance / DEG).toFixed(1)}° apart; the minimum is ${globe.placementRules.minShoreSeparationDeg}°`)
        }
      }
      for (const pole of poles) {
        if (angle(shore.position, pole) < globe.placementRules.poleClearanceDeg * DEG) {
          error(join(worldDir, 'locations'), `${shore.id} is too close to a pole`)
        }
      }
      for (const formation of formations) {
        if (formation.center && angle(shore.position, formation.center) < formation.clearance) {
          error(join(worldDir, 'locations'), `${shore.id} stands inside formation "${formation.id}"`)
        }
      }
    }
  }

  // ── Unused things ──
  for (const key of Object.keys(defaultText)) {
    if (!usedKeys.has(key)) warn(join(worldDir, 'locales', `${world.defaultLocale}.json`), `text key "${key}" is never used`)
  }
  for (const locale of world.locales) {
    if (locale === world.defaultLocale) continue
    const missing = [...usedKeys].filter((key) => key in defaultText && !(key in (locales[locale] ?? {})))
    if (missing.length) warn(join(worldDir, 'locales', `${locale}.json`), `${missing.length} keys fall back to ${world.defaultLocale}`)
    for (const key of Object.keys(locales[locale] ?? {})) {
      if (!(key in defaultText)) warn(join(worldDir, 'locales', `${locale}.json`), `text key "${key}" is not in the default locale`)
    }
  }
  if (manifest) {
    const iconOnly = new Set(['icon.site.favicon'])
    for (const asset of manifest.assets) {
      if (!usedAssets.has(asset.id) && !iconOnly.has(asset.id)) warn(manifestFile, `asset "${asset.id}" is not used anywhere`)
    }
  }

  const failed = diagnostics.some((diagnostic) => diagnostic.level === 'error')
  if (failed || !globe || !camera || !controls || !environment || !features || !discovery || !categories || !explorer || !destinationPanel || !navigation || !messages || !theme) {
    return { registry: null, diagnostics }
  }
  const strip = <T extends { schemaVersion: number }>({ schemaVersion: _version, ...rest }: T) => rest
  return {
    registry: {
      schemaVersion: 1,
      world: {
        id: world.id,
        nameKey: world.nameKey,
        descriptionKey: world.descriptionKey,
        defaultLocale: world.defaultLocale,
        locales: world.locales,
      },
      settings: {
        globe: strip(globe),
        camera: strip(camera),
        controls: strip(controls),
        environment: strip(environment),
        features: strip(features),
        discovery: strip(discovery),
      },
      categories: [...categories.categories].sort((a, b) => a.order - b.order),
      locations,
      formations,
      layouts: { explorer, destinationPanel: strip(destinationPanel), navigation: strip(navigation) },
      theme: strip(theme),
      locales,
      announcements: [...messages.announcements].sort((a, b) => b.priority - a.priority),
      assets,
    },
    diagnostics,
  }
}
