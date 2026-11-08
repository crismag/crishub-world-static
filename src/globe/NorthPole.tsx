import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '@/data/math.ts'
import { northPole } from '@/data/north-pole.ts'
import { ICE_HEIGHT } from '@/data/terrain.ts'
import { GLOBE_RADIUS } from '@/globe/geometry.ts'
import { Pine } from '@/globe/landmarks.tsx'
import { PoleHotspot } from '@/globe/PoleHotspot.tsx'

/**
 * The Beacon of Possibilities: a crystal-crowned lighthouse on the north pole, with compass
 * rings, glowing ice, and a ring of aurora overhead. It is built in the globe's own frame,
 * where the pole is +Y, so it turns and tilts with the planet.
 */

/** Drawn a little larger than a shore's landmark, so it reads as special without dwarfing them. */
const SCALE = 1.25
const CRYSTAL = '#7ff3ff'
const ICE_WHITE = '#eef6fb'
const ICE_BLUE = '#bfe3f5'
const STONE_BAND = '#c3d3e0'
const WARM = '#ffd59a'
const GOLD = '#e8c25a'

// Shared geometries: every crystal, rock, and crenel reuses one of these.
const OCTAHEDRON = new THREE.OctahedronGeometry(1, 0)
const ICOSAHEDRON = new THREE.IcosahedronGeometry(1, 0)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const SPHERE = new THREE.SphereGeometry(1, 10, 8)
/** One material for every glowing shard, so a single pulse lights them all. There is only one pole. */
const CRYSTAL_MATERIAL = new THREE.MeshStandardMaterial({
  color: CRYSTAL,
  emissive: CRYSTAL,
  emissiveIntensity: 1.2,
  roughness: 0.15,
  metalness: 0.1,
  flatShading: true,
})

const auroraVertex = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  // Ripple the curtain sideways, more toward its top edge.
  float sway = sin(uv.x * 9.0 + uTime * 0.7) * 0.05 + sin(uv.x * 23.0 - uTime * 1.1) * 0.015;
  p.xz += normalize(p.xz) * sway * uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const auroraFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uLow;
