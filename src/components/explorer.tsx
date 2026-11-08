import { Canvas } from '@react-three/fiber'
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  destinationFromHash,
  destinations,
  getDestination,
  matchesFilter,
  type DestinationFilter,
} from '@/data/destinations.ts'
import { GlobeControls, type SpinSpeed } from '@/components/globe-controls.tsx'
import { ShoreChip } from '@/components/shore-chip.tsx'
import { ShoreLegend } from '@/components/shore-legend.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { globeApi } from '@/globe/api.ts'
import { GlobeScene } from '@/globe/Scene.tsx'
import { useReducedMotion } from '@/hooks/use-reduced-motion.ts'

type BoundaryProps = {
  children: ReactNode
  onFail: () => void
}

type BoundaryState = { failed: boolean }

class GlobeBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(): void {
    this.props.onFail()
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

export function Explorer() {
  const reduced = useReducedMotion()
  // With reduced motion the planet starts still; the viewer can still turn it on.
  const [spin, setSpin] = useState<SpinSpeed>(() => (reduced ? 0 : 0.5))
  const [selectedId, setSelectedId] = useState<string | null>(
    () => destinationFromHash(window.location.hash)?.id ?? null,
  )
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [filter, setFilter] = useState<DestinationFilter>('all')
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const select = useCallback((id: string | null) => {
    setSelectedId(id)
    const next = id ? `#${id}` : `${window.location.pathname}${window.location.search}`
    window.history.replaceState(null, '', next)
  }, [])

  const choose = useCallback(
    (id: string) => {
      const destination = getDestination(id)
      if (destination && !matchesFilter(destination.kind, filter)) setFilter('all')
      select(id)
    },
    [filter, select],
  )

  const reset = useCallback(() => {
    globeApi.reset()
    select(null)
  }, [select])

  useEffect(() => {
    const onHash = () => setSelectedId(destinationFromHash(window.location.hash)?.id ?? null)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select')) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        globeApi.nudge(-48, 0)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        globeApi.nudge(48, 0)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        globeApi.nudge(0, -36)
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        globeApi.nudge(0, 36)
      } else if (event.key === '+' || event.key === '=') {
        globeApi.zoomBy(-0.45)
      } else if (event.key === '-' || event.key === '_') {
        globeApi.zoomBy(0.45)
      } else if (event.key === 'Escape') {
        select(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select])

  return (
    <main className="relative h-dvh overflow-hidden bg-background text-foreground" aria-busy={!ready && !failed}>
      <div className="absolute inset-0">
        {failed ? (
          <div className="flex h-full items-center justify-center p-6">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>The globe could not start</CardTitle>
                <CardDescription>
                  This browser could not create a WebGL scene, so there is no planet to explore here.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : (
          <GlobeBoundary onFail={() => setFailed(true)}>
            <Canvas
              className="h-full w-full touch-none"
              camera={{ position: [0, 3.29, 16.58], fov: 36, near: 0.1, far: 120 }}
              dpr={[1, 1.75]}
              flat
              gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
              performance={{ min: 0.5 }}
              onCreated={({ gl }) => {
                gl.domElement.dataset.globe = 'true'
                gl.domElement.setAttribute('role', 'application')
                gl.domElement.setAttribute(
                  'aria-label',
                  'Crishub World globe. Drag to rotate, scroll or pinch to zoom, or choose a shore from the list.',
                )
                setReady(true)
              }}
            >
              <GlobeScene
                selectedId={selectedId}
                hoveredId={hoveredId}
                filter={filter}
                reduced={reduced}
                spin={spin}
                onSelect={choose}
                onHover={setHoveredId}
              />
            </Canvas>
          </GlobeBoundary>
        )}
      </div>

      <div className="globe-vignette pointer-events-none absolute inset-0" />

      <h1 className="sr-only">Crishub World</h1>
      {/* Screen readers and keyboard users still get every shore without a visible list. */}
      <nav aria-label="Shores" className="sr-only">
        <ul>
          {destinations.map((destination) => (
            <li key={destination.id}>
              <button type="button" onClick={() => choose(destination.id)}>
                {destination.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-2">
        <ShoreLegend filter={filter} onFilter={setFilter} />
        <GlobeControls spin={spin} onSpin={setSpin} onReset={reset} />
      </div>

      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-x-3 top-3 z-30 flex justify-center"
      >
        {selectedId && <ShoreChip selectedId={selectedId} onClose={() => select(null)} />}
      </div>
    </main>
  )
}
