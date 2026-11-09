import type { Vec3 } from '@/runtime/configuration/registry-types.ts'

/** Imperative handles for zoom, keyboard nudge, and “bring into view”. */
export const globeApi = {
  zoomBy: (_delta: number) => {},
  reset: () => {},
  nudge: (_dx: number, _dy: number) => {},
  focus: (_position: Vec3) => {},
}

export const pointerTravel = {
  distance: 0,
}
