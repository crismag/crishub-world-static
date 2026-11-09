import { Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Vec3 } from '@/runtime/configuration/registry-types.ts'
import { features } from '@/runtime/features/index.ts'
import { centerOf, getLocation, globeLocations, settings } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { orientation } from '@/engine/controls/globe-orientation.ts'
import { Formations } from '@/engine/globe/Formations.tsx'
import { LocationNode } from '@/engine/globe/LocationNode.tsx'
import { Atmosphere, Clouds, Land, Ocean } from '@/engine/globe/Planet.tsx'
import { globeApi, pointerTravel } from '@/engine/interactions/api.ts'
import { setGlobeCursor } from '@/engine/interactions/cursor.ts'

const { camera: cameraSettings, controls, environment } = settings

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}


/** Where the globe opens: the configured view, or turned to face a chosen location or formation. */
function openingView(): THREE.Quaternion {
  const face = cameraSettings.initialOrientation.face
  const target = face ? centerOf(face) : null
  return target ? orientation.facing(orientation.opening, target) : orientation.opening.clone()
}

function GlobeRig({ children }: { children: ReactNode }) {
  const { selectedId, reduced, spin } = useExplorer()
  const spinRef = useRef(spin)
  useEffect(() => {
    spinRef.current = spin
  }, [spin])
  const group = useRef<THREE.Group>(null)
  const camera = useThree((state) => state.camera)
  const getThree = useThree((state) => state.get)
  const opening = useMemo(() => openingView(), [])
  /** Set while easing toward a chosen orientation: a shore, or the opening view. */
  const target = useRef<THREE.Quaternion | null>(null)
  const distance = useRef(cameraSettings.defaultDistance)
  const dragging = useRef(false)
  // Start past the idle delay, so the planet is already turning when the page opens.
  const idle = useRef(controls.autoRotate.idleDelaySeconds)
  /** Coasting after a flick: pixels per second along the screen's x and y. */
  const velocity = useRef({ x: 0, y: 0 })

  useLayoutEffect(() => {
    group.current?.quaternion.copy(opening)
  }, [opening])

  const stop = () => {
    idle.current = 0
    velocity.current.x = 0
    velocity.current.y = 0
  }

  useEffect(() => {
    const location = selectedId ? getLocation(selectedId) : undefined
    if (!location || !group.current) return
    target.current = orientation.facing(group.current.quaternion, location.position)
    stop()
  }, [selectedId])

  useEffect(() => {
    const zoomTo = (value: number) => {
      distance.current = clamp(value, cameraSettings.minDistance, cameraSettings.maxDistance)
    }
    globeApi.focus = (position: Vec3) => {
      if (!group.current) return
      target.current = orientation.facing(group.current.quaternion, position)
      stop()
    }
    globeApi.reset = () => {
      target.current = opening.clone()
      distance.current = cameraSettings.defaultDistance
      stop()
    }
    globeApi.zoomBy = (delta) => zoomTo(distance.current + delta)
    globeApi.nudge = (dx, dy) => {
      if (!group.current) return
      target.current = null
      stop()
      orientation.roll(group.current.quaternion, camera, dx, dy)
    }
    return () => {
      globeApi.focus = () => {}
      globeApi.reset = () => {}
      globeApi.zoomBy = () => {}
      globeApi.nudge = () => {}
    }
  }, [camera, opening])

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
    const zoomTo = (value: number) => {
      distance.current = clamp(value, cameraSettings.minDistance, cameraSettings.maxDistance)
    }

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
          zoomTo(distance.current + (pinch - span) * controls.zoom.pinchSensitivity)
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
      orientation.roll(group.current.quaternion, camera, dx, dy)
      if (controls.inertia.enabled) {
        // Pixels per second, capped so a hard flick still settles quickly.
        const cap = controls.inertia.maxRadiansPerSecond / controls.dragSensitivity
        velocity.current.x = clamp(dx / dt, -cap, cap)
        velocity.current.y = clamp(dy / dt, -cap, cap)
      }
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
      zoomTo(distance.current + event.deltaY * controls.zoom.wheelSensitivity)
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
    const globeGroup = group.current
    if (!globeGroup) return
    const step = Math.min(delta, 0.05)
    if (target.current) {
      // Ease along the shortest arc toward the chosen orientation.
      globeGroup.quaternion.slerp(target.current, reduced ? 1 : 1 - Math.exp(-controls.focusEasing * step))
      if (globeGroup.quaternion.angleTo(target.current) < 0.004) {
        globeGroup.quaternion.copy(target.current)
        target.current = null
      }
    } else if (!dragging.current) {
      const speed = Math.hypot(velocity.current.x, velocity.current.y)
      if (speed * controls.dragSensitivity > 0.02) {
        orientation.roll(globeGroup.quaternion, camera, velocity.current.x * step, velocity.current.y * step)
        const decay = Math.exp(-controls.inertia.decayPerSecond * step)
        velocity.current.x *= decay
        velocity.current.y *= decay
        idle.current = 0
      } else {
        velocity.current.x = 0
        velocity.current.y = 0
        idle.current += step
        // Turn on the planet's own polar axis, wherever it points. Never snaps back upright.
        // The speed is the visitor's explicit choice, so it applies even with reduced motion.
        if (idle.current > controls.autoRotate.idleDelaySeconds && spinRef.current > 0) {
          orientation.spinOnAxis(globeGroup.quaternion, step * controls.autoRotate.radiansPerSecond * spinRef.current)
        }
      }
    }
    const next = THREE.MathUtils.damp(camera.position.length(), distance.current, 5, step)
    camera.position.setLength(next)
    camera.lookAt(0, 0, 0)
  })

  return <group ref={group}>{children}</group>
}

export function GlobeScene() {
  const { reduced } = useExplorer()
  const { lights, stars, sun } = environment
  return (
    <>
      <color attach="background" args={[environment.background]} />
      <hemisphereLight args={[lights.hemisphere.sky, lights.hemisphere.ground, lights.hemisphere.intensity]} />
      <ambientLight color={lights.ambient.color} intensity={lights.ambient.intensity} />
      <directionalLight position={lights.key.position as Vec3} intensity={lights.key.intensity} color={lights.key.color} />
      <directionalLight position={lights.fill.position as Vec3} intensity={lights.fill.intensity} color={lights.fill.color} />
      {features.stars && (
        <Stars
          radius={stars.radius}
          depth={stars.depth}
          count={stars.count}
          factor={stars.size}
          saturation={0}
          fade
          speed={reduced ? 0 : stars.drift}
        />
      )}
      <group position={sun.position as Vec3}>
        <mesh>
          <sphereGeometry args={[sun.radius, 24, 24]} />
          <meshBasicMaterial color={sun.color} />
        </mesh>
        <mesh>
          <sphereGeometry args={[sun.radius * 1.565, 16, 16]} />
          <meshBasicMaterial color={sun.glow} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      </group>
      <Atmosphere />
      <GlobeRig>
        <Ocean />
        <Land />
        {features.formations && <Formations />}
        {features.clouds && <Clouds />}
        {globeLocations
          .filter((location) => features.polarLandmarks || !location.landmarks.some((landmark) => landmark.preset === 'beacon' || landmark.preset === 'vault'))
          .map((location) => (
            <LocationNode key={location.id} location={location} />
          ))}
      </GlobeRig>
    </>
  )
}
