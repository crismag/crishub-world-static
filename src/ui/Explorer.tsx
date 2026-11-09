import { Canvas } from '@react-three/fiber'
import { Component, useEffect, type ReactNode } from 'react'
import { quality, qualityPreset } from '@/runtime/configuration/quality.ts'
import { useText } from '@/runtime/localization/index.tsx'
import { UI } from '@/runtime/localization/ui-keys.ts'
import { selectableLocations, settings, world } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { globeApi } from '@/engine/interactions/api.ts'
import { GlobeScene } from '@/engine/globe/Scene.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { Sections } from '@/ui/components/registry.tsx'
import { Panel } from '@/ui/panels/Panel.tsx'
import { useState } from 'react'

type BoundaryProps = { children: ReactNode; onFail: () => void }
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
    return this.state.failed ? null : this.props.children
  }
}

const { camera, controls } = settings
const layout = world.layouts.explorer

/** The camera's starting position: along its configured direction, at the default distance. */
function cameraPosition(): [number, number, number] {
  const [x, y, z] = camera.direction
  const length = Math.hypot(x, y, z) || 1
  const scale = camera.defaultDistance / length
  return [x * scale, y * scale, z * scale]
}

/**
 * The page: the globe, plus whatever layouts/explorer.json places around it. Regions and
 * panels only hold registered components; this file knows nothing about what they show.
 */
export function Explorer() {
  const { t } = useText()
  const { ready, setReady, select, choose, setPanelOpen, entering } = useExplorer()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!controls.keyboard.enabled) return
    const [stepX, stepY] = controls.keyboard.rotateStepPx
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [role="tablist"], [role="radiogroup"], [role="group"]')) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        globeApi.nudge(-stepX, 0)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        globeApi.nudge(stepX, 0)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        globeApi.nudge(0, -stepY)
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        globeApi.nudge(0, stepY)
      } else if (event.key === '+' || event.key === '=') {
        globeApi.zoomBy(-controls.keyboard.zoomStep)
      } else if (event.key === '-' || event.key === '_') {
        globeApi.zoomBy(controls.keyboard.zoomStep)
      } else if (event.key === 'Escape') {
        setPanelOpen(false)
        select(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select, setPanelOpen])


  return (
    <main className="relative h-dvh overflow-hidden bg-background text-foreground" aria-busy={!ready && !failed}>
      <div className="absolute inset-0">
        {failed ? (
          <div className="flex h-full items-center justify-center p-6">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>{t(UI.webglTitle)}</CardTitle>
                <CardDescription>{t(UI.webglBody)}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : (
          <GlobeBoundary onFail={() => setFailed(true)}>
            <Canvas
              className="h-full w-full touch-none"
              camera={{ position: cameraPosition(), fov: camera.fovDeg, near: camera.near, far: camera.far }}
              dpr={[1, qualityPreset.maxPixelRatio]}
              flat
              gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
              performance={{ min: 0.5 }}
              onCreated={({ gl }) => {
                gl.domElement.dataset.globe = 'true'
                gl.domElement.setAttribute('role', 'application')
                gl.domElement.setAttribute('aria-label', t(UI.globeLabel))
                // `?perf` exposes the renderer's counters (geometries, textures, draw calls) for measuring.
                if (new URLSearchParams(window.location.search).has('perf')) {
                  ;(window as Window & { crisworldPerf?: unknown }).crisworldPerf = { quality, renderer: gl.info }
                }
                setReady(true)
              }}
            >
              <GlobeScene />
            </Canvas>
          </GlobeBoundary>
        )}
      </div>

      <div className="globe-vignette pointer-events-none absolute inset-0" />

      <h1 className="sr-only">{t(world.world.nameKey)}</h1>
      {/* Screen readers and keyboard users always get every shore, whatever the visible layout. */}
      <nav aria-label={t(UI.shoresNav)} className="sr-only">
        <ul>
          {selectableLocations.map((location) => (
            <li key={location.id}>
              <button type="button" onClick={() => choose(location.id)}>
                {t(location.display.nameKey)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-col items-center gap-2" aria-live="polite">
        <Sections sections={layout.regions.top} />
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-2">
        <div className="flex flex-col items-start gap-2">
          <Sections sections={layout.regions.bottomLeft} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Sections sections={layout.regions.bottomRight} />
        </div>
      </div>
      <Panel side="left" panel={layout.leftPanel} />
      <Panel side="right" panel={layout.rightPanel} />

      {/* While diving into a location's world, the page fades out over the dive. */}
      <div
        aria-hidden={!entering}
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background opacity-0 transition-opacity ease-in data-[entering=true]:pointer-events-auto data-[entering=true]:opacity-100"
        data-entering={entering ? 'true' : 'false'}
        style={{ transitionDuration: `${controls.entryTransition.durationMs}ms` }}
      >
        {entering && (
          <p role="status" className="font-heading text-sm text-muted-foreground">
            {t(UI.entering, { name: t(entering.nameKey) })}
          </p>
        )}
      </div>
    </main>
  )
}
