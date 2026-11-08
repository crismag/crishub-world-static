import { Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { destinations, matchesFilter, scenery, type DestinationFilter } from '@/data/destinations.ts'
import { clamp, type Vec3 } from '@/data/math.ts'
import { globeApi, pointerTravel } from '@/globe/api.ts'
import { setGlobeCursor } from '@/globe/geometry.ts'
import { DRAG, OPENING, facing, roll, spinOnAxis } from '@/globe/orientation.ts'
import { DestinationMarker, Islet } from '@/globe/Destination.tsx'
import { Atmosphere, Clouds, Land, Ocean } from '@/globe/Planet.tsx'
import { NorthPoleLandmark } from '@/globe/NorthPole.tsx'
import { SmileScenery } from '@/globe/Smile.tsx'
import { SouthPoleLandmark } from '@/globe/SouthPole.tsx'
import { ProgrammingLetters, ProgrammingScenery } from '@/globe/Programming.tsx'

const CAMERA_MIN = 6.8
const CAMERA_MAX = 16.9
/** Open fully zoomed out, so the whole small planet and its clouds fit on screen. */
const CAMERA_DEFAULT = CAMERA_MAX
/** Seconds of quiet before the planet starts turning on its own. */
const IDLE_DELAY = 2.4
/**
 * Radians per second of the idle turn at 1× speed, about one revolution a minute. The turn is
 * around the planet's own north–south axis, west to east as Earth turns, wherever that axis points.
 */
const AUTO_SPIN = 0.1

function GlobeRig({
  selectedId,
  reduced,
  spin,
  children,
}: {
  selectedId: string | null
  reduced: boolean
  /** Multiplier on the idle turn. 0 holds the planet still. */
  spin: number
  children: ReactNode
}) {
  const spinRef = useRef(spin)
  useEffect(() => {
    spinRef.current = spin
  }, [spin])
  const group = useRef<THREE.Group>(null)
  const camera = useThree((state) => state.camera)
  const getThree = useThree((state) => state.get)
  /** Set while easing toward a chosen orientation: a shore, or the opening view. */
  const target = useRef<THREE.Quaternion | null>(null)
  const distance = useRef(CAMERA_DEFAULT)
  const dragging = useRef(false)
  // Start past the idle delay, so the planet is already turning when the page opens.
  const idle = useRef(IDLE_DELAY)
  /** Coasting after a flick: pixels per second along the screen's x and y. */
  const velocity = useRef({ x: 0, y: 0 })

  useLayoutEffect(() => {
    group.current?.quaternion.copy(OPENING)
  }, [])

  const stop = () => {
    idle.current = 0
    velocity.current.x = 0
    velocity.current.y = 0
  }

  useEffect(() => {
    const destination = destinations.find((item) => item.id === selectedId)
    if (!destination || !group.current) return
    target.current = facing(group.current.quaternion, destination.position)
    stop()
  }, [selectedId])

  useEffect(() => {
    globeApi.focus = (position: Vec3) => {
      if (!group.current) return
      target.current = facing(group.current.quaternion, position)
      stop()
    }
    globeApi.reset = () => {
      target.current = OPENING.clone()
      distance.current = CAMERA_DEFAULT
      stop()
    }
    globeApi.zoomBy = (delta) => {
      distance.current = clamp(distance.current + delta, CAMERA_MIN, CAMERA_MAX)
    }
    globeApi.nudge = (dx, dy) => {
      if (!group.current) return
      target.current = null
      stop()
      roll(group.current.quaternion, camera, dx, dy)
    }
    return () => {
      globeApi.focus = () => {}
      globeApi.reset = () => {}
      globeApi.zoomBy = () => {}
      globeApi.nudge = () => {}
    }
  }, [camera])

  useEffect(() => {
    const element = getThree().gl.domElement
    element.dataset.globe = 'true'
    // One finger turns the globe and two pinch-zoom; the page itself never scrolls here.
    element.style.touchAction = 'none'
    setGlobeCursor('grab')
    const pointers = new Map<number, { x: number; y: number }>()
    let lastX = 0
    let lastY = 0
    let lastTime = 0
    let pinch = 0

    const onDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      element.setPointerCapture(event.pointerId)
      if (pointers.size === 1) {
        dragging.current = true
        target.current = null
        stop()
        lastX = event.clientX
        lastY = event.clientY
        lastTime = performance.now()
        pointerTravel.distance = 0
        pinch = 0
        setGlobeCursor('grabbing')
      }
    }
    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId) || !group.current) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()]
        if (!a || !b) return
        const span = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch > 0) {
          distance.current = clamp(distance.current + (pinch - span) * 0.012, CAMERA_MIN, CAMERA_MAX)
          pointerTravel.distance += Math.abs(pinch - span)
        }
        pinch = span
        return
      }
      if (!dragging.current) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      const now = performance.now()
      const dt = Math.max((now - lastTime) / 1000, 0.008)
      lastX = event.clientX
      lastY = event.clientY
      lastTime = now
      pointerTravel.distance += Math.hypot(dx, dy)
      roll(group.current.quaternion, camera, dx, dy)
      // Pixels per second, capped so a hard flick still settles quickly.
      const cap = 2.4 / DRAG
      velocity.current.x = clamp(dx / dt, -cap, cap)
      velocity.current.y = clamp(dy / dt, -cap, cap)
      idle.current = 0
    }
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size === 0) {
        dragging.current = false
        pinch = 0
        setGlobeCursor('grab')
        return
      }
      // One finger left after a pinch: carry on dragging from where it is now, without a jump.
      const [rest] = [...pointers.values()]
      if (rest) {
        lastX = rest.x
        lastY = rest.y
        lastTime = performance.now()
        pinch = 0
        velocity.current.x = 0
        velocity.current.y = 0
      }
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      distance.current = clamp(distance.current + event.deltaY * 0.0035, CAMERA_MIN, CAMERA_MAX)
    }
    const onContext = (event: Event) => event.preventDefault()

    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerup', onUp)
    element.addEventListener('pointercancel', onUp)
    element.addEventListener('wheel', onWheel, { passive: false })
    element.addEventListener('contextmenu', onContext)
    return () => {
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerup', onUp)
      element.removeEventListener('pointercancel', onUp)
      element.removeEventListener('wheel', onWheel)
      element.removeEventListener('contextmenu', onContext)
    }
  }, [getThree, camera])

  useFrame((_, delta) => {
    const globe = group.current
    if (!globe) return
    const step = Math.min(delta, 0.05)
    if (target.current) {
      // Ease along the shortest arc toward the chosen orientation.
      globe.quaternion.slerp(target.current, reduced ? 1 : 1 - Math.exp(-5 * step))
      if (globe.quaternion.angleTo(target.current) < 0.004) {
        globe.quaternion.copy(target.current)
        target.current = null
      }
    } else if (!dragging.current) {
      const speed = Math.hypot(velocity.current.x, velocity.current.y)
      if (speed * DRAG > 0.02) {
        roll(globe.quaternion, camera, velocity.current.x * step, velocity.current.y * step)
        const decay = Math.exp(-2.3 * step)
        velocity.current.x *= decay
        velocity.current.y *= decay
        idle.current = 0
      } else {
        velocity.current.x = 0
        velocity.current.y = 0
        idle.current += step
        // Turn on the planet's own polar axis, wherever it points. Never snaps back upright.
        // The speed is the viewer's explicit choice, so it applies even with reduced motion.
        if (idle.current > IDLE_DELAY && spinRef.current > 0) {
          spinOnAxis(globe.quaternion, step * AUTO_SPIN * spinRef.current)
        }
      }
    }
    const next = THREE.MathUtils.damp(camera.position.length(), distance.current, 5, step)
    camera.position.setLength(next)
    camera.lookAt(0, 0, 0)
  })

  return <group ref={group}>{children}</group>
}

