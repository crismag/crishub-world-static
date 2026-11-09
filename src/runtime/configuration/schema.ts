import { z } from 'zod'

/**
 * The one definition of every CrisWorld configuration file, and of the compiled registry the
 * app runs on. TypeScript types and the JSON Schemas in `schemas/` are both derived from here,
 * so there is nothing else to keep in step.
 *
 * Units, used everywhere unless a field says otherwise:
 * - Angles on the globe (latitude, longitude, island sizes, offsets) are degrees.
 * - Distances in the 3D scene (camera distance, landmark offsets, heights) are globe units;
 *   the globe's radius is set in settings/globe.json.
 * - Colors are #rrggbb.
 */

// ── Shared building blocks ───────────────────────────────────────────────────────────────

/** Permanent internal IDs: lowercase words joined by hyphens. Never shown to visitors. */
export const Id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'IDs are lowercase words joined by hyphens')
/** Localization keys: dot-separated lowercase segments, such as `location.japan.name`. */
export const TextKey = z.string().regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/, 'text keys look like `section.item.name`')
export const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'colors are #rrggbb')
/** A path to another configuration file, relative to the file that mentions it. No `..`, no absolute paths. */
export const ConfigPath = z
  .string()
  .regex(/^(?!\/)(?!.*\.\.)[a-z0-9][a-z0-9./_-]*$/, 'paths are relative, lowercase, and stay inside the world folder')
export const Status = z.enum(['published', 'draft', 'hidden'])
const Latitude = z.number().min(-90).max(90)
const Longitude = z.number().min(-180).max(180)
const Vec3 = z.tuple([z.number(), z.number(), z.number()])
const Vec2 = z.tuple([z.number(), z.number()])
/** A small positive angle in degrees, such as an island's radius. */
const SmallAngle = z.number().positive().max(60)

// ── world.json ───────────────────────────────────────────────────────────────────────────

export const WorldFile = z.strictObject({
  schemaVersion: z.literal(1),
  id: Id,
  nameKey: TextKey,
  descriptionKey: TextKey,
  defaultLocale: z.string().regex(/^[a-z]{2,3}$/),
  locales: z.array(z.string().regex(/^[a-z]{2,3}$/)).min(1),
  defaultTheme: Id,
  settings: z.strictObject({
    globe: ConfigPath,
    camera: ConfigPath,
    controls: ConfigPath,
    environment: ConfigPath,
    features: ConfigPath,
    discovery: ConfigPath,
    categories: ConfigPath,
  }),
  locations: ConfigPath,
  formations: ConfigPath,
  layouts: z.strictObject({ explorer: ConfigPath, destinationPanel: ConfigPath, navigation: ConfigPath }),
  themes: z.record(Id, ConfigPath),
  messages: ConfigPath,
  assets: ConfigPath,
})

// ── settings/*.json ──────────────────────────────────────────────────────────────────────

const QualityPreset = z.strictObject({
  /** Points around the equator of the land mesh. More is sharper and slower to build. */
  landSegments: z.number().int().min(128).max(1024),
  oceanSegments: z.number().int().min(48).max(384),
  /** Highest device-pixel ratio the canvas renders at. */
  maxPixelRatio: z.number().min(1).max(3),
})

export const GlobeSettings = z.strictObject({
  schemaVersion: z.literal(1),
  /** Radius of the planet, in globe units. Everything else in the scene is sized against it. */
  radius: z.number().min(1).max(20),
  /** The planet's axial tilt. The opening view leans the north pole by this much, and lettering is set upright against it. */
  axialTiltDeg: z.number().min(0).max(45),
  /** Latitude (north and south) where the polar ice caps begin. */
  iceCapLatitudeDeg: z.number().min(45).max(89),
  /** `auto` picks per device: lighter meshes on phones and low-memory devices. `?quality=` overrides it. */
  quality: z.enum(['auto', 'high', 'medium', 'low']),
  qualityPresets: z.strictObject({ high: QualityPreset, medium: QualityPreset, low: QualityPreset }),
  /** Validation rules for placing shores. Breaking them fails `world:validate`. */
  placementRules: z.strictObject({
    minShoreSeparationDeg: z.number().min(0).max(90),
    poleClearanceDeg: z.number().min(0).max(45),
  }),
})

