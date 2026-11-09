import type { Vec3 } from './registry-types.ts'

/**
 * The world's coordinate convention, shared by the compiler and the engine: unit vectors in
 * the globe's own frame, with longitude 0 facing +z, east toward +x, and north at +y.
 */

const DEG = Math.PI / 180

export function fromLatLon(latitude: number, longitude: number): Vec3 {
  const lat = latitude * DEG
  const lon = longitude * DEG
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]
}

export function unit([x, y, z]: Vec3): Vec3 {
  const length = Math.hypot(x, y, z) || 1
  return [x / length, y / length, z / length]
}

/** East and north on the sphere at a point. At the poles, east is taken as +x. */
export function tangentBasis(center: Vec3): { east: Vec3; north: Vec3 } {
  const [x, y, z] = center
  const length = Math.hypot(z, x)
  const east: Vec3 = length < 1e-9 ? [1, 0, 0] : [z / length, 0, -x / length]
  const north: Vec3 = [y * east[2] - z * east[1], z * east[0] - x * east[2], x * east[1] - y * east[0]]
  return { east, north }
}

/** The point reached by going `east` and `north` radians from a center, along the surface. */
export function offsetOnSphere(center: Vec3, east: number, north: number): Vec3 {
  const distance = Math.hypot(east, north)
  if (distance < 1e-12) return [center[0], center[1], center[2]]
  const { east: e, north: n } = tangentBasis(center)
  const reach = Math.tan(distance) / distance
  return unit([
    center[0] + reach * (east * e[0] + north * n[0]),
    center[1] + reach * (east * e[1] + north * n[1]),
    center[2] + reach * (east * e[2] + north * n[2]),
  ])
}
