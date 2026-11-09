import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '@/engine/terrain/noise.ts'
import { Palm, Pine, Solid } from '@/engine/landmarks/classic.tsx'

/**
 * Landmarks for the imagined realms and Mystery Island. Same scale as every other
 * landmark: roughly 0.25 across, standing on y = 0.
 */

type RealmProps = { accent: string; reduced: boolean }

function createStarGeometry(outer: number, inner: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = Math.PI / 2 + (i / 10) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.4,
    bevelSize: depth * 0.4,
    bevelSegments: 1,
  })
  geometry.center()
  return geometry
}

const STAR = createStarGeometry(1, 0.45, 0.35)

/** A zigzag of thin bars through the given points, in the XY plane. */
function Zigzag({ points, color }: { points: readonly [number, number][]; color: string }) {
  return (
    <>
      {points.slice(1).map((point, index) => {
        const from = points[index]
        if (!from) return null
        const dx = point[0] - from[0]
        const dy = point[1] - from[1]
        return (
          <mesh
            key={`${point[0]}-${point[1]}`}
            position={[(from[0] + point[0]) / 2, (from[1] + point[1]) / 2, 0]}
            rotation={[0, 0, -Math.atan2(dx, dy)]}
          >
            <boxGeometry args={[0.012, Math.hypot(dx, dy) + 0.006, 0.012]} />
            <meshBasicMaterial color={color} />
          </mesh>
        )
      })}
    </>
  )
}

const STORM_PUFFS: readonly [number, number, number, number][] = [
  [0, 0, 0, 0.075],
  [0.07, -0.012, 0.01, 0.055],
  [-0.075, -0.01, -0.01, 0.06],
  [0.025, 0.03, 0.025, 0.055],
  [-0.03, 0.025, -0.03, 0.05],
]

const BOLT: readonly [number, number][] = [
  [0.05, 0.41],
  [0.02, 0.35],
  [0.06, 0.32],
  [0.03, 0.25],
]

/** Dark towers under a storm cloud that never moves on. Rain falls, lightning flashes. */
export function RainIsland({ accent, reduced }: RealmProps) {
  const rain = useRef<THREE.Group>(null)
  const bolt = useRef<THREE.Group>(null)
  const flash = useRef<THREE.PointLight>(null)
  const drops = useMemo(() => {
    const random = mulberry32(73)
    return Array.from({ length: 20 }, () => ({
      x: (random() - 0.5) * 0.22,
      z: (random() - 0.5) * 0.18,
      offset: random(),
      speed: 0.9 + random() * 0.4,
    }))
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    rain.current?.children.forEach((drop, index) => {
      const spec = drops[index]
      if (!spec) return
      const fall = reduced ? spec.offset : (t * spec.speed + spec.offset) % 1
      drop.position.y = 0.4 - fall * 0.38
    })
    // A double flash every few seconds.
    const cycle = (t + 1.3) % 3.7
    const lit = !reduced && (cycle < 0.08 || (cycle > 0.16 && cycle < 0.22))
    if (bolt.current) bolt.current.visible = lit
    if (flash.current) flash.current.intensity = lit ? 2.5 : 0
  })

  return (
    <group>
      {[
        { x: -0.07, z: 0.03, height: 0.2 },
        { x: 0.03, z: -0.04, height: 0.27 },
        { x: 0.09, z: 0.06, height: 0.14 },
      ].map((tower) => (
        <group key={tower.x} position={[tower.x, 0, tower.z]}>
          <Solid position={[0, tower.height / 2, 0]} color="#3c4552" roughness={0.7}>
            <boxGeometry args={[0.05, tower.height, 0.05]} />
          </Solid>
          <Solid position={[0, tower.height * 0.7, 0.026]} color={accent} emissive={accent} emissiveIntensity={0.9}>
            <boxGeometry args={[0.03, 0.012, 0.004]} />
          </Solid>
          <Solid position={[0, tower.height + 0.03, 0]} color="#8a96a6" metalness={0.5}>
            <cylinderGeometry args={[0.003, 0.003, 0.06, 4]} />
          </Solid>
        </group>
      ))}
      <group position={[0, 0.46, 0]}>
        {STORM_PUFFS.map(([x, y, z, radius]) => (
          <Solid key={`${x}-${z}`} position={[x, y, z]} scale={[radius, radius * 0.8, radius]} color="#4a5566" roughness={0.9}>
            <sphereGeometry args={[1, 14, 10]} />
          </Solid>
        ))}
      </group>
      <group ref={rain}>
        {drops.map((drop) => (
          <mesh key={`${drop.x}-${drop.z}`} position={[drop.x, 0.2, drop.z]}>
            <cylinderGeometry args={[0.0028, 0.0028, 0.05, 4]} />
            <meshBasicMaterial color="#a9cdff" transparent opacity={0.75} />
          </mesh>
        ))}
      </group>
      <group ref={bolt} visible={false}>
        <Zigzag points={BOLT} color="#fff6b0" />
      </group>
      <pointLight ref={flash} position={[0.04, 0.33, 0.05]} color="#dfe8ff" intensity={0} distance={1.4} decay={2} />
    </group>
  )
}

