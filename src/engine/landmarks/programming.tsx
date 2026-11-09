import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { ContinentSceneryParams, LetteringParams } from '@/runtime/configuration/landmark-params.ts'
import type { Vec3 } from '@/runtime/configuration/registry-types.ts'
import { settings } from '@/runtime/world-registry/index.ts'
import { toonRamp } from '@/engine/effects/materials.ts'
import { Pine } from '@/engine/landmarks/classic.tsx'
import type { LandmarkProps } from '@/engine/landmarks/types.ts'
import { PLATEAU, mulberry32, terrain } from '@/engine/terrain/index.ts'

const GLOBE_RADIUS = settings.globe.radius
const DEG = Math.PI / 180

const CANVAS = 2048
const FONT_FAMILY = '"Fredoka Variable", "Fredoka", sans-serif'
const FONT_WEIGHT = 600
/** Set against the axial tilt, so the words read level when the continent faces you in the opening view. */
const LEVEL = settings.globe.axialTiltDeg * DEG

type Line = { words: string[]; width: number }

/** Wraps the words into centered rows at the largest size that fits the canvas. */
function layout(context: CanvasRenderingContext2D, technologies: readonly string[]): { size: number; lines: Line[] } {
  for (let size = 280; size > 60; size -= 8) {
    context.font = `${FONT_WEIGHT} ${size}px ${FONT_FAMILY}`
    const gap = size * 0.42
    const maxWidth = CANVAS * 0.86
    const lines: Line[] = []
    let current: Line = { words: [], width: 0 }
    for (const word of technologies) {
      const width = context.measureText(word).width
      const next = current.words.length ? current.width + gap + width : width
      if (next > maxWidth && current.words.length) {
        lines.push(current)
        current = { words: [word], width }
      } else {
        current = { words: [...current.words, word], width: next }
      }
    }
    if (current.words.length) lines.push(current)
    if (lines.length * size * 1.18 <= CANVAS * 0.8) return { size, lines }
  }
  return { size: 60, lines: [{ words: [...technologies], width: CANVAS }] }
}

/** Paints the technology names like big lettering on the ground: shadow, outline, then fill. */
function paintLetters(params: LetteringParams): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS
  canvas.height = CANVAS
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  if (!context) return texture

  const { size, lines } = layout(context, params.words)
  const gap = size * 0.42
  const lineHeight = size * 1.18
  context.font = `${FONT_WEIGHT} ${size}px ${FONT_FAMILY}`
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  let index = 0
  lines.forEach((line, row) => {
    const y = CANVAS / 2 + (row - (lines.length - 1) / 2) * lineHeight
    let x = (CANVAS - line.width) / 2
    for (const word of line.words) {
      const width = context.measureText(word).width
      context.fillStyle = 'rgba(14, 58, 34, 0.55)'
      context.fillText(word, x + size * 0.05, y + size * 0.06)
      context.strokeStyle = params.outline
      context.lineWidth = size * 0.12
      context.strokeText(word, x, y)
      context.fillStyle = params.fills[index % params.fills.length] ?? '#fff8e6'
      context.fillText(word, x, y)
      x += width + gap
      index++
    }
  })
  texture.needsUpdate = true
  return texture
}

