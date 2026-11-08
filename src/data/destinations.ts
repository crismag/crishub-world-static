import { angularDistance, fibonacciPoint, pickScattered, type Vec3 } from './math.ts'
import { programmingContinent } from './programming.ts'
import { smile } from './smile.ts'

export type DestinationKind = 'place' | 'project' | 'realm' | 'mystery'

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
  /**
   * A shore made of several connected lobes, each with its own landmark and ground color.
   * The destination's position is then the middle of the group, and each site has its own.
   */
  sites?: readonly DestinationSite[]
}

export type SiteSpec = {
  id: string
  /** Which landmark stands on this lobe. */
  landmark: string
  /** Offset from the shore's middle on the globe: radians east and north. */
  at: readonly [number, number]
  /** Ground color of this lobe. */
  land: string
}

export type DestinationSite = SiteSpec & { position: Vec3 }

type DestinationSpec = Omit<Destination, 'position' | 'sites'> & { sites?: readonly SiteSpec[] }

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
  {
    id: 'naruto-islands',
    name: 'Naruto Islands',
    kind: 'realm',
    epithet: 'Four villages, one island chain',
    summary:
      'Four lobes of land joined by narrow bridges around a sheltered bay: a leafy village under a giant tree, a town under a storm that never leaves, a stage that sings, and domed houses in the dunes.',
    notes: [
      'Leaf: a giant tree with a treehouse platform, and small houses in its shade.',
      'Rain and Sound: storm towers to the north-east, a singing pillar to the south-east.',
      'Sand: dunes and domes to the south-west. The bay between them opens to the sea.',
    ],
    land: '#5f8f4a',
    sand: '#d8c48e',
    accent: '#ff9f43',
    sites: [
      { id: 'leaf', landmark: 'leaf-village', at: [-0.085, 0.085], land: '#2f8f45' },
      { id: 'rain', landmark: 'rain-island', at: [0.085, 0.085], land: '#3d4a57' },
      { id: 'sound', landmark: 'sound-island', at: [0.085, -0.085], land: '#4b3a63' },
      { id: 'sand', landmark: 'sand-island', at: [-0.085, -0.085], land: '#e3b86c' },
    ],
  },
  {
    id: 'mystery-island',
    name: 'Mystery Island',
    kind: 'mystery',
    epithet: 'X marks something',
    summary:
      'A palm, a rock, and a chest that glows under a red X. Nobody has opened it yet, and the island is not saying what is inside.',
    notes: [
      'The chest stays shut for now.',
      'The X is painted, not dug.',
      'It opens when there is something worth finding.',
    ],
    land: '#2f7a4f',
    sand: '#e6cf94',
    accent: '#ffd27a',
  },
  {
    id: 'dreams-and-aspiration',
    name: 'Dreams and Aspiration',
    kind: 'realm',
    epithet: 'Stairs toward a star',
    summary:
      'A spiral staircase climbs from a ring of soft clouds toward a star that keeps floating just out of reach.',
    notes: [
      'Every step is a little higher than the last.',
      'The star moves, so the climb never quite ends.',
      'Goals and long-term plans live here.',
    ],
    land: '#8fa6e8',
    sand: '#d9d2ff',
    accent: '#ffd86b',
  },
  {
    id: 'semiconductor-land',
    name: 'Semiconductor Land',
    kind: 'realm',
    epithet: 'A city built on a chip',
    summary:
      'A giant chip sits on a green circuit board, its pins in neat rows and its die glowing. A silicon wafer leans beside it.',
    notes: [
      'The gold lines are traces, the roads of the board.',
      'The glowing square is the die, where the work happens.',
      'The wafer is where every chip starts.',
    ],
    land: '#25624a',
    sand: '#9fc7b4',
    accent: '#46d6a8',
  },
  {
    id: 'sss-tier-lands',
    name: 'SSS Tier Lands',
    kind: 'realm',
    epithet: 'Top of every ranking',
    summary:
      'A crown sits on a three-step podium while three gold stars circle overhead. This is the tier above S.',
    notes: [
      'Three steps up, three stars around.',
      'The crown is gold with red and blue gems.',
      'Only the best of the best get a place here.',
    ],
    land: '#5a3fb0',
    sand: '#c9b8f2',
    accent: '#ffcf3f',
  },
  {
    id: 'isla-sorna',
    name: 'Isla Sorna',
    kind: 'realm',
    epithet: 'The jungle has a volcano',
    summary:
      'Thick jungle, a smoking volcano, and a long-necked dinosaur grazing at the edge of the trees.',
    notes: [
      'The volcano is quiet, but it still smokes.',
      'The dinosaur is a toy-sized giant.',
      'Some islands are better visited from orbit.',
    ],
    land: '#2e6b3a',
    sand: '#d8c48e',
    accent: '#ff6a3d',
  },
]

