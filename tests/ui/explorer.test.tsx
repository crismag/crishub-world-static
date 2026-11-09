// @vitest-environment jsdom
import './setup.tsx'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
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

beforeEach(() => window.history.replaceState(null, '', '/'))
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
  test('shows its chip, and Read opens its writeups', () => {
    render(<Providers><Explorer /></Providers>)
    fireEvent.click(screen.getByRole('button', { name: 'Japan' }))
    expect(window.location.hash).toBe('#japan')
    expect(screen.getByText('Gate, then quiet')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Read about Japan' }))
    const panel = screen.getByRole('complementary')
    expect(within(panel).getByRole('heading', { name: 'Japan' })).toBeTruthy()
    expect(within(panel).getByText(/A vermilion gate, a pagoda/)).toBeTruthy()
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
