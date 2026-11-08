import type { Vec3 } from './math.ts'

/**
 * The programming continent: one wide, flat landmass with the technologies painted
 * across its ground in large letters, readable from orbit.
 */

/** Painted on the ground in this order, left to right and top to bottom. */
export const technologies = [
  'PHP',
  'MYSQL',
  'PYTHON',
  'TCL',
  'PERL',
  'REACT',
  'NODE.JS',
  'TYPESCRIPT',
  'JAVASCRIPT',
  'AWS',
  'GCP',
  'FLASK',
  'DJANGO',
  'APACHE',
  'AUTOMATION',
  'LINUX',
] as const

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z)
  return [x / length, y / length, z / length]
}

export const programmingContinent = {
  /** Faces the viewer when the page opens, a little north of the equator. */
  center: normalize(0, 0.2, 1) as Vec3,
  /** Angular radius (radians) of the flat core that carries the lettering. */
  core: 0.3,
  /** Angular radius of the coastline. Hills and ridges fill the ring between core and coast. */
  coast: 0.44,
  /** Half the width of the lettering, as an angle. Its corners stay inside the core. */
  letters: 0.2,
  /** The project islands ring the continent at this angular distance from its center. */
  projectRing: 0.7,
  /** Every other shore keeps at least this far from the center, outside the ring of projects. */
  clearance: 1.18,
  /** Ground color under the letters, darker than ordinary grass so the text stands out. */
  ground: '#2f8a55',
} as const
