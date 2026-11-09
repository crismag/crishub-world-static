import { useGLTF } from '@react-three/drei'
import { Component, Suspense, useMemo, type ReactNode } from 'react'
import type { LandmarkProps } from '@/engine/landmarks/types.ts'

/**
 * A 3D model (glTF or GLB) from the asset manifest. It loads on demand, after the globe is
 * already showing; if it cannot load, the shore simply has no model instead of breaking
 * the globe.
 */
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
  const { scene } = useGLTF(path)
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
