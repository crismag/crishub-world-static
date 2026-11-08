import { SITE_RADIUS, destinations, scenery, type Destination } from './destinations.ts'
import { mulberry32, type Vec3 } from './math.ts'
import { countryOutlines, type Point2 } from './outlines.ts'
import { programmingContinent } from './programming.ts'
import { smile } from './smile.ts'

/**
 * The planet's land. Three layers, all pure math so they can be tested without WebGL:
 *
 * 1. Land: each shore gets its own shape. Countries use simplified outlines, other shores
 *    get stretched, turned ovals, and the programming continent is round. Everything else
 *    is open ocean, so every island can be reached by sea.
 * 2. Relief: ridges, snowy peaks and hills inland, kept off the ground right under
 *    landmarks and lettering so those always stand flat.
 */

/** Field value where land meets water. */
export const COAST = 0.12
/** Height of the flat ground that landmarks stand on, above the globe radius. */
export const PLATEAU = 0.075
/** Height of the polar ice sheets above the globe radius. */
export const ICE_HEIGHT = 0.035
/** Depth of land that sits under the ocean surface. */
const SEABED = -0.06
/** Radians of distance from a named coast per unit of field. Smaller means steeper coasts. */
const SLOPE = 0.05
/** Tallest ridge, above the plateau. */
const RIDGE_HEIGHT = 0.12

type Shape =
  | { type: 'ellipse'; rx: number; ry: number; heading: number }
  | { type: 'outline'; parts: readonly (readonly Point2[])[] }

export type LandSeed = {
  id: string
  position: Vec3
  east: Vec3
  north: Vec3
  shape: Shape
  /** Furthest the shape reaches from its center, in radians. */
  bound: number
  /** Ground within this angle of the center stays flat: no ridges or hills. */
  flat: number
  /** Ground color for the named land. Islets and wild land keep the default grass. */
  patch?: string
  /** Precomputed: points with a smaller dot product than this are too far to matter. */
  reachCos: number
  /** Precomputed: points with a smaller dot product than this are outside the flat zone. */
  calmCos: number
}

function tangentBasis(center: Vec3): { east: Vec3; north: Vec3 } {
  const [x, y, z] = center
  const length = Math.hypot(z, x) || 1
  const east: Vec3 = [z / length, 0, -x / length]
  const north: Vec3 = [y * east[2] - z * east[1], z * east[0] - x * east[2], x * east[1] - y * east[0]]
  return { east, north }
}

function hashId(id: string): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619)
  return hash >>> 0
}

/** An oval with a random stretch and heading, so no two shores share an outline. */
function oval(id: string, minor: number, stretch: number): Shape {
  const random = mulberry32(hashId(id))
  const ratio = 1 + random() * (stretch - 1)
  return { type: 'ellipse', rx: minor * ratio, ry: minor, heading: random() * Math.PI }
}

function seed(id: string, position: Vec3, shape: Shape, flat: number, patch?: string): LandSeed {
  const bound =
    shape.type === 'ellipse'
      ? Math.max(shape.rx, shape.ry)
      : Math.max(...shape.parts.flat().map(([x, y]) => Math.hypot(x, y)))
  return {
    id,
    position,
    ...tangentBasis(position),
    shape,
    bound,
    flat,
    patch,
    reachCos: Math.cos(Math.min(1.4, bound + 0.3)),
    calmCos: Math.cos(flat + 0.06),
  }
}

/** Landmarks are about this wide (radians, from the center), plus a little margin. */
export const LANDMARK_FLAT = 0.075

/** Half-width of the land bridges joining the lobes of a multi-site shore, in radians. */
const BRIDGE_HALF_WIDTH = 0.018

/**
 * A multi-site shore: one round lobe per site, each with its own ground, plus land bridges
 * joining each lobe to the next. The last lobe is not joined back to the first, so the bay
 * in the middle stays open to the sea.
 */