/** A singing pillar between two speakers, sending out rings of sound. */
export function SoundIsland({ accent, reduced }: RealmProps) {
  const rings = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    rings.current.forEach((ring, index) => {
      if (!ring) return
      const phase = reduced ? (index + 0.5) / 3 : (clock.elapsedTime * 0.45 + index / 3) % 1
      ring.scale.setScalar(0.03 + phase * 0.15)
      const material = ring.material as THREE.MeshBasicMaterial
      material.opacity = (1 - phase) * 0.85
    })
  })
  return (
    <group>
      <Solid position={[0, 0.015, 0]} color="#2c2238" roughness={0.6}>
        <cylinderGeometry args={[0.11, 0.12, 0.03, 20]} />
      </Solid>
      <Solid position={[0, 0.13, 0]} color="#d9d2e6" metalness={0.5} roughness={0.3}>
        <cylinderGeometry args={[0.014, 0.02, 0.22, 10]} />
      </Solid>
      <Solid position={[0, 0.25, 0]} color={accent} emissive={accent} emissiveIntensity={1.1} roughness={0.2}>
        <sphereGeometry args={[0.03, 14, 10]} />
      </Solid>
      {[-0.13, 0.13].map((x) => (
        <group key={x} position={[x, 0, 0.02]} rotation={[0, -x * 3, 0]}>
          <Solid position={[0, 0.05, 0]} color="#1d1a24" roughness={0.6}>
            <boxGeometry args={[0.06, 0.1, 0.05]} />
          </Solid>
          {[0.07, 0.03].map((y, index) => (
            <Solid
              key={y}
              position={[0, y, 0.026]}
              rotation={[Math.PI / 2, 0, 0]}
              color={accent}
              emissive={accent}
              emissiveIntensity={0.35}
            >
              <cylinderGeometry args={[index === 0 ? 0.016 : 0.022, 0.012, 0.006, 14]} />
            </Solid>
          ))}
        </group>
      ))}
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            rings.current[index] = mesh
          }}
          position={[0, 0.25, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[1, 0.05, 6, 32]} />
          <meshBasicMaterial color={accent} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Dunes, domed houses, and one round sandstone tower baking in the sun. */
export function SandIsland({ accent }: RealmProps) {
  return (
    <group>
      {[
        [-0.1, -0.08, 0.12, 0.6],
        [0.11, 0.09, 0.1, -0.4],
        [0.12, -0.1, 0.08, 1.2],
      ].map(([x, z, size, turn]) => (
        <Solid key={`${x}`} position={[x, 0, z]} rotation={[0, turn, 0]} scale={[size, size * 0.32, size * 0.6]} color="#e9c27a" roughness={1} metalness={0}>
          <sphereGeometry args={[1, 16, 10]} />
        </Solid>
      ))}
      {[
        [-0.09, 0.07],
        [-0.02, 0.1],
        [0.07, -0.01],
      ].map(([x, z]) => (
        <group key={`${x}`} position={[x, 0, z]}>
          <Solid position={[0, 0.02, 0]} color="#d9a86a" roughness={0.95} metalness={0}>
            <cylinderGeometry args={[0.032, 0.034, 0.04, 12]} />
          </Solid>
          <Solid position={[0, 0.04, 0]} color="#e6bb80" roughness={0.95} metalness={0}>
            <sphereGeometry args={[0.032, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </Solid>
          <Solid position={[0, 0.016, 0.033]} color="#5a3a22" roughness={1} metalness={0}>
            <boxGeometry args={[0.014, 0.022, 0.004]} />
          </Solid>
        </group>
      ))}
      <group position={[-0.02, 0, -0.04]}>
        <Solid position={[0, 0.075, 0]} color="#c98f52" roughness={0.9} metalness={0}>
          <cylinderGeometry args={[0.055, 0.062, 0.15, 16]} />
        </Solid>
        <Solid position={[0, 0.15, 0]} color={accent} roughness={0.6}>
          <sphereGeometry args={[0.055, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </Solid>
        {[0.05, 0.1].map((y) => (
          <Solid key={y} position={[0, y, 0.058]} color="#4a2e1a" roughness={1} metalness={0}>
            <boxGeometry args={[0.016, 0.022, 0.006]} />
          </Solid>
        ))}
      </group>
    </group>
  )
}

/** Something is buried here. The chest glows under a red X. */
export function MysteryIsland({ accent, reduced }: RealmProps) {
  const glow = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!glow.current || reduced) return
    glow.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.2) * 0.12)
  })
  return (
    <group>
      <Palm position={[-0.1, 0, -0.07]} />
      <Solid position={[0.1, 0.03, -0.06]} color="#7d7a74" roughness={0.9} metalness={0}>
        <dodecahedronGeometry args={[0.04, 0]} />
      </Solid>
      {[0.8, -0.8].map((turn) => (
        <Solid key={turn} position={[-0.07, 0.004, 0.08]} rotation={[0, turn, 0]} color="#d23b3b" roughness={0.6}>
          <boxGeometry args={[0.09, 0.006, 0.016]} />
        </Solid>
      ))}
      <group position={[0.03, 0, 0.03]} rotation={[0, -0.4, 0]}>
        <Solid position={[0, 0.022, 0]} color="#7a4a26" roughness={0.8} metalness={0}>
          <boxGeometry args={[0.08, 0.044, 0.05]} />
        </Solid>
        <Solid position={[0, 0.044, 0]} rotation={[0, 0, Math.PI / 2]} color="#8a5630" roughness={0.8} metalness={0}>
          <cylinderGeometry args={[0.025, 0.025, 0.08, 12, 1, false, 0, Math.PI]} />
        </Solid>
        {[-0.028, 0.028].map((x) => (
          <Solid key={x} position={[x, 0.04, 0]} color="#e8c25a" metalness={0.7} roughness={0.3}>
            <boxGeometry args={[0.008, 0.06, 0.054]} />
          </Solid>
        ))}
        <mesh ref={glow} position={[0, 0.09, 0]}>
          <sphereGeometry args={[0.035, 14, 10]} />
          <meshBasicMaterial color={accent} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

/** Stairs climbing toward a star that keeps floating just out of reach. */
export function DreamsIsland({ accent, reduced }: RealmProps) {
  const star = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!star.current || reduced) return
    star.current.position.y = 0.31 + Math.sin(clock.elapsedTime * 1.4) * 0.02
    star.current.rotation.y = clock.elapsedTime * 0.8
  })
  return (
    <group>
      {Array.from({ length: 7 }, (_, index) => {
        const angle = index * 0.6
        return (
          <Solid
            key={index}
            position={[Math.cos(angle) * 0.08, 0.02 + index * 0.032, Math.sin(angle) * 0.08]}
            rotation={[0, -angle, 0]}
            color={index % 2 === 0 ? '#f1e6ff' : '#cdb8ff'}
            roughness={0.5}
          >
            <boxGeometry args={[0.05, 0.016, 0.03]} />
          </Solid>
        )
      })}
      <Solid position={[0, 0.11, 0]} color="#e8dcff" roughness={0.5}>
        <cylinderGeometry args={[0.01, 0.014, 0.22, 8]} />
      </Solid>
      {[
        [-0.11, 0.035, 0.07, 0.04],
        [-0.08, 0.03, 0.1, 0.03],
        [0.11, 0.03, -0.06, 0.035],
      ].map(([x, y, z, radius]) => (
        <Solid key={`${x}-${z}`} position={[x, y, z]} scale={[radius, radius * 0.7, radius]} color="#ffffff" roughness={0.9} metalness={0}>
          <sphereGeometry args={[1, 12, 8]} />
        </Solid>
      ))}
      <group ref={star} position={[0, 0.31, 0]}>
        <mesh geometry={STAR} scale={0.05}>
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

/** A giant chip on a circuit board, with a wafer leaning beside it. */
export function SemiconductorLand({ accent }: RealmProps) {
  const pins = useMemo(() => {
    const list: { position: [number, number, number]; rotation: number }[] = []
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < 5; i++) {
        const along = -0.048 + i * 0.024
        const angle = (side * Math.PI) / 2
        const x = Math.cos(angle) * 0.073 - Math.sin(angle) * along
        const z = Math.sin(angle) * 0.073 + Math.cos(angle) * along
        list.push({ position: [x, 0.022, z], rotation: -angle })
      }
    }
    return list
  }, [])
  return (
    <group>
      <Solid position={[0, 0.006, 0]} color="#1f6b4a" roughness={0.7}>
        <boxGeometry args={[0.27, 0.012, 0.27]} />
      </Solid>
      {[
        [0.1, 0.004, 0.11, 0.004],
        [-0.1, 0.004, 0.11, 0.004],
        [0.004, 0.11, 0.1, 0.004],
        [0.004, 0.11, -0.1, 0.004],
      ].map(([w, d, x, z], index) => (
        <Solid
          key={index}
          position={[index < 2 ? x : 0.06 * (index === 2 ? 1 : -1), 0.013, index < 2 ? 0.06 * (index === 0 ? 1 : -1) : z]}
          color="#e2b24c"
          metalness={0.8}
          roughness={0.3}
        >
          <boxGeometry args={[w, 0.002, d]} />
        </Solid>
      ))}
      <Solid position={[0, 0.03, 0]} color="#20242c" roughness={0.45} metalness={0.2}>
        <boxGeometry args={[0.13, 0.03, 0.13]} />
      </Solid>
      {pins.map((pin) => (
        <Solid key={pin.position.join(',')} position={pin.position} rotation={[0, pin.rotation, 0]} color="#c9ced6" metalness={0.8} roughness={0.25}>
          <boxGeometry args={[0.02, 0.006, 0.01]} />
        </Solid>
      ))}
      <Solid position={[0, 0.048, 0]} color="#c9a24a" metalness={0.75} roughness={0.25}>
        <boxGeometry args={[0.064, 0.006, 0.064]} />
      </Solid>
      <Solid position={[0, 0.052, 0]} color={accent} emissive={accent} emissiveIntensity={0.9} roughness={0.2}>
        <boxGeometry args={[0.03, 0.004, 0.03]} />
      </Solid>
      <Solid position={[0.1, 0.06, -0.09]} rotation={[0.3, 0.6, 1.25]} color="#a8b8ff" metalness={0.9} roughness={0.12}>
        <cylinderGeometry args={[0.055, 0.055, 0.006, 28]} />
      </Solid>
    </group>
  )
}

