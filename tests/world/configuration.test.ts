import { afterEach, describe, expect, test } from 'vitest'
import { scratchWorld, type ScratchWorld } from '../helpers/world-fixture.ts'

let world: ScratchWorld
const fresh = () => (world = scratchWorld())
afterEach(() => world?.dispose())

describe('loading', () => {
  test('the real world compiles with no errors', () => {
    fresh()
    const result = world.compile()
    expect(result.messages).toBe('')
    expect(result.registry?.locations).toHaveLength(27)
    expect(world.geography()).toEqual([])
  })

  test('a file that is not JSON fails, naming the file', () => {
    fresh()
    world.write('settings/globe.json', '{ "radius": 4,')
    const result = world.compile()
    expect(result.registry).toBeNull()
    expect(result.errors.some((item) => item.file.endsWith('settings/globe.json') && item.message.startsWith('not valid JSON'))).toBe(true)
  })

  test('out-of-range coordinates are rejected', () => {
    fresh()
    world.edit<{ placement: { latitude: number } }>('locations/countries/japan/location.json', (data) => {
      data.placement.latitude = 120
    })
    expect(world.compile().messages).toMatch(/placement\.latitude/)
  })

  test('unknown fields are rejected, so typos never pass silently', () => {
    fresh()
    world.edit<Record<string, unknown>>('settings/controls.json', (data) => {
      data.dragSensitivty = 0.01
    })
    expect(world.compile().messages).toMatch(/dragSensitivty/)
  })

  test('settings that contradict each other are rejected', () => {
    fresh()
    world.edit<{ defaultDistance: number }>('settings/camera.json', (data) => {
      data.defaultDistance = 100
    })
    expect(world.compile().messages).toMatch(/defaultDistance/)
  })

  test('configuration paths cannot leave the world folder', () => {
    fresh()
    world.edit<{ locations: string[] }>('locations/index.json', (data) => {
      data.locations.push('../../etc')
    })
    expect(world.compile().messages).toMatch(/paths are relative|outside the world folder/)
  })
})

describe('identity and references', () => {
  test('duplicate location IDs are detected', () => {
    fresh()
    world.write('locations/countries/japan-copy/location.json', world.read('locations/countries/japan/location.json'))
    world.edit<{ locations: string[] }>('locations/index.json', (data) => {
      data.locations.push('countries/japan-copy')
    })
    expect(world.compile().messages).toMatch(/id "japan" is already used/)
  })

  test('a missing text key is detected', () => {
    fresh()
    world.edit<{ display: { nameKey: string } }>('locations/countries/japan/location.json', (data) => {
      data.display.nameKey = 'location.japan.title'
    })
    expect(world.compile().messages).toMatch(/text key "location\.japan\.title" is missing/)
  })

  test('a missing asset is detected, both in the manifest and on disk', () => {
    fresh()
    world.edit<{ landmarks: { assetId: string | null; preset: string }[] }>('locations/countries/japan/landmarks.json', (data) => {
      data.landmarks[0]!.preset = 'model'
      data.landmarks[0]!.assetId = 'landmark.japan.gate'
    })
    expect(world.compile().messages).toMatch(/asset "landmark\.japan\.gate" is not in the asset manifest/)

    fresh()
    world.edit<{ assets: { path: string }[] }>('assets/manifest.json', (data) => {
      data.assets[0]!.path = 'icons/site/missing.svg'
    })
    expect(world.compile().messages).toMatch(/file not found/)
  })

  test('an unknown category or landmark preset is rejected', () => {
    fresh()
    world.edit<{ category: string }>('locations/countries/japan/location.json', (data) => {
      data.category = 'planet'
    })
    expect(world.compile().messages).toMatch(/unknown category "planet"/)

    fresh()
    world.edit<{ landmarks: { preset: string }[] }>('locations/countries/japan/landmarks.json', (data) => {
      data.landmarks[0]!.preset = 'pyramid'
    })
    expect(world.compile().messages).toMatch(/preset/)
  })

  test('landmark options are checked against their preset', () => {
    fresh()
    world.edit<{ landmarks: { params: Record<string, unknown> }[] }>('locations/special/north-pole/landmarks.json', (data) => {
      data.landmarks[0]!.params = { colors: { crystal: 'cyan' } }
    })
    expect(world.compile().messages).toMatch(/beacon params\.colors\.crystal/)
  })

  test('layouts may only use registered components with their documented props', () => {
    fresh()
    world.edit<{ regions: { top: { component: string }[] } }>('layouts/explorer.json', (data) => {
      data.regions.top[1]!.component = 'EvalScript'
    })
    expect(world.compile().messages).toMatch(/component/)

    fresh()
    world.edit<{ regions: { top: { props: Record<string, unknown> }[] } }>('layouts/explorer.json', (data) => {
      data.regions.top[1]!.props = { onClick: 'alert(1)' }
    })
    expect(world.compile().messages).toMatch(/props/)
  })

  test('shores too close together, or on top of a formation, are rejected', () => {
    fresh()
    const canada = world.read<{ placement: { latitude: number; longitude: number } }>('locations/countries/canada/location.json')
    world.edit<{ placement: { latitude: number; longitude: number } }>('locations/countries/japan/location.json', (data) => {
      data.placement.latitude = canada.placement.latitude + 2
      data.placement.longitude = canada.placement.longitude
    })
    expect(world.compile().messages).toMatch(/canada and japan are .* apart|japan and canada are .* apart/)
  })
})