function siteSeeds(destination: Destination): LandSeed[] {
  const sites = destination.sites ?? []
  const lobes = sites.map((site) =>
    seed(
      `${destination.id}:${site.id}`,
      site.position,
      { type: 'ellipse', rx: SITE_RADIUS, ry: SITE_RADIUS, heading: 0 },
      LANDMARK_FLAT,
      site.land,
    ),
  )
  const bridges = sites.slice(1).map((site, index) => {
    const from = sites[index]?.at ?? site.at
    const to = site.at
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const length = Math.hypot(dx, dy) || 1
    const nx = (-dy / length) * BRIDGE_HALF_WIDTH
    const ny = (dx / length) * BRIDGE_HALF_WIDTH
    return [
      [from[0] + nx, from[1] + ny],
      [to[0] + nx, to[1] + ny],
      [to[0] - nx, to[1] - ny],
      [from[0] - nx, from[1] - ny],
    ] as const
  })
  return [...lobes, seed(`${destination.id}:bridges`, destination.position, { type: 'outline', parts: bridges }, 0, destination.land)]
}

export const landSeeds: readonly LandSeed[] = [
  ...destinations.flatMap((destination) => {
    if (destination.sites) return siteSeeds(destination)
    const outline = countryOutlines[destination.id]
    if (outline) {
      const [ax, ay] = outline.anchor
      const parts = outline.parts.map((part) =>
        part.map(([x, y]) => [(x - ax) * outline.scale, (y - ay) * outline.scale] as const),
      )
      return [seed(destination.id, destination.position, { type: 'outline', parts }, LANDMARK_FLAT, destination.land)]
    }
    const minor = destination.kind === 'mystery' ? 0.095 : 0.11
    return [seed(destination.id, destination.position, oval(destination.id, minor, 1.7), LANDMARK_FLAT, destination.land)]
  }),
  ...scenery.map((islet) => seed(islet.id, islet.position, oval(islet.id, 0.045, 1.8), 0.03)),
  seed(
    'programming',
    programmingContinent.center,
    { type: 'ellipse', rx: programmingContinent.coast, ry: programmingContinent.coast, heading: 0 },
    programmingContinent.core + 0.015,
    programmingContinent.ground,
  ),
  // The smiling planet's eyes, nose, smile, and the plain islets around them.
  ...smile.features.map((feature) =>
    seed(
      feature.id,
      feature.position,
      { type: 'ellipse', rx: feature.rx, ry: feature.ry, heading: feature.localHeading },
      0,
      feature.ground,
    ),
  ),
]

/**
 * A coarse latitude-longitude grid listing which seeds can reach each cell, so a sample
 * only measures the few shapes near it instead of every shape on the planet.
 */
const GRID_COLUMNS = 72
const GRID_ROWS = 36

function cellOf(x: number, y: number, z: number): number {
  const latitude = Math.asin(Math.max(-1, Math.min(1, y)))
  const longitude = Math.atan2(z, x) + Math.PI
  const row = Math.min(GRID_ROWS - 1, Math.floor(((latitude + Math.PI / 2) / Math.PI) * GRID_ROWS))
  const column = Math.min(GRID_COLUMNS - 1, Math.floor((longitude / (Math.PI * 2)) * GRID_COLUMNS))
  return row * GRID_COLUMNS + column
}

function cellDirection(row: number, column: number, rowOffset: number, columnOffset: number): Vec3 {
  const latitude = ((row + rowOffset) / GRID_ROWS) * Math.PI - Math.PI / 2
  const longitude = ((column + columnOffset) / GRID_COLUMNS) * Math.PI * 2 - Math.PI
  return [Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)]
}

function angleBetween(a: Vec3, b: Vec3): number {
  return Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))
}

const nearbySeeds: readonly (readonly number[])[] = (() => {
  const cells: number[][] = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let column = 0; column < GRID_COLUMNS; column++) {
      const center = cellDirection(row, column, 0.5, 0.5)
      // How far the cell reaches from its center: the furthest of its corners.
      const corners = [
        cellDirection(row, column, 0, 0),
        cellDirection(row, column, 0, 1),
        cellDirection(row, column, 1, 0),
        cellDirection(row, column, 1, 1),
      ]
      const halfSize = Math.max(...corners.map((corner) => angleBetween(center, corner)))
      const list: number[] = []
      landSeeds.forEach((landSeed, index) => {
        const reach = Math.max(Math.acos(landSeed.reachCos), Math.acos(landSeed.calmCos))
        if (angleBetween(center, landSeed.position) <= reach + halfSize + 1e-6) list.push(index)
      })
      cells.push(list)
    }
  }
  return cells
})()

