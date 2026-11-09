import { settings } from '../world-registry/index.ts'

export type Quality = 'high' | 'medium' | 'low'

/**
 * The detail level for this visitor's device. With `quality: "auto"` in settings/globe.json:
 * - low: very little memory (2 GB or less) or two CPU cores or fewer;
 * - medium: touch-first devices, small screens, or 4 GB of memory or less;
 * - high: everything else.
 * `?quality=high|medium|low` in the address overrides it, for testing.
 */
export function resolveQuality(): Quality {
  const levels: Quality[] = ['high', 'medium', 'low']
  if (typeof window !== 'undefined') {
    const requested = new URLSearchParams(window.location.search).get('quality')
    if (levels.includes(requested as Quality)) return requested as Quality
  }
  const configured = settings.globe.quality
  if (configured !== 'auto') return configured
  if (typeof window === 'undefined') return 'high'
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency
  if ((memory !== undefined && memory <= 2) || (cores !== undefined && cores <= 2)) return 'low'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const small = Math.min(window.screen?.width ?? 1024, window.screen?.height ?? 1024) < 768
  if (coarse || small || (memory !== undefined && memory <= 4)) return 'medium'
  return 'high'
}

/** Resolved once per page load: switching mid-visit would rebuild the whole planet. */
export const quality: Quality = resolveQuality()
export const qualityPreset = settings.globe.qualityPresets[quality]
