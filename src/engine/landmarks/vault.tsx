import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { VaultParams } from '@/runtime/configuration/landmark-params.ts'
import { Hotspot } from '@/engine/interactions/Hotspot.tsx'
import type { LandmarkProps } from '@/engine/landmarks/types.ts'
import { mulberry32 } from '@/engine/terrain/noise.ts'

/**
 * The Vault of Mysteries: an ancient octagonal vault half buried in an ice crater on the
 * south pole, with light escaping from beneath the ice. Deliberately low and broad, the
 * opposite of the Beacon's tall tower and upward beam.
 *
 * Built in the globe's own frame, flipped so local +Y points out of the south pole.
 * Pieces away from the center are set on the curved ice, not on a flat plane.
 */

type Triple = [number, number, number]

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Stands something on the curved ice: `distance` from the pole along the surface and
 * `bearing` around it, both in local units. Returns where it goes and which way is up there.
 */
function onIce(localRadius: number, distance: number, bearing: number, heading = 0): { position: Triple; quaternion: THREE.Quaternion } {
  const angle = distance / localRadius
  const normal = new THREE.Vector3(
    Math.sin(angle) * Math.cos(bearing),
    Math.cos(angle),
    Math.sin(angle) * Math.sin(bearing),
  )
  const position = normal.clone().multiplyScalar(localRadius).sub(new THREE.Vector3(0, localRadius, 0))
  const quaternion = new THREE.Quaternion()
    .setFromUnitVectors(UP, normal)
    .multiply(new THREE.Quaternion().setFromAxisAngle(UP, heading))
  return { position: [position.x, position.y, position.z], quaternion }
}

// Shared geometry: every rock, slab, crystal, and seam reuses one of these.
const BOX = new THREE.BoxGeometry(1, 1, 1)
const OCTAHEDRON = new THREE.OctahedronGeometry(1, 0)
const ICOSAHEDRON = new THREE.IcosahedronGeometry(1, 0)
const PEAK = new THREE.ConeGeometry(1, 1, 5)

// Shared materials. Only the glowing ones change, and they pulse once for every piece.
const SNOW = new THREE.MeshStandardMaterial({ color: '#eef5fa', roughness: 0.85, flatShading: true })
const ICE_PALE = new THREE.MeshStandardMaterial({ color: '#c6def0', roughness: 0.6, flatShading: true })
const CREVASSE = new THREE.MeshStandardMaterial({ color: '#1c3766', roughness: 0.9 })
const CRATER_FLOOR = new THREE.MeshStandardMaterial({ color: '#12284c', roughness: 0.7, flatShading: true })
const STONE = new THREE.MeshStandardMaterial({ color: '#2b3245', roughness: 0.85, metalness: 0.15, flatShading: true })
const STONE_LIGHT = new THREE.MeshStandardMaterial({ color: '#3d4659', roughness: 0.75, metalness: 0.35, flatShading: true })
const DOOR = new THREE.MeshStandardMaterial({ color: '#4a5068', roughness: 0.45, metalness: 0.6 })
const GLYPH = new THREE.MeshStandardMaterial({ color: '#53f0e0', emissive: '#53f0e0', emissiveIntensity: 0.9 })
const SEAM = new THREE.MeshStandardMaterial({ color: '#9b86ff', emissive: '#8f7bff', emissiveIntensity: 1.2 })
const CORE = new THREE.MeshStandardMaterial({
  color: '#8f7bff',
  emissive: '#7d6bff',
  emissiveIntensity: 1.4,
  roughness: 0.15,
  flatShading: true,
})
const FROZEN = new THREE.MeshStandardMaterial({
  color: '#a9e6ff',
  emissive: '#5fb8ff',
  emissiveIntensity: 0.25,
  roughness: 0.1,
  transparent: true,
  opacity: 0.72,
  flatShading: true,
})
// Fissures brighten and dim in two groups, out of step with each other.
const FISSURE_A = new THREE.MeshBasicMaterial({ color: '#8fa4ff', transparent: true, opacity: 0.8 })
const FISSURE_B = new THREE.MeshBasicMaterial({ color: '#a98bff', transparent: true, opacity: 0.8 })

const glowVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/** Light welling up through the crater floor: brightest in the middle, gone at the rim. */
const glowFragment = /* glsl */ `
uniform float uPulse;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float glow = pow(max(1.0 - d, 0.0), 2.0);
  gl_FragColor = vec4(0.52, 0.45, 1.0, glow * 0.5 * uPulse);
}
`

type Piece = { id: string; position: Triple; quaternion: THREE.Quaternion; scale: Triple; material: THREE.Material }

/** Ice mountains, cliffs, crevasses, and crater-rim chunks, scattered with a fixed seed. */
function useTerrain(localRadius: number): Piece[] {
  return useMemo(() => {
    const random = mulberry32(2718)
    const pieces: Piece[] = []
    // Angular low-poly mountains ringing the region.
    for (let i = 0; i < 8; i++) {
      const bearing = (i / 8) * Math.PI * 2 + random() * 0.4
      const { position, quaternion } = onIce(localRadius, 0.6 + random() * 0.2, bearing, random() * Math.PI)
      const height = 0.13 + random() * 0.15
      const width = 0.08 + random() * 0.05
      pieces.push({
        id: `peak-${i}`,
        position: [position[0], position[1] + height / 2 - 0.02, position[2]],
        quaternion,
        scale: [width, height, width * 0.85],
        material: i % 3 === 0 ? ICE_PALE : SNOW,
      })
    }
    // Low ice cliffs and ridges.
    for (let i = 0; i < 7; i++) {
      const bearing = random() * Math.PI * 2
      const { position, quaternion } = onIce(localRadius, 0.44 + random() * 0.18, bearing, bearing + Math.PI / 2 + (random() - 0.5) * 0.6)
      const height = 0.035 + random() * 0.035
      pieces.push({
        id: `cliff-${i}`,
        position: [position[0], position[1] + height / 2 - 0.01, position[2]],
        quaternion,
        scale: [0.14 + random() * 0.08, height, 0.045],
        material: ICE_PALE,
      })
    }
    // Dark crevasses cut into the ice.
    for (let i = 0; i < 6; i++) {
      const bearing = random() * Math.PI * 2
      const { position, quaternion } = onIce(localRadius, 0.42 + random() * 0.3, bearing, random() * Math.PI)
      pieces.push({
        id: `crevasse-${i}`,
        position: [position[0], position[1] + 0.003, position[2]],
        quaternion,
        scale: [0.1 + random() * 0.06, 0.006, 0.016],
        material: CREVASSE,
      })
    }
    // Broken ice around the crater's edge.
    for (let i = 0; i < 16; i++) {
      const bearing = (i / 16) * Math.PI * 2 + (random() - 0.5) * 0.25
      const { position, quaternion } = onIce(localRadius, 0.31 + random() * 0.04, bearing, random() * Math.PI)
      pieces.push({
        id: `rim-${i}`,
        position,
        quaternion,
        scale: [0.045 + random() * 0.03, 0.025 + random() * 0.03, 0.035 + random() * 0.02],
        material: i % 2 === 0 ? SNOW : ICE_PALE,
      })
    }
    return pieces
  }, [localRadius])
}

/** Thin glowing cracks zigzagging out from the vault across the ice. */
function useFissures(localRadius: number): Piece[] {
  return useMemo(() => {
    const random = mulberry32(161)
    const pieces: Piece[] = []
    for (let crack = 0; crack < 7; crack++) {
      let bearing = (crack / 7) * Math.PI * 2 + random() * 0.3
      let distance = 0.22
      for (let step = 0; step < 4; step++) {
        const length = 0.09 + random() * 0.05
        const turn = (random() - 0.5) * 0.5
        bearing += turn * 0.25
        const middle = distance + length / 2
        const { position, quaternion } = onIce(localRadius, middle, bearing, -bearing + turn)
        pieces.push({
          id: `fissure-${crack}-${step}`,
          position: [position[0], position[1] + 0.004, position[2]],
          quaternion,
          scale: [length, 0.004, 0.008],
          material: crack % 2 === 0 ? FISSURE_A : FISSURE_B,
        })
        distance += length * 0.9
      }
    }
    return pieces
  }, [localRadius])
}