function lattice(x: number, y: number, z: number): number {
  let h = Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  return ((h ^ (h >>> 15)) >>> 0) / 4294967295
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Smooth value noise in [-1, 1]. */
function valueNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const w = smooth(z - zi)
  const x00 = lerp(lattice(xi, yi, zi), lattice(xi + 1, yi, zi), u)
  const x10 = lerp(lattice(xi, yi + 1, zi), lattice(xi + 1, yi + 1, zi), u)
  const x01 = lerp(lattice(xi, yi, zi + 1), lattice(xi + 1, yi, zi + 1), u)
  const x11 = lerp(lattice(xi, yi + 1, zi + 1), lattice(xi + 1, yi + 1, zi + 1), u)
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1
}

/** Three octaves of value noise, roughly in [-1, 1]. */
export function fbm(x: number, y: number, z: number): number {
  return (
    0.6 * valueNoise(x, y, z) +
    0.28 * valueNoise(x * 2.1 + 17.3, y * 2.1 - 4.1, z * 2.1 + 9.7) +
    0.12 * valueNoise(x * 4.3 - 8.2, y * 4.3 + 21.5, z * 4.3 - 3.3)
  )
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Signed distance to a polygon, negative inside. */
function polygonDistance(px: number, py: number, polygon: readonly Point2[]): number {
  const first = polygon[0]
  if (!first) return Infinity
  let best = (px - first[0]) ** 2 + (py - first[1]) ** 2
  let sign = 1
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (!a || !b) continue
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const wx = px - a[0]
    const wy = py - a[1]
    const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey)))
    const bx = wx - ex * t
    const by = wy - ey * t
    best = Math.min(best, bx * bx + by * by)
    const above = py >= a[1]
    const below = py < b[1]
    const left = ex * wy > ey * wx
    if ((above && below && left) || (!above && !below && !left)) sign = -sign
  }
  return sign * Math.sqrt(best)
}

/** Signed distance (radians, negative inside) from a point to a seed's shape. */
function shapeDistance(landSeed: LandSeed, direction: Vec3): number {
  const [x, y, z] = direction
  const [cx, cy, cz] = landSeed.position
  const along = x * cx + y * cy + z * cz
  if (along < landSeed.reachCos) return Infinity
  // Project onto the tangent plane at the seed's center.
  const qx = x / along - cx
  const qy = y / along - cy
  const qz = z / along - cz
  const u = qx * landSeed.east[0] + qy * landSeed.east[1] + qz * landSeed.east[2]
  const v = qx * landSeed.north[0] + qy * landSeed.north[1] + qz * landSeed.north[2]
  const { shape } = landSeed
  if (shape.type === 'ellipse') {
    const cos = Math.cos(shape.heading)
    const sin = Math.sin(shape.heading)
    const ru = u * cos + v * sin
    const rv = -u * sin + v * cos
    return (Math.hypot(ru / shape.rx, rv / shape.ry) - 1) * Math.min(shape.rx, shape.ry)
  }
  let distance = Infinity
  for (const part of shape.parts) distance = Math.min(distance, polygonDistance(u, v, part))
  return distance
}

export type TerrainSample = {
  /** Above COAST is land. */
  field: number
  /** Index into landSeeds of the land this point belongs to, or -1 in open ocean. */
  nearest: number
  /** How far inside that named land this point is, in field units. */
  weight: number
}

/** Samples the land field at a unit direction. */
export function terrainAt(direction: Vec3): TerrainSample {
  const [x, y, z] = direction
  let nearest = -1
  let closest = Infinity
  for (const i of nearbySeeds[cellOf(x, y, z)] ?? []) {
    const landSeed = landSeeds[i]
    if (!landSeed) continue
    const distance = shapeDistance(landSeed, direction)
    if (distance < closest) {
      closest = distance
      nearest = i
    }
  }
  // A small wobble on every named coast, so outlines look drawn by hand rather than by ruler.
  // Only worth computing near a coast; deep inland or far out at sea it changes nothing.
  // Small islands wobble less, so a little islet is never wobbled away entirely.
  const size = Math.min(1, (landSeeds[nearest]?.bound ?? 0.12) / 0.12)
  const wobble = Math.abs(closest) < 0.06 ? 0.012 * size * fbm(x * 9 + 2.7, y * 9 - 5.1, z * 9 + 8.3) : 0
  const weight = Number.isFinite(closest) ? COAST - (closest + wobble) / SLOPE : -Infinity
  // Far from every shore the field sits well below the coast: open ocean.
  const field = Number.isFinite(weight) ? Math.min(weight, 3) : -3
  return { field, nearest: field > COAST - 1 ? nearest : -1, weight }
}

