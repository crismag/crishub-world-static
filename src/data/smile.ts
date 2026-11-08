import type { Vec3 } from './math.ts'

/**
 * The smiling planet: an Easter egg made only of ordinary geography. Seen straight on from
 * the far side of the globe (opposite the programming continent), two forested islands
 * read as eyes, a small peaked island as a nose, and a curved chain of sandy islands as
 * a smile. From any other angle they are just islands.
 *
 * The layout is a flat map in radians, x east and y north, centered on the face. It is
 * turned against the planet's axial tilt so the face is upright when it turns toward you,
 * then wrapped onto the sphere.
 */

export type SmileRole = 'eye' | 'nose' | 'mouth' | 'scatter'

export type SmileFeature = {
  id: string
  role: SmileRole
  /** Position on the face map, radians east and north of the face center. */
  at: readonly [number, number]
  /** Half-length and half-width of the island, radians. */
  rx: number
  ry: number
  /** Direction of the island's long axis on the face map, radians from east toward north. */
  heading: number
  /** Ground color. Scatter islets keep the default grass. */
  ground?: string
  /** Decoration: pines on eyes, palms on some of the smile, a peak on the nose. */
  dress?: 'forest' | 'palms' | 'peak'
}

/** Earth's axial tilt, matching Scene.tsx. */
const LEVEL = (23.44 * Math.PI) / 180

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z)
  return [x / length, y / length, z / length]
}

const FOREST = '#1d6638'
const SAND = '#d8c48e'
const ROCK = '#8d7f6c'

/** The smile: islands along an arc that curves up at both ends, a little lopsided on purpose. */
function mouth(): SmileFeature[] {
  const count = 9
  const jitter = [0.006, -0.004, 0.003, -0.005, 0.002, 0.005, -0.003, 0.004, 0.012]
  const lengths = [0.026, 0.03, 0.029, 0.032, 0.03, 0.028, 0.031, 0.027, 0.025]
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1)
    const angle = (-152 + t * 124) * (Math.PI / 180)
    const radius = 0.29 + (jitter[index] ?? 0)
    const x = Math.cos(angle) * radius
    const y = 0.1 + Math.sin(angle) * radius
    return {
      id: `smile-${index}`,
      role: 'mouth' as const,
      at: [x, y] as const,
      rx: lengths[index] ?? 0.028,
      ry: 0.02,
      // Along the arc: the tangent of a circle is 90° from its radius.
      heading: angle + Math.PI / 2,
      ground: SAND,
      dress: index % 3 === 1 ? ('palms' as const) : undefined,
    }
  })
}

const layout: readonly SmileFeature[] = [
  { id: 'eye-left', role: 'eye', at: [-0.165, 0.12], rx: 0.062, ry: 0.048, heading: 0.3, ground: FOREST, dress: 'forest' },
  { id: 'eye-left-isle', role: 'eye', at: [-0.232, 0.17], rx: 0.024, ry: 0.018, heading: -0.4, ground: FOREST, dress: 'forest' },
  { id: 'eye-left-rock', role: 'eye', at: [-0.105, 0.072], rx: 0.02, ry: 0.016, heading: 0.9, ground: FOREST },
  { id: 'eye-right', role: 'eye', at: [0.172, 0.132], rx: 0.056, ry: 0.05, heading: -0.5, ground: FOREST, dress: 'forest' },
  { id: 'eye-right-isle', role: 'eye', at: [0.232, 0.082], rx: 0.022, ry: 0.017, heading: 0.6, ground: FOREST, dress: 'forest' },
  { id: 'nose', role: 'nose', at: [0.012, -0.005], rx: 0.038, ry: 0.03, heading: 1.2, ground: ROCK, dress: 'peak' },
  ...mouth(),
  { id: 'scatter-1', role: 'scatter', at: [-0.4, -0.12], rx: 0.03, ry: 0.02, heading: 0.7 },
  { id: 'scatter-2', role: 'scatter', at: [0.41, -0.21], rx: 0.026, ry: 0.02, heading: -0.3 },
  { id: 'scatter-3', role: 'scatter', at: [0.36, 0.31], rx: 0.024, ry: 0.019, heading: 1.4 },
  { id: 'scatter-4', role: 'scatter', at: [-0.34, 0.34], rx: 0.028, ry: 0.02, heading: 0.2 },
]

/** The face looks out from the far side of the planet, a little north of the equator. */
const center = normalize(0, Math.sin(0.3), -Math.cos(0.3))

function faceFrame(): { east: Vec3; north: Vec3 } {
  const [x, y, z] = center
  const length = Math.hypot(z, x)
  const east0: Vec3 = [z / length, 0, -x / length]
  const north0: Vec3 = [y * east0[2] - z * east0[1], z * east0[0] - x * east0[2], x * east0[1] - y * east0[0]]
  // Turn the map against the planet's tilt, so the face is upright when it faces the viewer.
  const cos = Math.cos(LEVEL)
  const sin = Math.sin(LEVEL)
  const east: Vec3 = [
    east0[0] * cos + north0[0] * sin,
    east0[1] * cos + north0[1] * sin,
    east0[2] * cos + north0[2] * sin,
  ]
  const north: Vec3 = [
    north0[0] * cos - east0[0] * sin,
    north0[1] * cos - east0[1] * sin,
    north0[2] * cos - east0[2] * sin,
  ]
  return { east, north }
}

const frame = faceFrame()

/** Wraps a point on the face map onto the unit sphere. */
export function fromFace([a, b]: readonly [number, number]): [number, number, number] {
  const { east, north } = frame
  return normalize(
    center[0] + a * east[0] + b * north[0],
    center[1] + a * east[1] + b * north[1],
    center[2] + a * east[2] + b * north[2],
  )
}

/** Unwraps a point on the sphere back onto the face map. Only meaningful on the face's side. */
export function toFace(point: Vec3): [number, number] {
  const along = point[0] * center[0] + point[1] * center[1] + point[2] * center[2]
  const q: Vec3 = [point[0] / along - center[0], point[1] / along - center[1], point[2] / along - center[2]]
  const { east, north } = frame
  return [
    q[0] * east[0] + q[1] * east[1] + q[2] * east[2],
    q[0] * north[0] + q[1] * north[1] + q[2] * north[2],
  ]
}

export type PlacedSmileFeature = SmileFeature & {
  position: Vec3
  /**
   * Heading of the island's long axis in its own tangent frame (east = horizontal). Close to
   * the face, that frame matches the untilted face map, so the tilt correction is added here.
   */
  localHeading: number
}

export const smile = {
  center: center as Vec3,
  /** Named shores keep their centers at least this far from the face's center. */
  clearance: 0.74,
  /**
   * Optional Easter-egg line shown when the face turns toward the viewer.
   * Off by default (null): the geography should work without explanation.
   */
  message: null as string | null,
  features: layout.map(
    (feature): PlacedSmileFeature => ({
      ...feature,
      position: fromFace(feature.at),
      localHeading: feature.heading + LEVEL,
    }),
  ),
}
