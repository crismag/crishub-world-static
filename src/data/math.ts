export type Vec3 = readonly [number, number, number]

/** Even scatter on a sphere. `poleScale` below 1 keeps shores off the poles. */
export function fibonacciPoint(index: number, count: number, poleScale = 0.84): [number, number, number] {
  const k = index + 0.5
  const y = (1 - (2 * k) / count) * poleScale
  const ring = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = k * Math.PI * (3 - Math.sqrt(5))
  const x = Math.cos(theta) * ring
  const z = Math.sin(theta) * ring
  const length = Math.hypot(x, y, z) || 1
  return [x / length, y / length, z / length]
}

export function angularDistance(a: Vec3, b: Vec3): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const length = Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2])
  if (length === 0) return 0
  return Math.acos(Math.min(1, Math.max(-1, dot / length)))
}

export function minAngularSeparation(points: readonly Vec3[]): number {
  let min = Infinity
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const point = points[i]
      const other = points[j]
      if (!point || !other) continue
      min = Math.min(min, angularDistance(point, other))
    }
  }
  return min
}

export function pickScattered(
  occupied: readonly Vec3[],
  count: number,
  separation: number,
): [number, number, number][] {
  const picked: [number, number, number][] = []
  for (let i = 0; i < 96 && picked.length < count; i++) {
    const point = fibonacciPoint(i, 96, 0.92)
    const blocked = [...occupied, ...picked].some((other) => angularDistance(point, other) < separation)
    if (!blocked) picked.push(point)
  }
  return picked
}

export function mulberry32(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