/** Base land height from the field: seabed, a rounded coast, then a flat plateau. */
export function elevation(field: number): number {
  const rise = smoothstep(COAST - 0.04, COAST + 0.08, field)
  const plateau = smoothstep(0.38, 0.46, field)
  return SEABED + rise * (PLATEAU - SEABED - 0.022) + plateau * 0.022
}

/** 1 where the ground must stay flat: under landmarks, lettering, and islet trees. */
function calmAt(direction: Vec3): number {
  const [x, y, z] = direction
  let calm = 0
  for (const index of nearbySeeds[cellOf(x, y, z)] ?? []) {
    const landSeed = landSeeds[index]
    if (!landSeed) continue
    const [cx, cy, cz] = landSeed.position
    const along = x * cx + y * cy + z * cz
    if (along < landSeed.calmCos) continue
    const angle = Math.acos(Math.min(1, along))
    calm = Math.max(calm, 1 - smoothstep(landSeed.flat, landSeed.flat + 0.05, angle))
  }
  return calm
}

export type Relief = {
  /** Height added on top of the plateau. */
  lift: number
  /** 0 on grass, rising to 1 on bare rock and snowy peaks. */
  rock: number
}

/** Mountain ridges and rolling hills, only well inland and never under a landmark. */
export function reliefAt(direction: Vec3, field: number): Relief {
  const inland = smoothstep(COAST + 0.2, COAST + 0.7, field)
  if (inland <= 0) return { lift: 0, rock: 0 }
  const open = inland * (1 - calmAt(direction))
  if (open <= 0) return { lift: 0, rock: 0 }
  const [x, y, z] = direction
  const ranges = smoothstep(-0.1, 0.25, fbm(x * 1.6 + 13.1, y * 1.6 - 6.6, z * 1.6 + 2.4))
  const crest = 1 - Math.abs(fbm(x * 4.6 - 3.9, y * 4.6 + 15.2, z * 4.6 - 11.7))
  const ridge = ranges * smoothstep(0.5, 0.88, crest) * open
  const hills = smoothstep(0.05, 0.6, fbm(x * 8 + 21.4, y * 8 - 9.3, z * 8 + 4.6)) * open
  return { lift: RIDGE_HEIGHT * ridge + 0.02 * hills, rock: ridge }
}

/** Distance toward either pole (|y|), roughened so the ice edge wanders. */
function polarity(direction: Vec3): number {
  const [x, y, z] = direction
  return Math.abs(y) + 0.035 * fbm(x * 5 + 3.1, y * 5 - 7.4, z * 5 + 11.8)
}

/** 0 away from the poles, rising to 1 across the north and south ice caps. */
export function iceAt(direction: Vec3): number {
  return smoothstep(0.9, 0.93, polarity(direction))
}

export type Surface = TerrainSample &
  Relief & {
    /** Final ground height above the globe radius, including ice. */
    height: number
    ice: number
  }

/** Everything about the ground at one direction: field, relief, ice, and final height. */
export function surfaceAt(direction: Vec3): Surface {
  const sample = terrainAt(direction)
  const relief = reliefAt(direction, sample.field)
  const ice = iceAt(direction)
  const land = elevation(sample.field) + relief.lift
  const height = Math.max(land, SEABED + ice * (ICE_HEIGHT - SEABED))
  return { ...sample, ...relief, ice, height }
}

/** 0 for open water, 1 for shallows near a coast or a lighter lagoon patch. */
export function shallowsAt(direction: Vec3, field: number): number {
  const [x, y, z] = direction
  const coast = smoothstep(COAST - 1.1, COAST - 0.25, field)
  const lagoon = smoothstep(0.25, 0.32, fbm(x * 1.5 + 31.7, y * 1.5 - 12.4, z * 1.5 + 5.9))
  const polarWater = smoothstep(0.86, 0.9, polarity(direction))
  return Math.max(coast, lagoon, polarWater)
}

/** 1 inside the lighter grass patches that break up each landmass. */
export function meadowAt(direction: Vec3): number {
  const [x, y, z] = direction
  return smoothstep(0.08, 0.16, fbm(x * 3.1 - 41.2, y * 3.1 + 7.7, z * 3.1 + 26.1))
}