describe('content', () => {
  const overview = 'locations/countries/japan/content/overview.md'

  test('a broken content reference is detected', () => {
    fresh()
    world.edit<{ sections: { source: string }[] }>('locations/countries/japan/items.json', (data) => {
      data.sections[0]!.source = 'content/missing.md'
    })
    expect(world.compile().messages).toMatch(/content file not found: content\/missing\.md/)
  })

  test('Markdown renders headings, emphasis, lists, tables, quotes, code, and links', () => {
    fresh()
    world.write(
      overview,
      [
        '---',
        'id: overview',
        'title: About Japan',
        'status: published',
        '---',
        '## Heading',
        '',
        'Some **bold** and *italic* text with a [link](https://example.com).',
        '',
        '- one',
        '- two',
        '',
        '| a | b |',
        '| - | - |',
        '| 1 | 2 |',
        '',
        '> quoted',
        '',
        '```',
        'code()',
        '```',
      ].join('\n'),
    )
    const html = world.compile().registry!.locations.find((item) => item.id === 'japan')!.sections[0]!.html
    expect(html).toContain('<h2>Heading</h2>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<table>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<code>code()')
    expect(html).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"')
  })

  test('raw HTML and unsafe links are neutralized', () => {
    fresh()
    world.write(
      overview,
      [
        '---',
        'id: overview',
        'title: About Japan',
        'status: published',
        '---',
        '<script>alert(1)</script>',
        '',
        '<img src=x onerror="alert(1)">',
        '',
        '[click](javascript:alert(1)) and [data](data:text/html,hi)',
      ].join('\n'),
    )
    const html = world.compile().registry!.locations.find((item) => item.id === 'japan')!.sections[0]!.html
    // Raw HTML survives only as visible, escaped text, never as a tag or a live link.
    expect(html).not.toMatch(/<script|<img|href="javascript:|href="data:/i)
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img src=x onerror')
  })

  test('images must be registered assets, and resolve to their served path', () => {
    fresh()
    world.write(overview, '---\nid: overview\ntitle: T\nstatus: published\n---\n![A photo](https://example.com/a.png)\n')
    expect(world.compile().messages).toMatch(/images must use registered assets/)

    fresh()
    world.write(overview, '---\nid: overview\ntitle: T\nstatus: published\n---\n![Site icon](asset:icon.site.favicon)\n')
    const section = world.compile().registry!.locations.find((item) => item.id === 'japan')!.sections[0]!
    expect(section.images).toEqual([{ src: 'world-assets/icons/site/favicon.svg', alt: 'Site icon' }])
  })

  test('sections follow their order, and hidden or draft sections are left out', () => {
    fresh()
    world.write('locations/countries/japan/content/history.md', '---\nid: history\ntitle: History\nstatus: published\n---\nOld.\n')
    world.write('locations/countries/japan/content/secret.md', '---\nid: secret\ntitle: Secret\nstatus: published\n---\nHidden.\n')
    world.write('locations/countries/japan/content/later.md', '---\nid: later\ntitle: Later\nstatus: draft\n---\nNot yet.\n')
    world.write('locations/countries/japan/items.json', {
      schemaVersion: 1,
      sections: [
        { id: 'overview', source: 'content/overview.md', display: 'article', order: 20, visible: true },
        { id: 'history', source: 'content/history.md', display: 'tab', order: 10, visible: true },
        { id: 'secret', source: 'content/secret.md', display: 'article', order: 30, visible: false },
        { id: 'later', source: 'content/later.md', display: 'article', order: 40, visible: true },
      ],
    })
    const result = world.compile()
    expect(result.registry!.locations.find((item) => item.id === 'japan')!.sections.map((section) => section.id)).toEqual(['history', 'overview'])
    expect(result.warnings.some((item) => item.message.includes('draft'))).toBe(true)
  })

  test('front matter is validated', () => {
    fresh()
    world.write(overview, '---\nid: Overview Page\nstatus: live\n---\nText\n')
    expect(world.compile().messages).toMatch(/front matter (id|status)/)
  })
})

