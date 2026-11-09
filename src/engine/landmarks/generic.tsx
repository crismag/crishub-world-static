import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type * as THREE from 'three'
import type { CrystalParams, GroveParams, MountainParams, TowerParams } from '@/runtime/configuration/landmark-params.ts'
import { Palm, Pine, Solid } from '@/engine/landmarks/classic.tsx'
import type { LandmarkProps } from '@/engine/landmarks/types.ts'
import { mulberry32 } from '@/engine/terrain/noise.ts'

/**
 * General-purpose landmarks for new shores that have no bespoke model yet. Each is shaped by
 * its params (landmark-params.ts lists them with their defaults). Same scale as every other
 * landmark: about 0.25 across before the landmark's own scale, standing on y = 0.
 */

/** A round tower with a conical roof and lit windows. */
export function TowerLandmark({ params, accent }: LandmarkProps) {
  const { height, radius, color, roof, windows } = params as TowerParams
  return (
    <group>
      <Solid position={[0, height / 2, 0]} color={color} roughness={0.7}>
        <cylinderGeometry args={[radius * 0.9, radius, height, 12]} />
      </Solid>
      <Solid position={[0, height + radius * 0.6, 0]} color={roof} roughness={0.6}>
        <coneGeometry args={[radius * 1.25, radius * 1.4, 12]} />
      </Solid>
      {windows &&
        [0.35, 0.65].map((level) => (
          <Solid key={level} position={[0, height * level, radius * 0.96]} color={accent} emissive={accent} emissiveIntensity={0.8}>
            <boxGeometry args={[radius * 0.4, radius * 0.5, 0.006]} />
          </Solid>
        ))}
    </group>
  )
}

/** A cluster of glowing crystals that slowly pulse. */
export function CrystalLandmark({ params, animate }: LandmarkProps) {
  const { height, color, count, glow } = params as CrystalParams
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const shards = useMemo(() => {
    const random = mulberry32(count * 31 + Math.round(height * 1000))
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + random() * 0.6
      const reach = index === 0 ? 0 : 0.04 + random() * 0.05
      const tall = index === 0 ? height : height * (0.45 + random() * 0.4)
      return {
        id: index,
        position: [Math.cos(angle) * reach, tall / 2, Math.sin(angle) * reach] as [number, number, number],
        rotation: [(random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5] as [number, number, number],
        scale: [tall * 0.22, tall / 2, tall * 0.22] as [number, number, number],
      }
    })
  }, [count, height])
  useFrame(({ clock }) => {
    if (!material.current || !glow) return
    material.current.emissiveIntensity = animate ? 0.9 + Math.sin(clock.elapsedTime * 1.6) * 0.3 : 0.9
  })
  return (
    <group>
      {shards.map((shard) => (
        <mesh key={shard.id} position={shard.position} rotation={shard.rotation} scale={shard.scale}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            ref={shard.id === 0 ? material : undefined}
            color={color}
            emissive={color}
            emissiveIntensity={glow ? 0.9 : 0}
            roughness={0.15}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

/** One low-poly mountain, optionally snow-capped. */
export function MountainLandmark({ params }: LandmarkProps) {
  const { height, radius, color, snowCap } = params as MountainParams
  return (
    <group>
      <Solid position={[0, height / 2, 0]} color={color} roughness={0.9} metalness={0}>
        <coneGeometry args={[radius, height, 6]} />
      </Solid>
      {snowCap && (
        <Solid position={[0, height * 0.86, 0]} color="#f4f8fb" roughness={0.8} metalness={0}>
          <coneGeometry args={[radius * 0.4, height * 0.3, 6]} />
        </Solid>
      )}
    </group>
  )
}

function useGrove({ count, radius, seed }: GroveParams) {
  return useMemo(() => {
    const random = mulberry32(seed)
    return Array.from({ length: count }, (_, index) => {
      const angle = random() * Math.PI * 2
      const reach = Math.sqrt(random()) * radius
      return {
        id: index,
        position: [Math.cos(angle) * reach, 0, Math.sin(angle) * reach] as [number, number, number],
        scale: 0.75 + random() * 0.5,
      }
    })
  }, [count, radius, seed])
}

export function PineGroveLandmark({ params }: LandmarkProps) {
  const trees = useGrove(params as GroveParams)
  return (
    <group>
      {trees.map((tree) => (
        <Pine key={tree.id} position={tree.position} scale={tree.scale} />
      ))}
    </group>
  )
}

export function PalmGroveLandmark({ params }: LandmarkProps) {
  const trees = useGrove(params as GroveParams)
  return (
    <group>
      {trees.map((tree) => (
        <Palm key={tree.id} position={tree.position} scale={tree.scale} />
      ))}
    </group>
  )
}
