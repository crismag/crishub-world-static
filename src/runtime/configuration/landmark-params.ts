import { z } from 'zod'
import type { LandmarkPreset } from './schema.ts'

/**
 * Options each landmark preset accepts in `params`. Every option has a default here, so a
 * landmark only lists what it changes. Unknown options are rejected, so a typo fails
 * validation instead of silently doing nothing.
 */

const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const None = z.strictObject({})

const Beacon = z.strictObject({
  colors: z
    .strictObject({
      crystal: Color.default('#7ff3ff'),
      gold: Color.default('#e8c25a'),
      ice: Color.default('#eef6fb'),
      iceBlue: Color.default('#bfe3f5'),
      stoneBand: Color.default('#c3d3e0'),
      windows: Color.default('#ffd59a'),
    })
    .prefault({}),
  aurora: z
    .strictObject({
      enabled: z.boolean().default(true),
      /** Multiplier on the curtains' brightness. */
      strength: z.number().min(0).max(3).default(1),
      /** Three curtains, each a [low, high] color pair. */
      colors: z
        .array(z.tuple([Color, Color]))
        .length(3)
        .default([
          ['#3dff9e', '#3fd8ff'],
          ['#46ffb0', '#a77bff'],
          ['#3fe9ff', '#8a7dff'],
        ]),
    })
    .prefault({}),
  beam: z.boolean().default(true),
  rings: z.boolean().default(true),
  /** Show the location's description under its name in the hover tooltip. */
  tooltipDescription: z.boolean().default(false),
  /** Multiplier on pulse and ring speed. */
  animationSpeed: z.number().min(0).max(5).default(1),
})

const Vault = z.strictObject({
  colors: z
    .strictObject({
      core: Color.default('#8f7bff'),
      seam: Color.default('#9b86ff'),
      glyph: Color.default('#53f0e0'),
      fissure: Color.default('#8fa4ff'),
      fissureAlt: Color.default('#a98bff'),
      stone: Color.default('#2b3245'),
      stoneLight: Color.default('#3d4659'),
      crater: Color.default('#12284c'),
      frozen: Color.default('#a9e6ff'),
    })
    .prefault({}),
  pillars: z.number().int().min(0).max(8).default(4),
  snowfall: z.boolean().default(true),
  tooltipDescription: z.boolean().default(true),
  animationSpeed: z.number().min(0).max(5).default(1),
})

const Lettering = z.strictObject({
  /** Painted left to right, top to bottom; wrapped and sized to fit. */
  words: z.array(z.string().min(1).max(24)).min(1).max(40),
  /** Half the width of the lettering, degrees. Its corners must stay on the flat ground. */
  halfWidthDeg: z.number().positive().max(30),
  fills: z.array(Color).min(1).default(['#fff8e6', '#ffe08a', '#fff8e6', '#c8f4ff']),
  outline: Color.default('#1b5534'),
})

const ContinentScenery = z.strictObject({
  /** Most props to place in the ring between the flat core and the coast. */
  count: z.number().int().min(0).max(200).default(46),
  seed: z.number().int().default(404),
  /** Inner edge of the ring, degrees from the center. */
  innerDeg: z.number().min(0).max(60),
  /** Outer edge of the ring, degrees from the center. */
  outerDeg: z.number().min(0).max(60),
})

const Tower = z.strictObject({
  height: z.number().min(0.05).max(1).default(0.3),
  radius: z.number().min(0.01).max(0.3).default(0.05),
  color: Color.default('#e8e2d4'),
  roof: Color.default('#c0504d'),
  windows: z.boolean().default(true),
})

const Crystal = z.strictObject({
  height: z.number().min(0.02).max(0.6).default(0.18),
  color: Color.default('#7ff3ff'),
  count: z.number().int().min(1).max(9).default(4),
  glow: z.boolean().default(true),
})

const Mountain = z.strictObject({
  height: z.number().min(0.05).max(0.8).default(0.24),
  radius: z.number().min(0.03).max(0.5).default(0.13),
  color: Color.default('#7d7062'),
  snowCap: z.boolean().default(true),
})

const Grove = z.strictObject({
  count: z.number().int().min(1).max(30).default(6),
  radius: z.number().min(0.02).max(0.5).default(0.14),
  seed: z.number().int().default(1),
})

export const LandmarkParams = {
  'classic-philippines': None,
  'classic-canada': None,
  'classic-singapore': None,
  'classic-united-states': None,
  'classic-malaysia': None,
  'classic-thailand': None,
  'classic-hong-kong': None,
  'classic-japan': None,
  'classic-crislab': None,
  'classic-marketlab': None,
  'classic-adarna-writer': None,
  'classic-awkward-studio': None,
  'classic-oikonomia': None,
  'classic-ekklesia': None,
  'classic-dalisay-ui': None,
  'classic-lantern-shoal': None,
  'classic-question-atoll': None,
  'classic-violet-gate': None,
  'leaf-village': None,
  'rain-town': None,
  'sound-stage': None,
  'sand-town': None,
  'mystery-chest': None,
  'dreams-stairway': None,
  'semiconductor-chip': None,
  'sss-crown': None,
  'volcano-jungle': None,
  beacon: Beacon,
  vault: Vault,
  lettering: Lettering,
  'continent-scenery': ContinentScenery,
  tower: Tower,
  crystal: Crystal,
  mountain: Mountain,
  'pine-grove': Grove,
  'palm-grove': Grove,
  model: None,
} satisfies Record<LandmarkPreset, z.ZodType>

export type BeaconParams = z.output<typeof Beacon>
export type VaultParams = z.output<typeof Vault>
export type LetteringParams = z.output<typeof Lettering>
export type ContinentSceneryParams = z.output<typeof ContinentScenery>
export type TowerParams = z.output<typeof Tower>
export type CrystalParams = z.output<typeof Crystal>
export type MountainParams = z.output<typeof Mountain>
export type GroveParams = z.output<typeof Grove>

/** Options the layout may pass to each UI component. Anything else is rejected. */
export const ComponentProps = {
  SelectionChip: z.strictObject({ readMore: z.boolean().optional() }),
  ShoreLegend: z.strictObject({}),
  /** The collapsible list of places. `defaultOpen` starts it expanded. */
  LocationLegend: z.strictObject({ defaultOpen: z.boolean().optional() }),
  GlobeControls: z.strictObject({
    showSpeed: z.boolean().optional(),
    showZoom: z.boolean().optional(),
    showReset: z.boolean().optional(),
  }),
  DestinationDetails: z.strictObject({}),
  DestinationDirectory: z.strictObject({}),
  Announcements: z.strictObject({ placement: z.enum(['top', 'bottom']).optional() }),
} as const
