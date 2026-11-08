import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import type { Vec3 } from '../data/math.ts'
import { CAMERA_DIRECTION, DRAG, FOCUS, OPENING, facing, roll, spinOnAxis } from './orientation.ts'

/** The real camera setup: on its starting line, looking at the globe's center. */
function makeCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120)
  camera.position.copy(CAMERA_DIRECTION).multiplyScalar(16.9)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  return camera
}

const NORTH: Vec3 = [0, 1, 0]
const SOUTH: Vec3 = [0, -1, 0]

/** Where a point on the globe ends up in the world. */
function world(quaternion: THREE.Quaternion, point: Vec3): THREE.Vector3 {
  return new THREE.Vector3(...point).applyQuaternion(quaternion)
}

/** Drags in small steps, the way pointer events arrive. */
function drag(quaternion: THREE.Quaternion, camera: THREE.Camera, dx: number, dy: number, steps = 200) {
  for (let i = 0; i < steps; i++) roll(quaternion, camera, dx / steps, dy / steps)
}

test('dragging down by half a turn turns the globe upside down', () => {
  const camera = makeCamera()
  const globe = OPENING.clone()
  const before = world(globe, NORTH)
  drag(globe, camera, 0, Math.PI / DRAG)
  const after = world(globe, NORTH)
  // A half turn about the screen's right axis flips the pole's up-down component.
  assert.ok(before.y > 0.5 && after.y < -0.5, `north pole went from ${before.y.toFixed(2)} to ${after.y.toFixed(2)}`)
})

test('a full vertical turn, or a full diagonal turn, comes back to the start', () => {
  const camera = makeCamera()
  for (const [dx, dy] of [
    [0, 1],
    [1, 1],
  ] as const) {
    const globe = OPENING.clone()
    const length = (Math.PI * 2) / DRAG / Math.hypot(dx, dy)
    drag(globe, camera, dx * length, dy * length, 400)
    assert.ok(globe.angleTo(OPENING) < 1e-6, `drift of ${globe.angleTo(OPENING)}`)
  }
})

test('the near side follows the pointer in every direction', () => {
  const camera = makeCamera()
  const near: Vec3 = [0, 0, 1]
  for (const [dx, dy] of [
    [40, 0],
    [-40, 0],
    [0, 40],
    [0, -40],
    [30, 30],
  ] as const) {
    const globe = new THREE.Quaternion()
    const before = world(globe, near)
    roll(globe, camera, dx, dy)
    const moved = world(globe, near).sub(before)
    // Screen right is +x; screen down is mostly -y (the camera looks slightly down).
    if (dx !== 0) assert.equal(Math.sign(moved.x), Math.sign(dx), `x for ${dx},${dy}`)
    if (dy !== 0) assert.equal(Math.sign(moved.y), -Math.sign(dy), `y for ${dx},${dy}`)
  }
})

test('either pole can be brought to the center of the view', () => {
  for (const pole of [NORTH, SOUTH]) {
    const globe = facing(OPENING, pole)
    assert.ok(world(globe, pole).angleTo(FOCUS) < 1e-6)
  }
})

test('focusing after any rotation takes the shortest turn and lands exactly', () => {
  const camera = makeCamera()
  let seed = 7
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let trial = 0; trial < 50; trial++) {
    // Tumble the globe into an arbitrary orientation, upside down included.
    const globe = OPENING.clone()
    drag(globe, camera, (random() - 0.5) * 2000, (random() - 0.5) * 2000, 20)
    const theta = random() * Math.PI * 2
    const phi = Math.acos(random() * 2 - 1)
    const point: Vec3 = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)]
    const target = facing(globe, point)
    assert.ok(world(target, point).angleTo(FOCUS) < 1e-6, 'the point lands at the focus')
    // The turn is no bigger than the angle the point has to travel: no extra revolutions.
    const travel = world(globe, point).angleTo(FOCUS)
    assert.ok(globe.angleTo(target) <= travel + 1e-6, `turned ${globe.angleTo(target)} for ${travel}`)
  }
})

test('the idle spin turns the planet on its own axis and never rights it', () => {
  const camera = makeCamera()
  const globe = OPENING.clone()
  drag(globe, camera, 300, 500)
  const axis = world(globe, NORTH)
  const equator = world(globe, [1, 0, 0])
  for (let i = 0; i < 100; i++) spinOnAxis(globe, 0.01)
  // The poles stay exactly where the visitor left them.
  assert.ok(world(globe, NORTH).angleTo(axis) < 1e-6)
  // And a point on the equator turned by the full amount, one radian.
  assert.ok(Math.abs(world(globe, [1, 0, 0]).angleTo(equator) - 1) < 1e-6)
})

test('long tumbles stay well formed: no drift, no NaN', () => {
  const camera = makeCamera()
  const globe = OPENING.clone()
  for (let i = 0; i < 20000; i++) roll(globe, camera, Math.sin(i) * 9, Math.cos(i * 1.3) * 9)
  const length = Math.hypot(globe.x, globe.y, globe.z, globe.w)
  assert.ok(Number.isFinite(length) && Math.abs(length - 1) < 1e-9)
})
