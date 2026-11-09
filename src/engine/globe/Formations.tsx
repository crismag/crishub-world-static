import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CompiledFormationIsland } from '@/runtime/configuration/registry-types.ts'
import { useText } from '@/runtime/localization/index.tsx'
import { getFormation, settings, world } from '@/runtime/world-registry/index.ts'
import { toonRamp } from '@/engine/effects/materials.ts'
import { Palm, Pine } from '@/engine/landmarks/classic.tsx'
import { mulberry32, terrain } from '@/engine/terrain/index.ts'

/**
 * Dressing for decorative formations (formations/*.json): pine forest, palms, and peaks on
 * island arrangements such as the smiling hemisphere, and trees on the scattered islets.
 * Everything stands on the real terrain, so from most angles it is simply scenery.
 */

const GLOBE_RADIUS = settings.globe.radius
const UP = new THREE.Vector3(0, 1, 0)

type Prop = {
  id: string
  kind: 'pine' | 'palm' | 'peak'
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: number
}

function standOn(direction: THREE.Vector3, turn: number): { position: THREE.Vector3; quaternion: THREE.Quaternion } | null {
  const ground = terrain.surfaceAt([direction.x, direction.y, direction.z])
  if (ground.height < 0.02) return null
  return {
    position: direction.clone().multiplyScalar(GLOBE_RADIUS + ground.height - 0.004),
    quaternion: new THREE.Quaternion()
      .setFromUnitVectors(UP, direction)
      .multiply(new THREE.Quaternion().setFromAxisAngle(UP, turn)),
  }
}

/** Scatters trees (or a peak) inside each dressed island's oval, keeping the ones on dry land. */
function dress(islands: readonly CompiledFormationIsland[]): Prop[] {
  const random = mulberry32(808)
  const props: Prop[] = []
  for (const island of islands) {
    if (!island.dress || island.dress === 'pines') continue
    const center = new THREE.Vector3(...island.position)
    const east = new THREE.Vector3(center.z, 0, -center.x).normalize()
    const north = new THREE.Vector3().crossVectors(center, east).normalize()
    const cos = Math.cos(island.heading)
    const sin = Math.sin(island.heading)
    const count = island.dress === 'forest' ? Math.round(6 + (island.rx / 0.06) * 12) : island.dress === 'palms' ? 2 : 1
    for (let i = 0, placed = 0; i < count * 4 && placed < count; i++) {
      const spread = island.dress === 'peak' ? 0 : 0.8
      const angle = random() * Math.PI * 2
      const reach = Math.sqrt(random()) * spread
      const along = Math.cos(angle) * reach * island.rx
      const across = Math.sin(angle) * reach * island.ry
      const u = along * cos - across * sin
      const v = along * sin + across * cos
      const direction = center.clone().addScaledVector(east, u).addScaledVector(north, v).normalize()
      const spot = standOn(direction, random() * Math.PI * 2)
      if (!spot) continue
      const kind = island.dress === 'forest' ? 'pine' : island.dress === 'palms' ? 'palm' : 'peak'
      props.push({
        id: `${island.id}-${i}`,
        kind,
        ...spot,
        scale: kind === 'pine' ? 1.1 + random() * 0.6 : kind === 'palm' ? 1.1 + random() * 0.3 : 1,
      })
      placed++
    }
  }
  return props
}

/** One low-poly mountain with a snowy cap. */
function Peak() {
  return (
    <group>
      <mesh position={[0, 0.09, 0]}>
        <coneGeometry args={[0.1, 0.18, 6]} />
        <meshToonMaterial color="#7d7062" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.155, 0]}>
        <coneGeometry args={[0.04, 0.055, 6]} />
        <meshToonMaterial color="#f4f8fb" gradientMap={toonRamp} />
      </mesh>
    </group>
  )
}

/** A small islet's pair of trees, standing at its center. */
function IsletTrees({ island }: { island: CompiledFormationIsland }) {
  const pose = useMemo(() => {
    const direction = new THREE.Vector3(...island.position).normalize()
    const ground = terrain.surfaceAt(island.position).height
    return {
      position: direction.clone().multiplyScalar(GLOBE_RADIUS + ground - 0.004),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, direction),
    }
  }, [island.position])
  return (
    <group position={pose.position} quaternion={pose.quaternion} scale={1.3}>
      {island.dress === 'pines' ? (
        <>
          <Pine position={[-0.05, 0, 0.02]} />
          <Pine position={[0.06, 0, -0.03]} scale={0.75} />
        </>
      ) : (
        <>
          <Palm position={[-0.04, 0, 0.02]} />
          <Palm position={[0.05, 0, -0.02]} scale={0.8} />
        </>
      )}
    </group>
  )
}

const WORLD = new THREE.Vector3()
const VIEW = new THREE.Vector3()

/** The optional discovery line, shown only when the formation turns squarely toward the viewer. */
function DiscoveryNotice({ formationId, message, alignment }: { formationId: string; message: string; alignment: number }) {
  const anchor = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const center = getFormation(formationId)?.center
  const position = useMemo(() => (center ? new THREE.Vector3(...center).multiplyScalar(GLOBE_RADIUS + 0.9) : null), [center])
  useFrame(({ camera }) => {
    if (!anchor.current || !label.current) return
    anchor.current.getWorldPosition(WORLD)
    const facing = WORLD.normalize().dot(VIEW.copy(camera.position).normalize())
    label.current.style.opacity = facing > alignment ? '1' : '0'
  })
  if (!position) return null
  return (
    <group ref={anchor} position={position}>
      <Html center zIndexRange={[9, 0]} pointerEvents="none">
        <div
          ref={label}
          className="pointer-events-none w-max select-none rounded-full bg-background/80 px-3 py-1 font-heading text-xs text-foreground opacity-0 ring-1 ring-border transition-opacity duration-700"
        >
          {message}
        </div>
      </Html>
    </group>
  )
}

export function Formations() {
  const { t } = useText()
  const arranged = useMemo(() => world.formations.filter((formation) => formation.type === 'island-arrangement'), [])
  const props = useMemo(() => dress(arranged.flatMap((formation) => formation.islands)), [arranged])
  const islets = useMemo(
    () => world.formations.filter((formation) => formation.type === 'islets').flatMap((formation) => formation.islands),
    [],
  )
  const greeting = settings.discovery.smileGreeting
  return (
    <group>
      {props.map((prop) => (
        <group key={prop.id} position={prop.position} quaternion={prop.quaternion} scale={prop.scale}>
          {prop.kind === 'pine' && <Pine />}
          {prop.kind === 'palm' && <Palm />}
          {prop.kind === 'peak' && <Peak />}
        </group>
      ))}
      {islets.map((island) => (
        <IsletTrees key={island.id} island={island} />
      ))}
      {greeting.enabled && (
        <DiscoveryNotice formationId={greeting.formation} message={t(greeting.messageKey)} alignment={greeting.alignment} />
      )}
    </group>
  )
}
