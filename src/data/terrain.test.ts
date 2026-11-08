import assert from 'node:assert/strict'
import test from 'node:test'
import { destinations, scenery } from './destinations.ts'
import { angularDistance, fibonacciPoint, type Vec3 } from './math.ts'
import { countryOutlines } from './outlines.ts'
import { northPole } from './north-pole.ts'
import { southPole } from './south-pole.ts'
import { smile, toFace } from './smile.ts'
import { programmingContinent, technologies } from './programming.ts'
import { COAST, ICE_HEIGHT, LANDMARK_FLAT, PLATEAU, iceAt, landSeeds, surfaceAt, terrainAt } from './terrain.ts'

/** Points on a circle of the given angular radius around a center. */
function ring(center: Vec3, radius: number, count = 24): Vec3[] {
  const [x, y, z] = center
  const length = Math.hypot(z, x)
  // At a pole every direction is south (or north), so pick any horizontal one.
  const east = length < 1e-9 ? ([1, 0, 0] as const) : ([z / length, 0, -x / length] as const)
  const north = [y * east[2] - z * east[1], z * east[0] - x * east[2], x * east[1] - y * east[0]] as const
  return Array.from({ length: count }, (_, step) => {
    const angle = (step / count) * Math.PI * 2
    const point = [0, 1, 2].map(
      (i) =>
        center[i]! * Math.cos(radius) +
        Math.sin(radius) * (Math.cos(angle) * east[i]! + Math.sin(angle) * north[i]!),
    )
    const size = Math.hypot(point[0]!, point[1]!, point[2]!)
    return [point[0]! / size, point[1]! / size, point[2]! / size] as const
  })
}

test('every landmark stands on flat ground on its own island', () => {
  // A multi-site shore has one landmark per lobe; every other shore has one at its middle.
  const stands = destinations.flatMap((destination) =>
    destination.sites
      ? destination.sites.map((site) => ({ id: `${destination.id}:${site.id}`, position: site.position }))
      : [{ id: destination.id, position: destination.position }],
  )
  for (const stand of stands) {
    for (const point of [stand.position, ...ring(stand.position, LANDMARK_FLAT - 0.025)]) {
      const ground = surfaceAt(point)
      assert.ok(Math.abs(ground.height - PLATEAU) < 1e-6, `${stand.id} is not flat`)
      assert.equal(landSeeds[ground.nearest]?.id, stand.id, `${stand.id} stands on someone else's land`)
    }
  }
})

test('the lobes of Naruto Islands are joined into one landmass around a bay open to the sea', () => {
  const naruto = destinations.find((destination) => destination.id === 'naruto-islands')
  assert.ok(naruto?.sites)
  // Walk from each lobe to the next: dry land all the way across each bridge.
  for (let i = 1; i < naruto.sites.length; i++) {
    const from = naruto.sites[i - 1]!.position
    const to = naruto.sites[i]!.position
    for (let step = 0; step <= 20; step++) {
      const t = step / 20
      const point = [0, 1, 2].map((k) => from[k]! * (1 - t) + to[k]! * t)
      const size = Math.hypot(point[0]!, point[1]!, point[2]!)
      const direction = [point[0]! / size, point[1]! / size, point[2]! / size] as const
      assert.ok(terrainAt(direction).field > COAST, `gap between lobes ${i - 1} and ${i} at ${t}`)
    }
  }
  // The bay in the middle is water.
  assert.ok(terrainAt(naruto.position).field <= COAST, 'the bay is filled in')
})

test('every country has a drawn outline and every islet is dry land', () => {
  for (const destination of destinations.filter((item) => item.kind === 'place')) {
    assert.ok(countryOutlines[destination.id], `${destination.id} has no outline`)
  }
  for (const islet of scenery) {
    assert.ok(terrainAt(islet.position).field > COAST, `${islet.id} is under water`)
  }
})

test('the planet is mostly open ocean', () => {
  const samples = 8000
  let land = 0
  for (let i = 0; i < samples; i++) {
    if (terrainAt(fibonacciPoint(i, samples, 1)).field > COAST) land++
  }
  const share = land / samples
  assert.ok(share > 0.08 && share < 0.3, `land covers ${(share * 100).toFixed(1)}%`)
})

test('every island reaches the world ocean, and the ocean has no lakes', () => {
  // Flood the ocean across a latitude-longitude grid, starting from open water.
  const columns = 540
  const rows = 270
  const cells = columns * rows
  const water = new Uint8Array(cells)
  const owner = new Int16Array(cells)
  const directionOf = (column: number, row: number): Vec3 => {
    const latitude = Math.PI / 2 - ((row + 0.5) / rows) * Math.PI
    const longitude = ((column + 0.5) / columns) * Math.PI * 2
    return [Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)]
  }
  let start = -1
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const direction = directionOf(column, row)
      const sample = terrainAt(direction)
      const index = row * columns + column
      owner[index] = sample.nearest
      if (sample.field <= COAST && iceAt(direction) < 0.5) {
        water[index] = 1
        if (start < 0 && sample.nearest < 0) start = index
      }
    }
  }
  assert.ok(start >= 0, 'no open ocean found')
  const reached = new Uint8Array(cells)
  const queue = [start]
  reached[start] = 1
  const neighbors = (index: number) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const list = [row * columns + ((column + 1) % columns), row * columns + ((column - 1 + columns) % columns)]
    if (row > 0) list.push(index - columns)
    if (row < rows - 1) list.push(index + columns)
    return list
  }
  while (queue.length) {
    const index = queue.pop()!
    for (const next of neighbors(index)) {
      if (water[next] && !reached[next]) {
        reached[next] = 1
        queue.push(next)
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
      continue
    }
    if (owner[index]! >= 0 && neighbors(index).some((next) => reached[next])) coastal.add(owner[index]!)
  }
  assert.ok(flooded / ocean > 0.995, `${((1 - flooded / ocean) * 100).toFixed(2)}% of the water is cut off`)
  for (let i = 0; i < landSeeds.length; i++) {
    assert.ok(coastal.has(i), `${landSeeds[i]?.id} has no coast on the world ocean`)
  }
})

