import type { DestinationFilter } from '@/data/destinations.ts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

const filters: { value: DestinationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'place', label: 'Places' },
  { value: 'project', label: 'Projects' },
  { value: 'realm', label: 'Realms' },
  { value: 'mystery', label: 'Uncharted' },
]

function isFilter(value: string): value is DestinationFilter {
  return filters.some((item) => item.value === value)
}

/** The only legend on screen: which kinds of shore are lit on the globe. */
export function ShoreLegend({
  filter,
  onFilter,
}: {
  filter: DestinationFilter
  onFilter: (filter: DestinationFilter) => void
}) {
  return (
    <ToggleGroup
      type="single"
      value={filter}
      aria-label="Show shores"
      className="pointer-events-auto rounded-lg bg-background/70 p-1 ring-1 ring-border backdrop-blur"
      onValueChange={(value) => {
        if (isFilter(value)) onFilter(value)
      }}
    >
      {filters.map((item) => (
        <ToggleGroupItem key={item.value} value={item.value} className="h-7 px-2 text-xs">
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
