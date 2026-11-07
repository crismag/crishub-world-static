import { Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { destinations, matchesFilter, scenery, type DestinationFilter } from '@/data/destinations.ts'
import { clamp, type Vec3 } from '@/data/math.ts'
import { globeApi, pointerTravel } from '@/globe/api.ts'
import { setGlobeCursor } from '@/globe/geometry.ts'
import { DestinationMarker, Islet } from '@/globe/Destination.tsx'
import { Atmosphere, Clouds, Graticule, Ocean } from '@/globe/Planet.tsx'

const AXIS_Y = new THREE.Vector3(0, 1, 0)
const AXIS_X = new THREE.Vector3(1, 0, 0)
const Q_YAW = new THREE.Quaternion()
const Q_PITCH = new THREE.Quaternion()
const FOCUS = new THREE.Vector3(0, 1.25, 6.3).normalize()
FOCUS.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.12)
const NORMAL = new THREE.Vector3()

const CAMERA_DEFAULT = 6.45
const CAMERA_MIN = 4.2
const CAMERA_MAX = 9.3
const DRAG = 0.0052

function spin(quaternion: THREE.Quaternion, yaw: number, pitch: number) {
  Q_YAW.setFromAxisAngle(AXIS_Y, yaw)
  Q_PITCH.setFromAxisAngle(AXIS_X, pitch)
  quaternion.premultiply(Q_PITCH).premultiply(Q_YAW)
}

function GlobeRig({
  selectedId,
  reduced,
  children,
}: {
  selectedId: string | null
  reduced: boolean
  children: ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const camera = useThree((state) => state.camera)
  const getThree = useThree((state) => state.get)
  const mode = useRef<'free' | 'focus'>('free')
  const target = useRef(new THREE.Quaternion())
  const distance = useRef(CAMERA_DEFAULT)
  const dragging = useRef(false)
  const idle = useRef(0)
  const angular = useRef({ x: 0, y: 0 })
  const selectedRef = useRef(selectedId)

  useLayoutEffect(() => {
    if (selectedRef.current || !group.current) return
    group.current.quaternion.setFromAxisAngle(AXIS_X, -0.28)
  }, [])

  useEffect(() => {
    const destination = destinations.find((item) => item.id === selectedId)
    if (!destination || !group.current) return
    NORMAL.set(destination.position[0], destination.position[1], destination.position[2]).normalize()
    target.current.setFromUnitVectors(NORMAL, FOCUS)
    mode.current = 'focus'
    idle.current = 0
    angular.current.x = 0
    angular.current.y = 0
  }, [selectedId])

  useEffect(() => {
    const focus = (position: Vec3) => {
      NORMAL.set(position[0], position[1], position[2]).normalize()
      target.current.setFromUnitVectors(NORMAL, FOCUS)
      mode.current = 'focus'
      idle.current = 0
      angular.current.x = 0
      angular.current.y = 0
    }
    globeApi.focus = focus
    globeApi.reset = () => {
      target.current.identity()
      mode.current = 'focus'
      distance.current = CAMERA_DEFAULT
      idle.current = 0
      angular.current.x = 0
      angular.current.y = 0
    }
    globeApi.zoomBy = (delta) => {
      distance.current = clamp(distance.current + delta, CAMERA_MIN, CAMERA_MAX)
    }
    globeApi.nudge = (dx, dy) => {
      if (!group.current) return
      mode.current = 'free'
      idle.current = 0
      spin(group.current.quaternion, dx * DRAG, dy * DRAG)
    }
    return () => {
      globeApi.focus = () => {}
      globeApi.reset = () => {}
      globeApi.zoomBy = () => {}
      globeApi.nudge = () => {}
    }
  }, [])

  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    const element = getThree().gl.domElement
    element.dataset.globe = 'true'
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
        mode.current = 'free'
        idle.current = 0
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
      spin(group.current.quaternion, dx * DRAG, dy * DRAG)
      angular.current.x = clamp((dx * DRAG) / dt, -2.4, 2.4)
      angular.current.y = clamp((dy * DRAG) / dt, -2.4, 2.4)
    }
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size === 0) {
        dragging.current = false
        pinch = 0
        setGlobeCursor('grab')
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
  }, [getThree])

  useFrame((_, delta) => {
    const globe = group.current
    if (!globe) return
    const step = Math.min(delta, 0.05)
    if (mode.current === 'focus') {
      const amount = reduced ? 1 : 1 - Math.exp(-5 * step)
      globe.quaternion.slerp(target.current, amount)
      if (globe.quaternion.angleTo(target.current) < 0.004) mode.current = 'free'
    } else if (!dragging.current) {
      const speed = Math.hypot(angular.current.x, angular.current.y)
      if (speed > 0.02) {
        spin(globe.quaternion, angular.current.x * step, angular.current.y * step)
        const decay = Math.exp(-2.3 * step)
        angular.current.x *= decay
        angular.current.y *= decay
        idle.current = 0
      } else {
        angular.current.x = 0
        angular.current.y = 0
        idle.current += step
        if (!reduced && !selectedRef.current && idle.current > 2.4) {
          spin(globe.quaternion, step * 0.09, 0)
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
  wide,
  onSelect,
  onHover,
}: {
  selectedId: string | null
  hoveredId: string | null
  filter: DestinationFilter
  reduced: boolean
  wide: boolean
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
      <GlobeRig selectedId={selectedId} reduced={reduced}>
        <Ocean />
        <Clouds reduced={reduced} />
        <Graticule />
        {scenery.map((islet) => (
          <Islet key={islet.id} position={islet.position} seed={islet.seed} land={islet.land} sand={islet.sand} />
        ))}
        {destinations.map((destination) => (
          <DestinationMarker
            key={destination.id}
            destination={destination}
            selected={destination.id === selectedId}
            hovered={destination.id === hoveredId}
            dimmed={!matchesFilter(destination.kind, filter)}
            reduced={reduced}
            wide={wide}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </GlobeRig>
    </>
  )
}
