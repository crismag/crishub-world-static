import type { CompiledLandmark, CompiledLocation } from '@/runtime/configuration/registry-types.ts'

/** What every landmark preset receives. */
export type LandmarkProps = {
  /** Options from landmarks.json, already validated and filled with defaults. */
  params: Record<string, unknown>
  /** The location's accent color. */
  accent: string
  /** False when the landmark is set to hold still, or the visitor prefers reduced motion. */
  animate: boolean
  /** The landmark's own scale, already applied to its group. */
  scale: number
  /** Distance from the globe's center to the ground under the landmark, world units. */
  groundRadius: number
  location: CompiledLocation
  landmark: CompiledLandmark
  /** Hover tooltip for landmarks that are not selectable shores, or null. */
  tooltip: { title: string; description?: string } | null
}
