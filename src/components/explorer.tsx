import { Canvas } from '@react-three/fiber'
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react'
import { destinationFromHash, getDestination, matchesFilter, type DestinationFilter } from '@/data/destinations.ts'
import { DestinationList } from '@/components/destination-list.tsx'
import { DestinationPanel } from '@/components/destination-panel.tsx'
import { GlobeControls } from '@/components/globe-controls.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { globeApi } from '@/globe/api.ts'
import { GlobeScene } from '@/globe/Scene.tsx'
import { useMinWidth } from '@/hooks/use-min-width.ts'
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
  const wide = useMinWidth(1024)
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
                  This browser could not create a WebGL scene. The shores are still listed, and each one keeps its
                  story.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : (
          <GlobeBoundary onFail={() => setFailed(true)}>
            <Canvas
              className="h-full w-full touch-none"
              camera={{ position: [0, 1.25, 6.3], fov: 36, near: 0.1, far: 90 }}
              dpr={[1, 1.75]}
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
                wide={wide}
                onSelect={choose}
                onHover={setHoveredId}
              />
            </Canvas>
          </GlobeBoundary>
        )}
      </div>

      <div className="globe-vignette pointer-events-none absolute inset-0" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 md:p-5">
        <Card size="sm" className="pointer-events-auto w-[min(22rem,calc(100vw-11.5rem))] shrink-0">
          <CardHeader>
            <Badge variant="outline">Miniature planet</Badge>
            <CardTitle>
              <h1 className="text-2xl leading-none md:text-3xl">Crishub World</h1>
            </CardTitle>
            <CardDescription>
              Places and projects on the same world. Drag to turn it. Pinch, scroll, or use the buttons to lean in.
            </CardDescription>
            {!ready && !failed && <p className="text-sm text-muted-foreground">Lighting the globe…</p>}
          </CardHeader>
        </Card>
        <GlobeControls onReset={reset} />
      </header>

      {wide && (
        <div className="pointer-events-none absolute top-44 bottom-5 left-5 z-20 flex w-[22rem] flex-col gap-3">
          <Card className="pointer-events-auto">
            <CardHeader>
              <CardTitle>How to wander</CardTitle>
              <CardDescription>The world is the menu. The list is only a shortcut.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
              <p>
                Eighteen named shores share one planet. A country and a project world are the same kind of stop. Empty
                ocean is reserved for places that do not exist yet.
              </p>
              <p className="text-muted-foreground">
                Arrow keys turn the globe. Plus and minus lean in. Escape steps back from a shore.
              </p>
            </CardContent>
          </Card>
          <DestinationList
            filter={filter}
            selectedId={selectedId}
            reduced={reduced}
            layout="rail"
            onFilter={setFilter}
            onSelect={choose}
          />
        </div>
      )}

      {selectedId && (
        <div className="absolute inset-x-3 bottom-36 z-30 lg:inset-x-auto lg:right-5 lg:bottom-auto lg:top-44 lg:w-[22rem]">
          <div aria-live="polite">
            <DestinationPanel selectedId={selectedId} globeReady={ready && !failed} onClose={() => select(null)} />
          </div>
        </div>
      )}

      {!wide && (
        <div className="absolute inset-x-3 bottom-3 z-20">
          <DestinationList
            filter={filter}
            selectedId={selectedId}
            reduced={reduced}
            layout="dock"
            onFilter={setFilter}
            onSelect={choose}
          />
        </div>
      )}
    </main>
  )
}
