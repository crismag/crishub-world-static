import { X } from 'lucide-react'
import type { ExplorerLayoutT } from '@/runtime/configuration/schema.ts'
import { useText } from '@/runtime/localization/index.tsx'
import { UI } from '@/runtime/localization/ui-keys.ts'
import { useExplorer } from '@/state/explorer.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Sections } from '@/ui/components/registry.tsx'

/**
 * A side panel from layouts/explorer.json. On wide screens it sits at its side with its
 * configured width; on narrow screens it becomes a sheet along the bottom. An `on-demand`
 * panel opens from a button (such as Read on the selection chip) and only while a shore is selected.
 */
export function Panel({ side, panel }: { side: 'left' | 'right'; panel: ExplorerLayoutT['leftPanel'] }) {
  const { t } = useText()
  const { panelOpen, setPanelOpen, selectedId } = useExplorer()
  if (!panel.enabled) return null
  const onDemand = panel.open === 'on-demand'
  if (onDemand && (!panelOpen || !selectedId)) return null
  return (
    <aside
      style={{ ['--panel-width' as string]: `${panel.width}px` }}
      className={`shore-panel pointer-events-auto absolute inset-x-3 bottom-3 z-40 flex max-h-[60dvh] flex-col rounded-2xl bg-background/90 ring-1 ring-border backdrop-blur lg:inset-x-auto lg:top-16 lg:bottom-16 lg:max-h-none lg:w-[var(--panel-width)] ${side === 'left' ? 'lg:left-3' : 'lg:right-3'}`}
    >
      {onDemand && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 size-8 rounded-full"
          aria-label={t(UI.closePanel)}
          onClick={() => setPanelOpen(false)}
        >
          <X />
        </Button>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pr-10">
        <Sections sections={panel.sections} />
      </div>
    </aside>
  )
}
