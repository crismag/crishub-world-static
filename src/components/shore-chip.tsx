import { X } from 'lucide-react'
import { getDestination, kindLabel } from '@/data/destinations.ts'
import { Button } from '@/components/ui/button.tsx'

/** One line about the selected shore: its name, kind, and epithet. */
export function ShoreChip({ selectedId, onClose }: { selectedId: string; onClose: () => void }) {
  const destination = getDestination(selectedId)
  if (!destination) return null
  return (
    <div className="shore-panel pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-background/80 py-1 pr-1 pl-3 text-xs ring-1 ring-border backdrop-blur">
      <span className="shrink-0 font-heading font-semibold">{destination.name}</span>
      <span className="shrink-0 text-muted-foreground uppercase">{kindLabel(destination.kind)}</span>
      <span className="hidden truncate text-muted-foreground sm:inline">{destination.epithet}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 rounded-full"
        aria-label={`Close ${destination.name}`}
        onClick={onClose}
      >
        <X />
      </Button>
    </div>
  )
}
