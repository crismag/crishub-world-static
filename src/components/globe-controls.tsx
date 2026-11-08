import { Minus, Pause, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
import { globeApi } from '@/globe/api.ts'

/** Multiplier on the planet's turn. 1× is about one revolution a minute. */
export type SpinSpeed = 0 | 0.5 | 1 | 3

const speeds: { value: SpinSpeed; label: string; text: string }[] = [
  { value: 0, label: 'Pause rotation', text: '' },
  { value: 0.5, label: 'Slow rotation', text: '½×' },
  { value: 1, label: 'Normal rotation', text: '1×' },
  { value: 3, label: 'Fast rotation', text: '3×' },
]

const zoom = [
  { label: 'Zoom in', Icon: Plus, action: () => globeApi.zoomBy(-0.55) },
  { label: 'Zoom out', Icon: Minus, action: () => globeApi.zoomBy(0.55) },
] as const

export function GlobeControls({
  spin,
  onSpin,
  onReset,
}: {
  spin: SpinSpeed
  onSpin: (speed: SpinSpeed) => void
  onReset: () => void
}) {
  return (
    <div className="pointer-events-auto flex flex-col gap-1 rounded-lg bg-background/70 p-1 ring-1 ring-border backdrop-blur">
      <ToggleGroup
        type="single"
        orientation="vertical"
        spacing={1}
        value={String(spin)}
        aria-label="Rotation speed"
        onValueChange={(value) => {
          const match = speeds.find((item) => String(item.value) === value)
          if (match) onSpin(match.value)
        }}
      >
        {speeds.map((item) => (
          <ToggleGroupItem
            key={item.value}
            value={String(item.value)}
            aria-label={item.label}
            title={item.label}
            className="size-8 min-w-0 px-0 text-xs"
          >
            {item.value === 0 ? <Pause /> : item.text}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="mx-1 h-px bg-border" />
      {zoom.map(({ label, Icon, action }) => (
        <Button key={label} type="button" variant="ghost" size="icon" className="size-8" aria-label={label} title={label} onClick={action}>
          <Icon />
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Reset the globe"
        title="Reset the globe"
        onClick={onReset}
      >
        <RotateCcw />
      </Button>
    </div>
  )
}
