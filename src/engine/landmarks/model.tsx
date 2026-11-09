import { useGLTF } from '@react-three/drei'
import { Component, Suspense, useMemo, type ReactNode } from 'react'
import type { LandmarkProps } from '@/engine/landmarks/types.ts'

/**
 * A 3D model (glTF or GLB) from the asset manifest. It loads on demand, after the globe is
 * already showing; if it cannot load, the shore simply has no model instead of breaking
 * the globe.
 */
/** Where the build puts the Draco decoder (see vite.config.ts), relative to the page. */
const DRACO_DECODERS = `${import.meta.env.BASE_URL}decoders/draco/`

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function Model({ path }: { path: string }) {
  // Compressed models decode with the copy of Draco this site serves, never a CDN.
  const { scene } = useGLTF(path, DRACO_DECODERS)
  // A copy per landmark, so the same model can stand on several shores.
  const copy = useMemo(() => scene.clone(true), [scene])
  return <primitive object={copy} />
}

export function ModelLandmark({ landmark }: LandmarkProps) {
  if (!landmark.assetPath) return null
  return (
    <Quiet>
      <Suspense fallback={null}>
        <Model path={landmark.assetPath} />
      </Suspense>
    </Quiet>
  )
}