test('mountains rise somewhere, but never under a landmark', () => {
  // The landmark half of this is checked by the flat-ground test above.
  let rocky = 0
  let peaks = 0
  for (let i = 0; i < 4000; i++) {
    const ground = surfaceAt(fibonacciPoint(i, 4000, 1))
    if (ground.rock > 0.3) rocky++
    if (ground.rock > 0.75) peaks++
  }
  assert.ok(rocky > 15, `only ${rocky} rocky samples`)
  assert.ok(peaks > 3, `only ${peaks} snowy peaks`)
})

test('both poles are capped with ice above the sea', () => {
  for (const pole of [
    [0, 1, 0],
    [0, -1, 0],
  ] as const) {
    assert.equal(iceAt(pole), 1)
    assert.ok(surfaceAt(pole).height >= ICE_HEIGHT - 1e-6)
  }
})

test('no shore or islet sits on the ice', () => {
  for (const point of [...destinations, ...scenery]) {
    assert.equal(iceAt(point.position), 0, point.id)
  }
})

test('the programming continent is flat under its lettering and ringed by projects', () => {
  const { center, letters, clearance } = programmingContinent
  // The lettering's square reaches atan(tan(letters) * √2) from the center at its corners.
  const corner = Math.atan(Math.tan(letters) * Math.SQRT2)
  for (const radius of [0, corner * 0.5, corner]) {
    for (const point of radius === 0 ? [center] : ring(center, radius, 32)) {
      assert.ok(Math.abs(surfaceAt(point).height - PLATEAU) < 1e-6, `slope under the letters at ${radius}`)
    }
  }
  for (const destination of destinations) {
    const distance = angularDistance(destination.position, center)
    if (destination.kind === 'project') {
      // Projects ring the continent: close, but across open water from it.
      assert.ok(Math.abs(distance - programmingContinent.projectRing) < 1e-6, `${destination.id} is off the ring`)
    } else {
      assert.ok(distance >= clearance, `${destination.id} crowds the programming continent`)
    }
  }
  assert.equal(new Set(technologies).size, technologies.length)
})

test('the north pole is kept clear for the Beacon, on ice', () => {
  assert.deepEqual(northPole.position, [0, 1, 0])
  assert.equal(iceAt(northPole.position), 1)
  assert.equal(terrainAt(northPole.position).nearest, -1, 'a shore claims the pole')
  for (const point of [...destinations, ...scenery]) {
    assert.ok(angularDistance(point.position, northPole.position) > northPole.clearance, `${point.id} crowds the Beacon`)
  }
  assert.ok(angularDistance(programmingContinent.center, northPole.position) > programmingContinent.projectRing + northPole.clearance)
})

test('the south pole is kept clear for the Vault, on ice, opposite the Beacon', () => {
  assert.deepEqual(southPole.position, [0, -1, 0])
  assert.equal(angularDistance(southPole.position, northPole.position), Math.PI)
  assert.equal(iceAt(southPole.position), 1)
  assert.ok(surfaceAt(southPole.position).height >= ICE_HEIGHT - 1e-6)
  assert.equal(terrainAt(southPole.position).nearest, -1, 'a shore claims the pole')
  for (const point of [...destinations, ...scenery]) {
    assert.ok(angularDistance(point.position, southPole.position) > southPole.clearance, `${point.id} crowds the Vault`)
  }
  // The vault region reaches about 0.8 local units × 1.25 scale ≈ 1 world unit from the pole: all on ice.
  for (const point of ring(southPole.position, 1 / 4)) assert.equal(iceAt(point), 1)
})

test('one side of the planet smiles, using only islands', () => {
  const byRole = (role: string) => smile.features.filter((feature) => feature.role === role)
  const eyes = byRole('eye')
  const mouth = byRole('mouth')
  const [nose] = byRole('nose')
  assert.ok(nose)
  // Read positions back off the globe, not from the layout, so the wrapping is tested too.
  const face = (position: Vec3) => toFace(position)
  const leftEye = eyes.filter((eye) => face(eye.position)[0] < 0)
  const rightEye = eyes.filter((eye) => face(eye.position)[0] > 0)
  assert.ok(leftEye.length > 0 && rightEye.length > 0, 'two eyes')
  const lowestEye = Math.min(...eyes.map((eye) => face(eye.position)[1]))
  const noseY = face(nose.position)[1]
  const mouthYs = mouth.map((island) => face(island.position)[1])
  assert.ok(lowestEye > noseY && noseY > Math.max(...mouthYs.slice(2, -2)), 'eyes above nose above the middle of the smile')
  // The smile curves up at both ends.
  const middle = Math.min(...mouthYs)
  assert.ok((mouthYs[0] ?? 0) - middle > 0.1 && (mouthYs.at(-1) ?? 0) - middle > 0.1, 'both corners turn up')
  // Every feature is real land, and nothing named stands on the face.
  for (const feature of smile.features) {
    assert.ok(terrainAt(feature.position).field > COAST, `${feature.id} is under water`)
  }
  for (const point of [...destinations, ...scenery]) {
    assert.ok(angularDistance(point.position, smile.center) > 0.6, `${point.id} stands on the face`)
  }
  assert.equal(smile.message, null, 'the Easter-egg message is off by default')
})