/** The top of every ranking: a crown on a three-step podium, with three stars circling. */
export function SssTierLands({ accent, reduced }: RealmProps) {
  const stars = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (stars.current && !reduced) stars.current.rotation.y += delta * 0.9
  })
  return (
    <group>
      {[
        [0.12, '#f4f1ea'],
        [0.09, '#6b4fd8'],
        [0.06, '#f4f1ea'],
      ].map(([radius, color], index) => (
        <Solid key={index} position={[0, 0.015 + index * 0.03, 0]} color={color as string} roughness={0.4}>
          <cylinderGeometry args={[radius as number, (radius as number) + 0.006, 0.03, 24]} />
        </Solid>
      ))}
      <group position={[0, 0.09, 0]}>
        <Solid position={[0, 0.02, 0]} color={accent} metalness={0.85} roughness={0.25}>
          <cylinderGeometry args={[0.045, 0.04, 0.04, 20, 1, true]} />
        </Solid>
        {Array.from({ length: 5 }, (_, index) => {
          const angle = (index / 5) * Math.PI * 2
          return (
            <group key={index} position={[Math.cos(angle) * 0.043, 0, Math.sin(angle) * 0.043]}>
              <Solid position={[0, 0.055, 0]} color={accent} metalness={0.85} roughness={0.25}>
                <coneGeometry args={[0.012, 0.035, 6]} />
              </Solid>
              <Solid position={[0, 0.02, 0]} color={index % 2 === 0 ? '#e0304a' : '#3a7bff'} roughness={0.2}>
                <sphereGeometry args={[0.008, 8, 6]} />
              </Solid>
            </group>
          )
        })}
      </group>
      <group ref={stars} position={[0, 0.2, 0]}>
        {[0, 1, 2].map((index) => {
          const angle = (index / 3) * Math.PI * 2
          return (
            <mesh key={index} geometry={STAR} position={[Math.cos(angle) * 0.11, 0, Math.sin(angle) * 0.11]} scale={0.026}>
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} metalness={0.5} roughness={0.3} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** A smoking volcano over thick jungle, and a long-necked dinosaur grazing at the edge. */
export function IslaSorna({ accent, reduced }: RealmProps) {
  const smoke = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    smoke.current?.children.forEach((puff, index) => {
      const phase = reduced ? index / 3 : (clock.elapsedTime * 0.3 + index / 3) % 1
      puff.position.y = 0.22 + phase * 0.14
      puff.position.x = phase * 0.03
      puff.scale.setScalar(0.02 + phase * 0.025)
    })
  })
  return (
    <group>
      <group position={[-0.06, 0, -0.06]}>
        <Solid position={[0, 0.1, 0]} color="#6b5848" roughness={0.95} metalness={0}>
          <cylinderGeometry args={[0.032, 0.12, 0.2, 12]} />
        </Solid>
        <Solid position={[0, 0.2, 0]} color={accent} emissive={accent} emissiveIntensity={1.2} roughness={0.4}>
          <cylinderGeometry args={[0.028, 0.028, 0.008, 12]} />
        </Solid>
        <group ref={smoke}>
          {[0, 1, 2].map((index) => (
            <Solid key={index} position={[0, 0.22, 0]} color="#9a9692" roughness={1} metalness={0}>
              <sphereGeometry args={[1, 10, 8]} />
            </Solid>
          ))}
        </group>
      </group>
      {[
        [0.06, -0.09, 0.045],
        [0.12, -0.03, 0.04],
        [-0.12, 0.06, 0.05],
        [-0.05, 0.11, 0.04],
      ].map(([x, z, radius]) => (
        <Solid key={`${x}-${z}`} position={[x, radius, z]} color="#1f6e3a" roughness={0.85} metalness={0}>
          <sphereGeometry args={[radius, 10, 8]} />
        </Solid>
      ))}
      <Pine position={[0.13, 0, 0.1]} scale={0.8} />
      <group position={[0.06, 0, 0.06]} rotation={[0, -0.5, 0]}>
        <Solid position={[0, 0.07, 0]} scale={[0.06, 0.038, 0.034]} color="#7c9a54" roughness={0.7} metalness={0}>
          <sphereGeometry args={[1, 14, 10]} />
        </Solid>
        {[
          [0.032, 0.018],
          [0.032, -0.018],
          [-0.032, 0.018],
          [-0.032, -0.018],
        ].map(([x, z]) => (
          <Solid key={`${x}-${z}`} position={[x, 0.025, z]} color="#6d8a48" roughness={0.7} metalness={0}>
            <cylinderGeometry args={[0.009, 0.01, 0.05, 6]} />
          </Solid>
        ))}
        <Solid position={[0.075, 0.13, 0]} rotation={[0, 0, -0.55]} color="#7c9a54" roughness={0.7} metalness={0}>
          <cylinderGeometry args={[0.009, 0.014, 0.12, 8]} />
        </Solid>
        <Solid position={[0.11, 0.185, 0]} scale={[0.022, 0.014, 0.014]} color="#7c9a54" roughness={0.7} metalness={0}>
          <sphereGeometry args={[1, 10, 8]} />
        </Solid>
        <Solid position={[-0.085, 0.06, 0]} rotation={[0, 0, -1.25]} color="#7c9a54" roughness={0.7} metalness={0}>
          <coneGeometry args={[0.014, 0.09, 8]} />
        </Solid>
      </group>
    </group>
  )
}

/** A leafy village: one giant broadleaf tree with a treehouse platform, small houses, and a grove. */
export function LeafVillage({ accent }: RealmProps) {
  const canopy: [number, number, number, number, string][] = [
    [0, 0.26, 0, 0.085, '#2f9a48'],
    [0.06, 0.23, 0.03, 0.06, '#3bb055'],
    [-0.055, 0.235, -0.02, 0.065, '#278a3f'],
    [0.01, 0.31, -0.03, 0.055, '#4cc062'],
  ]
  return (
    <group>
      {/* The giant tree, a little off center so the houses have room. */}
      <group position={[-0.03, 0, -0.02]}>
        <Solid position={[0, 0.1, 0]} color="#7a5232" roughness={0.85} metalness={0}>
          <cylinderGeometry args={[0.02, 0.032, 0.2, 8]} />
        </Solid>
        {canopy.map(([x, y, z, radius, color]) => (
          <Solid key={`${x}-${y}`} position={[x, y, z]} color={color} roughness={0.8} metalness={0}>
            <sphereGeometry args={[radius, 12, 10]} />
          </Solid>
        ))}
        {/* A wooden platform ringing the trunk, with a small hut on it. */}
        <Solid position={[0, 0.13, 0]} color="#a8763f" roughness={0.8} metalness={0}>
          <cylinderGeometry args={[0.06, 0.06, 0.008, 12]} />
        </Solid>
        <Solid position={[0.045, 0.15, 0.02]} color="#c99a5b" roughness={0.8} metalness={0}>
          <boxGeometry args={[0.03, 0.03, 0.03]} />
        </Solid>
        <Solid position={[0.045, 0.172, 0.02]} rotation={[0, Math.PI / 4, 0]} color={accent} roughness={0.6}>
          <coneGeometry args={[0.026, 0.02, 4]} />
        </Solid>
      </group>
      {[
        [0.09, 0.06, '#3f8f4f'],
        [0.1, -0.05, accent],
        [-0.04, 0.1, '#3f8f4f'],
      ].map(([x, z, roof]) => (
        <group key={`${x}-${z}`} position={[x as number, 0, z as number]}>
          <Solid position={[0, 0.02, 0]} color="#e9dcc3" roughness={0.85} metalness={0}>
            <boxGeometry args={[0.045, 0.04, 0.04]} />
          </Solid>
          <Solid position={[0, 0.05, 0]} rotation={[0, Math.PI / 4, 0]} color={roof as string} roughness={0.6}>
            <coneGeometry args={[0.038, 0.03, 4]} />
          </Solid>
        </group>
      ))}
      {[
        [-0.11, 0.05, 0.035],
        [-0.1, -0.09, 0.03],
        [0.04, -0.11, 0.032],
      ].map(([x, z, radius]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <Solid position={[0, 0.03, 0]} color="#7a5232" roughness={0.85} metalness={0}>
            <cylinderGeometry args={[0.006, 0.009, 0.06, 6]} />
          </Solid>
          <Solid position={[0, 0.065, 0]} color="#35a04e" roughness={0.8} metalness={0}>
            <sphereGeometry args={[radius, 10, 8]} />
          </Solid>
        </group>
      ))}
    </group>
  )
}