/**
 * Evenly scattered shore positions that leave the programming continent clear.
 * Uses the smallest spiral lattice that still has enough points outside it.
 */
function shorePositions(count: number): [number, number, number][] {
  const { center, clearance } = programmingContinent
  for (let size = count; size < count * 3; size++) {
    const open = Array.from({ length: size }, (_, index) => fibonacciPoint(index, size)).filter(
      (point) => angularDistance(point, center) >= clearance && angularDistance(point, smile.center) >= smile.clearance,
    )
    if (open.length >= count) return open.slice(0, count)
  }
  throw new Error('No room for every shore outside the programming continent and the smile')
}

/** Project islands ring the programming continent instead of taking a lattice slot. */
const projectIds = specs.filter((spec) => spec.kind === 'project').map((spec) => spec.id)

/** Shores made of several lobes need about two slots of room, so they sit between two. */
function siteReach(spec: DestinationSpec): number {
  if (!spec.sites) return 0
  return Math.max(...spec.sites.map((site) => Math.hypot(site.at[0], site.at[1]))) + SITE_RADIUS
}
/** Angular radius of each lobe of a multi-site shore. */
export const SITE_RADIUS = 0.075
const wideIds = specs.filter((spec) => spec.sites).map((spec) => spec.id)

/** Each lattice slot holds one shore. Projects ring the programming continent instead. */
const slotIds = specs.map((spec) => spec.id).filter((id) => !projectIds.includes(id))
// One extra slot for each wide shore, which spreads across two neighboring slots.
const positions = shorePositions(slotIds.length + wideIds.length)

/** A point at the given angular distance and compass heading from a center, on the unit sphere. */
function offsetFrom(center: Vec3, heading: number, distance: number): [number, number, number] {
  const [x, y, z] = center
  const east = normalize(z, 0, -x)
  const north: Vec3 = [y * east[2] - z * east[1], z * east[0] - x * east[2], x * east[1] - y * east[0]]
  const along = Math.tan(distance)
  return normalize(
    x + along * (Math.sin(heading) * east[0] + Math.cos(heading) * north[0]),
    y + along * (Math.sin(heading) * east[1] + Math.cos(heading) * north[1]),
    z + along * (Math.sin(heading) * east[2] + Math.cos(heading) * north[2]),
  )
}

/** A point offset east and north (radians) from a center, on the unit sphere. */
function offsetBy(center: Vec3, [east, north]: readonly [number, number]): [number, number, number] {
  return offsetFrom(center, Math.atan2(east, north), Math.hypot(east, north))
}

/** The project islands, evenly spaced around the programming continent, the first one due north. */
const ringPositions = projectIds.map((_, index) =>
  offsetFrom(programmingContinent.center, (index * Math.PI * 2) / projectIds.length, programmingContinent.projectRing),
)

function midpoint(a: Vec3, b: Vec3): [number, number, number] {
  return normalize(a[0] + b[0], a[1] + b[1], a[2] + b[2])
}

/**
 * Gives each wide shore two neighboring slots and places it between them: the pair whose
 * midpoint has the most room, with the whole shore outside the continent's and the smile's zones.
 */
