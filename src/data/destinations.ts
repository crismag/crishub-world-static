import { fibonacciPoint, pickScattered, type Vec3 } from './math.ts'

export type DestinationKind = 'place' | 'project' | 'mystery'

export type DestinationFilter = 'all' | DestinationKind

export type Destination = {
  id: string
  name: string
  kind: DestinationKind
  epithet: string
  summary: string
  notes: readonly [string, string, string]
  /** WebGL terrain colors. They are miniature materials, not interface tokens. */
  land: string
  sand: string
  accent: string
  position: Vec3
}

type DestinationSpec = Omit<Destination, 'position'>

const specs: readonly DestinationSpec[] = [
  {
    id: 'philippines',
    name: 'Philippines',
    kind: 'place',
    epithet: 'Jeepney under the palms',
    summary:
      'Home shore. A painted jeepney, a short street, and palms that lean over warm water. It is a souvenir of the place, not a map of it.',
    notes: [
      'The jeepney is red, with a yellow roof you can spot from orbit.',
      'Two palms mark the street instead of a city grid.',
      'This is the shore most of the other stories start from.',
    ],
    land: '#2f8f4e',
    sand: '#e6c27a',
    accent: '#e23b3b',
  },
  {
    id: 'crislab',
    name: 'CrisLab',
    kind: 'project',
    epithet: 'The workshop that stays lit',
    summary:
      'Experiments, prototypes, and half-built ideas. A glass dome, a dish, and a core that glows because something is always mid-build.',
    notes: [
      'The dome is the workshop. The bright core is the current experiment.',
      'CrisLab is a place on the globe, the same way Japan is.',
      'New tools tend to leave from here.',
    ],
    land: '#243044',
    sand: '#8aa0b8',
    accent: '#7ee0ff',
  },
  {
    id: 'canada',
    name: 'Canada',
    kind: 'place',
    epithet: 'A tower in the weather',
    summary:
      'Snow, dark pines, and a needle of a tower. A winter city reduced to the parts you would recognize from the window of a plane.',
    notes: [
      'The tower is the CN Tower, drawn as a toy.',
      'Pines and snow do the rest of the talking.',
      'The island is the same size as Singapore. That is deliberate.',
    ],
    land: '#e7eef2',
    sand: '#d5dde3',
    accent: '#d4544a',
  },
  {
    id: 'marketlab',
    name: 'MarketLab',
    kind: 'project',
    epithet: 'Weather made of numbers',
    summary:
      'Markets, models, and the habit of looking twice. The skyline is a candlestick chart and the plaza is a trading floor.',
    notes: [
      'Green bars rise. Red bars fall. The chart is the city.',
      'The ring is the floor where the looking happens.',
      'It sits in open ocean, not in a technology district.',
    ],
    land: '#1e2a28',
    sand: '#c8b48a',
    accent: '#3ddc97',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    kind: 'place',
    epithet: 'Three towers, one garden',
    summary:
      'A harbor city balanced on a sky park, with a small merlion and one supertree. Designed, dense, and immediately recognizable.',
    notes: [
      'The long slab on three stalks is Marina Bay Sands.',
      'The white figure by the water is the Merlion.',
      'The disc on a trunk stands in for Gardens by the Bay.',
    ],
    land: '#3d8f78',
    sand: '#f0d7a4',
    accent: '#e8d7b0',
  },
  {
    id: 'adarna-writer',
    name: 'Adarna Writer',
    kind: 'project',
    epithet: 'The bird that tells it',
    summary:
      'Stories, drafts, and the mythic Adarna. An open book, a quill, and a gold bird that sings a page awake.',
    notes: [
      'The book lies open so you can read the island from above.',
      'The bird is the Adarna, not a logo.',
      'This shore is for writing and for staying with a sentence.',
    ],
    land: '#6b4a78',
    sand: '#f0d9b8',
    accent: '#f2c14e',
  },
  {
    id: 'united-states',
    name: 'United States',
    kind: 'place',
    epithet: 'Torch on the harbor',
    summary:
      'A very large country, kept to one figure and a pedestal. The torch stays lit so the shore is findable from the night side.',
    notes: [
      'The green figure is a pocket Statue of Liberty.',
      'The torch is offset so it still reads from above.',
      'One landmark stands in for the whole country.',
    ],
    land: '#6f8f72',
    sand: '#e7d7b0',
    accent: '#6fbf9b',
  },
  {
    id: 'awkward-studio',
    name: 'Awkward Studio',
    kind: 'project',
    epithet: 'Games with the seams showing',
    summary:
      'Game worlds and interactive adventures. An arcade cabinet left slightly askew, on purpose, with a screen that refuses to sleep.',
    notes: [
      'The cabinet is the studio door.',
      'The marquee is crooked by one degree more than comfort.',
      'Future playable rooms can dock at this shore.',
    ],
    land: '#3a2e55',
    sand: '#e7b8c9',
    accent: '#ff5d8f',
  },
  {
    id: 'malaysia',
    name: 'Malaysia',
    kind: 'place',
    epithet: 'The twin lights',
    summary:
      'Two towers and the bridge between them. A skyline that explains itself in one glance, which is the whole point of a miniature.',
    notes: [
      'The pair is the Petronas Twin Towers.',
      'The skybridge sits a little above the middle.',
      'Silver, not gold, so Thailand can keep the gold.',
    ],
    land: '#2f7d4a',
    sand: '#efd3a1',
    accent: '#d5dde6',
  },
  {
    id: 'oikonomia',
    name: 'Oikonomia',
    kind: 'project',
    epithet: 'The household, enlarged',
    summary:
      'Leadership, planning, and the work of keeping a house in order. Columns, steps, and a table where plans get made.',
    notes: [
      'The name is the old word for the management of a household.',
      'Four columns and a lintel make a room you can walk toward.',
      'The sheet on the table is a plan, not a spreadsheet costume.',
    ],
    land: '#c4b49a',
    sand: '#efe4d2',
    accent: '#f4f1ea',
  },
  {
    id: 'thailand',
    name: 'Thailand',
    kind: 'place',
    epithet: 'Gold in the heat',
    summary:
      'A tiered spire and a small red pavilion. Temple architecture, simplified until the silhouette is enough.',
    notes: [
      'The gold stupa is the landmark.',
      'The red roof beside it keeps the shore from being only a spike.',
      'Nothing here tries to be a full temple complex.',
    ],
    land: '#c4a15a',
    sand: '#f3e2c2',
    accent: '#e1b03a',
  },
  {
    id: 'ekklesia',
    name: 'Ekklesia',
    kind: 'project',
    epithet: 'A room that gathers',
    summary:
      'Church technology and community systems, built at human size. A chapel, a warm window, and a courtyard rather than a campus.',
    notes: [
      'The nave is small on purpose.',
      'The lit window means someone is already inside.',
      'The steeple carries a modest cross, not a billboard.',
    ],
    land: '#8d6b4a',
    sand: '#f0e2cc',
    accent: '#f2a65a',
  },
  {
    id: 'hong-kong',
    name: 'Hong Kong',
    kind: 'place',
    epithet: 'Harbor stacked high',
    summary:
      'Towers packed until they become one ridge, a peak behind them, and water in front. Victoria Harbour, remembered rather than surveyed.',
    notes: [
      'The windows are the lights across the harbor.',
      'The green peak sits behind the ridge.',
      'Density is the landmark.',
    ],
    land: '#5c6b7a',
    sand: '#d9d3c7',
    accent: '#f0d78c',
  },
  {
    id: 'dalisay-ui',
    name: 'Dalisay UI',
    kind: 'project',
    epithet: 'Color, type, and restraint',
    summary:
      'Design systems and interface experiments. Slabs of color stacked into a little campus, pure enough to reuse.',
    notes: [
      'Dalisay means pure. The slabs are tokens you can walk around.',
      'Each block is a different voice in the same system.',
      'The arch is a type specimen, not a gate to somewhere else.',
    ],
    land: '#d7c4b0',
    sand: '#f3e6d4',
    accent: '#1f6f8b',
  },
  {
    id: 'japan',
    name: 'Japan',
    kind: 'place',
    epithet: 'Gate, then quiet',
    summary:
      'A vermilion gate, a pagoda, and a stone lantern. The path through the island is obvious, which is the hospitality.',
    notes: [
      'The torii is the thing you see first.',
      'The pagoda stands just behind it.',
      'The lantern is the invitation to come closer.',
    ],
    land: '#3f7d4e',
    sand: '#efe6d6',
    accent: '#d84b3c',
  },
  {
    id: 'lantern-shoal',
    name: 'Lantern Shoal',
    kind: 'mystery',
    epithet: 'One light in the fog',
    summary:
      'An unknown island under low cloud. Something is moored here. The logbooks are blank, and the lantern is the only sentence.',
    notes: [
      'Fog is the landmark.',
      'The lantern is lit, but it does not explain itself.',
      'This shore stays closed until there is a reason to land.',
    ],
    land: '#8a93a0',
    sand: '#b7c0c8',
    accent: '#f6d48a',
  },
  {
    id: 'question-atoll',
    name: 'Question Atoll',
    kind: 'mystery',
    epithet: 'The marker came first',
    summary:
      'A question mark was here before the map. It has not explained itself. The atoll is real enough to select and too early to enter.',
    notes: [
      'The mark is cut into the ground so it reads from above.',
      'There is no riddle to solve yet.',
      'Selecting it only confirms that it is still unknown.',
    ],
    land: '#6d6458',
    sand: '#cfc3b0',
    accent: '#f4efe6',
  },
  {
    id: 'violet-gate',
    name: 'Violet Gate',
    kind: 'mystery',
    epithet: 'A ring that does not open',
    summary:
      'A glowing portal standing on open water. It is a promise of a later adventure, not a door you can walk through today.',
    notes: [
      'The ring is the whole destination.',
      'It faces you and stays shut.',
      'Seasonal events and secret islands can arrive through gates like this.',
    ],
    land: '#241838',
    sand: '#3a2758',
    accent: '#c9b0ff',
  },
]

