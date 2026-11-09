import type { Vec3 } from '@/runtime/configuration/registry-types.ts'

/** Imperative handles for zoom, keyboard nudge, and “bring into view”. */
export const globeApi = {
  zoomBy: (_delta: number) => {},
  reset: () => {},
  nudge: (_dx: number, _dy: number) => {},
  focus: (_position: Vec3) => {},
  /** Turn a point to the front and swoop the camera down toward it: the way into a location's world. */
  dive: (_position: Vec3) => {},
}

export const pointerTravel = {
  distance: 0,
}
