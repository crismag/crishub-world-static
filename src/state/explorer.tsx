import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { filterShows, getLocation, locationFromHash, settings, world } from '@/runtime/world-registry/index.ts'

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
    }),
    [selectedId, select, choose, hoveredId, filter, spin, panelOpen, reduced, ready],
  )
  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- a hook belongs with its provider
export function useExplorer(): ExplorerState {
  const state = useContext(ExplorerContext)
  if (!state) throw new Error('useExplorer needs an ExplorerProvider')
  return state
}