export const CameraSettings = z.strictObject({
  schemaVersion: z.literal(1),
  fovDeg: z.number().min(10).max(90),
  near: z.number().positive(),
  far: z.number().positive(),
  /** The camera's direction from the globe's center. Zoom moves it along this line. */
  direction: Vec3,
  minDistance: z.number().positive(),
  maxDistance: z.number().positive(),
  defaultDistance: z.number().positive(),
  /** A chosen shore comes to rest this many degrees below the camera's line of sight. */
  focusDropDeg: z.number().min(-45).max(45),
  initialOrientation: z.strictObject({
    /** Tips the north pole toward the viewer. */
    pitchDeg: z.number().min(-180).max(180),
    /** Turns the planet on its axis, west to east. */
    yawDeg: z.number().min(-360).max(360),
    /** Optionally open facing a location or formation instead, by its ID. */
    face: Id.nullable(),
  }),
})

export const ControlsSettings = z.strictObject({
  schemaVersion: z.literal(1),
  /** Only trackball exists: the globe turns freely, through the poles and upside down. */
  rotationMode: z.literal('trackball'),
  /** Radians of turn per pixel dragged. */
  dragSensitivity: z.number().min(0.0005).max(0.05),
  inertia: z.strictObject({
    enabled: z.boolean(),
    /** How quickly a flick slows down: higher stops sooner. */
    decayPerSecond: z.number().min(0.1).max(20),
    /** Fastest a flick can spin the globe, radians per second. */
    maxRadiansPerSecond: z.number().min(0.1).max(20),
  }),
  /** How quickly the globe eases to a chosen shore: higher is faster. */
  focusEasing: z.number().min(0.5).max(30),
  zoom: z.strictObject({
    wheelSensitivity: z.number().min(0).max(0.05),
    pinchSensitivity: z.number().min(0).max(0.1),
    buttonStep: z.number().min(0).max(5),
  }),
  keyboard: z.strictObject({
    enabled: z.boolean(),
    rotateStepPx: Vec2,
    zoomStep: z.number().min(0).max(5),
  }),
  /** A press that moves more than this many pixels is a drag, not a click. */
  clickTolerancePx: z.number().min(0).max(50),
  autoRotate: z.strictObject({
    enabled: z.boolean(),
    /** Radians per second at 1× speed. */
    radiansPerSecond: z.number().min(0).max(2),
    idleDelaySeconds: z.number().min(0).max(60),
    /** The speed buttons, as multipliers. 0 pauses. */
    speeds: z.array(z.number().min(0).max(10)).min(1).max(6),
    defaultSpeed: z.number().min(0).max(10),
  }),
  /** With the visitor's reduced-motion setting on, the planet opens paused and effects hold still. */
  respectReducedMotion: z.boolean(),
})

const Light = z.strictObject({ color: Color, intensity: z.number().min(0).max(10) })
const CloudKind = z.strictObject({
  count: z.number().int().min(0).max(40),
  color: Color,
  opacity: z.number().min(0).max(1),
  /** Height above the ground, globe units. */
  altitude: z.number().min(0).max(5),
  /** Multiplier on drift speed. */
  speed: z.number().min(0).max(10),
})

