import type { Diagnostic } from '../../runtime/configuration/compile.ts'
import type { Vec3, WorldRegistry } from '../../runtime/configuration/registry-types.ts'
import { offsetOnSphere } from '../../runtime/configuration/sphere.ts'
import { COAST, PLATEAU, createTerrain } from './terrain.ts'

/**
 * Geography checks on a compiled world. They need the real terrain, so they run after the
 * compiler: `world:validate` reports them alongside schema and reference problems.
 *
 * - Every landmark stands on flat ground on its own location's land.
 * - Every island has a coast on the open ocean (nothing enclosed), and the ocean has no lakes.
 * - No shore stands on the polar ice.
 * - Painted lettering lies on flat ground.
 */
export function checkTerrain(world: WorldRegistry<unknown>): Diagnostic[] {
  const problems: Diagnostic[] = []
  const terrain = createTerrain(world)
  const file = (id: string) => `world/locations (${id})`
  const radius = world.settings.globe.radius

  /** Points on a circle of the given angular radius around a center. */
  const ring = (center: Vec3, angle: number, count = 16): Vec3[] =>
    Array.from({ length: count }, (_, step) => {
      const bearing = (step / count) * Math.PI * 2
      return offsetOnSphere(center, Math.cos(bearing) * angle, Math.sin(bearing) * angle)
    })

  for (const location of world.locations) {
    if (!location.display.showOnGlobe || location.terrain.type === 'none') continue
    for (const landmark of location.landmarks) {
      if (landmark.preset === 'lettering' || landmark.preset === 'continent-scenery') continue
      const [east, , north] = landmark.position
      const at = offsetOnSphere(landmark.anchor, east / radius, north / radius)
      // A landmark is about 0.2 globe units across before its scale.
      const footprint = (0.2 * landmark.scale) / radius / 1.3
      for (const point of [at, ...ring(at, footprint)]) {
        const ground = terrain.surfaceAt(point)
        if (Math.abs(ground.height - PLATEAU) > 1e-6) {
          problems.push({ level: 'error', file: file(location.id), message: `landmark "${landmark.id}" is not on flat ground; enlarge the island or its flatRadiusDeg, or move the landmark` })
          break
        }
        if (terrain.seeds[ground.nearest]?.ownerId !== location.id) {
          problems.push({ level: 'error', file: file(location.id), message: `landmark "${landmark.id}" stands on ${terrain.seeds[ground.nearest]?.ownerId ?? 'open water'}, not on ${location.id}` })
          break
        }
      }
    }
    if (location.interaction.selectable && terrain.iceAt(location.position) > 0) {
      problems.push({ level: 'error', file: file(location.id), message: 'stands on the polar ice' })
    }
    const lettering = location.landmarks.find((landmark) => landmark.preset === 'lettering')
    if (lettering) {
      const half = ((lettering.params.halfWidthDeg as number) * Math.PI) / 180
      const corner = Math.atan(Math.tan(half) * Math.SQRT2)
      for (const point of ring(location.position, corner, 32)) {
        if (Math.abs(terrain.surfaceAt(point).height - PLATEAU) > 1e-6) {
          problems.push({ level: 'error', file: file(location.id), message: 'the lettering runs off the flat ground; shrink halfWidthDeg or widen flatRadiusDeg' })
          break
        }
      }
    }
  }

  // Flood the ocean across a latitude-longitude grid from open water.
  const columns = 540
  const rows = 270
  const cells = columns * rows
  const water = new Uint8Array(cells)
  const owner = new Int16Array(cells)
  let start = -1
  for (let row = 0; row < rows; row++) {
    const latitude = Math.PI / 2 - ((row + 0.5) / rows) * Math.PI
    for (let column = 0; column < columns; column++) {
      const longitude = ((column + 0.5) / columns) * Math.PI * 2
      const direction: Vec3 = [Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)]
      const sample = terrain.terrainAt(direction)
      const index = row * columns + column
      owner[index] = sample.nearest
      if (sample.field <= COAST && terrain.iceAt(direction) < 0.5) {
        water[index] = 1
        if (start < 0 && sample.nearest < 0) start = index
      }
    }
  }
  const reached = new Uint8Array(cells)
  const neighbors = (index: number) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const list = [row * columns + ((column + 1) % columns), row * columns + ((column - 1 + columns) % columns)]
    if (row > 0) list.push(index - columns)
    if (row < rows - 1) list.push(index + columns)
    return list
  }
  if (start >= 0) {
    const queue = [start]
    reached[start] = 1
    while (queue.length) {
      const index = queue.pop()!
      for (const next of neighbors(index)) {
        if (water[next] && !reached[next]) {
          reached[next] = 1
          queue.push(next)
        }
      }
    }
  }
  let ocean = 0
  let flooded = 0
  const coastal = new Set<number>()
  for (let index = 0; index < cells; index++) {
    if (water[index]) {
      ocean++
      if (reached[index]) flooded++
    } else if (owner[index]! >= 0 && neighbors(index).some((next) => reached[next])) {
      coastal.add(owner[index]!)
    }
  }
  if (ocean === 0 || flooded / ocean < 0.995) {
    problems.push({ level: 'error', file: 'world', message: `${(100 - (flooded / Math.max(ocean, 1)) * 100).toFixed(2)}% of the water is cut off from the open ocean` })
  }
  terrain.seeds.forEach((seed, index) => {
    if (!coastal.has(index)) problems.push({ level: 'error', file: file(seed.ownerId), message: `"${seed.id}" has no coast on the open ocean` })
  })
  return problems
}

export type { TerrainSample } from './terrain.ts'
