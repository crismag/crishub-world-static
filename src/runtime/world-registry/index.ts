import data from '../../generated/world.json'
import type { CompiledFormation, CompiledLocation, Vec3, WorldRegistry } from '../configuration/registry-types.ts'

/**
 * The compiled world, loaded once. Every engine and UI module reads configuration through
 * here; nothing loads world/ files on its own. The data was validated by `world:build`.
 */
export const world = data as unknown as WorldRegistry

export const settings = world.settings

const byId = new Map(world.locations.map((location) => [location.id, location]))

export function getLocation(id: string): CompiledLocation | undefined {
  return byId.get(id)
}

/** Locations drawn on the globe. */
export const globeLocations: readonly CompiledLocation[] = world.locations.filter((location) => location.display.showOnGlobe)

/** Shores a visitor can select: in the legend, the directory, and the URL hash. */
export const selectableLocations: readonly CompiledLocation[] = globeLocations.filter(
  (location) => location.interaction.selectable,
)

export function categoryOf(id: string) {
  return world.categories.find((category) => category.id === id)
}

export function getFormation(id: string): CompiledFormation | undefined {
  return world.formations.find((formation) => formation.id === id)
}

/** A location or formation's center, by ID: for camera framing. */
export function centerOf(id: string): Vec3 | null {
  return byId.get(id)?.position ?? getFormation(id)?.center ?? null
}

/** The selectable shore named by a URL hash such as `#japan`, if any. */
export function locationFromHash(hash: string): CompiledLocation | undefined {
  const id = hash.replace(/^#/, '').trim().toLowerCase()
  if (!id) return undefined
  const location = byId.get(id)
  return location?.interaction.selectable ? location : undefined
}

/** Whether a navigation filter (from layouts/navigation.json) shows a location. */
export function filterShows(filterId: string, location: CompiledLocation): boolean {
  const filter = world.layouts.navigation.filters.find((item) => item.id === filterId)
  if (!filter || filter.categories === 'all') return true
  return filter.categories.includes(location.category)
}
