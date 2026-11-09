import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CompiledLandmark, RuntimeLocation, Vec3 } from '@/runtime/configuration/registry-types.ts'
import { offsetOnSphere } from '@/runtime/configuration/sphere.ts'
import { useText } from '@/runtime/localization/index.tsx'
import { categoryOf, filterShows, settings, world } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { pointerTravel } from '@/engine/interactions/api.ts'
import { setGlobeCursor } from '@/engine/interactions/cursor.ts'
import { landmarkPresets } from '@/engine/landmarks/registry.tsx'
import type { LandmarkProps } from '@/engine/landmarks/types.ts'
import { PLATEAU, terrain } from '@/engine/terrain/index.ts'

/**
 * One location on the globe: its landmarks, and, if it is a selectable shore, its selection
 * ring, click target, and floating name label. Everything about it comes from configuration;
 * this component only knows how to draw what it is given.
 */

const GLOBE_RADIUS = settings.globe.radius
const WORLD = new THREE.Vector3()
const PROJECT = new THREE.Vector3()
const CAM = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)
const { selection } = world.theme.globe

type Pose = { position: THREE.Vector3; quaternion: THREE.Quaternion; groundRadius: number }

/** Stands something on the ground at a direction: on the surface, upright to the globe. */
function standAt(direction: Vec3, ground = terrain.surfaceAt(direction).height): Pose {
  const normal = new THREE.Vector3(...direction).normalize()
  const groundRadius = GLOBE_RADIUS + ground - 0.004
  return {
    position: normal.clone().multiplyScalar(groundRadius),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, normal),
    groundRadius,
  }
}

/** Where a landmark stands: offset along the surface from its anchor, lifted, then turned. */
function landmarkPose(landmark: CompiledLandmark): Pose {
  const [east, up, north] = landmark.position
  const direction = offsetOnSphere(landmark.anchor, east / GLOBE_RADIUS, north / GLOBE_RADIUS)
  const pose = standAt(direction)
  pose.position.addScaledVector(new THREE.Vector3(...direction), up)
  pose.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...landmark.rotation)))
  return pose
}

/** Expresses a pose relative to another, so it can sit inside that pose's group. */
function relativeTo(parent: Pose, child: Pose) {
  const inverse = parent.quaternion.clone().invert()
  return {
    position: child.position.clone().sub(parent.position).applyQuaternion(inverse),
    quaternion: inverse.clone().multiply(child.quaternion),
  }
}

export function LocationNode({ location }: { location: RuntimeLocation }) {
  const { t } = useText()
  const { selectedId, hoveredId, filter, reduced, setHoveredId, choose, enter } = useExplorer()
  const groupRef = useRef<THREE.Group>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const beaconRef = useRef<THREE.Mesh>(null)

  const selectable = location.interaction.selectable
  const selected = location.id === selectedId
  const hovered = location.id === hoveredId
  const dimmed = selectable && !filterShows(filter, location)
  const radius = location.interaction.markerRadius
  // A lobed shore's middle is open water (its bay), so its marker floats at plateau height.
  const pose = useMemo(
    () => standAt(location.position, location.terrain.type === 'lobes' ? PLATEAU : undefined),
    [location.position, location.terrain.type],
  )
  const landmarks = useMemo(
    () =>
      location.landmarks.map((landmark) => {
        const own = landmarkPose(landmark)
        return { landmark, own, relative: relativeTo(pose, own) }
      }),
    [location.landmarks, pose],
  )
  const seed = location.position[0] * 4 + location.position[2]
  const tooltip = useMemo(() => {
    if (selectable || !location.interaction.tooltipEnabled) return null
    return { title: t(location.display.nameKey), description: t(location.display.descriptionKey) }
  }, [selectable, location, t])

  useFrame(({ clock, camera }) => {
    const group = groupRef.current
    const label = labelRef.current
    if (!group || !label) return
    group.getWorldPosition(WORLD)
    CAM.copy(WORLD).normalize()
    const camLength = Math.hypot(camera.position.x, camera.position.y, camera.position.z) || 1
    const facing = (CAM.x * camera.position.x + CAM.y * camera.position.y + CAM.z * camera.position.z) / camLength
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

  const propsFor = (landmark: CompiledLandmark, own: Pose): LandmarkProps => ({
    params: landmark.params,
    accent: location.appearance.accent,
    animate: landmark.animate && !reduced,
    scale: landmark.scale,
    groundRadius: own.groundRadius,
    location,
    landmark,
    tooltip: tooltip && {
      title: tooltip.title,
      description: (landmark.params as { tooltipDescription?: boolean }).tooltipDescription ? tooltip.description : undefined,
    },
  })

  const globeSpace = landmarks.filter(({ landmark }) => landmarkPresets[landmark.preset].space === 'globe')
  const localSpace = landmarks.filter(({ landmark }) => landmarkPresets[landmark.preset].space === 'local')
  const category = categoryOf(location.category)

  return (
    <>
      {globeSpace.map(({ landmark, own }) => (
        <group key={landmark.id}>{landmarkPresets[landmark.preset].render(propsFor(landmark, own))}</group>
      ))}
      <group ref={groupRef} position={pose.position} quaternion={pose.quaternion} scale={dimmed ? 0.86 : 1}>
        {localSpace.map(({ landmark, own, relative }) => (
          <group key={landmark.id} position={relative.position} quaternion={relative.quaternion} scale={landmark.scale}>
            {landmarkPresets[landmark.preset].render(propsFor(landmark, own))}
          </group>
        ))}
        {selectable && (selected || hovered) && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[radius * (0.38 / 0.42), radius, 64]} />
            <meshBasicMaterial
              color={selected ? selection.selected : selection.hovered}
              transparent
              opacity={selected ? 0.95 : 0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        {selectable && (selected || hovered) && (
          <mesh ref={beaconRef} position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.028, 12, 12]} />
            <meshBasicMaterial color={selected ? selection.selected : selection.hovered} />
          </mesh>
        )}
        {dimmed && (
          <mesh position={[0, 0.1, 0]} raycast={() => null}>
            <sphereGeometry args={[radius * (0.4 / 0.42), 16, 12]} />
            <meshBasicMaterial color="#071422" transparent opacity={0.45} depthWrite={false} />
          </mesh>
        )}
        {selectable && (
          <mesh
            position={[0, 0.2, 0]}
            onPointerOver={(event) => {
              event.stopPropagation()
              setHoveredId(location.id)
              setGlobeCursor('pointer')
            }}
            onPointerOut={() => {
              setHoveredId(null)
              setGlobeCursor('grab')
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (pointerTravel.distance > settings.controls.clickTolerancePx) return
              // Clicking the island enters its world when it has one; otherwise it just selects it.
              if (!enter(location.id)) choose(location.id)
            }}
          >
            <sphereGeometry args={[radius, 16, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        )}
        {location.display.showLabel && (
          <Html position={[0, 0.84, 0]} center zIndexRange={[8, 0]} pointerEvents="none">
            <div ref={labelRef} className="pointer-events-none w-max select-none text-center">
              <div className="rounded-full bg-background/85 px-2.5 py-1 font-heading text-xs font-semibold text-foreground ring-1 ring-border">
                {t(location.display.nameKey)}
              </div>
              {(selected || hovered) && category && (
                <div className="mt-1 text-xs font-medium tracking-wide text-foreground uppercase">{t(category.labelKey)}</div>
              )}
            </div>
          </Html>
        )}
      </group>
    </>
  )
}
