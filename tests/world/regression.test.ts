import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import type { Vec3 } from '../../src/runtime/configuration/registry-types.ts'
import { createTranslator } from '../../src/runtime/localization/translate.ts'
import { world } from '../../src/runtime/world-registry/index.ts'
import { checkTerrain } from '../../src/engine/terrain/checks.ts'
import { COAST, createTerrain } from '../../src/engine/terrain/terrain.ts'

/**
 * The migrated world against tests/fixtures/baseline.json, captured from the hardcoded app
 * (commit ed104d2) before migration. Nothing a visitor sees may have moved or changed shape.
 */
type Baseline = {
  destinations: { id: string; name: string; kind: string; order: number; position: Vec3; sites?: { id: string; landmark: string; position: Vec3 }[] }[]
  islets: { id: string; position: Vec3 }[]
  smile: { id: string; position: Vec3 }[]
  programming: { center: Vec3; technologies: string[] }
  seeds: { id: string }[]
  samples: { point: Vec3; field: number; height: number; rock: number; owner: string | null }[]
}
const baseline = JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/baseline.json'), 'utf8')) as Baseline
const terrain = createTerrain(world)
const t = createTranslator('en')

/** Distance between two (nearly) unit vectors, stable for tiny angles. */
const gap = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const categoryOf: Record<string, string> = { place: 'country', project: 'virtual', realm: 'realm', mystery: 'mystery' }

describe('every shore is still there, unmoved', () => {
  test('same IDs, names, categories, and order', () => {
    const shores = world.locations.filter((location) => location.interaction.selectable)
    expect(shores.map((location) => location.id)).toEqual(baseline.destinations.map((item) => item.id))
    for (const item of baseline.destinations) {
      const location = world.locations.find((candidate) => candidate.id === item.id)!
      expect(t(location.display.nameKey)).toBe(item.name)
      expect(location.category).toBe(categoryOf[item.kind])
    }
  })

  test('same positions, to within a millionth of a radian', () => {
    for (const item of baseline.destinations) {
      const location = world.locations.find((candidate) => candidate.id === item.id)!
      expect(gap(location.position, item.position)).toBeLessThan(1e-6)
      for (const site of item.sites ?? []) {
        const lobe = location.terrain.type === 'lobes' ? location.terrain.lobes.find((candidate) => candidate.id === site.id) : undefined
        expect(lobe, site.id).toBeDefined()
        expect(gap(lobe!.position, site.position)).toBeLessThan(1e-6)
      }
    }
  })

  test('islets and the smiling hemisphere are in place', () => {
    const islands = world.formations.flatMap((formation) => formation.islands)
    for (const item of [...baseline.islets, ...baseline.smile]) {
      const island = islands.find((candidate) => candidate.id === item.id)
      expect(island, item.id).toBeDefined()
      expect(gap(island!.position, item.position)).toBeLessThan(1e-6)
    }
  })

  test('the programming continent keeps its place and its words', () => {
    const programming = world.locations.find((location) => location.id === 'programming')!
    expect(gap(programming.position, baseline.programming.center)).toBeLessThan(1e-6)
    expect(programming.landmarks.find((landmark) => landmark.preset === 'lettering')!.params.words).toEqual(baseline.programming.technologies)
  })
})

describe('the terrain is the same land', () => {
  test('same land shapes', () => {
    expect(terrain.seeds.map((seed) => seed.id).sort()).toEqual(baseline.seeds.map((seed) => seed.id).sort())
  })

  test('3,000 samples across the globe: same field, height, rock, and owner', () => {
    let owners = 0
    for (const sample of baseline.samples) {
      const ground = terrain.surfaceAt(sample.point)
      expect(Math.abs(ground.field - sample.field)).toBeLessThan(1e-3)
      expect(Math.abs(ground.height - sample.height)).toBeLessThan(1e-4)
      expect(Math.abs(ground.rock - sample.rock)).toBeLessThan(1e-3)
      if ((terrain.seeds[ground.nearest]?.id ?? null) !== sample.owner) owners++
    }
    expect(owners).toBe(0)
  })

  test('geography checks pass: flat landmarks, open ocean, nothing on the ice', () => {
    expect(checkTerrain(world)).toEqual([])
  })

  test('the planet stays mostly open ocean', () => {
    let land = 0
    for (const sample of baseline.samples) if (sample.field > COAST) land++
    const share = land / baseline.samples.length
    expect(share).toBeGreaterThan(0.08)
    expect(share).toBeLessThan(0.3)
  })
})

