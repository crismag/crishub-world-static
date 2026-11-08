import assert from 'node:assert/strict'
import test from 'node:test'
import {
  destinations,
  destinationFromHash,
  kindLabel,
  matchesFilter,
  scenery,
} from './destinations.ts'
import { angularDistance, minAngularSeparation } from './math.ts'

const expectedPlaces = [
  'Philippines',
  'Canada',
  'Singapore',
  'United States',
  'Malaysia',
  'Thailand',
  'Hong Kong',
  'Japan',
]

const expectedProjects = [
  'CrisLab',
  'MarketLab',
  'Adarna Writer',
  'Awkward Studio',
  'Oikonomia',
  'Ekklesia',
  'Dalisay UI',
]

const expectedRealms = [
  'Naruto Islands',
  'Dreams and Aspiration',
  'Semiconductor Land',
  'SSS Tier Lands',
  'Isla Sorna',
]

test('named shores match the globe brief and stay unique', () => {
  const ids = destinations.map((destination) => destination.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(
    destinations.filter((destination) => destination.kind === 'place').map((destination) => destination.name),
    expectedPlaces,
  )
  assert.deepEqual(
    destinations.filter((destination) => destination.kind === 'project').map((destination) => destination.name),
    expectedProjects,
  )
  assert.deepEqual(
    destinations.filter((destination) => destination.kind === 'realm').map((destination) => destination.name),
    expectedRealms,
  )
  assert.equal(destinations.filter((destination) => destination.kind === 'mystery').length, 4)
})

test('every shore is a unit vector with room around it', () => {
  for (const destination of destinations) {
    const [x, y, z] = destination.position
    assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-9)
    assert.equal(destination.notes.length, 3)
    assert.ok(destination.summary.length > 40)
  }
  // Shores stand well apart. A multi-site shore needs more room, since it spreads over four lobes.
  assert.ok(minAngularSeparation(destinations.map((destination) => destination.position)) > 0.45)
  const naruto = destinations.find((destination) => destination.id === 'naruto-islands')
  assert.ok(naruto?.sites)
  assert.deepEqual(
    naruto.sites.map((site) => site.landmark),
    ['leaf-village', 'rain-island', 'sound-island', 'sand-island'],
  )
  for (const other of destinations) {
    if (other === naruto) continue
    assert.ok(angularDistance(naruto.position, other.position) > 0.5, `${other.id} crowds Naruto Islands`)
  }
  // The four lobes sit close together around the shore's middle.
  for (const site of naruto.sites) {
    const distance = angularDistance(site.position, naruto.position)
    assert.ok(distance > 0.08 && distance < 0.15, `${site.id} is ${distance.toFixed(3)} from the middle`)
  }
})

test('empty islets stay clear of named shores', () => {
  assert.ok(scenery.length >= 4)
  for (const islet of scenery) {
    for (const destination of destinations) {
      assert.ok(angularDistance(islet.position, destination.position) >= 0.34)
    }
  }
})

test('hash lookup only accepts known shores', () => {
  assert.equal(destinationFromHash('#japan')?.name, 'Japan')
  assert.equal(destinationFromHash('#CrisLab')?.id, 'crislab')
  assert.equal(destinationFromHash('#not-a-shore'), undefined)
  assert.equal(destinationFromHash('#violet-gate')?.kind, 'mystery')
  assert.equal(matchesFilter('project', 'all'), true)
  assert.equal(matchesFilter('place', 'project'), false)
  assert.equal(kindLabel('mystery'), 'Uncharted')
  assert.equal(kindLabel('realm'), 'Realm')
  assert.equal(destinationFromHash('#isla-sorna')?.kind, 'realm')
})
