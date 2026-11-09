import { useText } from '@/runtime/localization/index.tsx'
import { categoryOf, getLocation, world } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { ContentSections } from '@/ui/content-renderers/index.tsx'

/** The selected shore's writeups, in the order its items.json gives. Options come from layouts/destination-panel.json. */
export function DestinationDetails() {
  const { t } = useText()
  const { selectedId } = useExplorer()
  const location = selectedId ? getLocation(selectedId) : undefined
  const options = world.layouts.destinationPanel
  if (!location) return null
  const category = categoryOf(location.category)
  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-0.5">
        {options.showCategory && category && (
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t(category.labelKey)}</p>
        )}
        <h2 className="font-heading text-xl font-semibold">{t(location.display.nameKey)}</h2>
        {options.showTagline && <p className="text-sm text-muted-foreground">{t(location.display.descriptionKey)}</p>}
      </header>
      {location.sections.length ? (
        <ContentSections sections={location.sections} expandAccordions={options.expandAccordions} />
      ) : (
        <p className="text-sm text-muted-foreground">{t(options.emptyMessageKey)}</p>
      )}
    </div>
  )
}
