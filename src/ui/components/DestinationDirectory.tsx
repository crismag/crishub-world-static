import { useText } from '@/runtime/localization/index.tsx'
import { UI } from '@/runtime/localization/ui-keys.ts'
import { categoryOf, filterShows, selectableLocations, world } from '@/runtime/world-registry/index.ts'
import { useExplorer } from '@/state/explorer.tsx'

/** Every listed shore, grouped by category (layouts/navigation.json), honoring the current filter. */
export function DestinationDirectory() {
  const { t } = useText()
  const { selectedId, choose, filter } = useExplorer()
  const listed = selectableLocations.filter(
    (location) => location.display.showInDirectory && categoryOf(location.category)?.listed && filterShows(filter, location),
  )
  const groups = world.layouts.navigation.directory.groupByCategory
    ? world.categories
        .filter((category) => category.listed)
        .map((category) => ({ id: category.id, title: t(category.pluralKey), items: listed.filter((item) => item.category === category.id) }))
        .filter((group) => group.items.length)
    : [{ id: 'all', title: t(UI.directoryTitle), items: listed }]
  return (
    <nav aria-label={t(UI.directoryTitle)} className="flex flex-col gap-3">
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-1">
          <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{group.title}</h3>
          <ul className="flex flex-col">
            {group.items.map((location) => (
              <li key={location.id}>
                <button
                  type="button"
                  aria-pressed={location.id === selectedId}
                  onClick={() => choose(location.id)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted aria-pressed:bg-muted aria-pressed:font-semibold"
                >
                  {t(location.display.nameKey)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}