/** A curved patch hugging the continent's flat top, mapped like a flat sheet of paper. */
function createPatch(centerPoint: Vec3, halfWidthDeg: number): THREE.BufferGeometry {
  /** Half the patch width, as the tangent of its angle from the center. */
  const HALF = Math.tan(halfWidthDeg * DEG)
  const center = new THREE.Vector3(...centerPoint).normalize()
  const east = new THREE.Vector3(center.z, 0, -center.x).normalize()
  const north = new THREE.Vector3().crossVectors(center, east).normalize()
  // Turn the sheet against the planet's tilt.
  const levelEast = east.clone().multiplyScalar(Math.cos(LEVEL)).addScaledVector(north, Math.sin(LEVEL))
  const levelNorth = north.clone().multiplyScalar(Math.cos(LEVEL)).addScaledVector(east, -Math.sin(LEVEL))

  const segments = 64
  const radius = GLOBE_RADIUS + PLATEAU + 0.006
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const point = new THREE.Vector3()
  for (let row = 0; row <= segments; row++) {
    const v = row / segments
    for (let column = 0; column <= segments; column++) {
      const u = column / segments
      point
        .copy(center)
        .addScaledVector(levelEast, (u * 2 - 1) * HALF)
        .addScaledVector(levelNorth, (v * 2 - 1) * HALF)
        .normalize()
        .multiplyScalar(radius)
      positions.push(point.x, point.y, point.z)
      uvs.push(u, v)
    }
  }
  for (let row = 0; row < segments; row++) {
    for (let column = 0; column < segments; column++) {
      const a = row * (segments + 1) + column
      const b = a + 1
      const c = a + segments + 1
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** The technologies, painted large across the programming continent. */
/** Large painted words lying flat on a location's ground, centered on the location. */
export function Lettering({ params, location }: LandmarkProps) {
  const lettering = params as LetteringParams
  const geometry = useMemo(() => createPatch(location.position, lettering.halfWidthDeg), [location.position, lettering.halfWidthDeg])
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    let cancelled = false
    let painted: THREE.CanvasTexture | null = null
    const paint = () => {
      if (cancelled) return
      painted = paintLetters(lettering)
      painted.anisotropy = anisotropy
      setTexture(painted)
    }
    // Wait for the heading font, so the canvas does not paint in a fallback face.
    document.fonts.load(`${FONT_WEIGHT} 100px ${FONT_FAMILY}`).then(paint, paint)
    return () => {
      cancelled = true
      painted?.dispose()
    }
  }, [anisotropy, lettering])

  useEffect(() => () => geometry.dispose(), [geometry])

  if (!texture) return null
  return (
    <mesh geometry={geometry} renderOrder={1} raycast={() => null}>
      <meshToonMaterial
        map={texture}
        gradientMap={toonRamp}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  )
}

type Prop = { id: string; kind: 'pine' | 'rock' | 'bush'; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: number }

const UP = new THREE.Vector3(0, 1, 0)

/** Forests, boulders, and bushes in the ring between the lettering and the coast. */
function scatterProps(center: Vec3, { count, seed, innerDeg, outerDeg }: ContinentSceneryParams): Prop[] {
  const inner = innerDeg * DEG
  const outer = outerDeg * DEG
  const middle = new THREE.Vector3(...center).normalize()
  const east = new THREE.Vector3(middle.z, 0, -middle.x).normalize()
  const north = new THREE.Vector3().crossVectors(middle, east).normalize()
  const random = mulberry32(seed)
  const props: Prop[] = []
  for (let attempt = 0; attempt < count * 3.5 && props.length < count; attempt++) {
    const angle = random() * Math.PI * 2
    const distance = inner + random() * (outer - inner)
    const along = Math.tan(distance)
    const direction = middle
      .clone()
      .addScaledVector(east, Math.cos(angle) * along)
      .addScaledVector(north, Math.sin(angle) * along)
      .normalize()
    const ground = terrain.surfaceAt([direction.x, direction.y, direction.z])
    // Only on dry, gentle ground: not in the sea and not up on a rocky crest.
    if (ground.height < 0.02 || ground.rock > 0.35) continue
    const roll = random()
    const kind: Prop['kind'] = roll < 0.7 ? 'pine' : roll < 0.85 ? 'rock' : 'bush'
    props.push({
      id: `prop-${attempt}`,
      kind,
      position: direction.clone().multiplyScalar(GLOBE_RADIUS + ground.height - 0.004),
      quaternion: new THREE.Quaternion()
        .setFromUnitVectors(UP, direction)
        .multiply(new THREE.Quaternion().setFromAxisAngle(UP, random() * Math.PI * 2)),
      scale: 0.9 + random() * 0.7,
    })
  }
  return props
}

/** Pine forest, boulders, and bushes scattered in a ring around a location's center. */
export function ContinentScenery({ params, location }: LandmarkProps) {
  const props = useMemo(() => scatterProps(location.position, params as ContinentSceneryParams), [location.position, params])
  return (
    <group>
      {props.map((prop) => (
        <group key={prop.id} position={prop.position} quaternion={prop.quaternion} scale={prop.scale}>
          {prop.kind === 'pine' && <Pine />}
          {prop.kind === 'rock' && (
            <mesh position={[0, 0.02, 0]} scale={[0.04, 0.03, 0.035]}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshToonMaterial color="#8f8678" gradientMap={toonRamp} />
            </mesh>
          )}
          {prop.kind === 'bush' && (
            <mesh position={[0, 0.025, 0]} scale={[0.04, 0.03, 0.04]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshToonMaterial color="#2f8f45" gradientMap={toonRamp} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}