describe('special places', () => {
  test('both poles keep their landmarks, on ice, clear of every shore', () => {
    const north = world.locations.find((location) => location.id === 'north-pole')!
    const south = world.locations.find((location) => location.id === 'south-pole')!
    expect(north.landmarks.map((landmark) => landmark.preset)).toEqual(['beacon'])
    expect(south.landmarks.map((landmark) => landmark.preset)).toEqual(['vault'])
    expect(gap(north.position, [0, 1, 0])).toBeLessThan(1e-9)
    expect(gap(south.position, [0, -1, 0])).toBeLessThan(1e-9)
    expect(terrain.iceAt(north.position)).toBe(1)
    expect(terrain.iceAt(south.position)).toBe(1)
    expect(t(north.display.nameKey)).toBe('North Pole — Beacon of Possibilities')
    expect(t(south.display.nameKey)).toBe('South Pole — The Vault of Mysteries')
  })

  test('the smile still reads as a face: eyes above nose above the middle of the smile, corners up', () => {
    const face = world.formations.find((formation) => formation.id === 'smiling-hemisphere')!
    const { east, north } = face.frame!
    const center = face.center!
    /** Back onto the face's own flat map. */
    const toFace = (point: Vec3): [number, number] => {
      const along = point[0] * center[0] + point[1] * center[1] + point[2] * center[2]
      const q = [point[0] / along - center[0], point[1] / along - center[1], point[2] / along - center[2]]
      return [q[0]! * east[0] + q[1]! * east[1] + q[2]! * east[2], q[0]! * north[0] + q[1]! * north[1] + q[2]! * north[2]]
    }
    const eyes = face.islands.filter((island) => island.role === 'eye')
    const nose = face.islands.find((island) => island.role === 'nose')!
    const mouth = face.islands.filter((island) => island.role === 'mouth').map((island) => toFace(island.position)[1])
    expect(eyes.some((eye) => toFace(eye.position)[0] < 0) && eyes.some((eye) => toFace(eye.position)[0] > 0)).toBe(true)
    expect(Math.min(...eyes.map((eye) => toFace(eye.position)[1]))).toBeGreaterThan(toFace(nose.position)[1])
    expect(toFace(nose.position)[1]).toBeGreaterThan(Math.max(...mouth.slice(2, -2)))
    expect(mouth[0]! - Math.min(...mouth)).toBeGreaterThan(0.1)
    expect(mouth.at(-1)! - Math.min(...mouth)).toBeGreaterThan(0.1)
  })

  test('Naruto Islands keeps four connected lobes around an open bay', () => {
    const naruto = world.locations.find((location) => location.id === 'naruto-islands')!
    expect(naruto.terrain.type).toBe('lobes')
    expect(naruto.landmarks.map((landmark) => landmark.preset)).toEqual(['leaf-village', 'rain-town', 'sound-stage', 'sand-town'])
    expect(terrain.terrainAt(naruto.position).field).toBeLessThanOrEqual(COAST)
  })
})

describe('the generated registry', () => {
  test('contains every expected destination and nothing that needs a server', () => {
    const generated = JSON.parse(readFileSync(join(import.meta.dirname, '../../src/generated/world.json'), 'utf8')) as typeof world
    expect(generated.locations.map((location) => location.id)).toEqual(world.locations.map((location) => location.id))
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8')) as { dependencies: Record<string, string> }
    for (const name of Object.keys(pkg.dependencies)) expect(name).not.toMatch(/^(express|fastify|koa|pg|mysql|mongodb|prisma|firebase)/)
  })
})
