import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getDestination } from '@/data/destinations.ts'
import { fibonacciPoint, mulberry32, type Vec3 } from '@/data/math.ts'
import {
  COAST,
  fbm,
  landSeeds,
  meadowAt,
  shallowsAt,
  smoothstep,
  surfaceAt,
  terrainAt,
} from '@/data/terrain.ts'
import { GLOBE_RADIUS } from '@/globe/geometry.ts'
import { atmosphereFragment, atmosphereVertex, oceanFragment, oceanVertex } from '@/globe/shaders.ts'

/** Three hard light bands, so land and clouds read as painted toys rather than plastic. */
function createToonRamp(): THREE.DataTexture {
  const ramp = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat)
  ramp.minFilter = THREE.NearestFilter
  ramp.magFilter = THREE.NearestFilter
  ramp.generateMipmaps = false
  ramp.needsUpdate = true
  return ramp
}

export const toonRamp = createToonRamp()

const SHORE_GREEN = new THREE.Color('#2f9e3c')
const GRASS = new THREE.Color('#4cbf3c')
const MEADOW = new THREE.Color('#9edb4c')
const ICE = new THREE.Color('#f4fbff')
const ROCK = new THREE.Color('#8d7f6c')
const SNOW = new THREE.Color('#f2f6fa')
const ICE_EDGE = new THREE.Color('#cde9f7')

function createOceanGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 192, 96)
  const position = geometry.attributes.position
  if (!position) return geometry
  const tint = new Float32Array(position.count)
  for (let i = 0; i < position.count; i++) {
    const direction: Vec3 = [
      position.getX(i) / GLOBE_RADIUS,
      position.getY(i) / GLOBE_RADIUS,
      position.getZ(i) / GLOBE_RADIUS,
    ]
    tint[i] = shallowsAt(direction, terrainAt(direction).field)
  }
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tint, 1))
  return geometry
}

