import type { Vec3 } from './math.ts'

/**
 * The Beacon of Possibilities stands on the planet's own north pole: local +Y in the
 * globe's frame, which the rig tilts and spins like Earth's axis.
 */
export const northPole = {
  title: 'North Pole — Beacon of Possibilities',
  /** Unit direction of the pole in the globe's own frame. */
  position: [0, 1, 0] as Vec3,
  /** No shore, islet, or project island may stand closer than this (radians) to the pole. */
  clearance: 0.3,
} as const
