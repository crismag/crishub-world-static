import { BookOpen, X } from 'lucide-react'
import { useText } from '@/runtime/localization/index.tsx'
import { UI } from '@/runtime/localization/ui-keys.ts'
import { categoryOf, getLocation, world } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { Button } from '@/components/ui/button.tsx'

/**
 * One line about the selected shore: name, kind, and tagline. With `readMore`, and when the
 * layout has an on-demand panel holding the details, a Read button opens it.
 */
export function SelectionChip({ readMore = false }: { readMore?: boolean }) {
  const { t } = useText()
  const { selectedId, select, setPanelOpen, panelOpen } = useExplorer()
  const location = selectedId ? getLocation(selectedId) : undefined
  if (!location) return null
  const name = t(location.display.nameKey)
  const category = categoryOf(location.category)
  const { leftPanel, rightPanel } = world.layouts.explorer
  const hasPanel = [leftPanel, rightPanel].some(
    (panel) => panel.enabled && panel.open === 'on-demand' && panel.sections.some((section) => section.component === 'DestinationDetails'),
  )
  return (
    <div className="shore-panel pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-background/80 py-1 pr-1 pl-3 text-xs ring-1 ring-border backdrop-blur">
      <span className="shrink-0 font-heading font-semibold">{name}</span>
      {category && <span className="shrink-0 text-muted-foreground uppercase">{t(category.labelKey)}</span>}
      <span className="hidden truncate text-muted-foreground sm:inline">{t(location.display.descriptionKey)}</span>
      {readMore && hasPanel && !panelOpen && location.sections.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 shrink-0 gap-1 rounded-full px-2 text-xs"
          aria-label={t(UI.readMoreLabel, { name })}
          onClick={() => setPanelOpen(true)}
        >
          <BookOpen className="size-3.5" />
          {t(UI.readMore)}
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 rounded-full"
        aria-label={t(UI.closeShore, { name })}
        onClick={() => select(null)}
      >
        <X />
      </Button>
    </div>
  )
}