describe('authoring without code', () => {
  test('a new island needs only a folder of JSON and Markdown', () => {
    fresh()
    const folder = 'locations/virtual/test-lab'
    world.write(`${folder}/location.json`, {
      schemaVersion: 1,
      id: 'test-lab',
      category: 'virtual',
      status: 'published',
      display: {
        nameKey: 'location.test-lab.name',
        shortNameKey: 'location.test-lab.short',
        descriptionKey: 'location.test-lab.description',
        showLabel: true,
        showOnGlobe: true,
        showInDirectory: true,
        sortOrder: 500,
      },
      placement: { latitude: -50, longitude: 42, altitude: 0, scale: 1, headingDeg: 0 },
      appearance: { ground: '#4a7a9c', shore: '#e6d5bc', accent: '#ff9f43' },
      references: { terrain: 'terrain.json', landmarks: 'landmarks.json', items: 'items.json' },
      interaction: { selectable: true, tooltipEnabled: true, markerRadius: 0.42 },
      tags: [],
      parent: null,
      related: [],
    })
    world.write(`${folder}/terrain.json`, {
      schemaVersion: 1,
      locationId: 'test-lab',
      shape: { type: 'oval', radiusDeg: [7, 6.3], headingDeg: 20, flatRadiusDeg: 4.3 },
    })
    world.write(`${folder}/landmarks.json`, {
      schemaVersion: 1,
      locationId: 'test-lab',
      landmarks: [
        { id: 'tower', preset: 'tower', assetId: null, labelKey: null, lobe: null, position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: 1.3, visible: true, animation: 'default', params: { roof: '#ff9f43' } },
      ],
    })
    world.write(`${folder}/items.json`, {
      schemaVersion: 1,
      sections: [{ id: 'overview', source: 'content/overview.md', display: 'card', order: 10, visible: true }],
    })
    world.write(`${folder}/content/overview.md`, '---\nid: overview\ntitle: About Test Lab\nstatus: published\n---\nA new island.\n')
    world.edit<{ locations: string[] }>('locations/index.json', (data) => {
      data.locations.push('virtual/test-lab')
    })
    world.edit<Record<string, string>>('locales/en.json', (data) => {
      data['location.test-lab.name'] = 'Test Lab'
      data['location.test-lab.short'] = 'Test Lab'
      data['location.test-lab.description'] = 'Built from configuration alone'
    })
    const result = world.compile()
    expect(result.messages).toBe('')
    const island = result.registry!.locations.find((item) => item.id === 'test-lab')!
    expect(island.landmarks[0]!.preset).toBe('tower')
    expect(island.sections[0]!.html).toContain('A new island.')
    expect(world.geography()).toEqual([])
  })

  test('geography problems are caught: a landmark too big for its island', () => {
    fresh()
    world.edit<{ shape: { radiusDeg: number[] } }>('locations/realms/isla-sorna/terrain.json', (data) => {
      data.shape.radiusDeg = [1.5, 1.2]
    })
    const problems = world.geography()!
    expect(problems.some((item) => item.message.includes('not on flat ground'))).toBe(true)
  })
})
