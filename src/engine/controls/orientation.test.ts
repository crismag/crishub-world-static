import * as THREE from 'three'
import { expect, test } from 'vitest'
import type { Vec3 } from '../../runtime/configuration/registry-types.ts'
import { settings } from '../../runtime/world-registry/index.ts'
import { createOrientation } from './orientation.ts'

/** Built from the real settings/camera.json and settings/controls.json. */
const orientation = createOrientation({
  axialTiltDeg: settings.globe.axialTiltDeg,
  pitchDeg: settings.camera.initialOrientation.pitchDeg,
  yawDeg: settings.camera.initialOrientation.yawDeg,
  cameraDirection: settings.camera.direction as Vec3,
  focusDropDeg: settings.camera.focusDropDeg,
  dragSensitivity: settings.controls.dragSensitivity,
})
const { opening, focus, roll, facing, spinOnAxis } = orientation
const DRAG = settings.controls.dragSensitivity

/** The real camera setup: on its starting line, looking at the globe's center. */
function makeCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(settings.camera.fovDeg, 1, settings.camera.near, settings.camera.far)
  camera.position.copy(orientation.cameraDirection).multiplyScalar(settings.camera.defaultDistance)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  return camera
}

const NORTH: Vec3 = [0, 1, 0]
const SOUTH: Vec3 = [0, -1, 0]

function world(quaternion: THREE.Quaternion, point: Vec3): THREE.Vector3 {
  return new THREE.Vector3(...point).applyQuaternion(quaternion)
}

/** Drags in small steps, the way pointer events arrive. */
function drag(quaternion: THREE.Quaternion, camera: THREE.Camera, dx: number, dy: number, steps = 200) {
  for (let i = 0; i < steps; i++) roll(quaternion, camera, dx / steps, dy / steps)
}

test('dragging down by half a turn turns the globe upside down', () => {
  const camera = makeCamera()
  const globe = opening.clone()
  const before = world(globe, NORTH)
  drag(globe, camera, 0, Math.PI / DRAG)
  const after = world(globe, NORTH)
  expect(before.y).toBeGreaterThan(0.5)
  expect(after.y).toBeLessThan(-0.5)
})

test('a full vertical turn, or a full diagonal turn, comes back to the start', () => {
  const camera = makeCamera()
  for (const [dx, dy] of [
    [0, 1],
    [1, 1],
  ] as const) {
    const globe = opening.clone()
    const length = (Math.PI * 2) / DRAG / Math.hypot(dx, dy)
    drag(globe, camera, dx * length, dy * length, 400)
    expect(globe.angleTo(opening)).toBeLessThan(1e-6)
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
    if (dx !== 0) expect(Math.sign(moved.x)).toBe(Math.sign(dx))
    if (dy !== 0) expect(Math.sign(moved.y)).toBe(-Math.sign(dy))
  }
})

test('either pole can be brought to the center of the view', () => {
  for (const pole of [NORTH, SOUTH]) {
    expect(world(facing(opening, pole), pole).angleTo(focus)).toBeLessThan(1e-6)
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
    const globe = opening.clone()
    drag(globe, camera, (random() - 0.5) * 2000, (random() - 0.5) * 2000, 20)
    const theta = random() * Math.PI * 2
    const phi = Math.acos(random() * 2 - 1)
    const point: Vec3 = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)]
    const target = facing(globe, point)
    expect(world(target, point).angleTo(focus)).toBeLessThan(1e-6)
    expect(globe.angleTo(target)).toBeLessThanOrEqual(world(globe, point).angleTo(focus) + 1e-6)
  }
})

test('the idle spin turns the planet on its own axis and never rights it', () => {
  const camera = makeCamera()
  const globe = opening.clone()
  drag(globe, camera, 300, 500)
  const axis = world(globe, NORTH)
  const equator = world(globe, [1, 0, 0])
  for (let i = 0; i < 100; i++) spinOnAxis(globe, 0.01)
  expect(world(globe, NORTH).angleTo(axis)).toBeLessThan(1e-6)
  expect(Math.abs(world(globe, [1, 0, 0]).angleTo(equator) - 1)).toBeLessThan(1e-6)
})

test('long tumbles stay well formed: no drift, no NaN', () => {
  const camera = makeCamera()
  const globe = opening.clone()
  for (let i = 0; i < 20000; i++) roll(globe, camera, Math.sin(i) * 9, Math.cos(i * 1.3) * 9)
  const length = Math.hypot(globe.x, globe.y, globe.z, globe.w)
  expect(Number.isFinite(length) && Math.abs(length - 1) < 1e-9).toBe(true)
})
