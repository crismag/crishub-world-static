import { Html } from '@react-three/drei'
import { useFrame, useLoader } from '@react-three/fiber'
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { BackdropPlanet } from '@/runtime/configuration/registry-types.ts'
import { useText } from '@/runtime/localization/index.tsx'
import { world } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { pointerTravel } from '@/engine/interactions/api.ts'
import { setGlobeCursor } from '@/engine/interactions/cursor.ts'
import { mulberry32 } from '@/engine/terrain/noise.ts'

/**
 * Distant planets far behind the globe (settings/backdrop.json). They are scenery: they stay
 * put while the globe turns, show their name on hover, and open their own world on click when
 * they have an `entry`. Without one, clicking them does nothing.
 */

const WIDTH = 512
const HEIGHT = 256

function mix(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, Math.min(1, Math.max(0, t)))
}

/** A few random sine waves, for cheap seeded turbulence. */
function waves(seed: number, count: number) {
  const random = mulberry32(seed)
  const list = Array.from({ length: count }, () => ({
    fx: 1 + Math.floor(random() * 6),
    fy: 1 + random() * 8,
    phase: random() * Math.PI * 2,
    weight: 0.4 + random(),
  }))
  const total = list.reduce((sum, wave) => sum + wave.weight, 0)
  return (u: number, v: number) =>
    list.reduce((sum, wave) => sum + Math.sin(u * Math.PI * 2 * wave.fx + v * wave.fy * Math.PI + wave.phase) * wave.weight, 0) / total
}

/** Paints a planet's surface into a texture wrapped around its sphere (equirectangular). */
function paintSurface(look: Extract<BackdropPlanet['look'], { type: 'painted' }>): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  if (!context) return texture
  const colors = look.colors.map((hex) => new THREE.Color(hex))
  const image = context.createImageData(WIDTH, HEIGHT)
  const turbulence = waves(look.seed, 6)
  const detail = waves(look.seed + 101, 9)
  const random = mulberry32(look.seed + 7)
  const spot = { u: 0.25 + random() * 0.5, v: 0.6 + random() * 0.08 }
  for (let y = 0; y < HEIGHT; y++) {
    const v = y / HEIGHT
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH
      let color: THREE.Color
      if (look.style === 'banded') {
        // Belts and zones: latitude bands, bent by turbulence.
        const band = (v * 9 + turbulence(u, v) * 0.6 + detail(u * 2, v * 3) * 0.15) % colors.length
        const index = Math.floor(band)
        color = mix(colors[index]!, colors[(index + 1) % colors.length]!, (band - index) ** 3)
        // One great oval storm.
        const du = (u - spot.u) / 0.07
        const dv = (v - spot.v) / 0.035
        const inStorm = du * du + dv * dv
        if (inStorm < 1) color = mix(color, new THREE.Color('#b5523b'), (1 - inStorm) * 1.4)
      } else {
        // Dusty plains with darker regions, and white ice at both poles.
        const plains = turbulence(u, v) * 0.7 + detail(u * 3, v * 2) * 0.3
        const level = Math.min(colors.length - 1, Math.max(0, (plains + 0.6) * (colors.length - 1)))
        const index = Math.floor(level)
        color = mix(colors[index]!, colors[Math.min(index + 1, colors.length - 1)]!, level - index)
        const polar = Math.abs(v - 0.5) * 2 + detail(u * 4, v) * 0.03
        if (polar > 0.88) color = mix(color, new THREE.Color('#f4f1ec'), (polar - 0.88) * 12)
      }
      const offset = (y * WIDTH + x) * 4
      image.data[offset] = Math.round(color.r * 255)
      image.data[offset + 1] = Math.round(color.g * 255)
      image.data[offset + 2] = Math.round(color.b * 255)
      image.data[offset + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  texture.needsUpdate = true
  return texture
}

function PaintedSurface({ look, radius }: { look: Extract<BackdropPlanet['look'], { type: 'painted' }>; radius: number }) {
  const texture = useMemo(() => paintSurface(look), [look])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <>
      <mesh>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>
      {look.ring && (
        <mesh rotation={[Math.PI / 2 - 0.3, 0, 0]} raycast={() => null}>
          <ringGeometry args={[radius * 1.35, radius * 2.1, 64]} />
          <meshBasicMaterial color={look.colors[1] ?? '#d9b48a'} transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  )
}

/** A registered image, shown as a flat disc that always faces the viewer. */
function ImageSurface({ path, radius }: { path: string; radius: number }) {
  const texture = useLoader(THREE.TextureLoader, path)
  return (
    <sprite scale={[radius * 2, radius * 2, 1]}>
      <spriteMaterial map={texture} />
    </sprite>
  )
}

/** A missing or broken image leaves an empty spot in the sky instead of breaking the globe. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function Planet({ planet }: { planet: BackdropPlanet }) {
  const { t } = useText()
  const { reduced, enter } = useExplorer()
  const body = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  useFrame((_, delta) => {
    if (body.current && !reduced) body.current.rotation.y += Math.min(delta, 0.05) * planet.spin
  })
  return (
    <group position={planet.position} rotation={[0, 0, planet.tilt]}>
      <group
        ref={body}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          setGlobeCursor(planet.entry ? 'pointer' : 'grab')
        }}
        onPointerOut={() => {
          setHovered(false)
          setGlobeCursor('grab')
        }}
        onClick={(event) => {
          event.stopPropagation()
          if (pointerTravel.distance > world.settings.controls.clickTolerancePx) return
          enter(planet.id)
        }}
      >
        {planet.look.type === 'painted' ? (
          <PaintedSurface look={planet.look} radius={planet.radius} />
        ) : (
          <Quiet>
            <Suspense fallback={null}>
              <ImageSurface path={planet.look.assetPath} radius={planet.radius} />
            </Suspense>
          </Quiet>
        )}
      </group>
      {hovered && (
        <Html position={[0, -planet.radius * 1.4, 0]} center zIndexRange={[8, 0]} pointerEvents="none">
          <div className="pointer-events-none w-max select-none rounded-full bg-background/85 px-2.5 py-1 font-heading text-xs font-semibold text-foreground ring-1 ring-border">
            {t(planet.nameKey)}
          </div>
        </Html>
      )}
    </group>
  )
}

export function Backdrop() {
  return (
    <group>
      {world.backdrop.map((planet) => (
        <Planet key={planet.id} planet={planet} />
      ))}
    </group>
  )
}
