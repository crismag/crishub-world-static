// @vitest-environment jsdom
import './setup.tsx'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { navigation } from '@/state/navigation.ts'
import type { CompiledSection } from '@/runtime/configuration/registry-types.ts'
import { TextProvider } from '@/runtime/localization/index.tsx'
import { world } from '@/runtime/world-registry/index.ts'
import { ExplorerProvider, useExplorer } from '@/state/explorer.tsx'
import { isLive } from '@/ui/components/Announcements.tsx'
import { DestinationDirectory } from '@/ui/components/DestinationDirectory.tsx'
import { Sections } from '@/ui/components/registry.tsx'
import { ContentSections } from '@/ui/content-renderers/index.tsx'
import { Explorer } from '@/ui/Explorer.tsx'
import type { ReactNode } from 'react'

function Providers({ children, locale = 'en' }: { children: ReactNode; locale?: string }) {
  return (
    <TextProvider locale={locale}>
      <ExplorerProvider reduced={false}>{children}</ExplorerProvider>
    </TextProvider>
  )
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  window.localStorage.clear()
})
afterEach(cleanup)

describe('the configured layout', () => {
  test('renders the legend and controls from layouts/explorer.json, labeled from the locale', () => {
    render(<Providers><Explorer /></Providers>)
    const legend = screen.getByRole('radiogroup', { name: 'Show shores' })
    const labels = within(legend).getAllByRole('radio').map((item) => item.textContent)
    expect(labels).toEqual(world.layouts.navigation.filters.map((filter) => ({ all: 'All', places: 'Places', projects: 'Projects', realms: 'Realms', uncharted: 'Uncharted' })[filter.id]))
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset the globe' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: '½× rotation' }).getAttribute('aria-checked')).toBe('true')
  })

  test('text comes from the visitor\'s locale, falling back to the default', () => {
    render(<Providers locale="fil"><Explorer /></Providers>)
    expect(screen.getByRole('radiogroup', { name: 'Ipakita ang mga baybayin' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Mga Lugar' })).toBeTruthy()
    // Shore names are not translated, so they fall back to English.
    expect(screen.getByRole('button', { name: 'Japan' })).toBeTruthy()
  })

  test('sections render in their configured order, and hidden ones do not render', () => {
    render(
      <Providers>
        <div data-testid="region">
          <Sections
            sections={[
              { id: 'b', component: 'GlobeControls', order: 20, visible: true, props: { showSpeed: false, showReset: false } },
              { id: 'a', component: 'ShoreLegend', order: 10, visible: true, props: {} },
              { id: 'c', component: 'DestinationDirectory', order: 30, visible: false, props: {} },
            ]}
          />
        </div>
      </Providers>,
    )
    const order = [...screen.getByTestId('region').querySelectorAll('[data-section]')].map((element) => element.getAttribute('data-section'))
    expect(order).toEqual(['a', 'b'])
    expect(screen.queryByRole('button', { name: 'Reset the globe' })).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Shores' })).toBeNull()
  })
})

describe('choosing a shore', () => {
  test('shows its chip, and Read opens its writeups, loaded on demand', async () => {
    render(<Providers><Explorer /></Providers>)
    fireEvent.click(screen.getByRole('button', { name: 'Japan' }))
    expect(window.location.hash).toBe('#japan')
    expect(screen.getByText('Gate, then quiet')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Read about Japan' }))
    const panel = screen.getByRole('complementary')
    expect(within(panel).getByRole('heading', { name: 'Japan' })).toBeTruthy()
    // The header comes from the registry at once; the article arrives from its own content file.
    expect(await within(panel).findByText(/A vermilion gate, a pagoda/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close Japan' }))
    expect(window.location.hash).toBe('')
  })

  test('opening a link to a shore selects it', () => {
    window.history.replaceState(null, '', '/#crislab')
    render(<Providers><Explorer /></Providers>)
    expect(screen.getByText('The workshop that stays lit')).toBeTruthy()
  })

  test('a hash naming something that is not a shore selects nothing', () => {
    window.history.replaceState(null, '', '/#north-pole')
    render(<Providers><Explorer /></Providers>)
    expect(screen.queryByRole('button', { name: /^Close / })).toBeNull()
  })
})

describe('filters and the directory', () => {
  function Probe() {
    const { filter, setFilter } = useExplorer()
    return (
      <>
        <output data-testid="filter">{filter}</output>
        <button type="button" onClick={() => setFilter('projects')}>
          projects only
        </button>
        <DestinationDirectory />
      </>
    )
  }

  test('the directory groups shores by category and follows the filter', () => {
    render(<Providers><Probe /></Providers>)
    const directory = screen.getByRole('navigation', { name: 'Shores' })
    expect(within(directory).getByRole('heading', { name: 'Places' })).toBeTruthy()
    expect(within(directory).getByRole('button', { name: 'Canada' })).toBeTruthy()
    fireEvent.click(screen.getByText('projects only'))
    expect(within(directory).queryByRole('button', { name: 'Canada' })).toBeNull()
    expect(within(directory).getByRole('button', { name: 'CrisLab' })).toBeTruthy()
  })

  test('choosing a shore the filter hides switches the filter back to all', () => {
    render(<Providers><Explorer /><Probe /></Providers>)
    fireEvent.click(screen.getByText('projects only'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Japan' })[0]!)
    expect(screen.getByTestId('filter').textContent).toBe('all')
  })
})

describe('content loading', () => {
  test('each shore\'s writeups load separately, and only once', async () => {
    const { loadContent } = await import('@/runtime/content/index.ts')
    const first = loadContent('japan')
    expect(loadContent('japan')).toBe(first)
    const sections = await first
    expect(sections.map((section) => section.id)).toEqual(['overview'])
    expect(sections[0]!.html).toContain('vermilion gate')
    expect(await loadContent('north-pole')).toEqual([])
  })

  test('the up-front registry carries section summaries, not articles', () => {
    const japan = world.locations.find((location) => location.id === 'japan')!
    expect(japan.sections).toEqual([{ id: 'overview', display: 'article', order: 10, title: 'About Japan', titleKey: null }])
    expect(JSON.stringify(world)).not.toContain('vermilion gate')
  })
})

describe('the places legend', () => {
  beforeEach(() => window.localStorage.clear())

  test('starts collapsed, opens to list every place by category, and remembers', () => {
    const { unmount } = render(<Providers><Explorer /></Providers>)
    const toggle = screen.getByRole('button', { name: 'Show the list of places' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    const list = screen.getByRole('navigation', { name: 'Places' })
    for (const heading of ['Places', 'Projects', 'Realms', 'Uncharted']) {
      expect(within(list).getByRole('heading', { name: heading })).toBeTruthy()
    }
    expect(within(list).getAllByRole('button')).toHaveLength(24)
    unmount()
    render(<Providers><Explorer /></Providers>)
    expect(screen.getByRole('button', { name: 'Hide the list of places' }).getAttribute('aria-expanded')).toBe('true')
  })

  test('choosing a place selects it and turns the globe to it, without entering', () => {
    const go = vi.spyOn(navigation, 'go').mockImplementation(() => {})
    const japan = world.locations.find((location) => location.id === 'japan')!
    japan.entry = { type: 'url', href: './worlds/japan/', openIn: 'same-tab', transition: 'dive', labelKey: null }
    try {
      render(<Providers><Explorer /></Providers>)
      fireEvent.click(screen.getByRole('button', { name: 'Show the list of places' }))
      fireEvent.click(within(screen.getByRole('navigation', { name: 'Places' })).getByRole('button', { name: /^Japan/ }))
      expect(window.location.hash).toBe('#japan')
      expect(go).not.toHaveBeenCalled()
    } finally {
      japan.entry = null
      go.mockRestore()
    }
  })
})

describe('entering a world', () => {
  afterEach(() => vi.useRealTimers())

  test('a place without an entry has no Enter button, and entering does nothing', () => {
    const go = vi.spyOn(navigation, 'go').mockImplementation(() => {})
    let entered: boolean | null = null
    function Probe() {
      const { enter } = useExplorer()
      return <button type="button" onClick={() => (entered = enter('canada'))}>try canada</button>
    }
    render(<Providers><Explorer /><Probe /></Providers>)
    fireEvent.click(screen.getByRole('button', { name: 'Canada' }))
    expect(screen.queryByRole('button', { name: /^Enter / })).toBeNull()
    fireEvent.click(screen.getByText('try canada'))
    expect(entered).toBe(false)
    expect(go).not.toHaveBeenCalled()
    go.mockRestore()
  })

  test('a place with an entry dives, fades, then opens its world', () => {
    vi.useFakeTimers()
    const go = vi.spyOn(navigation, 'go').mockImplementation(() => {})
    const crislab = world.locations.find((location) => location.id === 'crislab')!
    crislab.entry = { type: 'url', href: './worlds/crislab/', openIn: 'same-tab', transition: 'dive', labelKey: null }
    try {
      render(<Providers><Explorer /></Providers>)
      fireEvent.click(screen.getByRole('button', { name: 'CrisLab' }))
      fireEvent.click(screen.getByRole('button', { name: 'Enter CrisLab' }))
      expect(screen.getByRole('status').textContent).toBe('Entering CrisLab…')
      expect(go).not.toHaveBeenCalled()
      vi.advanceTimersByTime(world.settings.controls.entryTransition.durationMs)
      expect(go).toHaveBeenCalledWith(new URL('./worlds/crislab/', window.location.href).toString())
    } finally {
      crislab.entry = null
      go.mockRestore()
    }
  })

  test('a new-tab entry opens at once and leaves the globe where it is', () => {
    const open = vi.spyOn(navigation, 'open').mockImplementation(() => {})
    const marketlab = world.locations.find((location) => location.id === 'marketlab')!
    marketlab.entry = { type: 'url', href: 'https://example.com/marketlab', openIn: 'new-tab', transition: 'dive', labelKey: null }
    try {
      render(<Providers><Explorer /></Providers>)
      fireEvent.click(screen.getByRole('button', { name: 'MarketLab' }))
      fireEvent.click(screen.getByRole('button', { name: 'Enter MarketLab' }))
      expect(open).toHaveBeenCalledWith('https://example.com/marketlab')
      expect(screen.queryByText(/^Entering/)).toBeNull()
    } finally {
      marketlab.entry = null
      open.mockRestore()
    }
  })
})

describe('backdrop planets', () => {
  afterEach(() => vi.useRealTimers())

  function EnterProbe({ id, onResult }: { id: string; onResult: (entered: boolean) => void }) {
    const { enter } = useExplorer()
    return <button type="button" onClick={() => onResult(enter(id))}>enter {id}</button>
  }

  test('clicking a planet without an entry does nothing', () => {
    const go = vi.spyOn(navigation, 'go').mockImplementation(() => {})
    let result: boolean | null = null
    render(<Providers><Explorer /><EnterProbe id="mars" onResult={(entered) => (result = entered)} /></Providers>)
    fireEvent.click(screen.getByText('enter mars'))
    expect(result).toBe(false)
    expect(screen.queryByText(/^Entering/)).toBeNull()
    expect(go).not.toHaveBeenCalled()
    go.mockRestore()
  })

  test('a planet with an entry fades, then opens its world', () => {
    vi.useFakeTimers()
    const go = vi.spyOn(navigation, 'go').mockImplementation(() => {})
    const mars = world.backdrop.find((planet) => planet.id === 'mars')!
    mars.entry = { type: 'url', href: './worlds/mars/', openIn: 'same-tab', transition: 'dive', labelKey: null }
    try {
      render(<Providers><Explorer /><EnterProbe id="mars" onResult={() => {}} /></Providers>)
      fireEvent.click(screen.getByText('enter mars'))
      expect(screen.getByRole('status').textContent).toBe('Entering Mars…')
      vi.advanceTimersByTime(world.settings.controls.entryTransition.durationMs)
      expect(go).toHaveBeenCalledWith(new URL('./worlds/mars/', window.location.href).toString())
      // A planet is not a shore: entering it selects nothing on the globe.
      expect(window.location.hash).toBe('')
    } finally {
      mars.entry = null
      go.mockRestore()
    }
  })
})

describe('content renderers', () => {
  const section = (id: string, display: CompiledSection['display'], html: string, extra: Partial<CompiledSection> = {}): CompiledSection => ({
    id,
    display,
    order: 0,
    title: id,
    titleKey: null,
    summary: null,
    coverPath: null,
    tags: [],
    author: null,
    updated: null,
    html,
    images: [],
    links: [],
    ...extra,
  })

  test('neighboring tab sections become one tab set', () => {
    render(
      <Providers>
        <ContentSections
          expandAccordions={false}
          sections={[section('History', 'tab', '<p>old</p>'), section('Culture', 'tab', '<p>art</p>'), section('Notes', 'article', '<p>end</p>')]}
        />
      </Providers>,
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['History', 'Culture'])
    expect(screen.getByRole('tabpanel').textContent).toBe('old')
    fireEvent.click(tabs[1]!)
    expect(screen.getByRole('tabpanel').textContent).toBe('art')
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeTruthy()
  })

  test('galleries, accordions, and link lists use their own layouts', () => {
    render(
      <Providers>
        <ContentSections
          expandAccordions
          sections={[
            section('Photos', 'gallery', '', { images: [{ src: 'a.webp', alt: 'Harbor' }] }),
            section('More', 'accordion', '<p>inside</p>'),
            section('Links', 'links', '', { links: [{ href: 'https://example.com', text: 'Example' }] }),
          ]}
        />
      </Providers>,
    )
    expect(screen.getByRole('img', { name: 'Harbor' })).toBeTruthy()
    expect(screen.getByText('inside').closest('details')?.open).toBe(true)
    const link = screen.getByRole('link', { name: 'Example' })
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })
})

describe('announcements', () => {
  test('show only while enabled and within their dates', () => {
    const today = new Date('2026-11-08T12:00:00Z')
    expect(isLive({ enabled: false, startsAt: null, endsAt: null }, today)).toBe(false)
    expect(isLive({ enabled: true, startsAt: null, endsAt: null }, today)).toBe(true)
    expect(isLive({ enabled: true, startsAt: '2026-11-09', endsAt: null }, today)).toBe(false)
    expect(isLive({ enabled: true, startsAt: null, endsAt: '2026-11-07' }, today)).toBe(false)
    expect(isLive({ enabled: true, startsAt: '2026-11-01', endsAt: '2026-11-30' }, today)).toBe(true)
  })
})
