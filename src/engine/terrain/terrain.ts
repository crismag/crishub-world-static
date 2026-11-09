import type { Vec3, WorldRegistry } from '../../runtime/configuration/registry-types.ts'
import { fbm, smoothstep } from './noise.ts'

/**
 * The planet's land, built from a compiled world. Pure math, so the validator, the tests, and
 * the renderer all share it.
 *
 * Every island is a "land seed": a shape on the sphere (an oval or polygons on the tangent
 * plane at its center) with a ground color and a flat zone. Land rises where a point is inside
 * a seed's shape; ridges and hills form well inland, but never inside a flat zone, so
 * landmarks always stand level. Everything else is open ocean, with ice at the poles.
 *
 * Engine constants below are the look of the terrain rather than world content, so they stay
 * in code. World content (where islands are, their shapes and colors) comes from configuration.
 */

/** Field value where land meets water. */
export const COAST = 0.12
/** Height of the flat ground that landmarks stand on, above the globe radius. */
export const PLATEAU = 0.075
/** Height of the polar ice sheets above the globe radius. */
export const ICE_HEIGHT = 0.035
/** Depth of land that sits under the ocean surface. */
const SEABED = -0.06
/** Radians of distance from a coast per unit of field. Smaller means steeper coasts. */
const SLOPE = 0.05
/** Tallest ridge, above the plateau. */
const RIDGE_HEIGHT = 0.12

type Shape =
  | { type: 'ellipse'; rx: number; ry: number; heading: number }
  | { type: 'outline'; parts: readonly (readonly (readonly [number, number])[])[] }

export type LandSeed = {
  id: string
  /** The location or formation this land belongs to. */
  ownerId: string
  position: Vec3
  east: Vec3
  north: Vec3
  shape: Shape
  /** Furthest the shape reaches from its center, radians. */
  bound: number
  /** Ground within this angle of the center stays flat. */
  flat: number
  /** Interior ground color, or null for the default grass. */
  ground: string | null
  reachCos: number
  calmCos: number
}

export type TerrainSample = {
  /** Above COAST is land. */
  field: number
  /** Index into seeds of the land this point belongs to, or -1 in open ocean. */
  nearest: number
  /** How far inside that land this point is, in field units. */
  weight: number
}

export type Relief = {
  /** Height added on top of the plateau. */
  lift: number
  /** 0 on grass, rising to 1 on bare rock and snowy peaks. */
  rock: number
}

export type Surface = TerrainSample &
  Relief & {
    /** Final ground height above the globe radius, including ice. */
    height: number
    ice: number
  }

function tangentBasis(center: Vec3): { east: Vec3; north: Vec3 } {
  const [x, y, z] = center
  const length = Math.hypot(z, x)
  const east: Vec3 = length < 1e-9 ? [1, 0, 0] : [z / length, 0, -x / length]
  const north: Vec3 = [y * east[2] - z * east[1], z * east[0] - x * east[2], x * east[1] - y * east[0]]
  return { east, north }
}

function makeSeed(id: string, ownerId: string, position: Vec3, shape: Shape, flat: number, ground: string | null): LandSeed {
  const bound =
    shape.type === 'ellipse' ? Math.max(shape.rx, shape.ry) : Math.max(...shape.parts.flat().map(([x, y]) => Math.hypot(x, y)))
  return {
    id,
    ownerId,
    position,
    ...tangentBasis(position),
    shape,
    bound,
    flat,
    ground,
    reachCos: Math.cos(Math.min(1.4, bound + 0.3)),
    calmCos: Math.cos(flat + 0.06),
  }
}

/** Every island in the world as land seeds, in a stable order. */
export function landSeedsOf(world: WorldRegistry<unknown>): LandSeed[] {
  const seeds: LandSeed[] = []
  for (const location of world.locations) {
    if (!location.display.showOnGlobe) continue
    const { terrain } = location
    if (terrain.type === 'oval') {
      seeds.push(
        makeSeed(location.id, location.id, location.position, { type: 'ellipse', rx: terrain.rx, ry: terrain.ry, heading: terrain.heading }, terrain.flat, location.appearance.ground),
      )
    } else if (terrain.type === 'outline') {
      seeds.push(makeSeed(location.id, location.id, location.position, { type: 'outline', parts: terrain.parts }, terrain.flat, location.appearance.ground))
    } else if (terrain.type === 'lobes') {
      for (const lobe of terrain.lobes) {
        seeds.push(
          makeSeed(`${location.id}:${lobe.id}`, location.id, lobe.position, { type: 'ellipse', rx: terrain.lobeRadius, ry: terrain.lobeRadius, heading: 0 }, terrain.flat, lobe.ground),
        )
      }
      // Land bridges: a strip from one lobe's center to another's, on the location's tangent plane.
      const parts = terrain.bridges.map(([a, b]) => {
        const from = terrain.lobes[a]?.at ?? [0, 0]
        const to = terrain.lobes[b]?.at ?? [0, 0]
        const dx = to[0] - from[0]
        const dy = to[1] - from[1]
        const length = Math.hypot(dx, dy) || 1
        const nx = (-dy / length) * terrain.bridgeHalfWidth
        const ny = (dx / length) * terrain.bridgeHalfWidth
        return [
          [from[0] + nx, from[1] + ny],
          [to[0] + nx, to[1] + ny],
          [to[0] - nx, to[1] - ny],
          [from[0] - nx, from[1] - ny],
        ] as const
      })
      if (parts.length) {
        seeds.push(makeSeed(`${location.id}:bridges`, location.id, location.position, { type: 'outline', parts }, 0, location.appearance.ground))
      }
    }
  }
  if (world.settings.features.formations) {
    for (const formation of world.formations) {
      for (const island of formation.islands) {
        seeds.push(
          makeSeed(island.id, formation.id, island.position, { type: 'ellipse', rx: island.rx, ry: island.ry, heading: island.heading }, island.flat, island.ground),
        )
      }
    }
  }
  return seeds
}

