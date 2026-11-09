import { vi } from 'vitest'

// jsdom has no matchMedia; the reduced-motion hook asks for it.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }),
  })
}

// There is no WebGL in tests: stand in a plain element for the globe canvas.
vi.mock('@react-three/fiber', async () => {
  const { useEffect } = await import('react')
  return {
    Canvas: ({ onCreated }: { onCreated?: (state: { gl: { domElement: HTMLCanvasElement } }) => void }) => {
      useEffect(() => onCreated?.({ gl: { domElement: document.createElement('canvas') } }), [onCreated])
      return <div data-testid="globe-canvas" />
    },
  }
})
vi.mock('@/engine/globe/Scene.tsx', () => ({ GlobeScene: () => null }))