/** Translucent ice crystals and broken ancient pillars around the crater. */
function useRuins(localRadius: number, pillarCount: number) {
  return useMemo(() => {
    const random = mulberry32(31)
    const crystals: Piece[] = Array.from({ length: 7 }, (_, index) => {
      const bearing = (index / 7) * Math.PI * 2 + 0.4 + random() * 0.3
      const { position, quaternion } = onIce(localRadius, 0.37 + random() * 0.22, bearing, random() * Math.PI)
      const height = 0.04 + random() * 0.05
      quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.7)))
      return {
        id: `crystal-${index}`,
        position: [position[0], position[1] + height * 0.6, position[2]],
        quaternion,
        scale: [0.018 + random() * 0.01, height, 0.018 + random() * 0.01],
        material: FROZEN,
      }
    })
    // Four pillars keep their original bearings; other counts are spread evenly.
    const bearings = pillarCount === 4 ? [0.6, 2.2, 3.7, 5.2] : Array.from({ length: pillarCount }, (_, index) => 0.6 + (index / pillarCount) * Math.PI * 2)
    const pillars = bearings.map((bearing, index) => {
      const height = 0.11 + random() * 0.09
      const lean = 0.08 + random() * 0.18
      const { position, quaternion } = onIce(localRadius, 0.42, bearing, random() * Math.PI)
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lean))
      return { id: `pillar-${index}`, position, quaternion, height, crowned: index === 1 }
    })
    return { crystals, pillars }
  }, [localRadius, pillarCount])
}

function Vault({ ring }: { ring: React.RefObject<THREE.Group | null> }) {
  const segments = Array.from({ length: 8 }, (_, index) => ((index + 0.5) / 8) * Math.PI * 2)
  const seams = Array.from({ length: 8 }, (_, index) => (index / 8) * Math.PI * 2)
  return (
    <group>
      {/* The octagonal body, sunk into the crater floor. */}
      <mesh position={[0, 0.02, 0]} material={STONE}>
        <cylinderGeometry args={[0.17, 0.19, 0.07, 8]} />
      </mesh>
      {/* A thick segmented outer ring, with light escaping through the gaps. */}
      {segments.map((angle) => (
        <mesh
          key={`segment-${angle}`}
          geometry={BOX}
          material={STONE_LIGHT}
          position={[Math.cos(angle) * 0.205, 0.03, Math.sin(angle) * 0.205]}
          rotation={[0, -angle + Math.PI / 2, 0]}
          scale={[0.135, 0.055, 0.035]}
        />
      ))}
      {seams.map((angle) => (
        <mesh
          key={`seam-${angle}`}
          geometry={BOX}
          material={SEAM}
          position={[Math.cos(angle) * 0.205, 0.028, Math.sin(angle) * 0.205]}
          rotation={[0, -angle + Math.PI / 2, 0]}
          scale={[0.012, 0.045, 0.03]}
        />
      ))}
      <mesh position={[0, 0.06, 0]} material={STONE_LIGHT}>
        <cylinderGeometry args={[0.15, 0.16, 0.012, 8]} />
      </mesh>
      {/* Ancient markings: a circle of glyphs and an inner ring. */}
      {seams.map((angle, index) => (
        <mesh
          key={`glyph-${angle}`}
          geometry={index % 2 === 0 ? BOX : OCTAHEDRON}
          material={GLYPH}
          position={[Math.cos(angle) * 0.118, 0.068, Math.sin(angle) * 0.118]}
          rotation={[0, -angle, 0]}
          scale={index % 2 === 0 ? [0.022, 0.004, 0.008] : [0.009, 0.004, 0.009]}
        />
      ))}
      <mesh position={[0, 0.067, 0]} rotation={[-Math.PI / 2, 0, 0]} material={GLYPH}>
        <torusGeometry args={[0.085, 0.004, 4, 32]} />
      </mesh>
      {/* The sealed round door, cracked in a cross where light leaks through. */}
      <mesh position={[0, 0.07, 0]} material={DOOR}>
        <cylinderGeometry args={[0.062, 0.062, 0.012, 16]} />
      </mesh>
      {[0, Math.PI / 2].map((turn) => (
        <mesh key={turn} geometry={BOX} material={SEAM} position={[0, 0.077, 0]} rotation={[0, turn, 0]} scale={[0.12, 0.003, 0.006]} />
      ))}
      {/* The Mystery Core, rising out of the door, with one slow ring around it. */}
      <mesh geometry={ICOSAHEDRON} material={CORE} position={[0, 0.125, 0]} scale={[0.038, 0.07, 0.038]} />
      <group ref={ring} position={[0, 0.125, 0]}>
        <mesh rotation={[Math.PI / 2 - 0.4, 0, 0]} material={GLYPH}>
          <torusGeometry args={[0.07, 0.003, 4, 40]} />
        </mesh>
      </group>
    </group>
  )
}

