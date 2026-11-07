import { useMemo } from 'react'
import * as THREE from 'three'
import { createIslandGeometry } from '@/globe/geometry.ts'

export function Island({
  land,
  sand,
  radius,
  seed,
}: {
  land: string
  sand: string
  radius: number
  seed: number
}) {
  const geometry = useMemo(() => createIslandGeometry(radius, seed), [radius, seed])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, seed]} position={[0, 0.003, 0]}>
        <ringGeometry args={[radius * 0.9, radius * 1.18, 14]} />
        <meshStandardMaterial color={sand} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={land} roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh position={[radius * 0.62, 0.04, radius * 0.18]} scale={0.045 + (seed % 0.4) * 0.02}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={sand} roughness={0.8} />
      </mesh>
    </group>
  )
}
