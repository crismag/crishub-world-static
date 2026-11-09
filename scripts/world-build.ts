import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { compileWorld, type Diagnostic } from '../src/runtime/configuration/compile.ts'
import { splitContent, type WorldRegistry } from '../src/runtime/configuration/registry-types.ts'
import * as schema from '../src/runtime/configuration/schema.ts'
import { checkTerrain } from '../src/engine/terrain/checks.ts'

/** Compiles world/ and runs the geography checks. Writes nothing. */
export function validateWorld(project: string): { registry: WorldRegistry | null; diagnostics: Diagnostic[] } {
  const { registry, diagnostics } = compileWorld(join(project, 'world'), project)
  return { registry, diagnostics: registry ? [...diagnostics, ...checkTerrain(registry)] : diagnostics }
}

/** Editor-friendly JSON Schemas, generated from the same definitions the compiler uses. */
const schemaFiles: Record<string, z.ZodType> = {
  world: schema.WorldFile,
  globe: schema.GlobeSettings,
  camera: schema.CameraSettings,
  controls: schema.ControlsSettings,
  environment: schema.EnvironmentSettings,
  features: schema.FeatureSettings,
  discovery: schema.DiscoverySettings,
  categories: schema.CategoriesFile,
  'location-index': schema.LocationIndex,
  location: schema.LocationFile,
  terrain: schema.TerrainFile,
  landmarks: schema.LandmarkFile,
  items: schema.ItemsFile,
  'content-front-matter': schema.ContentFrontMatter,
  'formation-index': schema.FormationIndex,
  formation: schema.FormationFile,
  'explorer-layout': schema.ExplorerLayout,
  'destination-panel-layout': schema.DestinationPanelLayout,
  'navigation-layout': schema.NavigationLayout,
  theme: schema.ThemeFile,
  locale: schema.LocaleFile,
  announcements: schema.AnnouncementsFile,
  'asset-manifest': schema.AssetManifest,
}

/** Writes a file only when its contents changed, so the dev server reloads only on real edits. */
function writeIfChanged(file: string, text: string): boolean {
  if (existsSync(file) && readFileSync(file, 'utf8') === text) return false
  writeFileSync(file, text)
  return true
}

/**
 * Validates world/ and, if it is sound, writes the static runtime data:
 * - src/generated/world.json: the up-front registry (settings, places, shapes, landmarks, text,
 *   and section summaries), bundled into the app;
 * - src/generated/content/<location>.json: each location's compiled articles, which the build
 *   turns into small fingerprinted files fetched only when that shore is opened;
 * and the JSON Schemas in schemas/.
 */
export function buildWorld(project: string) {
  const result = validateWorld(project)
  const errors = result.diagnostics.filter((item) => item.level === 'error')
  if (!result.registry || errors.length) return { ...result, errors, written: false }
  const { runtime, content } = splitContent(result.registry)
  const generated = join(project, 'src/generated')
  const contentDir = join(generated, 'content')
  mkdirSync(contentDir, { recursive: true })
  let written = writeIfChanged(join(generated, 'world.json'), `${JSON.stringify(runtime)}\n`)
  for (const [id, sections] of Object.entries(content)) {
    written = writeIfChanged(join(contentDir, `${id}.json`), `${JSON.stringify(sections)}\n`) || written
  }
  // Remove bundles for locations that no longer have content.
  for (const file of readdirSync(contentDir)) {
    if (!(file.replace(/\.json$/, '') in content)) {
      rmSync(join(contentDir, file))
      written = true
    }
  }
  mkdirSync(join(project, 'schemas'), { recursive: true })
  for (const [name, definition] of Object.entries(schemaFiles)) {
    const file = join(project, 'schemas', `${name}.schema.json`)
    const text = `${JSON.stringify(z.toJSONSchema(definition, { io: 'input' }), null, 2)}\n`
    if (!existsSync(file) || readFileSync(file, 'utf8') !== text) writeFileSync(file, text)
  }
  return { ...result, errors, written, contentBundles: Object.keys(content).length }
}

export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics.map((item) => `${item.level === 'error' ? 'error  ' : 'warning'} ${item.file}: ${item.message}`).join('\n')
}
