import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { filterShows, getBackdropPlanet, getLocation, locationFromHash, settings, world } from '@/runtime/world-registry/index.ts'
import { globeApi } from '@/engine/interactions/api.ts'
import { navigation } from '@/state/navigation.ts'

/**
 * What the visitor is doing: which shore is selected, which filter is on, how fast the
 * planet turns, and whether the reading panel is open. Every configured UI component reads
 * this, so layout files only choose components and never wire them together.
 */
export type ExplorerState = {
  selectedId: string | null
  /** Select a shore (or none), and keep the URL hash in step. */
  select: (id: string | null) => void
  /** Select a shore from anywhere, switching the filter if it would hide that shore. */
  choose: (id: string) => void
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
  filter: string
  setFilter: (id: string) => void
  spin: number
  setSpin: (speed: number) => void
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  /** The visitor asked their system for less motion, and the world respects it. */
  reduced: boolean
  /** The globe canvas has started. */
  ready: boolean
  setReady: (ready: boolean) => void
  /**
   * Enter the world of a location or backdrop planet, if it has one (its `entry`). Returns
   * false and does nothing when it has none, so callers can fall back to simply selecting it.
   */
  enter: (id: string) => boolean
  /** What is being entered, while the transition plays. */
  entering: { id: string; url: string; nameKey: string } | null
}

const ExplorerContext = createContext<ExplorerState | null>(null)

const firstFilter = world.layouts.navigation.filters[0]?.id ?? 'all'

export function ExplorerProvider({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : (locationFromHash(window.location.hash)?.id ?? null),
  )
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [filter, setFilter] = useState(firstFilter)
  const { autoRotate } = settings.controls
  // With reduced motion the planet starts still; the visitor can still turn it on.
  const [spin, setSpin] = useState(() => (autoRotate.enabled && !reduced ? autoRotate.defaultSpeed : 0))
  const [panelOpen, setPanelOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [entering, setEntering] = useState<{ id: string; url: string; nameKey: string } | null>(null)

  const select = useCallback((id: string | null) => {
    setSelectedId(id)
    if (!id) setPanelOpen(false)
    if (typeof window === 'undefined') return
    const next = id ? `#${id}` : `${window.location.pathname}${window.location.search}`
    window.history.replaceState(null, '', next)
  }, [])

  const choose = useCallback(
    (id: string) => {
      const location = getLocation(id)
      if (location && !filterShows(filter, location)) setFilter(firstFilter)
      select(id)
    },
    [filter, select],
  )

  const enter = useCallback(
    (id: string) => {
      const location = getLocation(id)
      const planet = location ? undefined : getBackdropPlanet(id)
      const entry = location?.entry ?? planet?.entry
      const nameKey = location?.display.nameKey ?? planet?.nameKey
      if (!entry || !nameKey || entering) return false
      const url = new URL(entry.href, window.location.href).toString()
      if (entry.openIn === 'new-tab') {
        // Opened straight from the click, so browsers do not treat it as a pop-up.
        navigation.open(url)
        return true
      }
      if (location) select(id)
      if (entry.transition === 'none' || reduced) {
        navigation.go(url)
        return true
      }
      setEntering({ id, url, nameKey })
      // Islands get the dive toward them; a distant planet simply fades in.
      if (location) globeApi.dive(location.position)
      return true
    },
    [entering, reduced, select],
  )

  // The dive plays, then the world opens.
  useEffect(() => {
    if (!entering) return
    const timer = window.setTimeout(() => navigation.go(entering.url), settings.controls.entryTransition.durationMs)
    return () => window.clearTimeout(timer)
  }, [entering])

  // Coming back with the browser's Back button can restore this page mid-dive: undo it.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setEntering(null)
      globeApi.reset()
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  useEffect(() => {
    const onHash = () => {
      const location = locationFromHash(window.location.hash)
      if (location && !filterShows(filter, location)) setFilter(firstFilter)
      setSelectedId(location?.id ?? null)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [filter])

  const value = useMemo(
    () => ({
      selectedId,
      select,
      choose,
      hoveredId,
      setHoveredId,
      filter,
      setFilter,
      spin,
      setSpin,
      panelOpen,
      setPanelOpen,
      reduced,
      ready,
      setReady,
      enter,
      entering,
    }),
    [selectedId, select, choose, hoveredId, filter, spin, panelOpen, reduced, ready, enter, entering],
  )
  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- a hook belongs with its provider
export function useExplorer(): ExplorerState {
  const state = useContext(ExplorerContext)
  if (!state) throw new Error('useExplorer needs an ExplorerProvider')
  return state
}
