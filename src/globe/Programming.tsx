import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { programmingContinent, technologies } from '@/data/programming.ts'
import { mulberry32 } from '@/data/math.ts'
import { PLATEAU, surfaceAt } from '@/data/terrain.ts'
import { GLOBE_RADIUS } from '@/globe/geometry.ts'
import { Pine } from '@/globe/landmarks.tsx'
import { toonRamp } from '@/globe/Planet.tsx'

const CANVAS = 2048
const FONT_FAMILY = '"Fredoka Variable", "Fredoka", sans-serif'
const FONT_WEIGHT = 600
/** Half the patch width, as the tangent of its angle from the continent center. */
const HALF = Math.tan(programmingContinent.letters)
/** Matches the axial tilt in Scene.tsx, so the words read level when the continent faces you. */
const LEVEL = THREE.MathUtils.degToRad(23.44)
const FILLS = ['#fff8e6', '#ffe08a', '#fff8e6', '#c8f4ff'] as const

type Line = { words: string[]; width: number }

/** Wraps the words into centered rows at the largest size that fits the canvas. */
function layout(context: CanvasRenderingContext2D): { size: number; lines: Line[] } {
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
function paintLetters(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS
  canvas.height = CANVAS
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  if (!context) return texture

  const { size, lines } = layout(context)
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
      context.strokeStyle = '#1b5534'
      context.lineWidth = size * 0.12
      context.strokeText(word, x, y)
      context.fillStyle = FILLS[index % FILLS.length] ?? '#fff8e6'
      context.fillText(word, x, y)
      x += width + gap
      index++
    }
  })
  texture.needsUpdate = true
  return texture
}

/** A curved patch hugging the continent's flat top, mapped like a flat sheet of paper. */
function createPatch(): THREE.BufferGeometry {
  const center = new THREE.Vector3(...programmingContinent.center).normalize()
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
export function ProgrammingLetters() {
  const geometry = useMemo(() => createPatch(), [])
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    let cancelled = false
    let painted: THREE.CanvasTexture | null = null
    const paint = () => {
      if (cancelled) return
      painted = paintLetters()
      painted.anisotropy = anisotropy
      setTexture(painted)
    }
    // Wait for the heading font, so the canvas does not paint in a fallback face.
    document.fonts.load(`${FONT_WEIGHT} 100px ${FONT_FAMILY}`).then(paint, paint)
    return () => {
      cancelled = true
      painted?.dispose()
    }
  }, [anisotropy])

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
function scatterProps(): Prop[] {
  const { center, core, coast } = programmingContinent
  const middle = new THREE.Vector3(...center).normalize()
  const east = new THREE.Vector3(middle.z, 0, -middle.x).normalize()
  const north = new THREE.Vector3().crossVectors(middle, east).normalize()
  const random = mulberry32(404)
  const props: Prop[] = []
  for (let attempt = 0; attempt < 160 && props.length < 46; attempt++) {
    const angle = random() * Math.PI * 2
    const distance = core + 0.03 + random() * (coast - core - 0.07)
    const along = Math.tan(distance)
    const direction = middle
      .clone()
      .addScaledVector(east, Math.cos(angle) * along)
      .addScaledVector(north, Math.sin(angle) * along)
      .normalize()
    const ground = surfaceAt([direction.x, direction.y, direction.z])
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

/** The natural edge of the programming continent: pine forest and boulders around the letters. */
export function ProgrammingScenery() {
  const props = useMemo(() => scatterProps(), [])
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
