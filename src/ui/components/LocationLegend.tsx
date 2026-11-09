import { ChevronDown, DoorOpen, MapPinned } from 'lucide-react'
import { useId, useState } from 'react'
import { useText } from '@/runtime/localization/index.tsx'
import { UI } from '@/runtime/localization/ui-keys.ts'
import { selectableLocations, world } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'

const STORAGE_KEY = 'crisworld.places-open'

function readOpen(fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === null ? fallback : stored === 'true'
  } catch {
    return fallback
  }
}

/**
 * A small, collapsible list of every place on the globe, grouped by category. Choosing one
 * turns the globe to it and selects it; it does not enter it. Entering a world still takes a
 * click on the island itself (or the Enter button on its chip).
 */
export function LocationLegend({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { t } = useText()
  const { selectedId, choose, setHoveredId } = useExplorer()
  const [open, setOpen] = useState(() => readOpen(defaultOpen))
  const listId = useId()

  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Storage may be unavailable (private windows); the choice then lasts for this visit.
    }
  }

  const groups = world.categories
    .filter((category) => category.listed)
    .map((category) => ({
      category,
      places: selectableLocations
        .filter((location) => location.category === category.id && location.display.showInDirectory)
        .sort((a, b) => t(a.display.nameKey).localeCompare(t(b.display.nameKey))),
    }))
    .filter((group) => group.places.length)

  return (
    <div className="pointer-events-auto flex w-56 max-w-[calc(100vw-1.5rem)] flex-col rounded-lg bg-background/75 ring-1 ring-border backdrop-blur">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? t(UI.placesHide) : t(UI.placesShow)}
        onClick={toggle}
        className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold"
      >
        <MapPinned className="size-3.5" />
        <span className="flex-1 text-left font-heading">{t(UI.placesTitle)}</span>
        <span className="text-muted-foreground">{selectableLocations.length}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <nav id={listId} aria-label={t(UI.placesTitle)} className="max-h-[min(22rem,45dvh)] overflow-y-auto px-1.5 pb-1.5">
          {groups.map(({ category, places }) => (
            <section key={category.id} className="pt-1.5">
              <h3 className="px-1.5 pb-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {t(category.pluralKey)}
              </h3>
              <ul>
                {places.map((location) => (
                  <li key={location.id}>
                    <button
                      type="button"
                      aria-current={location.id === selectedId ? 'location' : undefined}
                      onClick={() => choose(location.id)}
                      onMouseEnter={() => setHoveredId(location.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => setHoveredId(location.id)}
                      onBlur={() => setHoveredId(null)}
                      className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted aria-[current]:bg-muted aria-[current]:font-semibold"
                    >
                      <span className="flex-1 truncate">{t(location.display.nameKey)}</span>
                      {location.entry && (
                        <DoorOpen className="size-3 shrink-0 text-muted-foreground" aria-label={t(UI.placesEnterable)} role="img" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      )}
    </div>
  )
}
