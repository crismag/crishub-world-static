import type { Vec3 } from '@/runtime/configuration/registry-types.ts'
import { settings } from '@/runtime/world-registry/index.ts'
import { createOrientation } from './orientation.ts'

/** The globe's rotation, built from settings/camera.json, settings/controls.json, and the axial tilt. */
export const orientation = createOrientation({
  axialTiltDeg: settings.globe.axialTiltDeg,
  pitchDeg: settings.camera.initialOrientation.pitchDeg,
  yawDeg: settings.camera.initialOrientation.yawDeg,
  cameraDirection: settings.camera.direction as Vec3,
  focusDropDeg: settings.camera.focusDropDeg,
  dragSensitivity: settings.controls.dragSensitivity,
})
