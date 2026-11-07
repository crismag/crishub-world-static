import { Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardContent } from '@/components/ui/card.tsx'
import { globeApi } from '@/globe/api.ts'

export function GlobeControls({ onReset }: { onReset: () => void }) {
  return (
    <Card size="sm" className="pointer-events-auto shrink-0 overflow-visible">
      <CardContent className="flex flex-row gap-2 lg:flex-col">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Zoom in"
          onClick={() => globeApi.zoomBy(-0.55)}
        >
          <Plus data-icon="inline-start" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Zoom out"
          onClick={() => globeApi.zoomBy(0.55)}
        >
          <Minus data-icon="inline-start" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Reset the globe"
          onClick={onReset}
        >
          <RotateCcw data-icon="inline-start" />
        </Button>
      </CardContent>
    </Card>
  )
}
