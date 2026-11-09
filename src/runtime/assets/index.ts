import { world } from '../world-registry/index.ts'

/** The served path of a registered asset, by its stable ID. */
export function assetPath(id: string): string | null {
  return world.assets[id]?.path ?? null
}
