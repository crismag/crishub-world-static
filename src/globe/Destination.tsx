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
import { PLATEAU, surfaceAt } from '@/data/terrain.ts'
import { Landmark, Palm, Pine } from '@/globe/landmarks.tsx'

const WORLD = new THREE.Vector3()
const PROJECT = new THREE.Vector3()
const CAM = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)
/** Landmarks are drawn larger than life, so the planet reads as a small toy world. */
const LANDMARK_SCALE = 1.3

function placement(normal: Vec3, ground?: number) {
  const direction = new THREE.Vector3(normal[0], normal[1], normal[2]).normalize()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction)
  const height = ground ?? surfaceAt([direction.x, direction.y, direction.z]).height
  const position = direction.multiplyScalar(GLOBE_RADIUS + height - 0.004)
  return { position, quaternion }
}

/** Where each site's landmark stands, relative to the shore's own marker group. */
function sitePoses(destination: Destination, pose: { position: THREE.Vector3; quaternion: THREE.Quaternion }) {
  const inverse = pose.quaternion.clone().invert()
  return (destination.sites ?? []).map((site) => {
    const own = placement(site.position)
    return {
      id: site.id,
      landmark: site.landmark,
      position: own.position.clone().sub(pose.position).applyQuaternion(inverse),
      quaternion: inverse.clone().multiply(own.quaternion),
    }
  })
}

export function DestinationMarker({
  destination,
  selected,
  hovered,
  dimmed,
  reduced,
  onSelect,
  onHover,
}: {
  destination: Destination
  selected: boolean
  hovered: boolean
  dimmed: boolean
  reduced: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const beaconRef = useRef<THREE.Mesh>(null)
  // A multi-site shore's middle is open water (its bay), so its marker floats at plateau height.
  const pose = useMemo(
    () => placement(destination.position, destination.sites ? PLATEAU : undefined),
    [destination.position, destination.sites],
  )
  const sites = useMemo(() => sitePoses(destination, pose), [destination, pose])
  /** Rings, hit targets, and dimming grow to cover every lobe of a multi-site shore. */
  const size = destination.sites ? 2 : 1
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
    // Keep labels clear of the screen edges and the small controls along the bottom.
    const inFrame = Math.abs(PROJECT.x) < 0.9 && PROJECT.y < 0.9 && PROJECT.y > -0.72
    const visible = !dimmed && facing > 0.28 && inFrame
    const fade = visible ? Math.min(1, (facing - 0.28) / 0.3) : 0
    label.style.opacity = fade.toFixed(3)
    if (beaconRef.current && !reduced) {
      beaconRef.current.position.y = 0.72 + Math.sin(clock.elapsedTime * 2 + seed) * 0.025
    }
  })

  return (
    <group ref={groupRef} position={pose.position} quaternion={pose.quaternion} scale={dimmed ? 0.86 : 1}>
      {sites.length > 0 ? (
        sites.map((site) => (
          <group key={site.id} position={site.position} quaternion={site.quaternion} scale={LANDMARK_SCALE}>
            <Landmark id={site.landmark} accent={destination.accent} reduced={reduced} />
          </group>
        ))
      ) : (
        <group scale={LANDMARK_SCALE}>
          <Landmark id={destination.id} accent={destination.accent} reduced={reduced} />
        </group>
      )}
      {(selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.38 * size, 0.42 * size, 64]} />
          <meshBasicMaterial
            color={selected ? '#f0c36a' : '#f7f4ee'}
            transparent
            opacity={selected ? 0.95 : 0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {(selected || hovered) && (
        <mesh ref={beaconRef} position={[0, 0.72, 0]}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshBasicMaterial color={selected ? '#f0c36a' : '#f7f4ee'} />
        </mesh>
      )}
      {dimmed && (
        <mesh position={[0, 0.1, 0]} raycast={() => null}>
          <sphereGeometry args={[0.4 * size, 16, 12]} />
          <meshBasicMaterial color="#071422" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
      <mesh
        position={[0, 0.2, 0]}
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
        <sphereGeometry args={[0.42 * size, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <Html position={[0, 0.84, 0]} center zIndexRange={[8, 0]} pointerEvents="none">
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

export function Islet({ position, seed }: { position: Vec3; seed: number }) {
  const pose = useMemo(() => placement(position), [position])
  if (seed > 2) {
    return (
      <group position={pose.position} quaternion={pose.quaternion} scale={1.3}>
        <Pine position={[-0.05, 0, 0.02]} />
        <Pine position={[0.06, 0, -0.03]} scale={0.75} />
      </group>
    )
  }
  return (
    <group position={pose.position} quaternion={pose.quaternion} scale={1.3}>
      <Palm position={[-0.04, 0, 0.02]} />
      <Palm position={[0.05, 0, -0.02]} scale={0.8} />
    </group>
  )
}
