import { useEffect, useState } from 'react'
import type { CompiledSection } from '../configuration/registry-types.ts'

/**
 * Location articles, loaded on demand. `world:build` writes one JSON file per location to
 * src/generated/content/; the build turns each into its own small fingerprinted file, so the
 * first page load carries none of them and opening a shore fetches only that shore's writeups.
 */
const bundles = import.meta.glob<CompiledSection[]>('../../generated/content/*.json', { import: 'default' })

const cache = new Map<string, Promise<CompiledSection[]>>()

/** A location's sections. Repeated calls share one request; a failed request can be retried. */
export function loadContent(locationId: string): Promise<CompiledSection[]> {
  const cached = cache.get(locationId)
  if (cached) return cached
  const loader = bundles[`../../generated/content/${locationId}.json`]
  const request = loader ? loader() : Promise.resolve([])
  cache.set(locationId, request)
  request.catch(() => cache.delete(locationId))
  return request
}

export type ContentState =
  | { status: 'loading'; sections: null }
  | { status: 'ready'; sections: CompiledSection[] }
  | { status: 'failed'; sections: null; retry: () => void }

/** Loads a location's sections and re-renders when they arrive. */
export function useLocationContent(locationId: string | null): ContentState {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ id: string | null; sections: CompiledSection[] | null; failed: boolean }>({
    id: null,
    sections: null,
    failed: false,
  })
  useEffect(() => {
    if (!locationId) return
    let current = true
    loadContent(locationId).then(
      (sections) => current && setState({ id: locationId, sections, failed: false }),
      () => current && setState({ id: locationId, sections: null, failed: true }),
    )
    return () => {
      current = false
    }
  }, [locationId, attempt])
  if (state.id === locationId && state.failed) {
    return { status: 'failed', sections: null, retry: () => setAttempt((value) => value + 1) }
  }
  if (state.id === locationId && state.sections) return { status: 'ready', sections: state.sections }
  return { status: 'loading', sections: null }
}
