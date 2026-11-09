import { world } from '../../runtime/world-registry/index.ts'
import { createTerrain } from './terrain.ts'

/** The terrain of the loaded world, shared by every part of the scene. */
export const terrain = createTerrain(world)
export { COAST, ICE_HEIGHT, PLATEAU, elevation, meadowAt } from './terrain.ts'
export { fbm, mulberry32, smoothstep } from './noise.ts'