uniform vec3 uHigh;
uniform float uStrength;
varying vec2 vUv;
void main() {
  float rise = smoothstep(0.0, 0.18, vUv.y) * pow(1.0 - vUv.y, 1.6);
  float ends = sin(3.14159 * vUv.x);
  float rays = 0.6 + 0.4 * sin(vUv.x * 60.0 + uTime * 0.9 + sin(vUv.x * 13.0) * 2.0);
  vec3 color = mix(uLow, uHigh, smoothstep(0.15, 0.9, vUv.y));
  gl_FragColor = vec4(color, rise * ends * rays * uStrength);
}
`

const beamFragment = /* glsl */ `
uniform float uPulse;
varying vec2 vUv;
void main() {
  float fade = pow(1.0 - vUv.y, 2.2);
  gl_FragColor = vec4(0.55, 0.95, 1.0, fade * 0.32 * uPulse);
}
`

const beamVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/** A curtain of aurora: an arc of quads around the pole, open at the top and bottom. */
function createRibbon(radius: number, start: number, span: number, height: number): THREE.BufferGeometry {
  const segments = 48
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const angle = start + t * span
    // The curtain wanders in and out a little, like real aurora folds.
    const r = radius + Math.sin(t * Math.PI * 3 + start) * 0.06
    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r
    positions.push(x, 0, z, x, height, z)
    uvs.push(t, 0, t, 1)
    if (i < segments) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

const RIBBONS = [
  { radius: 0.62, start: 0.2, span: 2.4, height: 0.55, lift: 0.75, low: '#3dff9e', high: '#3fd8ff', strength: 0.5 },
  { radius: 0.74, start: 2.9, span: 2.2, height: 0.62, lift: 0.82, low: '#46ffb0', high: '#a77bff', strength: 0.42 },
  { radius: 0.55, start: 4.9, span: 1.9, height: 0.48, lift: 0.7, low: '#3fe9ff', high: '#8a7dff', strength: 0.38 },
] as const

function Aurora({ reduced }: { reduced: boolean }) {
  const materials = useRef<(THREE.ShaderMaterial | null)[]>([])
  const ribbons = useMemo(
    () =>
      RIBBONS.map((ribbon) => ({
        ...ribbon,
        geometry: createRibbon(ribbon.radius, ribbon.start, ribbon.span, ribbon.height),
        uniforms: {
          uTime: { value: 0 },
          uLow: { value: new THREE.Color(ribbon.low) },
          uHigh: { value: new THREE.Color(ribbon.high) },
          uStrength: { value: ribbon.strength },
        },
      })),
    [],
  )
  useEffect(() => () => ribbons.forEach((ribbon) => ribbon.geometry.dispose()), [ribbons])
  useFrame(({ clock }) => {
    if (reduced) return
    for (const material of materials.current) {
      if (material?.uniforms.uTime) material.uniforms.uTime.value = clock.elapsedTime
    }
  })
  return (
    <group>
      {ribbons.map((ribbon, index) => (
        <mesh key={ribbon.start} geometry={ribbon.geometry} position={[0, ribbon.lift, 0]} raycast={() => null} renderOrder={3}>
          <shaderMaterial
            ref={(material) => {
              materials.current[index] = material
            }}
            uniforms={ribbon.uniforms}
            vertexShader={auroraVertex}
            fragmentShader={auroraFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

type Triple = [number, number, number]
type Shard = { id: string; position: Triple; rotation: Triple; scale: Triple }

/** Glowing ice crystals scattered around the tower's base, plus the cluster on its crown. */
function useCrystalLayout(): { ground: Shard[]; crown: Shard[] } {
  return useMemo(() => {
    const random = mulberry32(90)
    const ground: Shard[] = Array.from({ length: 7 }, (_, index) => {
      const angle = (index / 7) * Math.PI * 2 + random() * 0.4
      const radius = 0.17 + random() * 0.08
      return {
        id: `ground-${index}`,
        position: [Math.cos(angle) * radius, 0.05, Math.sin(angle) * radius],
        rotation: [random() * 0.5 - 0.25, random() * Math.PI, random() * 0.5 - 0.25],
        scale: [0.014, 0.035 + random() * 0.03, 0.014],
      }
    })
    const crown: Shard[] = [
      { id: 'crown-0', position: [0, 0.6, 0], rotation: [0, 0, 0], scale: [0.03, 0.1, 0.03] },
      { id: 'crown-1', position: [0.035, 0.58, 0.01], rotation: [0, 0, -0.4], scale: [0.022, 0.075, 0.022] },
      { id: 'crown-2', position: [-0.03, 0.58, 0.02], rotation: [0.2, 0, 0.45], scale: [0.02, 0.07, 0.02] },
      { id: 'crown-3', position: [0.01, 0.575, -0.035], rotation: [-0.45, 0, 0], scale: [0.02, 0.065, 0.02] },
      { id: 'crown-4', position: [-0.01, 0.57, 0.04], rotation: [0.5, 0, -0.1], scale: [0.018, 0.06, 0.018] },
    ]
    return { ground, crown }
  }, [])
}

function Tower({ crystal }: { crystal: THREE.Material }) {
  const crenels = Array.from({ length: 10 }, (_, index) => (index / 10) * Math.PI * 2)
  return (
    <group>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.06, 0.082, 0.42, 10]} />
        <meshStandardMaterial color={ICE_WHITE} roughness={0.55} flatShading />
      </mesh>
      {[0.12, 0.24, 0.36].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.083 - y * 0.05, 0.085 - y * 0.05, 0.012, 10]} />
          <meshStandardMaterial color={STONE_BAND} roughness={0.7} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.07, 0.078]} geometry={BOX} scale={[0.04, 0.06, 0.012]}>
        <meshStandardMaterial color="#6b4a2e" roughness={0.8} />
      </mesh>
      {[
        [0, 0.2, 0.072, 0],
        [0.069, 0.29, 0.02, Math.PI / 2.5],
        [-0.06, 0.32, 0.03, -Math.PI / 2.8],
      ].map(([x, y, z, turn]) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} rotation={[0, turn, 0]} geometry={BOX} scale={[0.018, 0.03, 0.008]}>
          <meshStandardMaterial color={WARM} emissive={WARM} emissiveIntensity={1.1} />
        </mesh>
      ))}
      {/* Gallery and battlement, like the top of a lighthouse. */}
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.095, 0.075, 0.025, 12]} />
        <meshStandardMaterial color={STONE_BAND} roughness={0.6} flatShading />
      </mesh>
      {crenels.map((angle) => (
        <mesh
          key={angle}
          position={[Math.cos(angle) * 0.085, 0.495, Math.sin(angle) * 0.085]}
          rotation={[0, -angle, 0]}
          geometry={BOX}
          scale={[0.018, 0.026, 0.02]}
        >
          <meshStandardMaterial color={ICE_WHITE} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 0.51, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.05, 10]} />
        <meshStandardMaterial
          color={CRYSTAL}
          emissive={CRYSTAL}
          emissiveIntensity={0.7}
          transparent
          opacity={0.75}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, 0.535, 0]} material={crystal}>
        <cylinderGeometry args={[0.03, 0.03, 0.01, 10]} />
      </mesh>
    </group>
  )
}

/** Snowy ground, ice rocks, frosted pines, and small warm lanterns around the base. */
function PolarBase() {
  const layout = useMemo(() => {
    const random = mulberry32(17)
    const rocks = Array.from({ length: 6 }, (_, index) => {
      const angle = (index / 6) * Math.PI * 2 + 0.3
      const radius = 0.24 + random() * 0.05
      return {
        id: `rock-${index}`,
        position: [Math.cos(angle) * radius, 0.03, Math.sin(angle) * radius] as const,
        scale: [0.035 + random() * 0.02, 0.025 + random() * 0.025, 0.035 + random() * 0.02] as const,
        color: index % 2 === 0 ? ICE_BLUE : ICE_WHITE,
      }
    })
    const pines = [0.9, 2.2, 3.6, 5.1].map((angle, index) => ({
      id: `pine-${index}`,
      position: [Math.cos(angle) * 0.29, 0.02, Math.sin(angle) * 0.29] as const,
      scale: 0.8 + index * 0.08,
    }))
    const lanterns = [0.3, 1.9, 3.3, 4.6].map((angle, index) => ({
      id: `lantern-${index}`,
      position: [Math.cos(angle) * 0.14, 0.048, Math.sin(angle) * 0.14] as const,
    }))
    return { rocks, pines, lanterns }
  }, [])
  return (
    <group>
      <mesh position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.24, 0.33, 0.05, 11]} />
        <meshStandardMaterial color={ICE_WHITE} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.13, 0.2, 0.03, 9]} />
        <meshStandardMaterial color="#f7fbfe" roughness={0.9} flatShading />
      </mesh>
      {layout.rocks.map((rock) => (
        <mesh key={rock.id} position={rock.position} scale={rock.scale} geometry={ICOSAHEDRON}>
          <meshStandardMaterial color={rock.color} roughness={0.5} flatShading />
        </mesh>
      ))}
      {layout.pines.map((pine) => (
        <group key={pine.id} position={pine.position} scale={pine.scale}>
          <Pine />
          {/* Snow on the tip. */}
          <mesh position={[0, 0.185, 0]}>
            <coneGeometry args={[0.022, 0.035, 7]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {layout.lanterns.map((lantern) => (
        <mesh key={lantern.id} position={lantern.position} geometry={SPHERE} scale={0.009}>
          <meshBasicMaterial color={WARM} />
        </mesh>
      ))}
    </group>
  )
}

export function NorthPoleLandmark({ reduced }: { reduced: boolean }) {
  const goldRing = useRef<THREE.Group>(null)
  const cyanRing = useRef<THREE.Group>(null)
  const beam = useRef<THREE.ShaderMaterial>(null)
  const halo = useRef<THREE.Mesh>(null)
  const layout = useCrystalLayout()

  const crystal = CRYSTAL_MATERIAL
  const beamUniforms = useMemo(() => ({ uPulse: { value: 1 } }), [])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const pulse = reduced ? 1 : 0.85 + Math.sin(t * 1.6) * 0.15
    crystal.emissiveIntensity = 1.2 * pulse
    if (beam.current?.uniforms.uPulse) beam.current.uniforms.uPulse.value = pulse
    if (halo.current) halo.current.scale.setScalar(0.07 * (0.9 + pulse * 0.2))
    if (!reduced) {
      if (goldRing.current) goldRing.current.rotation.y += delta * 0.25
      if (cyanRing.current) cyanRing.current.rotation.y -= delta * 0.18
    }
  })

  return (
    <group position={[0, GLOBE_RADIUS + ICE_HEIGHT - 0.004, 0]}>
      <group scale={SCALE}>
        <PolarBase />
        <Tower crystal={crystal} />
        {[...layout.crown, ...layout.ground].map((shard) => (
          <mesh
            key={shard.id}
            geometry={OCTAHEDRON}
            material={crystal}
            position={shard.position}
            rotation={shard.rotation}
            scale={shard.scale}
          />
        ))}

        {/* Compass rings around the upper tower, turning slowly in opposite directions. */}
        <group ref={goldRing} position={[0, 0.36, 0]}>
          <group rotation={[0.22, 0, 0.1]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.13, 0.005, 6, 48]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.35} metalness={0.8} roughness={0.3} />
            </mesh>
            {[0, 1, 2, 3].map((point) => {
              const angle = (point / 4) * Math.PI * 2
              return (
                <mesh
                  key={point}
                  geometry={OCTAHEDRON}
                  position={[Math.cos(angle) * 0.13, 0, Math.sin(angle) * 0.13]}
                  scale={point === 0 ? 0.016 : 0.01}
                >
                  <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.5} metalness={0.8} roughness={0.3} />
                </mesh>
              )
            })}
          </group>
        </group>
        <group ref={cyanRing} position={[0, 0.42, 0]}>
          <mesh rotation={[Math.PI / 2 - 0.35, 0, 0.2]}>
            <torusGeometry args={[0.155, 0.003, 6, 56]} />
            <meshBasicMaterial color={CRYSTAL} transparent opacity={0.8} />
          </mesh>
        </group>

        {/* Beacon light: a soft halo on the crown and a faint beam rising from it. */}
        <mesh ref={halo} position={[0, 0.6, 0]} geometry={SPHERE} raycast={() => null}>
          <meshBasicMaterial color={CRYSTAL} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 0.95, 0]} raycast={() => null} renderOrder={3}>
          <cylinderGeometry args={[0.12, 0.025, 0.7, 20, 1, true]} />
          <shaderMaterial
            ref={beam}
            uniforms={beamUniforms}
            vertexShader={beamVertex}
            fragmentShader={beamFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        <pointLight position={[0, 0.62, 0]} color={CRYSTAL} intensity={1.6} distance={1.1} decay={2} />

        <Aurora reduced={reduced} />

        <PoleHotspot title={northPole.title} radius={0.3} height={0.3} labelHeight={0.78} />
      </group>
    </group>
  )
}