export const EnvironmentSettings = z.strictObject({
  schemaVersion: z.literal(1),
  background: Color,
  lights: z.strictObject({
    hemisphere: z.strictObject({ sky: Color, ground: Color, intensity: z.number().min(0).max(10) }),
    ambient: Light,
    key: Light.extend({ position: Vec3 }),
    fill: Light.extend({ position: Vec3 }),
  }),
  stars: z.strictObject({ count: z.number().int().min(0).max(5000), radius: z.number().positive(), depth: z.number().positive(), size: z.number().positive(), drift: z.number().min(0).max(5) }),
  sun: z.strictObject({ position: Vec3, color: Color, glow: Color, radius: z.number().positive() }),
  atmosphere: z.strictObject({ color: Color, strength: z.number().min(0).max(1), scale: z.number().min(1).max(1.5) }),
  clouds: z.strictObject({ seed: z.number().int(), puffy: CloudKind, wispy: CloudKind }),
})

export const FeatureSettings = z.strictObject({
  schemaVersion: z.literal(1),
  clouds: z.boolean(),
  stars: z.boolean(),
  /** Decorative formations, such as the smiling hemisphere and scattered islets. */
  formations: z.boolean(),
  /** Location kinds that can be switched off as a group. */
  polarLandmarks: z.boolean(),
  announcements: z.boolean(),
  /** Visitors can switch language with `?lang=`. */
  localeFromUrl: z.boolean(),
})

export const DiscoverySettings = z.strictObject({
  schemaVersion: z.literal(1),
  smileGreeting: z.strictObject({
    enabled: z.boolean(),
    formation: Id,
    messageKey: TextKey,
    /** How squarely the face must point at the viewer, 0 to 1. */
    alignment: z.number().min(0).max(1),
  }),
})

export const CategoriesFile = z.strictObject({
  schemaVersion: z.literal(1),
  categories: z
    .array(
      z.strictObject({
        id: Id,
        labelKey: TextKey,
        pluralKey: TextKey,
        order: z.number(),
        /** Selectable shores of this kind appear in filters and the directory. */
        listed: z.boolean(),
      }),
    )
    .min(1),
})

// ── Locations ────────────────────────────────────────────────────────────────────────────

export const LocationIndex = z.strictObject({
  schemaVersion: z.literal(1),
  /** Each entry is a location folder, relative to this file, holding a location.json. */
  locations: z.array(ConfigPath).min(1),
})

export const LocationFile = z.strictObject({
  schemaVersion: z.literal(1),
  id: Id,
  category: Id,
  status: Status,
  display: z.strictObject({
    nameKey: TextKey,
    shortNameKey: TextKey,
    descriptionKey: TextKey,
    showLabel: z.boolean(),
    showOnGlobe: z.boolean(),
    showInDirectory: z.boolean(),
    sortOrder: z.number(),
  }),
  placement: z.strictObject({
    latitude: Latitude,
    longitude: Longitude,
    /** Lifts the landmarks above the ground, globe units. */
    altitude: z.number().min(0).max(2),
    /** Grows or shrinks the island and its landmarks together. */
    scale: z.number().min(0.25).max(4),
    /** Turns the island and its landmarks clockwise, seen from above. */
    headingDeg: z.number().min(-360).max(360),
  }),
  appearance: z.strictObject({
    /** Ground color of the island's interior. */
    ground: Color,
    shore: Color,
    /** Accent color landmarks may use. */
    accent: Color,
  }),
  references: z.strictObject({
    terrain: ConfigPath.nullable(),
    landmarks: ConfigPath.nullable(),
    items: ConfigPath.nullable(),
  }),
  interaction: z.strictObject({
    selectable: z.boolean(),
    tooltipEnabled: z.boolean(),
    /** Radius of the selection ring and click target, globe units. */
    markerRadius: z.number().min(0.1).max(3),
  }),
  tags: z.array(Id),
  parent: Id.nullable(),
  related: z.array(Id),
})