const free = new Set(positions.map((_, index) => index))
const widePositions = new Map<string, [number, number, number]>()
for (const id of wideIds) {
  const spec = specs.find((item) => item.id === id)
  const reach = spec ? siteReach(spec) : 0
  let best: { pair: [number, number]; center: [number, number, number]; room: number } | null = null
  for (const index of free) {
    const position = positions[index]
    if (!position) continue
    let partner = -1
    let nearest = Infinity
    for (const other of free) {
      if (other === index) continue
      const distance = angularDistance(position, positions[other] ?? position)
      if (distance < nearest) {
        nearest = distance
        partner = other
      }
    }
    const partnerPosition = positions[partner]
    if (!partnerPosition) continue
    const center = midpoint(position, partnerPosition)
    const fits =
      angularDistance(center, programmingContinent.center) >= programmingContinent.clearance + reach &&
      angularDistance(center, smile.center) >= smile.clearance + reach
    if (!fits) continue
    const others = [
      ...[...free].filter((other) => other !== index && other !== partner).map((other) => positions[other] ?? center),
      ...ringPositions,
      ...widePositions.values(),
    ]
    const room = Math.min(...others.map((other) => angularDistance(center, other)))
    if (!best || room > best.room) best = { pair: [index, partner], center, room }
  }
  if (!best) throw new Error(`No room for ${id}`)
  free.delete(best.pair[0])
  free.delete(best.pair[1])
  widePositions.set(id, best.center)
}

const otherSlots = positions.filter((_, index) => free.has(index))
const otherIds = slotIds.filter((id) => !wideIds.includes(id))

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b)
}

/**
 * Steps through the remaining slots by a stride, so neighbors in the list land far apart
 * on the globe. The stride must share no factor with the slot count, or some slots would
 * be visited twice.
 */
const STRIDE = [7, 5, 3, 1].find((stride) => greatestCommonDivisor(stride, otherSlots.length) === 1) ?? 1

const slotPositions = new Map<string, [number, number, number]>(
  otherIds.map((id, index) => [id, otherSlots[(index * STRIDE) % otherSlots.length] ?? fibonacciPoint(index, otherIds.length)]),
)

const projectPositions = new Map(projectIds.map((id, index) => [id, ringPositions[index] ?? programmingContinent.center]))

function positionFor(id: string): [number, number, number] {
  const position = projectPositions.get(id) ?? widePositions.get(id) ?? slotPositions.get(id)
  if (!position) throw new Error(`No position for ${id}`)
  return position
}

export const destinations: readonly Destination[] = specs.map((spec) => {
  const position = positionFor(spec.id)
  return {
    ...spec,
    position,
    sites: spec.sites?.map((site) => ({ ...site, position: offsetBy(position, site.at) })),
  }
})

/** Points across the programming continent, so empty islets keep off it. */
function continentFootprint(): Vec3[] {
  const { center, core } = programmingContinent
  const footprint: Vec3[] = [center]
  const [cx, cy, cz] = center
  // Two tangent directions at the center.
  const east = normalize(cz, 0, -cx)
  const north: Vec3 = [cy * east[2] - cz * east[1], cz * east[0] - cx * east[2], cx * east[1] - cy * east[0]]
  for (const radius of [core * 0.5, core]) {
    for (let step = 0; step < 10; step++) {
      const angle = (step / 10) * Math.PI * 2
      const along = Math.tan(radius)
      footprint.push(
        normalize(
          cx + along * (Math.cos(angle) * east[0] + Math.sin(angle) * north[0]),
          cy + along * (Math.cos(angle) * east[1] + Math.sin(angle) * north[1]),
          cz + along * (Math.cos(angle) * east[2] + Math.sin(angle) * north[2]),
        ),
      )
    }
  }
  return footprint
}

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1
  return [x / length, y / length, z / length]
}

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
  [...destinations.map((destination) => destination.position), ...continentFootprint()],
  5,
  0.34,
  // Stay off the polar ice caps and out of the smiling face.
  (point) => Math.abs(point[1]) < 0.8 && angularDistance(point, smile.center) > 0.62,
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
  if (kind === 'realm') return 'Realm'
  return 'Uncharted'
}
