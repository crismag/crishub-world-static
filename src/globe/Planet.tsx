import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '@/data/math.ts'
import { GLOBE_RADIUS } from '@/globe/geometry.ts'
import { atmosphereFragment, atmosphereVertex, oceanFragment, oceanVertex } from '@/globe/shaders.ts'

export function Ocean() {
  const material = useRef<THREE.ShaderMaterial>(null)
  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 80, 80]} />
      <shaderMaterial
        ref={material}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={oceanVertex}
        fragmentShader={oceanFragment}
      />
    </mesh>
  )
}

export function Atmosphere() {
  return (
    <mesh scale={1.085} renderOrder={2}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <shaderMaterial
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

export function Graticule() {
  const radius = GLOBE_RADIUS + 0.012
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.0045, 8, 96]} />
        <meshBasicMaterial color="#d7efe8" transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[radius, 0.0035, 8, 96]} />
        <meshBasicMaterial color="#d7efe8" transparent opacity={0.28} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[radius, 0.0035, 8, 96]} />
        <meshBasicMaterial color="#d7efe8" transparent opacity={0.22} />
      </mesh>
    </group>
  )
}

function createCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) {
    const fallback = new THREE.CanvasTexture(canvas)
    return fallback
  }
  const random = mulberry32(11)
  for (let i = 0; i < 36; i++) {
    const x = random() * canvas.width
    const y = random() * canvas.height
    const radius = 28 + random() * 70
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(255,255,255,${0.18 + random() * 0.22})`)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export function Clouds({ reduced }: { reduced: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const texture = useMemo(() => createCloudTexture(), [])
  useFrame((_, delta) => {
    if (!reduced && mesh.current) mesh.current.rotation.y += delta * 0.012
  })
  return (
    <mesh ref={mesh} scale={1.035}>
      <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}
