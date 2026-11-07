import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Destination } from '@/data/destinations.ts'
import { kindLabel } from '@/data/destinations.ts'
import type { Vec3 } from '@/data/math.ts'
import { pointerTravel } from '@/globe/api.ts'
import { setGlobeCursor } from '@/globe/geometry.ts'
import { GLOBE_RADIUS } from '@/globe/geometry.ts'
import { Island } from '@/globe/Island.tsx'
import { Landmark } from '@/globe/landmarks.tsx'

const WORLD = new THREE.Vector3()
const PROJECT = new THREE.Vector3()
const CAM = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

function placement(normal: Vec3) {
  const direction = new THREE.Vector3(normal[0], normal[1], normal[2]).normalize()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction)
  const position = direction.multiplyScalar(GLOBE_RADIUS - 0.02)
  return { position, quaternion }
}

export function DestinationMarker({
  destination,
  selected,
  hovered,
  dimmed,
  reduced,
  wide,
  onSelect,
  onHover,
}: {
  destination: Destination
  selected: boolean
  hovered: boolean
  dimmed: boolean
  reduced: boolean
  wide: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const beaconRef = useRef<THREE.Mesh>(null)
  const pose = useMemo(() => placement(destination.position), [destination.position])
  const seed = destination.position[0] * 4 + destination.position[2]

  useFrame(({ clock, camera }) => {
    const group = groupRef.current
    const label = labelRef.current
    if (!group || !label) return
    group.getWorldPosition(WORLD)
    CAM.copy(WORLD).normalize()
    const camLength = Math.hypot(camera.position.x, camera.position.y, camera.position.z) || 1
    const facing =
      (CAM.x * camera.position.x + CAM.y * camera.position.y + CAM.z * camera.position.z) / camLength
    PROJECT.copy(WORLD).project(camera)
    const inFrame = wide
      ? PROJECT.x > -0.5 && PROJECT.x < 0.52 && PROJECT.y < 0.38 && PROJECT.y > -0.8
      : PROJECT.x > -0.82 && PROJECT.x < 0.82 && PROJECT.y < 0.18 && PROJECT.y > -0.36
    const visible = !dimmed && facing > 0.28 && inFrame
    const fade = visible ? Math.min(1, (facing - 0.28) / 0.3) : 0
    label.style.opacity = fade.toFixed(3)
    if (beaconRef.current && !reduced) {
      beaconRef.current.position.y = 0.58 + Math.sin(clock.elapsedTime * 2 + seed) * 0.025
    }
  })

  return (
    <group ref={groupRef} position={pose.position} quaternion={pose.quaternion} scale={dimmed ? 0.86 : 1}>
      <Island land={destination.land} sand={destination.sand} radius={0.24} seed={seed} />
      <Landmark id={destination.id} accent={destination.accent} />
      {(selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.3, 0.33, 40]} />
          <meshBasicMaterial
            color={selected ? '#f0c36a' : '#f7f4ee'}
            transparent
            opacity={selected ? 0.95 : 0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {(selected || hovered) && (
        <mesh ref={beaconRef} position={[0, 0.58, 0]}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshBasicMaterial color={selected ? '#f0c36a' : '#f7f4ee'} />
        </mesh>
      )}
      {dimmed && (
        <mesh position={[0, 0.08, 0]} raycast={() => null}>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshBasicMaterial color="#071422" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
      <mesh
        position={[0, 0.16, 0]}
        onPointerOver={(event) => {
          event.stopPropagation()
          onHover(destination.id)
          setGlobeCursor('pointer')
        }}
        onPointerOut={() => {
          onHover(null)
          setGlobeCursor('grab')
        }}
        onClick={(event) => {
          event.stopPropagation()
          if (pointerTravel.distance > 8) return
          onSelect(destination.id)
        }}
      >
        <sphereGeometry args={[0.34, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <Html position={[0, 0.7, 0]} center zIndexRange={[8, 0]} pointerEvents="none">
        <div ref={labelRef} className="pointer-events-none w-max select-none text-center">
          <div className="rounded-full bg-background/85 px-2.5 py-1 font-heading text-xs font-semibold text-foreground ring-1 ring-border">
            {destination.name}
          </div>
          {(selected || hovered) && (
            <div className="mt-1 text-xs font-medium tracking-wide text-foreground uppercase">
              {kindLabel(destination.kind)}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

export function Islet({
  position,
  seed,
  land,
  sand,
}: {
  position: Vec3
  seed: number
  land: string
  sand: string
}) {
  const pose = useMemo(() => placement(position), [position])
  const pine = seed > 2
  return (
    <group position={pose.position} quaternion={pose.quaternion}>
      <Island land={land} sand={sand} radius={0.11} seed={seed} />
      {pine ? (
        <group scale={0.7}>
          <mesh position={[0, 0.08, 0]}>
            <coneGeometry args={[0.04, 0.1, 6]} />
            <meshStandardMaterial color="#1d6840" roughness={0.8} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, 0.07, 0]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color="#1f8a45" roughness={0.75} />
        </mesh>
      )}
    </group>
  )
}
