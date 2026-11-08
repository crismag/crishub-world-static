import * as THREE from 'three'
import type { Vec3 } from '../data/math.ts'

/**
 * How the globe turns. Its orientation is one quaternion with no limits and no preferred
 * up, so it can roll through the poles, turn upside down, and face any point at the viewer.
 * Plain three.js math with no React, so it can be tested directly.
 */

const AXIS_X = new THREE.Vector3(1, 0, 0)
const AXIS_Y = new THREE.Vector3(0, 1, 0)
const AXIS_Z = new THREE.Vector3(0, 0, 1)

/** Earth's axial tilt, 23.44°. In the opening view the north pole leans to the right. */
const TILT = THREE.MathUtils.degToRad(23.44)
/** Opening tilt: the north pole leans a little toward the viewer. */
const OPENING_PITCH = 0.18

/** The opening orientation, which reset also returns to. */
export const OPENING = new THREE.Quaternion()
  .setFromAxisAngle(AXIS_Z, -TILT)
  .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_X, OPENING_PITCH))

/** The camera's starting direction from the globe's center. Zoom moves along this line. */
export const CAMERA_DIRECTION = new THREE.Vector3(0, 1.25, 6.3).normalize()

/** Where a chosen shore comes to rest: just below the camera's line of sight to the center. */
export const FOCUS = CAMERA_DIRECTION.clone().applyAxisAngle(AXIS_X, 0.12)

/** Radians of turn per pixel dragged. */
export const DRAG = 0.0052

const SCREEN_RIGHT = new THREE.Vector3()
const SCREEN_UP = new THREE.Vector3()
const AXIS = new THREE.Vector3()
const TURN = new THREE.Quaternion()
const POINT = new THREE.Vector3()
const SPIN = new THREE.Quaternion()

/**
 * Turns the globe like a ball under the hand: a drag of (dx, dy) pixels rotates it around the
 * camera's own up and right axes, in world space. Right drags turn the near side right,
 * down drags turn it down, and diagonal drags do both at once.
 */
export function roll(quaternion: THREE.Quaternion, camera: THREE.Camera, dx: number, dy: number): void {
  SCREEN_RIGHT.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
  SCREEN_UP.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
  AXIS.copy(SCREEN_UP).multiplyScalar(dx).addScaledVector(SCREEN_RIGHT, dy)
  const angle = AXIS.length() * DRAG
  if (angle < 1e-9) return
  TURN.setFromAxisAngle(AXIS.normalize(), angle)
  quaternion.premultiply(TURN).normalize()
}

/**
 * The orientation that brings a point on the globe to the front of the view, reached by the
 * shortest turn from where the globe is now. It keeps whatever roll the globe already has,
 * so there is no snapping back upright and never a needless full revolution.
 */
export function facing(current: THREE.Quaternion, position: Vec3): THREE.Quaternion {
  POINT.set(position[0], position[1], position[2]).normalize().applyQuaternion(current)
  return new THREE.Quaternion().setFromUnitVectors(POINT, FOCUS).multiply(current).normalize()
}

/** Turns the planet around its own north–south axis, wherever that axis points: Earth's daily turn. */
export function spinOnAxis(quaternion: THREE.Quaternion, angle: number): void {
  SPIN.setFromAxisAngle(AXIS_Y, angle)
  quaternion.multiply(SPIN).normalize()
}
