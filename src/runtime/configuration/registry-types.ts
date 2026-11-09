import type { z } from 'zod'
import type {
  AnnouncementsFile,
  CameraSettings,
  CategoriesFile,
  ContentDisplayT,
  ControlsSettings,
  DestinationPanelLayout,
  DiscoverySettings,
  EnvironmentSettings,
  ExplorerLayoutT,
  FeatureSettings,
  GlobeSettings,
  LandmarkPreset,
  NavigationLayout,
  ThemeFile,
} from './schema.ts'

/**
 * The compiled world registry: what `world:build` writes to src/generated/world.json and what
 * the app runs on. It is the configuration after validation, with every reference resolved,
 * Markdown compiled to safe HTML, and every angle converted to radians.
 *
 * Coordinates: a unit vector in the globe's own frame. Longitude 0 faces +z (the viewer, in
 * the opening view), longitude increases toward +x (east), and +y is the north pole.
 */

export type Vec3 = [number, number, number]
type Without<T> = Omit<T, 'schemaVersion'>

export type CompiledTerrain =
  | { type: 'none' }
  | { type: 'oval'; rx: number; ry: number; heading: number; flat: number }
  | {
      type: 'outline'
      /** Polygons in radians, east and north of the location's center. */
      parts: [number, number][][]
      flat: number
    }
  | {
      type: 'lobes'
      lobeRadius: number
      bridgeHalfWidth: number
      flat: number
      lobes: { id: string; at: [number, number]; ground: string; position: Vec3 }[]
      bridges: [number, number][]
    }

export type CompiledLandmark = {
  id: string
  preset: LandmarkPreset
  /** Resolved from the asset manifest, relative to the site root. */
  assetPath: string | null
  labelKey: string | null
  /** Where this landmark stands: the location's center, or a lobe's center. */
  anchor: Vec3
  /** Offset [east, up, north] in globe units, after the location's scale and heading. */
  position: Vec3
  /** Radians, after the location's heading. */
  rotation: Vec3
  scale: number
  animate: boolean
  params: Record<string, unknown>
}

export type CompiledSection = {
  id: string
  display: ContentDisplayT
  order: number
  title: string | null
  titleKey: string | null
  summary: string | null
  coverPath: string | null
  tags: string[]
  author: string | null
  updated: string | null
  /** Sanitized HTML: raw HTML in the Markdown is escaped, unsafe links are dropped. */
  html: string
  images: { src: string; alt: string }[]
  links: { href: string; text: string }[]
}

export type CompiledLocation = {
  id: string
  category: string
  display: {
    nameKey: string
    shortNameKey: string
    descriptionKey: string
    showLabel: boolean
    showOnGlobe: boolean
    showInDirectory: boolean
    sortOrder: number
  }
  position: Vec3
  latitude: number
  longitude: number
  altitude: number
  scale: number
  heading: number
  appearance: { ground: string; shore: string; accent: string }
  terrain: CompiledTerrain
  landmarks: CompiledLandmark[]
  sections: CompiledSection[]
  interaction: { selectable: boolean; tooltipEnabled: boolean; markerRadius: number }
  tags: string[]
  parent: string | null
  related: string[]
}

export type CompiledFormationIsland = {
  id: string
  role: string
  position: Vec3
  rx: number
  ry: number
  /** Heading of the long axis in the island's own tangent frame, radians. */
  heading: number
  ground: string | null
  dress: 'forest' | 'palms' | 'peak' | 'pines' | null
  flat: number
}

export type CompiledFormation = {
  id: string
  type: 'island-arrangement' | 'islets'
  center: Vec3 | null
  clearance: number
  islands: CompiledFormationIsland[]
  /** For arrangements: the layout's own east and north on the sphere, after any tilt correction. */
  frame: { east: Vec3; north: Vec3 } | null
}

export type CompiledAsset = { id: string; type: string; path: string; displayName: string }

export type WorldRegistry = {
  schemaVersion: 1
  world: { id: string; nameKey: string; descriptionKey: string; defaultLocale: string; locales: string[] }
  settings: {
    globe: Without<z.infer<typeof GlobeSettings>>
    camera: Without<z.infer<typeof CameraSettings>>
    controls: Without<z.infer<typeof ControlsSettings>>
    environment: Without<z.infer<typeof EnvironmentSettings>>
    features: Without<z.infer<typeof FeatureSettings>>
    discovery: Without<z.infer<typeof DiscoverySettings>>
  }
  categories: Without<z.infer<typeof CategoriesFile>>['categories']
  locations: CompiledLocation[]
  formations: CompiledFormation[]
  layouts: {
    explorer: ExplorerLayoutT
    destinationPanel: Without<z.infer<typeof DestinationPanelLayout>>
    navigation: Without<z.infer<typeof NavigationLayout>>
  }
  theme: Without<z.infer<typeof ThemeFile>>
  locales: Record<string, Record<string, string>>
  announcements: Without<z.infer<typeof AnnouncementsFile>>['announcements']
  assets: Record<string, CompiledAsset>
}
