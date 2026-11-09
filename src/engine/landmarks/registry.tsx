import { lazy, Suspense, type ReactNode } from 'react'
import type { LandmarkPreset } from '@/runtime/configuration/schema.ts'
import { BeaconLandmark } from '@/engine/landmarks/beacon.tsx'
import { classicLandmarks } from '@/engine/landmarks/classic.tsx'
import {
  CrystalLandmark,
  MountainLandmark,
  PalmGroveLandmark,
  PineGroveLandmark,
  TowerLandmark,
} from '@/engine/landmarks/generic.tsx'
import { ContinentScenery, Lettering } from '@/engine/landmarks/programming.tsx'
import {
  DreamsIsland,
  IslaSorna,
  LeafVillage,
  MysteryIsland,
  RainIsland,
  SandIsland,
  SemiconductorLand,
  SoundIsland,
  SssTierLands,
} from '@/engine/landmarks/realms.tsx'
import type { LandmarkProps } from '@/engine/landmarks/types.ts'
import { VaultLandmark } from '@/engine/landmarks/vault.tsx'

/**
 * Every landmark preset configuration may name, and how it is drawn. Configuration can only
 * choose among these; it never supplies code.
 *
 * `local` presets are drawn in the landmark's own frame: placed on the ground, turned, and
 * scaled by the location. `globe` presets draw across a location's whole area (such as the
 * painted lettering) and work in the globe's frame.
 */
type Preset = { space: 'local' | 'globe'; render: (props: LandmarkProps) => ReactNode }

/** The model loader is large, so it downloads only when a world actually uses a model. */
const ModelLandmark = lazy(() => import('@/engine/landmarks/model.tsx').then((module) => ({ default: module.ModelLandmark })))

const realm = (Draw: (props: { accent: string; reduced: boolean }) => ReactNode): Preset => ({
  space: 'local',
  render: ({ accent, animate }) => <Draw accent={accent} reduced={!animate} />,
})

const classic = (name: string): Preset => {
  const Draw = classicLandmarks[name]
  return { space: 'local', render: ({ accent }) => (Draw ? <Draw accent={accent} /> : null) }
}

export const landmarkPresets: Record<LandmarkPreset, Preset> = {
  'classic-philippines': classic('classic-philippines'),
  'classic-canada': classic('classic-canada'),
  'classic-singapore': classic('classic-singapore'),
  'classic-united-states': classic('classic-united-states'),
  'classic-malaysia': classic('classic-malaysia'),
  'classic-thailand': classic('classic-thailand'),
  'classic-hong-kong': classic('classic-hong-kong'),
  'classic-japan': classic('classic-japan'),
  'classic-crislab': classic('classic-crislab'),
  'classic-marketlab': classic('classic-marketlab'),
  'classic-adarna-writer': classic('classic-adarna-writer'),
  'classic-awkward-studio': classic('classic-awkward-studio'),
  'classic-oikonomia': classic('classic-oikonomia'),
  'classic-ekklesia': classic('classic-ekklesia'),
  'classic-dalisay-ui': classic('classic-dalisay-ui'),
  'classic-lantern-shoal': classic('classic-lantern-shoal'),
  'classic-question-atoll': classic('classic-question-atoll'),
  'classic-violet-gate': classic('classic-violet-gate'),
  'leaf-village': realm(LeafVillage),
  'rain-town': realm(RainIsland),
  'sound-stage': realm(SoundIsland),
  'sand-town': realm(SandIsland),
  'mystery-chest': realm(MysteryIsland),
  'dreams-stairway': realm(DreamsIsland),
  'semiconductor-chip': realm(SemiconductorLand),
  'sss-crown': realm(SssTierLands),
  'volcano-jungle': realm(IslaSorna),
  beacon: { space: 'local', render: (props) => <BeaconLandmark {...props} /> },
  vault: { space: 'local', render: (props) => <VaultLandmark {...props} /> },
  lettering: { space: 'globe', render: (props) => <Lettering {...props} /> },
  'continent-scenery': { space: 'globe', render: (props) => <ContinentScenery {...props} /> },
  tower: { space: 'local', render: (props) => <TowerLandmark {...props} /> },
  crystal: { space: 'local', render: (props) => <CrystalLandmark {...props} /> },
  mountain: { space: 'local', render: (props) => <MountainLandmark {...props} /> },
  'pine-grove': { space: 'local', render: (props) => <PineGroveLandmark {...props} /> },
  'palm-grove': { space: 'local', render: (props) => <PalmGroveLandmark {...props} /> },
  model: {
    space: 'local',
    render: (props) => (
      <Suspense fallback={null}>
        <ModelLandmark {...props} />
      </Suspense>
    ),
  },
}
