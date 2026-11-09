import { Minus, Pause, Plus, RotateCcw } from 'lucide-react'
import { useText } from '@/runtime/localization/index.tsx'
import { UI } from '@/runtime/localization/ui-keys.ts'
import { settings } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { globeApi } from '@/engine/interactions/api.ts'
import { Button } from '@/components/ui/button.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

/** Rotation speed, zoom, and reset. The speeds and zoom step come from settings/controls.json. */
export function GlobeControls({
  showSpeed = true,
  showZoom = true,
  showReset = true,
}: {
  showSpeed?: boolean
  showZoom?: boolean
  showReset?: boolean
}) {
  const { t } = useText()
  const { spin, setSpin } = useExplorer()
  const { autoRotate, zoom } = settings.controls
  const label = (speed: number) => (speed === 0 ? t(UI.pause) : t(UI.speedOption, { speed: speed === 0.5 ? '½' : speed }))
  return (
    <div className="pointer-events-auto flex flex-col gap-1 rounded-lg bg-background/70 p-1 ring-1 ring-border backdrop-blur">
      {showSpeed && autoRotate.enabled && (
        <>
          <ToggleGroup
            type="single"
            orientation="vertical"
            spacing={1}
            value={String(spin)}
            aria-label={t(UI.speedLabel)}
            onValueChange={(value) => {
              const match = autoRotate.speeds.find((speed) => String(speed) === value)
              if (match !== undefined) setSpin(match)
            }}
          >
            {autoRotate.speeds.map((speed) => (
              <ToggleGroupItem
                key={speed}
                value={String(speed)}
                aria-label={label(speed)}
                title={label(speed)}
                className="size-8 min-w-0 px-0 text-xs"
              >
                {speed === 0 ? <Pause /> : `${speed === 0.5 ? '½' : speed}×`}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {(showZoom || showReset) && <div className="mx-1 h-px bg-border" />}
        </>
      )}
      {showZoom &&
        [
          { label: t(UI.zoomIn), Icon: Plus, step: -zoom.buttonStep },
          { label: t(UI.zoomOut), Icon: Minus, step: zoom.buttonStep },
        ].map(({ label: text, Icon, step }) => (
          <Button
            key={text}
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={text}
            title={text}
            onClick={() => globeApi.zoomBy(step)}
          >
            <Icon />
          </Button>
        ))}
      {showReset && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={t(UI.reset)}
          title={t(UI.reset)}
          onClick={() => globeApi.reset()}
        >
          <RotateCcw />
        </Button>
      )}
    </div>
  )
}
