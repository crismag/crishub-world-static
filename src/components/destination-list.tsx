import { useEffect } from 'react'
import { destinations, kindLabel, matchesFilter, type DestinationFilter } from '@/data/destinations.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

const filters: { value: DestinationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'place', label: 'Places' },
  { value: 'project', label: 'Projects' },
  { value: 'mystery', label: 'Uncharted' },
]

export function DestinationList({
  filter,
  selectedId,
  reduced,
  layout,
  onFilter,
  onSelect,
}: {
  filter: DestinationFilter
  selectedId: string | null
  reduced: boolean
  layout: 'rail' | 'dock'
  onFilter: (filter: DestinationFilter) => void
  onSelect: (id: string) => void
}) {
  const visible = destinations.filter((destination) => matchesFilter(destination.kind, filter))

  useEffect(() => {
    if (!selectedId) return
    const element = document.getElementById(`shore-${layout}-${selectedId}`)
    element?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [layout, reduced, selectedId])

  const filterGroup = (
    <ToggleGroup
      type="single"
      value={filter}
      variant="outline"
      spacing={1}
      aria-label="Filter shores"
      className="max-w-full"
      onValueChange={(value) => {
        if (value === 'all' || value === 'place' || value === 'project' || value === 'mystery') {
          onFilter(value)
        }
      }}
    >
      {filters.map((item) => (
        <ToggleGroupItem key={item.value} value={item.value} className="min-h-11 px-3">
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )

  if (layout === 'dock') {
    return (
      <Card size="sm" className="pointer-events-auto">
        <CardContent className="flex flex-col gap-3">
          <div className="overflow-x-auto">{filterGroup}</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {visible.map((destination) => {
              const active = destination.id === selectedId
              return (
                <Button
                  key={destination.id}
                  id={`shore-dock-${destination.id}`}
                  type="button"
                  variant={active ? 'secondary' : 'outline'}
                  className="min-h-11 shrink-0"
                  aria-pressed={active}
                  onClick={() => onSelect(destination.id)}
                >
                  {destination.name}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="pointer-events-auto flex min-h-0 flex-1 flex-col">
      <CardHeader>
        <CardTitle>Shores</CardTitle>
        <CardDescription>
          {visible.length} on this view. Countries and projects share the same globe.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {filterGroup}
        <ScrollArea className="min-h-0 w-full flex-1">
          <div className="flex w-full min-w-0 flex-col gap-1 pr-3">
            {visible.map((destination) => {
              const active = destination.id === selectedId
              return (
                <Button
                  key={destination.id}
                  id={`shore-rail-${destination.id}`}
                  type="button"
                  variant={active ? 'secondary' : 'ghost'}
                  className="grid h-auto min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5"
                  aria-pressed={active}
                  onClick={() => onSelect(destination.id)}
                >
                  <span className="truncate text-left">{destination.name}</span>
                  <Badge variant="outline">{kindLabel(destination.kind)}</Badge>
                </Button>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