function createLandGeometry(): THREE.BufferGeometry {
  // Fine enough for country outlines, ridge lines, and the small islands of the smile.
  const sphere = new THREE.SphereGeometry(1, 640, 320)
  sphere.deleteAttribute('uv')
  sphere.deleteAttribute('normal')
  const geometry = mergeVertices(sphere)
  sphere.dispose()
  const position = geometry.attributes.position
  if (!position) return geometry
  const colors = new Float32Array(position.count * 3)
  const color = new THREE.Color()
  const patches = landSeeds.map((seed) => (seed.patch ? new THREE.Color(seed.patch) : null))
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const direction: Vec3 = [x, y, z]
    const sample = surfaceAt(direction)
    const radius = GLOBE_RADIUS + sample.height
    position.setXYZ(i, x * radius, y * radius, z * radius)

    color.copy(SHORE_GREEN).lerp(GRASS, smoothstep(COAST + 0.04, COAST + 0.14, sample.field))
    color.lerp(MEADOW, meadowAt(direction) * smoothstep(0.3, 0.4, sample.field) * 0.9)
    const patch = patches[sample.nearest]
    if (patch) {
      // Named land takes its own ground color inland, with a green rim at the coast.
      const ragged = sample.weight + 0.25 * fbm(x * 6, y * 6, z * 6)
      color.lerp(patch, smoothstep(COAST + 0.3, COAST + 0.6, ragged) * 0.88)
    }
    if (sample.rock > 0) {
      // Bare rock on the ridges, snow on the highest crests.
      color.lerp(ROCK, smoothstep(0.2, 0.45, sample.rock))
      color.lerp(SNOW, smoothstep(0.72, 0.85, sample.rock))
    }
    const ice = sample.ice
    if (ice > 0) {
      // A pale blue rim where the ice meets the sea, then bright snow across the cap.
      color.lerp(ICE_EDGE, smoothstep(0.35, 0.5, ice))
      color.lerp(ICE, smoothstep(0.75, 0.9, ice))
    }
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function Ocean() {
  const material = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => createOceanGeometry(), [])
  useFrame(({ clock }) => {
    if (material.current?.uniforms.uTime) material.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={material}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={oceanVertex}
        fragmentShader={oceanFragment}
      />
    </mesh>
  )
}

/** Raised, rounded continents. Land under the sea surface is simply hidden by the ocean. */
export function Land() {
  const geometry = useMemo(() => createLandGeometry(), [])
  return (
    <mesh geometry={geometry}>
      <meshToonMaterial vertexColors gradientMap={toonRamp} />
    </mesh>
  )
}

export function Atmosphere() {
  return (
    <mesh scale={1.085} renderOrder={2}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <shaderMaterial
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

type Puff = { position: [number, number, number]; scale: [number, number, number] }

function round(position: [number, number, number], radius: number): Puff {
  return { position, scale: [radius, radius * 0.86, radius] }
}

/** Low, chunky cumulus built from overlapping balls. */
const PUFFY: readonly Puff[] = [
  round([0, 0, 0], 0.15),
  round([0.14, -0.025, 0.01], 0.11),
  round([-0.14, -0.02, -0.01], 0.115),
  round([0.05, 0.06, 0.04], 0.115),
  round([-0.06, 0.05, -0.04], 0.1),
  round([0.24, -0.05, 0], 0.07),
  round([-0.235, -0.045, 0.02], 0.075),
]

/** High, thin streaks stretched along the wind. */
const WISPY: readonly Puff[] = [
  { position: [0, 0, 0], scale: [0.3, 0.04, 0.085] },
  { position: [0.17, 0.022, 0.06], scale: [0.22, 0.034, 0.07] },
  { position: [-0.19, -0.014, -0.045], scale: [0.24, 0.032, 0.066] },
  { position: [0.04, -0.018, -0.085], scale: [0.17, 0.028, 0.055] },
]

type CloudKind = 'puffy' | 'wispy'

const CLOUD_KINDS: Record<
  CloudKind,
  { puffs: readonly Puff[]; color: string; opacity: number; altitude: number; speed: number }
> = {
  puffy: { puffs: PUFFY, color: '#e9f4fb', opacity: 1, altitude: 0.5, speed: 1 },
  wispy: { puffs: WISPY, color: '#ffffff', opacity: 0.72, altitude: 0.76, speed: 1.45 },
}

type CloudSpec = {
  id: string
  kind: CloudKind
  /** Unit direction at time zero, in the planet's frame. */
  start: THREE.Vector3
  /** The cloud circles the planet around this axis. */
  axis: THREE.Vector3
  /** Radians per second. Negative clouds ride against the prevailing wind. */
  speed: number
  altitude: number
  scale: number
  phase: number
}

const CLOUD_GEOMETRY = new THREE.SphereGeometry(1, 20, 14)
const PUFFY_COUNT = 7
const WISPY_COUNT = 5

function createClouds(): CloudSpec[] {
  const random = mulberry32(29)
  const total = PUFFY_COUNT + WISPY_COUNT
  return Array.from({ length: total }, (_, index) => {
    const kind: CloudKind = index < PUFFY_COUNT ? 'puffy' : 'wispy'
    const settings = CLOUD_KINDS[kind]
    // Step through the lattice by a stride coprime with the total, so the two kinds interleave.
    const point = fibonacciPoint((index * 5) % total, total, 0.8)
    const tilt = (random() - 0.5) * 0.9
    const heading = random() * Math.PI * 2
    const axis = new THREE.Vector3(
      Math.sin(tilt) * Math.cos(heading),
      Math.cos(tilt),
      Math.sin(tilt) * Math.sin(heading),
    ).normalize()
    const direction = random() < 0.8 ? 1 : -1
    return {
      id: `cloud-${index}`,
      kind,
      start: new THREE.Vector3(point[0], point[1], point[2]).normalize(),
      axis,
      speed: (0.025 + random() * 0.035) * settings.speed * direction,
      altitude: settings.altitude + (random() - 0.5) * 0.08,
      scale: 0.85 + random() * 0.4,
      phase: random() * Math.PI * 2,
    }
  })
}

const DIRECTION = new THREE.Vector3()
const HEADING = new THREE.Vector3()
const SIDE = new THREE.Vector3()
const BASIS = new THREE.Matrix4()

function Cloud({ spec, reduced, focus }: { spec: CloudSpec; reduced: boolean; focus: Vec3 | null }) {
  const group = useRef<THREE.Group>(null)
  const travelled = useRef(0)
  const settings = CLOUD_KINDS[spec.kind]
  const material = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: settings.color,
        gradientMap: toonRamp,
        transparent: true,
        opacity: settings.opacity,
      }),
    [settings],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }, delta) => {
    const cloud = group.current
    if (!cloud) return
    const step = Math.min(delta, 0.05)
    if (!reduced) travelled.current += step * spec.speed

    DIRECTION.copy(spec.start).applyAxisAngle(spec.axis, travelled.current)
    HEADING.crossVectors(spec.axis, DIRECTION)
    if (HEADING.lengthSq() > 1e-6) {
      HEADING.normalize().multiplyScalar(Math.sign(spec.speed) || 1)
      SIDE.crossVectors(HEADING, DIRECTION)
      BASIS.makeBasis(HEADING, DIRECTION, SIDE)
      cloud.quaternion.setFromRotationMatrix(BASIS)
    }
    const bob = reduced ? 0 : Math.sin(clock.elapsedTime * 0.6 + spec.phase) * 0.03
    cloud.position.copy(DIRECTION).multiplyScalar(GLOBE_RADIUS + spec.altitude + bob)

    // Step aside for the shore being read, so a passing cloud never hides it.
    const overhead = focus
      ? smoothstep(0.9, 0.97, DIRECTION.x * focus[0] + DIRECTION.y * focus[1] + DIRECTION.z * focus[2])
      : 0
    const target = settings.opacity * (1 - 0.88 * overhead)
    // All puffs of one cloud share a material, so fading the first fades the whole cloud.
    const puff = cloud.children[0]
    if (puff instanceof THREE.Mesh && puff.material instanceof THREE.MeshToonMaterial) {
      puff.material.opacity = THREE.MathUtils.damp(puff.material.opacity, target, 6, step)
      cloud.visible = puff.material.opacity > 0.02
    }
  })

  return (
    <group ref={group} scale={spec.scale}>
      {settings.puffs.map((puff) => (
        <mesh
          key={puff.position.join(',')}
          geometry={CLOUD_GEOMETRY}
          material={material}
          position={puff.position}
          scale={puff.scale}
          raycast={() => null}
        />
      ))}
    </group>
  )
}

/** Low puffy cumulus and high wispy streaks, each drifting around the planet on its own path. */
export function Clouds({ reduced, selectedId }: { reduced: boolean; selectedId: string | null }) {
  const clouds = useMemo(() => createClouds(), [])
  const focus = selectedId ? (getDestination(selectedId)?.position ?? null) : null
  return (
    <group>
      {clouds.map((spec) => (
        <Cloud key={spec.id} spec={spec} reduced={reduced} focus={focus} />
      ))}
    </group>
  )
}
