import type { Vec3 } from './math.ts'

/**
 * The Vault of Mysteries lies under the planet's own south pole: local -Y in the globe's
 * frame, the opposite end of the axis from the Beacon of Possibilities.
 */
export const southPole = {
  title: 'South Pole — The Vault of Mysteries',
  description: 'Deep beneath the frozen edge of Crishub World, an ancient mystery waits to be uncovered.',
  /** Unit direction of the pole in the globe's own frame. */
  position: [0, -1, 0] as Vec3,
  /** No shore, islet, or project island may stand closer than this (radians) to the pole. */
  clearance: 0.3,
} as const