export function GlobeScene({
  selectedId,
  hoveredId,
  filter,
  reduced,
  spin,
  onSelect,
  onHover,
}: {
  selectedId: string | null
  hoveredId: string | null
  filter: DestinationFilter
  reduced: boolean
  spin: number
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  return (
    <>
      <color attach="background" args={['#070b14']} />
      <hemisphereLight args={['#d7ecff', '#1c3a4a', 0.92]} />
      <ambientLight intensity={0.28} />
      <directionalLight position={[6, 4.2, 5]} intensity={1.4} color="#fff4dd" />
      <directionalLight position={[-5, 1.6, -3]} intensity={0.5} color="#8ec5ff" />
      <Stars radius={55} depth={28} count={900} factor={2.6} saturation={0} fade speed={reduced ? 0 : 0.25} />
      <group position={[24, 12, 16]}>
        <mesh>
          <sphereGeometry args={[1.15, 24, 24]} />
          <meshBasicMaterial color="#ffe3b8" />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.8, 16, 16]} />
          <meshBasicMaterial color="#ffd7a1" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      </group>
      <Atmosphere />
      <GlobeRig selectedId={selectedId} reduced={reduced} spin={spin}>
        <Ocean />
        <Land />
        <ProgrammingLetters />
        <ProgrammingScenery />
        <NorthPoleLandmark reduced={reduced} />
        <SouthPoleLandmark reduced={reduced} />
        <SmileScenery />
        <Clouds reduced={reduced} selectedId={selectedId} />
        {scenery.map((islet) => (
          <Islet key={islet.id} position={islet.position} seed={islet.seed} />
        ))}
        {destinations.map((destination) => (
          <DestinationMarker
            key={destination.id}
            destination={destination}
            selected={destination.id === selectedId}
            hovered={destination.id === hoveredId}
            dimmed={!matchesFilter(destination.kind, filter)}
            reduced={reduced}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </GlobeRig>
    </>
  )
}
