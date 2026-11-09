import { useText } from '@/runtime/localization/index.tsx'
import { UI } from '@/runtime/localization/ui-keys.ts'
import { world } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

/** The small legend: which kinds of shore are lit on the globe. Filters come from layouts/navigation.json. */
export function ShoreLegend() {
  const { t } = useText()
  const { filter, setFilter } = useExplorer()
  const filters = world.layouts.navigation.filters
  return (
    <ToggleGroup
      type="single"
      value={filter}
      aria-label={t(UI.legendLabel)}
      className="pointer-events-auto flex-wrap rounded-lg bg-background/70 p-1 ring-1 ring-border backdrop-blur"
      onValueChange={(value) => {
        if (filters.some((item) => item.id === value)) setFilter(value)
      }}
    >
      {filters.map((item) => (
        <ToggleGroupItem key={item.id} value={item.id} className="h-7 px-2 text-xs">
          {t(item.labelKey)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
