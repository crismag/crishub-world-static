import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '@/data/math.ts'
import { smile } from '@/data/smile.ts'
import { surfaceAt } from '@/data/terrain.ts'
import { GLOBE_RADIUS } from '@/globe/geometry.ts'
import { Palm, Pine } from '@/globe/landmarks.tsx'
import { toonRamp } from '@/globe/Planet.tsx'

/**
 * Dressing for the smiling side of the planet: dense pine forest on the eye islands, a few
 * palms along the smile, and one snowy peak on the nose. Everything stands on the real
 * terrain, so from other angles it is just more scenery.
 */

const UP = new THREE.Vector3(0, 1, 0)

type Prop = {
  id: string
  kind: 'pine' | 'palm' | 'peak'
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: number
}

function standOn(direction: THREE.Vector3, turn: number): { position: THREE.Vector3; quaternion: THREE.Quaternion } | null {
  const ground = surfaceAt([direction.x, direction.y, direction.z])
  if (ground.height < 0.02) return null
  return {
    position: direction.clone().multiplyScalar(GLOBE_RADIUS + ground.height - 0.004),
    quaternion: new THREE.Quaternion()
      .setFromUnitVectors(UP, direction)
      .multiply(new THREE.Quaternion().setFromAxisAngle(UP, turn)),
  }
}

function dress(): Prop[] {
  const random = mulberry32(808)
  const props: Prop[] = []
  for (const feature of smile.features) {
    if (!feature.dress) continue
    const center = new THREE.Vector3(...feature.position)
    const east = new THREE.Vector3(center.z, 0, -center.x).normalize()
    const north = new THREE.Vector3().crossVectors(center, east).normalize()
    const cos = Math.cos(feature.localHeading)
    const sin = Math.sin(feature.localHeading)
    // Scatter points inside the island's oval, then keep the ones on dry land.
    const count = feature.dress === 'forest' ? Math.round(6 + (feature.rx / 0.06) * 12) : feature.dress === 'palms' ? 2 : 1
    for (let i = 0, placed = 0; i < count * 4 && placed < count; i++) {
      const spread = feature.dress === 'peak' ? 0 : 0.8
      const angle = random() * Math.PI * 2
      const reach = Math.sqrt(random()) * spread
      const along = Math.cos(angle) * reach * feature.rx
      const across = Math.sin(angle) * reach * feature.ry
      const u = along * cos - across * sin
      const v = along * sin + across * cos
      const direction = center.clone().addScaledVector(east, u).addScaledVector(north, v).normalize()
      const spot = standOn(direction, random() * Math.PI * 2)
      if (!spot) continue
      const kind = feature.dress === 'forest' ? 'pine' : feature.dress === 'palms' ? 'palm' : 'peak'
      props.push({
        id: `${feature.id}-${i}`,
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

const WORLD = new THREE.Vector3()
const VIEW = new THREE.Vector3()

/** The optional line, shown only when the face turns toward the viewer. Off unless smile.message is set. */
function SmileNotice({ message }: { message: string }) {
  const anchor = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const position = useMemo(() => new THREE.Vector3(...smile.center).multiplyScalar(GLOBE_RADIUS + 0.9), [])
  useFrame(({ camera }) => {
    if (!anchor.current || !label.current) return
    anchor.current.getWorldPosition(WORLD)
    const facing = WORLD.normalize().dot(VIEW.copy(camera.position).normalize())
    label.current.style.opacity = facing > 0.97 ? '1' : '0'
  })
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

export function SmileScenery() {
  const props = useMemo(() => dress(), [])
  return (
    <group>
      {props.map((prop) => (
        <group key={prop.id} position={prop.position} quaternion={prop.quaternion} scale={prop.scale}>
          {prop.kind === 'pine' && <Pine />}
          {prop.kind === 'palm' && <Palm />}
          {prop.kind === 'peak' && <Peak />}
        </group>
      ))}
      {smile.message && <SmileNotice message={smile.message} />}
    </group>
  )
}
