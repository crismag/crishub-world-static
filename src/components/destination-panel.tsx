import { LocateFixed, X } from 'lucide-react'
import { getDestination, kindLabel, type DestinationKind } from '@/data/destinations.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import { globeApi } from '@/globe/api.ts'

function shoreNote(kind: DestinationKind): string {
  if (kind === 'mystery') return 'Uncharted on purpose. It opens when there is something to visit.'
  if (kind === 'project') return 'A project world, drawn at the same size as every country.'
  return 'A miniature of a real place, not a geographic map.'
}

export function DestinationPanel({
  selectedId,
  globeReady,
  onClose,
}: {
  selectedId: string
  globeReady: boolean
  onClose: () => void
}) {
  const destination = getDestination(selectedId)
  if (!destination) return null

  return (
    <Card className="shore-panel pointer-events-auto w-full lg:w-[22rem]">
      <CardHeader>
        <Badge variant="outline">{kindLabel(destination.kind)}</Badge>
        <CardTitle className="text-xl">{destination.name}</CardTitle>
        <CardDescription>{destination.epithet}</CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={`Close ${destination.name}`}
            onClick={onClose}
          >
            <X data-icon="inline-start" />
          </Button>
        </CardAction>
      </CardHeader>
      <ScrollArea className="h-[min(11rem,22dvh)] lg:h-56">
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed">{destination.summary}</p>
          <Separator />
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {destination.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </CardContent>
      </ScrollArea>
      <CardFooter className="flex-wrap gap-3">
        <Button
          type="button"
          className="min-h-11"
          disabled={!globeReady}
          onClick={() => globeApi.focus(destination.position)}
        >
          <LocateFixed data-icon="inline-start" />
          Bring into view
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">{shoreNote(destination.kind)}</p>
      </CardFooter>
    </Card>
  )
}