export const destinations: readonly Destination[] = specs.map((spec, index) => ({
  ...spec,
  position: fibonacciPoint(index, specs.length),
}))

const sceneryPalette = [
  { land: '#3e7c55', sand: '#e7d3a4' },
  { land: '#c2b49a', sand: '#efe4cf' },
  { land: '#4d6e78', sand: '#d5ddd4' },
  { land: '#6e8f4a', sand: '#ead7a8' },
  { land: '#8d7a62', sand: '#e6d5bc' },
] as const

export type Scenery = {
  id: string
  position: Vec3
  seed: number
  land: string
  sand: string
}

export const scenery: readonly Scenery[] = pickScattered(
  destinations.map((destination) => destination.position),
  5,
  0.42,
).map((position, index) => {
  const colors = sceneryPalette[index % sceneryPalette.length] ?? sceneryPalette[0]
  return {
    id: `islet-${index + 1}`,
    position,
    seed: index * 2.1 + 0.6,
    land: colors.land,
    sand: colors.sand,
  }
})

export function destinationFromHash(hash: string): Destination | undefined {
  const id = hash.replace(/^#/, '').trim().toLowerCase()
  if (!id) return undefined
  return destinations.find((destination) => destination.id === id)
}

export function getDestination(id: string): Destination | undefined {
  return destinations.find((destination) => destination.id === id)
}

export function matchesFilter(kind: DestinationKind, filter: DestinationFilter): boolean {
  return filter === 'all' || kind === filter
}

export function kindLabel(kind: DestinationKind): string {
  if (kind === 'place') return 'Place'
  if (kind === 'project') return 'Project'
  return 'Uncharted'
}