function Pillar({ height, crowned }: { height: number; crowned: boolean }) {
  return (
    <group>
      {/* Partly buried: the base sits below the snow line. */}
      <mesh geometry={BOX} material={STONE_LIGHT} position={[0, height / 2 - 0.03, 0]} scale={[0.048, height, 0.048]} />
      <mesh geometry={BOX} material={SNOW} position={[0, height - 0.026, 0]} scale={[0.056, 0.012, 0.056]} />
      <mesh geometry={BOX} material={GLYPH} position={[0, height * 0.55 - 0.03, 0.0245]} scale={[0.016, 0.016, 0.002]} />
      {crowned ? (
        <mesh position={[0, height + 0.015, 0]} material={GLYPH}>
          <torusGeometry args={[0.024, 0.006, 4, 8]} />
        </mesh>
      ) : (
        <mesh
          geometry={BOX}
          material={STONE_LIGHT}
          position={[0.012, height - 0.005, 0]}
          rotation={[0, 0, 0.5]}
          scale={[0.03, 0.03, 0.04]}
        />
      )}
    </group>
  )
}

/** A light, sparse fall of snow over the crater. */
function Snowfall({ reduced }: { reduced: boolean }) {
  const points = useRef<THREE.Points>(null)
  const { geometry, speeds } = useMemo(() => {
    const random = mulberry32(5)
    const count = 40
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2
      const radius = Math.sqrt(random()) * 0.6
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = random() * 0.5
      positions[i * 3 + 2] = Math.sin(angle) * radius
      speeds[i] = 0.04 + random() * 0.04
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry, speeds }
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((_, delta) => {
    if (reduced || !points.current) return
    const attribute = points.current.geometry.getAttribute('position')
    if (!(attribute instanceof THREE.BufferAttribute)) return
    const step = Math.min(delta, 0.05)
    for (let i = 0; i < attribute.count; i++) {
      let y = attribute.getY(i) - (speeds[i] ?? 0.05) * step
      if (y < 0) y += 0.5
      attribute.setY(i, y)
    }
    attribute.needsUpdate = true
  })
  return (
    <points ref={points} geometry={geometry} raycast={() => null}>
      <pointsMaterial color="#ffffff" size={0.012} transparent opacity={0.8} depthWrite={false} />
    </points>
  )
}

export function VaultLandmark({ params, animate, scale, groundRadius, tooltip }: LandmarkProps) {
  const { colors, pillars, snowfall, animationSpeed } = params as VaultParams
  const ring = useRef<THREE.Group>(null)
  const glow = useRef<THREE.ShaderMaterial>(null)
  const halo = useRef<THREE.Mesh>(null)
  /** The ice's radius in this landmark's own units, so outlying pieces follow the globe's curve. */
  const localRadius = groundRadius / scale
  const terrain = useTerrain(localRadius)
  const fissures = useFissures(localRadius)
  const ruins = useRuins(localRadius, pillars)
  useEffect(() => {
    CORE.color.set(colors.core)
    CORE.emissive.set(colors.core)
    SEAM.color.set(colors.seam)
    SEAM.emissive.set(colors.seam)
    GLYPH.color.set(colors.glyph)
    GLYPH.emissive.set(colors.glyph)
    FISSURE_A.color.set(colors.fissure)
    FISSURE_B.color.set(colors.fissureAlt)
    STONE.color.set(colors.stone)
    STONE_LIGHT.color.set(colors.stoneLight)
    CRATER_FLOOR.color.set(colors.crater)
    FROZEN.color.set(colors.frozen)
  }, [colors])
  const glowUniforms = useMemo(() => ({ uPulse: { value: 1 } }), [])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    // Slow breathing, never a flash: one full pulse about every five seconds.
    const pulse = animate ? 0.8 + Math.sin(t * 1.25 * animationSpeed) * 0.2 : 1
    CORE.emissiveIntensity = 1.4 * pulse
    SEAM.emissiveIntensity = 1.2 * pulse
    FISSURE_A.opacity = animate ? 0.55 + Math.sin(t * 0.9 * animationSpeed) * 0.3 : 0.8
    FISSURE_B.opacity = animate ? 0.55 + Math.sin(t * 0.9 * animationSpeed + 2.1) * 0.3 : 0.8
    if (glow.current?.uniforms.uPulse) glow.current.uniforms.uPulse.value = pulse
    if (halo.current) halo.current.scale.setScalar(0.075 * (0.92 + pulse * 0.12))
    if (animate && ring.current) ring.current.rotation.y += delta * 0.15 * animationSpeed
  })

  return (
    <group>
      <group>
        {terrain.map((piece) => (
          <mesh
            key={piece.id}
            geometry={piece.id.startsWith('peak') ? PEAK : piece.id.startsWith('rim') ? ICOSAHEDRON : BOX}
            material={piece.material}
            position={piece.position}
            quaternion={piece.quaternion}
            scale={piece.scale}
          />
        ))}
        {fissures.map((piece) => (
          <mesh
            key={piece.id}
            geometry={BOX}
            material={piece.material}
            position={piece.position}
            quaternion={piece.quaternion}
            scale={piece.scale}
          />
        ))}

        {/* The crater: a dark floor inside the broken rim, lit from below. */}
        <mesh position={[0, 0.002, 0]} material={CRATER_FLOOR}>
          <cylinderGeometry args={[0.3, 0.31, 0.012, 14]} />
        </mesh>
        <mesh position={[0, 0.0095, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={2}>
          <circleGeometry args={[0.3, 32]} />
          <shaderMaterial
            ref={glow}
            uniforms={glowUniforms}
            vertexShader={glowVertex}
            fragmentShader={glowFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <Vault ring={ring} />
        <mesh ref={halo} position={[0, 0.125, 0]} raycast={() => null}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshBasicMaterial color={colors.core} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <pointLight position={[0, 0.1, 0]} color={colors.core} intensity={1.3} distance={0.9} decay={2} />

        {ruins.pillars.map((pillar) => (
          <group key={pillar.id} position={pillar.position} quaternion={pillar.quaternion}>
            <Pillar height={pillar.height} crowned={pillar.crowned} />
          </group>
        ))}
        {ruins.crystals.map((piece) => (
          <mesh
            key={piece.id}
            geometry={OCTAHEDRON}
            material={piece.material}
            position={piece.position}
            quaternion={piece.quaternion}
            scale={piece.scale}
          />
        ))}

        {snowfall && <Snowfall reduced={!animate} />}
        {tooltip && (
          <Hotspot title={tooltip.title} description={tooltip.description} radius={0.34} height={0.08} labelHeight={0.38} />
        )}
      </group>
    </group>
  )
}
