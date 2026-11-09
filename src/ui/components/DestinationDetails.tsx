import { useLocationContent } from '@/runtime/content/index.ts'
import { useText } from '@/runtime/localization/index.tsx'
import { UI } from '@/runtime/localization/ui-keys.ts'
import { categoryOf, getLocation, world } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ContentSections } from '@/ui/content-renderers/index.tsx'

/**
 * The selected shore's writeups, in the order its items.json gives. The header shows at once
 * from the registry; the articles load from the shore's own content file.
 * Options come from layouts/destination-panel.json.
 */
export function DestinationDetails() {
  const { t } = useText()
  const { selectedId } = useExplorer()
  const location = selectedId ? getLocation(selectedId) : undefined
  const content = useLocationContent(location && location.sections.length ? location.id : null)
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
      {!location.sections.length ? (
        <p className="text-sm text-muted-foreground">{t(options.emptyMessageKey)}</p>
      ) : content.status === 'ready' ? (
        <ContentSections sections={content.sections} expandAccordions={options.expandAccordions} />
      ) : content.status === 'failed' ? (
        <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground" role="alert">
          <p>{t(UI.contentFailed)}</p>
          <Button type="button" variant="outline" size="sm" onClick={content.retry}>
            {t(UI.retry)}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          {t(UI.contentLoading)}
        </p>
      )}
    </div>
  )
}