const OvalTerrain = z.strictObject({
  type: z.literal('oval'),
  /** Half-length and half-width of the island. */
  radiusDeg: z.tuple([SmallAngle, SmallAngle]),
  /** Direction of the long axis, degrees from east toward north. */
  headingDeg: z.number(),
  /** Ground under the landmarks stays flat within this radius of the center. */
  flatRadiusDeg: z.number().min(0).max(60),
})
const OutlineTerrain = z.strictObject({
  type: z.literal('outline'),
  /** One unit of the outline's box, in degrees. */
  scaleDeg: SmallAngle,
  /** Where the location's center sits inside the outline's box. */
  anchor: Vec2,
  /** One or more polygons, x east and y north, roughly within -1 to 1. */
  parts: z.array(z.array(Vec2).min(3)).min(1),
  flatRadiusDeg: z.number().min(0).max(60),
})
const LobesTerrain = z.strictObject({
  type: z.literal('lobes'),
  lobeRadiusDeg: SmallAngle,
  bridgeHalfWidthDeg: SmallAngle,
  flatRadiusDeg: z.number().min(0).max(60),
  lobes: z.array(z.strictObject({ id: Id, atDeg: Vec2, ground: Color })).min(2),
  /** Pairs of lobe indexes joined by a land bridge. */
  bridges: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])),
})
const NoTerrain = z.strictObject({ type: z.literal('none') })

export const TerrainFile = z.strictObject({
  schemaVersion: z.literal(1),
  locationId: Id,
  shape: z.discriminatedUnion('type', [OvalTerrain, OutlineTerrain, LobesTerrain, NoTerrain]),
})

export const LandmarkPresetNames = [
  // Bespoke landmarks, one per shore that has them.
  'classic-philippines',
  'classic-canada',
  'classic-singapore',
  'classic-united-states',
  'classic-malaysia',
  'classic-thailand',
  'classic-hong-kong',
  'classic-japan',
  'classic-crislab',
  'classic-marketlab',
  'classic-adarna-writer',
  'classic-awkward-studio',
  'classic-oikonomia',
  'classic-ekklesia',
  'classic-dalisay-ui',
  'classic-lantern-shoal',
  'classic-question-atoll',
  'classic-violet-gate',
  'leaf-village',
  'rain-town',
  'sound-stage',
  'sand-town',
  'mystery-chest',
  'dreams-stairway',
  'semiconductor-chip',
  'sss-crown',
  'volcano-jungle',
  // Special landmarks.
  'beacon',
  'vault',
  'lettering',
  'continent-scenery',
  // General-purpose generators, for new shores without bespoke models.
  'tower',
  'crystal',
  'mountain',
  'pine-grove',
  'palm-grove',
  // A 3D model from the asset manifest.
  'model',
] as const

export const LandmarkFile = z.strictObject({
  schemaVersion: z.literal(1),
  locationId: Id,
  landmarks: z.array(
    z.strictObject({
      id: Id,
      preset: z.enum(LandmarkPresetNames),
      /** Required for `model`, optional elsewhere. */
      assetId: z.string().nullable(),
      labelKey: TextKey.nullable(),
      /** Stand on this lobe's center instead of the location's center (lobed terrain only). */
      lobe: Id.nullable(),
      /** Offset [east, up, north] in globe units. East and north follow the curve of the globe. */
      position: Vec3,
      rotationDeg: Vec3,
      scale: z.number().positive().max(10),
      visible: z.boolean(),
      /** `none` holds the landmark still. */
      animation: z.enum(['default', 'none']),
      /** Preset-specific options, checked against that preset's own schema. */
      params: z.record(z.string(), z.unknown()),
    }),
  ),
})

export const ContentDisplay = z.enum(['article', 'card', 'accordion', 'tab', 'gallery', 'image', 'links', 'info'])

export const ItemsFile = z.strictObject({
  schemaVersion: z.literal(1),
  sections: z.array(
    z.strictObject({
      id: Id,
      /** A Markdown file, relative to the location folder (or to `world/` for shared content, starting `shared/`). */
      source: ConfigPath,
      display: ContentDisplay,
      order: z.number(),
      visible: z.boolean(),
    }),
  ),
})