/** Signed distance to a polygon, negative inside. */
function polygonDistance(px: number, py: number, polygon: readonly (readonly [number, number])[]): number {
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

/**
 * A coarse latitude-longitude grid listing which seeds can reach each cell, so a sample only
 * measures the few shapes near it instead of every shape on the planet.
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

export type Terrain = ReturnType<typeof createTerrain>

/** Builds the terrain functions for one compiled world. */
export function createTerrain(world: WorldRegistry<unknown>) {
  const seeds = landSeedsOf(world)
  /** Where the ice caps begin, as |y| on the unit sphere. */
  const iceEdge = Math.sin((world.settings.globe.iceCapLatitudeDeg * Math.PI) / 180)

  const nearbySeeds: number[][] = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let column = 0; column < GRID_COLUMNS; column++) {
      const center = cellDirection(row, column, 0.5, 0.5)
      // How far the cell reaches from its center: the furthest of its corners.
      const corners = [cellDirection(row, column, 0, 0), cellDirection(row, column, 0, 1), cellDirection(row, column, 1, 0), cellDirection(row, column, 1, 1)]
      const halfSize = Math.max(...corners.map((corner) => angleBetween(center, corner)))
      const list: number[] = []
      seeds.forEach((landSeed, index) => {
        const reach = Math.max(Math.acos(landSeed.reachCos), Math.acos(landSeed.calmCos))
        if (angleBetween(center, landSeed.position) <= reach + halfSize + 1e-6) list.push(index)
      })
      nearbySeeds.push(list)
    }
  }

  /** Samples the land field at a unit direction. */
  function terrainAt(direction: Vec3): TerrainSample {
    const [x, y, z] = direction
    let nearest = -1
    let closest = Infinity
    for (const i of nearbySeeds[cellOf(x, y, z)] ?? []) {
      const landSeed = seeds[i]
      if (!landSeed) continue
      const distance = shapeDistance(landSeed, direction)
      if (distance < closest) {
        closest = distance
        nearest = i
      }
    }
    // A small wobble on every coast, so outlines look drawn by hand rather than by ruler.
    // Only worth computing near a coast. Small islands wobble less, so none wobbles away.
    const size = Math.min(1, (seeds[nearest]?.bound ?? 0.12) / 0.12)
    const wobble = Math.abs(closest) < 0.06 ? 0.012 * size * fbm(x * 9 + 2.7, y * 9 - 5.1, z * 9 + 8.3) : 0
    const weight = Number.isFinite(closest) ? COAST - (closest + wobble) / SLOPE : -Infinity
    // Far from every shore the field sits well below the coast: open ocean.
    const field = Number.isFinite(weight) ? Math.min(weight, 3) : -3
    return { field, nearest: field > COAST - 1 ? nearest : -1, weight }
  }

  /** 1 where the ground must stay flat: under landmarks, lettering, and islet trees. */
  function calmAt(direction: Vec3): number {
    const [x, y, z] = direction
    let calm = 0
    for (const index of nearbySeeds[cellOf(x, y, z)] ?? []) {
      const landSeed = seeds[index]
      if (!landSeed) continue
      const [cx, cy, cz] = landSeed.position
      const along = x * cx + y * cy + z * cz
      if (along < landSeed.calmCos) continue
      const angle = Math.acos(Math.min(1, along))
      calm = Math.max(calm, 1 - smoothstep(landSeed.flat, landSeed.flat + 0.05, angle))
    }
    return calm
  }

  /** Mountain ridges and rolling hills, only well inland and never in a flat zone. */
  function reliefAt(direction: Vec3, field: number): Relief {
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
  function iceAt(direction: Vec3): number {
    return smoothstep(iceEdge, iceEdge + 0.03, polarity(direction))
  }

  /** Everything about the ground at one direction: field, relief, ice, and final height. */
  function surfaceAt(direction: Vec3): Surface {
    const sample = terrainAt(direction)
    const relief = reliefAt(direction, sample.field)
    const ice = iceAt(direction)
    const land = elevation(sample.field) + relief.lift
    const height = Math.max(land, SEABED + ice * (ICE_HEIGHT - SEABED))
    return { ...sample, ...relief, ice, height }
  }

  /** 0 for open water, 1 for shallows near a coast, a lighter lagoon patch, or polar water. */
  function shallowsAt(direction: Vec3, field: number): number {
    const [x, y, z] = direction
    const coast = smoothstep(COAST - 1.1, COAST - 0.25, field)
    const lagoon = smoothstep(0.25, 0.32, fbm(x * 1.5 + 31.7, y * 1.5 - 12.4, z * 1.5 + 5.9))
    const polarWater = smoothstep(iceEdge - 0.04, iceEdge, polarity(direction))
    return Math.max(coast, lagoon, polarWater)
  }

  return { seeds, terrainAt, surfaceAt, reliefAt, iceAt, shallowsAt, meadowAt, elevation }
}

/** Base land height from the field: seabed, a rounded coast, then a flat plateau. */
export function elevation(field: number): number {
  const rise = smoothstep(COAST - 0.04, COAST + 0.08, field)
  const plateau = smoothstep(0.38, 0.46, field)
  return SEABED + rise * (PLATEAU - SEABED - 0.022) + plateau * 0.022
}

/** 1 inside the lighter grass patches that break up each landmass. */
export function meadowAt(direction: Vec3): number {
  const [x, y, z] = direction
  return smoothstep(0.08, 0.16, fbm(x * 3.1 - 41.2, y * 3.1 + 7.7, z * 3.1 + 26.1))
}
