/** Deterministic noise for terrain: the same planet on every load and every device. */

function lattice(x: number, y: number, z: number): number {
  let h = Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  return ((h ^ (h >>> 15)) >>> 0) / 4294967295
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Smooth value noise in [-1, 1]. */
function valueNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const w = smooth(z - zi)
  const x00 = lerp(lattice(xi, yi, zi), lattice(xi + 1, yi, zi), u)
  const x10 = lerp(lattice(xi, yi + 1, zi), lattice(xi + 1, yi + 1, zi), u)
  const x01 = lerp(lattice(xi, yi, zi + 1), lattice(xi + 1, yi, zi + 1), u)
  const x11 = lerp(lattice(xi, yi + 1, zi + 1), lattice(xi + 1, yi + 1, zi + 1), u)
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1
}

/** Three octaves of value noise, roughly in [-1, 1]. */
export function fbm(x: number, y: number, z: number): number {
  return (
    0.6 * valueNoise(x, y, z) +
    0.28 * valueNoise(x * 2.1 + 17.3, y * 2.1 - 4.1, z * 2.1 + 9.7) +
    0.12 * valueNoise(x * 4.3 - 8.2, y * 4.3 + 21.5, z * 4.3 - 3.3)
  )
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** A small seeded random number generator, for scattering props the same way every time. */
export function mulberry32(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