/** Front matter at the top of every Markdown content file. */
export const ContentFrontMatter = z.strictObject({
  id: Id,
  title: z.string().min(1).optional(),
  titleKey: TextKey.optional(),
  summary: z.string().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: Status,
  author: z.string().optional(),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// ── Formations ───────────────────────────────────────────────────────────────────────────

export const FormationIndex = z.strictObject({
  schemaVersion: z.literal(1),
  formations: z.array(ConfigPath),
})

const FormationIsland = z.strictObject({
  id: Id,
  role: z.string().min(1),
  /** Offset from the formation's center, degrees east and north. */
  atDeg: Vec2,
  radiusDeg: z.tuple([SmallAngle, SmallAngle]),
  headingDeg: z.number(),
  ground: Color.nullable(),
  dress: z.enum(['forest', 'palms', 'peak', 'pines']).nullable(),
})

export const IslandArrangementFile = z.strictObject({
  schemaVersion: z.literal(1),
  id: Id,
  type: z.literal('island-arrangement'),
  status: Status,
  center: z.strictObject({ latitude: Latitude, longitude: Longitude }),
  /** Turn the layout against the axial tilt, so it reads upright when it faces the viewer. */
  uprightAgainstTilt: z.boolean(),
  /** Keep named shores at least this far from the center. */
  clearanceDeg: z.number().min(0).max(90),
  islands: z.array(FormationIsland),
  /** Islands strung along an arc, such as a smile. */
  arcs: z.array(
    z.strictObject({
      id: Id,
      role: z.string().min(1),
      centerDeg: Vec2,
      radiusDeg: SmallAngle,
      fromDeg: z.number(),
      toDeg: z.number(),
      /** Half-length of each island along the arc; one entry per island. */
      lengthsDeg: z.array(SmallAngle).min(2),
      /** Nudges each island in or out from the arc; same count as lengths. */
      jitterDeg: z.array(z.number()),
      widthDeg: SmallAngle,
      ground: Color.nullable(),
      /** Decorate every Nth island (starting at the second), or 0 for none. */
      dressEvery: z.number().int().min(0),
      dress: z.enum(['forest', 'palms', 'peak', 'pines']).nullable(),
    }),
  ),
})

export const IsletsFile = z.strictObject({
  schemaVersion: z.literal(1),
  id: Id,
  type: z.literal('islets'),
  status: Status,
  islands: z.array(
    z.strictObject({
      id: Id,
      latitude: Latitude,
      longitude: Longitude,
      radiusDeg: z.tuple([SmallAngle, SmallAngle]),
      headingDeg: z.number(),
      flatRadiusDeg: z.number().min(0).max(10),
      dress: z.enum(['pines', 'palms']),
    }),
  ),
})

export const FormationFile = z.discriminatedUnion('type', [IslandArrangementFile, IsletsFile])

// ── Layouts ──────────────────────────────────────────────────────────────────────────────

/** UI components configuration may place. Anything else is rejected. */
export const ComponentNames = [
  'SelectionChip',
  'ShoreLegend',
  'GlobeControls',
  'DestinationDetails',
  'DestinationDirectory',
  'Announcements',
] as const

const LayoutSection = z.strictObject({
  id: Id,
  component: z.enum(ComponentNames),
  order: z.number(),
  visible: z.boolean(),
  /** Only the documented options of that component are accepted. */
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
})

const Panel = z.strictObject({
  enabled: z.boolean(),
  width: z.number().int().min(240).max(640),
  /** `always` keeps it open; `on-demand` opens it from a button, such as Read on the selection chip. */
  open: z.enum(['always', 'on-demand']),
  sections: z.array(LayoutSection),
})

export const ExplorerLayout = z.strictObject({
  schemaVersion: z.literal(1),
  id: Id,
  regions: z.strictObject({
    top: z.array(LayoutSection),
    bottomLeft: z.array(LayoutSection),
    bottomRight: z.array(LayoutSection),
  }),
  leftPanel: Panel,
  rightPanel: Panel,
})

export const DestinationPanelLayout = z.strictObject({
  schemaVersion: z.literal(1),
  showCategory: z.boolean(),
  showTagline: z.boolean(),
  /** Shown when a shore has no visible content yet. */
  emptyMessageKey: TextKey,
  /** Accordion sections start open. */
  expandAccordions: z.boolean(),
})

export const NavigationLayout = z.strictObject({
  schemaVersion: z.literal(1),
  filters: z
    .array(
      z.strictObject({
        id: Id,
        labelKey: TextKey,
        /** Category IDs this filter shows, or `all`. */
        categories: z.union([z.literal('all'), z.array(Id).min(1)]),
      }),
    )
    .min(1),
  directory: z.strictObject({ groupByCategory: z.boolean() }),
})

// ── Themes, text, messages, assets ───────────────────────────────────────────────────────

/** Interface tokens a theme may override. These are the CSS variables in src/index.css. */
export const UiTokenNames = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--primary',
  '--primary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--border',
  '--ring',
  '--radius',
] as const

export const ThemeFile = z.strictObject({
  schemaVersion: z.literal(1),
  id: Id,
  ui: z.partialRecord(z.enum(UiTokenNames), z.string().min(1)),
  globe: z.strictObject({
    ocean: z.strictObject({ deep: Color, shallow: Color, rim: Color }),
    land: z.strictObject({ shore: Color, grass: Color, meadow: Color, rock: Color, snow: Color }),
    ice: z.strictObject({ cap: Color, edge: Color }),
    selection: z.strictObject({ selected: Color, hovered: Color }),
  }),
})

export const LocaleFile = z.record(TextKey, z.string())

export const AnnouncementsFile = z.strictObject({
  schemaVersion: z.literal(1),
  announcements: z.array(
    z.strictObject({
      id: Id,
      messageKey: TextKey,
      enabled: z.boolean(),
      priority: z.number(),
      /** ISO dates. Checked in the visitor's browser when the page loads. */
      startsAt: z.iso.date().nullable(),
      endsAt: z.iso.date().nullable(),
      placement: z.enum(['top', 'bottom']),
      dismissible: z.boolean(),
    }),
  ),
})

export const AssetTypes = ['model', 'texture', 'image', 'icon', 'audio', 'thumbnail', 'environment', 'animation'] as const

export const AssetManifest = z.strictObject({
  schemaVersion: z.literal(1),
  /**
   * Folder holding every managed asset, relative to the project folder (not to this file).
   * It must sit inside `public/`, which is served as-is at the site root.
   */
  root: z.string().regex(/^public\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/, 'the asset root is a folder inside public/'),
  assets: z.array(
    z.strictObject({
      id: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'asset IDs look like `landmark.singapore.tower`'),
      type: z.enum(AssetTypes),
      /** Relative to the asset root, as `category/owner/descriptive-name.ext`. */
      path: z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\.[a-z0-9]+$/, 'paths are lowercase, hyphenated, relative'),
      displayName: z.string().min(1),
      version: z.number().int().min(1),
      status: z.enum(['active', 'deprecated', 'draft']),
      license: z.string().min(1),
      attribution: z.string().nullable(),
      tags: z.array(z.string()),
    }),
  ),
})

export type WorldFileT = z.infer<typeof WorldFile>
export type LocationFileT = z.infer<typeof LocationFile>
export type TerrainShape = z.infer<typeof TerrainFile>['shape']
export type LandmarkT = z.infer<typeof LandmarkFile>['landmarks'][number]
export type LayoutSectionT = z.infer<typeof LayoutSection>
export type ExplorerLayoutT = z.infer<typeof ExplorerLayout>
export type ComponentName = (typeof ComponentNames)[number]
export type LandmarkPreset = (typeof LandmarkPresetNames)[number]
export type ContentDisplayT = z.infer<typeof ContentDisplay>
