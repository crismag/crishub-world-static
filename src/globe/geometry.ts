import * as THREE from 'three'

export const GLOBE_RADIUS = 2.2

export function createIslandGeometry(radius: number, seed: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const steps = 9
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2
    const wobble = 0.8 + 0.16 * Math.sin(angle * 3 + seed) + 0.08 * Math.cos(angle * 2 + seed * 1.4)
    const x = Math.cos(angle) * radius * wobble
    const y = Math.sin(angle) * radius * wobble
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.022,
    bevelSegments: 2,
    curveSegments: 1,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingBox()
  const minY = geometry.boundingBox?.min.y ?? 0
  geometry.translate(0, -minY - 0.015, 0)
  geometry.computeVertexNormals()
  return geometry
}

export function setGlobeCursor(cursor: string) {
  const element = document.querySelector<HTMLCanvasElement>('[data-globe]')
  if (element) element.style.cursor = cursor
}
