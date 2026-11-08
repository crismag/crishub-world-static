import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { pointerTravel } from '@/globe/api.ts'
import { setGlobeCursor } from '@/globe/geometry.ts'

const WORLD = new THREE.Vector3()
const VIEW = new THREE.Vector3()

/**
 * An invisible hover and click target with a small tooltip, shared by both poles.
 * Hover shows the title; a click pins it until the next click elsewhere. The tooltip
 * hides whenever its pole faces away from the viewer.
 */
export function PoleHotspot({
  title,
  description,
  radius,
  height,
  labelHeight,
}: {
  title: string
  description?: string
  /** Radius of the invisible target sphere. */
  radius: number
  /** Height of the target's center above the ground. */
  height: number
  /** Height of the tooltip above the ground. */
  labelHeight: number
}) {
  const anchor = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)

  useFrame(({ camera }) => {
    if (!label.current || !anchor.current) return
    anchor.current.getWorldPosition(WORLD)
    const facing = WORLD.normalize().dot(VIEW.copy(camera.position).normalize())
    label.current.style.opacity = facing > 0.2 ? '1' : '0'
  })

  return (
    <group ref={anchor}>
      <mesh
        position={[0, height, 0]}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          setGlobeCursor('pointer')
        }}
        onPointerOut={() => {
          setHovered(false)
          setGlobeCursor('grab')
        }}
        onClick={(event) => {
          event.stopPropagation()
          if (pointerTravel.distance > 8) return
          setPinned((value) => !value)
        }}
        onPointerMissed={() => setPinned(false)}
      >
        <sphereGeometry args={[radius, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {(hovered || pinned) && (
        <Html position={[0, labelHeight, 0]} center zIndexRange={[9, 0]} pointerEvents="none">
          <div
            ref={label}
            role="status"
            className="pointer-events-none max-w-64 select-none rounded-2xl bg-background/85 px-3 py-1.5 text-center ring-1 ring-border"
          >
            <div className="w-max max-w-60 font-heading text-xs font-semibold text-foreground">{title}</div>
            {description && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</div>}
          </div>
        </Html>
      )}
    </group>
  )
}
