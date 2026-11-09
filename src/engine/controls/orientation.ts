import * as THREE from 'three'
import type { Vec3 } from '../../runtime/configuration/registry-types.ts'

/**
 * How the globe turns. Its orientation is one quaternion with no limits and no preferred up,
 * so it can roll through the poles, turn upside down, and face any point at the viewer.
 * Plain three.js math with no React, built from settings, so it can be tested directly.
 */

const AXIS_X = new THREE.Vector3(1, 0, 0)
const AXIS_Y = new THREE.Vector3(0, 1, 0)
const AXIS_Z = new THREE.Vector3(0, 0, 1)
const DEG = Math.PI / 180

export type OrientationSettings = {
  /** Earth-like lean of the axis in the opening view. */
  axialTiltDeg: number
  /** Opening tilt of the north pole toward the viewer, and turn on the axis. */
  pitchDeg: number
  yawDeg: number
  /** The camera's direction from the globe's center. */
  cameraDirection: Vec3
  /** A chosen point comes to rest this many degrees below the camera's line of sight. */
  focusDropDeg: number
  /** Radians of turn per pixel dragged. */
  dragSensitivity: number
}

export type Orientation = ReturnType<typeof createOrientation>

export function createOrientation(config: OrientationSettings) {
  const cameraDirection = new THREE.Vector3(...config.cameraDirection).normalize()
  /** Where a chosen point comes to rest. */
  const focus = cameraDirection.clone().applyAxisAngle(AXIS_X, config.focusDropDeg * DEG)
  /** The opening orientation: lean by the axial tilt, tip toward the viewer, turn on the axis. */
  const opening = new THREE.Quaternion()
    .setFromAxisAngle(AXIS_Z, -config.axialTiltDeg * DEG)
    .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_X, config.pitchDeg * DEG))
    .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_Y, config.yawDeg * DEG))

  const screenRight = new THREE.Vector3()
  const screenUp = new THREE.Vector3()
  const axis = new THREE.Vector3()
  const turn = new THREE.Quaternion()
  const point = new THREE.Vector3()
  const spin = new THREE.Quaternion()

  /**
   * Turns the globe like a ball under the hand: a drag of (dx, dy) pixels rotates it around the
   * camera's own up and right axes, in world space. Right drags turn the near side right, down
   * drags turn it down, and diagonal drags do both at once.
   */
  function roll(quaternion: THREE.Quaternion, camera: THREE.Camera, dx: number, dy: number): void {
    screenRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
    screenUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
    axis.copy(screenUp).multiplyScalar(dx).addScaledVector(screenRight, dy)
    const angle = axis.length() * config.dragSensitivity
    if (angle < 1e-9) return
    turn.setFromAxisAngle(axis.normalize(), angle)
    quaternion.premultiply(turn).normalize()
  }

  /**
   * The orientation that brings a point on the globe to the front of the view, reached by the
   * shortest turn from where the globe is now. It keeps whatever roll the globe already has,
   * so there is no snapping back upright and never a needless full revolution.
   */
  function facing(current: THREE.Quaternion, position: Vec3): THREE.Quaternion {
    point.set(position[0], position[1], position[2]).normalize().applyQuaternion(current)
    return new THREE.Quaternion().setFromUnitVectors(point, focus).multiply(current).normalize()
  }

  /** Turns the planet around its own north–south axis, wherever that axis points: Earth's daily turn. */
  function spinOnAxis(quaternion: THREE.Quaternion, angle: number): void {
    spin.setFromAxisAngle(AXIS_Y, angle)
    quaternion.multiply(spin).normalize()
  }

  return { opening, focus, cameraDirection, dragSensitivity: config.dragSensitivity, roll, facing, spinOnAxis }
}
