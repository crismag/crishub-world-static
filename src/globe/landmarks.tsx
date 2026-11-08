import type { ReactNode } from 'react'
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
} from '@/globe/realms.tsx'

export function Solid({
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
  metalness = 0.14,
  roughness = 0.52,
  transparent = false,
  opacity = 1,
  position,
  rotation,
  scale,
  children,
}: {
  color: string
  emissive?: string
  emissiveIntensity?: number
  metalness?: number
  roughness?: number
  transparent?: boolean
  opacity?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number] | number
  children: ReactNode
}) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      {children}
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        metalness={metalness}
        roughness={roughness}
        transparent={transparent}
        opacity={opacity}
        depthWrite={!transparent}
      />
    </mesh>
  )
}

export function Palm({
  position = [0, 0, 0],
  scale = 1,
}: {
  position?: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <Solid position={[0, 0.07, 0]} color="#8a5a32" roughness={0.8} metalness={0}>
        <cylinderGeometry args={[0.008, 0.013, 0.14, 6]} />
      </Solid>
      <Solid position={[0, 0.15, 0]} color="#1f8a45" roughness={0.75} metalness={0}>
        <sphereGeometry args={[0.04, 8, 6]} />
      </Solid>
      <Solid position={[0.045, 0.145, 0]} rotation={[0, 0, -0.9]} color="#166b34" roughness={0.75} metalness={0}>
        <sphereGeometry args={[0.028, 8, 6]} />
      </Solid>
      <Solid position={[-0.045, 0.145, 0.01]} rotation={[0, 0, 0.9]} color="#166b34" roughness={0.75} metalness={0}>
        <sphereGeometry args={[0.028, 8, 6]} />
      </Solid>
    </group>
  )
}

export function Pine({
  position = [0, 0, 0],
  scale = 1,
}: {
  position?: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <Solid position={[0, 0.04, 0]} color="#6b4a32" roughness={0.85} metalness={0}>
        <cylinderGeometry args={[0.008, 0.012, 0.08, 5]} />
      </Solid>
      <Solid position={[0, 0.1, 0]} color="#1d6840" roughness={0.8} metalness={0}>
        <coneGeometry args={[0.05, 0.1, 7]} />
      </Solid>
      <Solid position={[0, 0.16, 0]} color="#2f8f4e" roughness={0.8} metalness={0}>
        <coneGeometry args={[0.034, 0.08, 7]} />
      </Solid>
    </group>
  )
}

function Philippines({ accent }: { accent: string }) {
  return (
    <group>
      <Solid position={[0, 0.012, 0.02]} color="#3a342c" roughness={0.95} metalness={0}>
        <boxGeometry args={[0.28, 0.012, 0.07]} />
      </Solid>
      <Palm position={[-0.14, 0, -0.08]} />
      <Palm position={[0.15, 0, 0.09]} scale={0.82} />
      <group position={[0.01, 0, 0.02]} rotation={[0, 0.4, 0]}>
        <Solid position={[0, 0.05, 0]} color={accent}>
          <boxGeometry args={[0.18, 0.055, 0.072]} />
        </Solid>
        <Solid position={[0, 0.084, 0]} color="#f3d36b">
          <boxGeometry args={[0.19, 0.016, 0.08]} />
        </Solid>
        <Solid position={[0.035, 0.072, 0]} color="#9fd8ea" metalness={0.4} roughness={0.2}>
          <boxGeometry args={[0.055, 0.028, 0.062]} />
        </Solid>
        <Solid position={[-0.06, 0.025, 0.038]} rotation={[Math.PI / 2, 0, 0]} color="#222222" roughness={0.7}>
          <cylinderGeometry args={[0.018, 0.018, 0.012, 10]} />
        </Solid>
        <Solid position={[0.055, 0.025, 0.038]} rotation={[Math.PI / 2, 0, 0]} color="#222222" roughness={0.7}>
          <cylinderGeometry args={[0.018, 0.018, 0.012, 10]} />
        </Solid>
      </group>
    </group>
  )
}

function Canada({ accent }: { accent: string }) {
  return (
    <group>
      <Pine position={[-0.12, 0, 0.06]} scale={0.9} />
      <Pine position={[0.12, 0, -0.05]} scale={1.05} />
      <Pine position={[-0.05, 0, -0.12]} scale={0.7} />
      <group position={[0.02, 0, 0.02]}>
        <Solid position={[0, 0.16, 0]} color="#d9dde2" roughness={0.45} metalness={0.25}>
          <cylinderGeometry args={[0.012, 0.016, 0.32, 8]} />
        </Solid>
        <Solid position={[0, 0.24, 0]} color="#d9dde2" metalness={0.3} roughness={0.4}>
          <cylinderGeometry args={[0.05, 0.05, 0.016, 10]} />
        </Solid>
        <Solid position={[0, 0.26, 0]} color={accent}>
          <sphereGeometry args={[0.028, 12, 10]} />
        </Solid>
        <Solid position={[0, 0.34, 0]} color="#e8eef2" roughness={0.4} metalness={0.3}>
          <cylinderGeometry args={[0.004, 0.008, 0.12, 6]} />
        </Solid>
      </group>
    </group>
  )
}

function Singapore({ accent }: { accent: string }) {
  return (
    <group>
      {[-0.06, 0, 0.06].map((x) => (
        <Solid key={x} position={[x, 0.1, 0]} color="#1d4668" roughness={0.4} metalness={0.35}>
          <cylinderGeometry args={[0.018, 0.022, 0.2, 8]} />
        </Solid>
      ))}
      <Solid position={[0, 0.21, 0]} color={accent} roughness={0.35} metalness={0.2}>
        <boxGeometry args={[0.2, 0.028, 0.07]} />
      </Solid>
      <group position={[0.12, 0, 0.08]}>
        <Solid position={[0, 0.04, 0]} color="#f4f7f8" roughness={0.4}>
          <boxGeometry args={[0.04, 0.05, 0.05]} />
        </Solid>
        <Solid position={[0.02, 0.07, 0]} color="#f4f7f8" roughness={0.4}>
          <coneGeometry args={[0.02, 0.04, 6]} />
        </Solid>
      </group>
      <group position={[-0.12, 0, -0.06]}>
        <Solid position={[0, 0.07, 0]} color="#2f6b4a" roughness={0.7} metalness={0}>
          <cylinderGeometry args={[0.008, 0.01, 0.14, 6]} />
        </Solid>
        <Solid position={[0, 0.15, 0]} color="#3f8f62" roughness={0.55}>
          <cylinderGeometry args={[0.045, 0.02, 0.02, 8]} />
        </Solid>
      </group>
    </group>
  )
}

function UnitedStates({ accent }: { accent: string }) {
  return (
    <group position={[0, 0, 0.02]}>
      <Solid position={[0, 0.025, 0]} color="#d9d3c5" roughness={0.7}>
        <boxGeometry args={[0.1, 0.05, 0.1]} />
      </Solid>
      <Solid position={[0, 0.09, 0]} color="#cfc6b6" roughness={0.65}>
        <cylinderGeometry args={[0.028, 0.036, 0.08, 8]} />
      </Solid>
      <Solid position={[0, 0.16, 0]} color={accent} roughness={0.45} metalness={0.2}>
        <cylinderGeometry args={[0.022, 0.03, 0.1, 8]} />
      </Solid>
      <Solid position={[0, 0.23, 0]} color={accent} roughness={0.45}>
        <sphereGeometry args={[0.022, 10, 8]} />
      </Solid>
      {[0, 1.2, 2.4, 3.6, 4.8].map((angle) => (
        <Solid
          key={angle}
          position={[Math.cos(angle) * 0.02, 0.255, Math.sin(angle) * 0.02]}
          color={accent}
          roughness={0.4}
        >
          <coneGeometry args={[0.006, 0.02, 4]} />
        </Solid>
      ))}
      <Solid position={[0.04, 0.2, 0]} rotation={[0, 0, -0.7]} color={accent} roughness={0.45}>
        <cylinderGeometry args={[0.006, 0.008, 0.08, 6]} />
      </Solid>
      <Solid
        position={[0.07, 0.24, 0]}
        color="#ffcf70"
        emissive="#ffcf70"
        emissiveIntensity={0.9}
        roughness={0.3}
      >
        <sphereGeometry args={[0.016, 10, 8]} />
      </Solid>
    </group>
  )
}

function Malaysia() {
  return (
    <group>
      {[-0.07, 0.07].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Solid position={[0, 0.02, 0]} color="#b7c6d4" metalness={0.35} roughness={0.35}>
            <cylinderGeometry args={[0.042, 0.048, 0.04, 8]} />
          </Solid>
          <Solid position={[0, 0.15, 0]} color="#e7eef5" metalness={0.5} roughness={0.25}>
            <cylinderGeometry args={[0.026, 0.034, 0.22, 8]} />
          </Solid>
          <Solid position={[0, 0.28, 0]} color="#c9a227" metalness={0.45} roughness={0.32}>
            <coneGeometry args={[0.028, 0.08, 6]} />
          </Solid>
        </group>
      ))}
      <Solid position={[0, 0.2, 0]} color="#f7fbff" metalness={0.35} roughness={0.28}>
        <boxGeometry args={[0.16, 0.016, 0.03]} />
      </Solid>
    </group>
  )
}

function Thailand({ accent }: { accent: string }) {
  return (
    <group>
      <Solid position={[-0.1, 0.04, 0.04]} color="#f7f1e6" roughness={0.6}>
        <boxGeometry args={[0.08, 0.05, 0.06]} />
      </Solid>
      <Solid position={[-0.1, 0.08, 0.04]} color="#a33b32" roughness={0.55}>
        <coneGeometry args={[0.055, 0.05, 4]} />
      </Solid>
      <group position={[0.04, 0, 0]}>
        <Solid position={[0, 0.02, 0]} color="#f4efe4" roughness={0.55}>
          <cylinderGeometry args={[0.07, 0.08, 0.03, 8]} />
        </Solid>
        <Solid position={[0, 0.06, 0]} color={accent} metalness={0.35} roughness={0.35}>
          <sphereGeometry args={[0.05, 12, 10]} />
        </Solid>
        <Solid position={[0, 0.12, 0]} color={accent} metalness={0.4} roughness={0.32}>
          <sphereGeometry args={[0.034, 12, 10]} />
        </Solid>
        <Solid position={[0, 0.18, 0]} color="#f6e7a8" metalness={0.45} roughness={0.3}>
          <coneGeometry args={[0.018, 0.08, 8]} />
        </Solid>
      </group>
    </group>
  )
}

function HongKong({ accent }: { accent: string }) {
  const towers: { x: number; z: number; h: number; color: string }[] = [
    { x: -0.09, z: 0.02, h: 0.16, color: '#3e5160' },
    { x: -0.03, z: -0.02, h: 0.28, color: '#2c3e50' },
    { x: 0.03, z: 0.03, h: 0.22, color: '#4e6274' },
    { x: 0.09, z: -0.01, h: 0.18, color: '#314556' },
    { x: 0, z: 0.08, h: 0.12, color: '#5c7384' },
  ]
  return (
    <group>
      <Solid position={[-0.02, 0.08, -0.12]} color="#6d7c6a" roughness={0.9} metalness={0}>
        <coneGeometry args={[0.1, 0.16, 4]} />
      </Solid>
      {towers.map((tower) => (
        <group key={`${tower.x}-${tower.z}`}>
          <Solid position={[tower.x, tower.h / 2, tower.z]} color={tower.color} roughness={0.45} metalness={0.25}>
            <boxGeometry args={[0.045, tower.h, 0.045]} />
          </Solid>
          <Solid
            position={[tower.x + 0.024, tower.h * 0.55, tower.z]}
            color={accent}
            emissive={accent}
            emissiveIntensity={0.55}
            roughness={0.3}
          >
            <boxGeometry args={[0.004, tower.h * 0.55, 0.02]} />
          </Solid>
        </group>
      ))}
      <Solid position={[0, 0.32, -0.02]} color="#e8eef2" metalness={0.4} roughness={0.3}>
        <cylinderGeometry args={[0.003, 0.003, 0.08, 4]} />
      </Solid>
    </group>
  )
}

function Japan({ accent }: { accent: string }) {
  return (
    <group>
      <group position={[-0.02, 0, 0.04]}>
        <Solid position={[-0.06, 0.08, 0]} color={accent} roughness={0.4}>
          <boxGeometry args={[0.016, 0.16, 0.016]} />
        </Solid>
        <Solid position={[0.06, 0.08, 0]} color={accent} roughness={0.4}>
          <boxGeometry args={[0.016, 0.16, 0.016]} />
        </Solid>
        <Solid position={[0, 0.15, 0]} color={accent} roughness={0.4}>
          <boxGeometry args={[0.18, 0.018, 0.028]} />
        </Solid>
        <Solid position={[0, 0.175, 0]} color="#1d1a17" roughness={0.5}>
          <boxGeometry args={[0.15, 0.012, 0.02]} />
        </Solid>
      </group>
      <group position={[0.1, 0, -0.06]}>
        <Solid position={[0, 0.04, 0]} color="#f3f0ea" roughness={0.55}>
          <boxGeometry args={[0.06, 0.05, 0.06]} />
        </Solid>
        <Solid position={[0, 0.075, 0]} color="#2f2a28" roughness={0.5}>
          <boxGeometry args={[0.09, 0.012, 0.09]} />
        </Solid>
        <Solid position={[0, 0.11, 0]} color="#f3f0ea" roughness={0.55}>
          <boxGeometry args={[0.045, 0.04, 0.045]} />
        </Solid>
        <Solid position={[0, 0.14, 0]} color="#2f2a28" roughness={0.5}>
          <boxGeometry args={[0.07, 0.01, 0.07]} />
        </Solid>
        <Solid position={[0, 0.18, 0]} color={accent} roughness={0.4}>
          <coneGeometry args={[0.012, 0.06, 6]} />
        </Solid>
      </group>
      <Solid position={[-0.12, 0.04, -0.08]} color="#f2e2c4" roughness={0.6}>
        <boxGeometry args={[0.025, 0.07, 0.025]} />
      </Solid>
      <Solid
        position={[-0.12, 0.085, -0.08]}
        color="#f6d48a"
        emissive="#f6d48a"
        emissiveIntensity={0.5}
      >
        <boxGeometry args={[0.04, 0.02, 0.04]} />
      </Solid>
    </group>
  )
}

function CrisLab({ accent }: { accent: string }) {
  return (
    <group>
      <Solid position={[0, 0.03, 0]} color="#1c2430" roughness={0.5} metalness={0.3}>
        <cylinderGeometry args={[0.1, 0.11, 0.05, 12]} />
      </Solid>
      <Solid
        position={[0, 0.1, 0]}
        color={accent}
        transparent
        opacity={0.38}
        roughness={0.08}
        metalness={0.1}
        emissive={accent}
        emissiveIntensity={0.25}
      >
        <sphereGeometry args={[0.09, 18, 14]} />
      </Solid>
      <Solid position={[0, 0.08, 0]} color={accent} emissive={accent} emissiveIntensity={1.4} roughness={0.2}>
        <boxGeometry args={[0.04, 0.04, 0.04]} />
      </Solid>
      <Solid position={[0.12, 0.05, -0.04]} rotation={[0.4, 0.2, 0]} color="#d0d7e2" metalness={0.6} roughness={0.25}>
        <cylinderGeometry args={[0.04, 0.02, 0.02, 10]} />
      </Solid>
      <Solid position={[-0.1, 0.1, 0.02]} color="#9aa6b5" metalness={0.5} roughness={0.3}>
        <torusGeometry args={[0.03, 0.005, 8, 16]} />
      </Solid>
    </group>
  )
}

function MarketLab({ accent }: { accent: string }) {
  const bars = [
    { x: -0.09, h: 0.1, up: true },
    { x: -0.045, h: 0.18, up: true },
    { x: 0, h: 0.12, up: false },
    { x: 0.045, h: 0.22, up: true },
    { x: 0.09, h: 0.14, up: false },
  ]
  return (
    <group>
      <Solid position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} color="#c8b48a" roughness={0.55}>
        <torusGeometry args={[0.12, 0.012, 8, 24]} />
      </Solid>
      {bars.map((bar) => (
        <Solid
          key={bar.x}
          position={[bar.x, bar.h / 2 + 0.02, 0]}
          color={bar.up ? accent : '#e15b64'}
          emissive={bar.up ? accent : '#e15b64'}
          emissiveIntensity={0.25}
          roughness={0.35}
        >
          <boxGeometry args={[0.028, bar.h, 0.028]} />
        </Solid>
      ))}
    </group>
  )
}

function Adarna({ accent }: { accent: string }) {
  return (
    <group>
      <Solid position={[-0.04, 0.02, 0]} rotation={[0, 0.15, 0.18]} color="#6d3b74" roughness={0.5}>
        <boxGeometry args={[0.1, 0.018, 0.12]} />
      </Solid>
      <Solid position={[0.04, 0.02, 0]} rotation={[0, -0.15, -0.18]} color="#f7f1e4" roughness={0.6}>
        <boxGeometry args={[0.1, 0.012, 0.12]} />
      </Solid>
      <Solid position={[0.02, 0.045, 0.02]} rotation={[0, 0.4, 0.8]} color="#f4f7fb" roughness={0.4}>
        <cylinderGeometry args={[0.004, 0.004, 0.14, 5]} />
      </Solid>
      <group position={[-0.02, 0.06, -0.02]}>
        <Solid position={[0, 0.03, 0]} color={accent} roughness={0.4} metalness={0.3}>
          <sphereGeometry args={[0.028, 10, 8]} />
        </Solid>
        <Solid position={[0.03, 0.04, 0]} rotation={[0, 0, -0.6]} color="#e07a3d" roughness={0.45}>
          <coneGeometry args={[0.01, 0.035, 5]} />
        </Solid>
        <Solid position={[-0.02, 0.045, 0]} rotation={[0, 0, 0.8]} color="#e6b322" roughness={0.45}>
          <boxGeometry args={[0.04, 0.008, 0.02]} />
        </Solid>
      </group>
    </group>
  )
}

function Awkward({ accent }: { accent: string }) {
  return (
    <group rotation={[0, 0.2, 0.08]}>
      <Solid position={[0, 0.09, 0]} color="#2a2140" roughness={0.45}>
        <boxGeometry args={[0.1, 0.18, 0.07]} />
      </Solid>
      <Solid position={[0, 0.2, 0.03]} color={accent} roughness={0.4}>
        <boxGeometry args={[0.11, 0.035, 0.03]} />
      </Solid>
      <Solid
        position={[0, 0.11, 0.037]}
        color="#67f0c8"
        emissive="#67f0c8"
        emissiveIntensity={0.7}
        roughness={0.2}
      >
        <boxGeometry args={[0.06, 0.05, 0.006]} />
      </Solid>
      <Solid position={[-0.02, 0.04, 0.038]} color="#ffcf70" roughness={0.4}>
        <sphereGeometry args={[0.008, 8, 8]} />
      </Solid>
      <Solid position={[0.01, 0.035, 0.038]} color="#ff5d8f" roughness={0.4}>
        <sphereGeometry args={[0.008, 8, 8]} />
      </Solid>
    </group>
  )
}

function Oikonomia({ accent }: { accent: string }) {
  const columns = [
    [-0.06, -0.04],
    [0.06, -0.04],
    [-0.06, 0.04],
    [0.06, 0.04],
  ] as const
  return (
    <group>
      <Solid position={[0, 0.012, 0.08]} color="#e7dfd2" roughness={0.6}>
        <boxGeometry args={[0.16, 0.02, 0.05]} />
      </Solid>
      <Solid position={[0, 0.028, 0.1]} color="#efe7da" roughness={0.6}>
        <boxGeometry args={[0.12, 0.016, 0.04]} />
      </Solid>
      {columns.map(([x, z]) => (
        <Solid key={`${x}-${z}`} position={[x, 0.08, z]} color={accent} roughness={0.4}>
          <cylinderGeometry args={[0.012, 0.014, 0.12, 8]} />
        </Solid>
      ))}
      <Solid position={[0, 0.15, 0]} color="#f7f4ee" roughness={0.35}>
        <boxGeometry args={[0.16, 0.02, 0.12]} />
      </Solid>
      <Solid position={[0.08, 0.03, 0.08]} color="#8d6b45" roughness={0.55}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 10]} />
      </Solid>
      <Solid position={[0.08, 0.045, 0.08]} color="#7dcec4" roughness={0.4}>
        <boxGeometry args={[0.03, 0.004, 0.02]} />
      </Solid>
    </group>
  )
}

function Ekklesia({ accent }: { accent: string }) {
  return (
    <group>
      <Solid position={[0, 0.05, 0]} color="#c4a484" roughness={0.75} metalness={0}>
        <boxGeometry args={[0.16, 0.08, 0.1]} />
      </Solid>
      <Solid position={[0, 0.11, 0]} rotation={[0, 0, Math.PI / 4]} color="#7c3a32" roughness={0.6}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
      </Solid>
      <Solid position={[0, 0.045, 0.052]} color="#3a2a24" roughness={0.7}>
        <boxGeometry args={[0.03, 0.05, 0.01]} />
      </Solid>
      <Solid
        position={[0.04, 0.07, 0.052]}
        color={accent}
        emissive={accent}
        emissiveIntensity={0.7}
        roughness={0.3}
      >
        <boxGeometry args={[0.02, 0.025, 0.008]} />
      </Solid>
      <Solid position={[-0.09, 0.08, 0]} color="#b08968" roughness={0.7}>
        <boxGeometry args={[0.04, 0.14, 0.04]} />
      </Solid>
      <Solid position={[-0.09, 0.16, 0]} color="#f4efe4" roughness={0.4}>
        <boxGeometry args={[0.028, 0.006, 0.006]} />
      </Solid>
      <Solid position={[-0.09, 0.16, 0]} color="#f4efe4" roughness={0.4}>
        <boxGeometry args={[0.006, 0.028, 0.006]} />
      </Solid>
    </group>
  )
}

function Dalisay({ accent }: { accent: string }) {
  const slabs = [
    { x: -0.09, h: 0.08, color: '#f4efe4' },
    { x: -0.03, h: 0.14, color: accent },
    { x: 0.03, h: 0.11, color: '#e6b422' },
    { x: 0.09, h: 0.17, color: '#c4493a' },
  ]
  return (
    <group>
      {slabs.map((slab) => (
        <Solid key={slab.x} position={[slab.x, slab.h / 2, 0]} color={slab.color} roughness={0.4}>
          <boxGeometry args={[0.045, slab.h, 0.07]} />
        </Solid>
      ))}
      <Solid position={[0, 0.05, 0.09]} rotation={[Math.PI / 2, 0, 0]} color="#f7f4ef" roughness={0.35}>
        <torusGeometry args={[0.05, 0.008, 8, 18, Math.PI]} />
      </Solid>
      <Solid position={[0.02, 0.02, -0.08]} color="#2f6b4f" roughness={0.45}>
        <boxGeometry args={[0.03, 0.03, 0.03]} />
      </Solid>
    </group>
  )
}

function LanternShoal({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0.02, 0.1, 0]}>
        <sphereGeometry args={[0.11, 16, 12]} />
        <meshStandardMaterial color="#e7eef2" transparent opacity={0.28} depthWrite={false} roughness={1} />
      </mesh>
      <mesh position={[-0.08, 0.08, 0.05]}>
        <sphereGeometry args={[0.07, 14, 10]} />
        <meshStandardMaterial color="#f5f8fa" transparent opacity={0.22} depthWrite={false} roughness={1} />
      </mesh>
      <Solid position={[0.06, 0.06, 0.02]} color="#5c5348" roughness={0.7}>
        <cylinderGeometry args={[0.008, 0.01, 0.12, 6]} />
      </Solid>
      <Solid
        position={[0.06, 0.13, 0.02]}
        color={accent}
        emissive={accent}
        emissiveIntensity={1.1}
        roughness={0.3}
      >
        <sphereGeometry args={[0.02, 10, 8]} />
      </Solid>
    </group>
  )
}

function QuestionAtoll({ accent }: { accent: string }) {
  return (
    <group>
      <Solid position={[0, 0.02, 0.045]} color={accent} roughness={0.35} emissive={accent} emissiveIntensity={0.15}>
        <sphereGeometry args={[0.018, 10, 8]} />
      </Solid>
      <Solid position={[0, 0.02, 0.01]} color={accent} roughness={0.35} emissive={accent} emissiveIntensity={0.12}>
        <boxGeometry args={[0.02, 0.025, 0.04]} />
      </Solid>
      <Solid
        position={[0.01, 0.025, -0.045]}
        rotation={[-Math.PI / 2, 0, 0.4]}
        color={accent}
        roughness={0.35}
        emissive={accent}
        emissiveIntensity={0.18}
      >
        <torusGeometry args={[0.05, 0.012, 8, 18, Math.PI * 1.25]} />
      </Solid>
    </group>
  )
}

function VioletGate({ accent }: { accent: string }) {
  return (
    <group>
      <Solid position={[-0.07, 0.07, 0]} color="#2a2038" roughness={0.5}>
        <boxGeometry args={[0.02, 0.14, 0.02]} />
      </Solid>
      <Solid position={[0.07, 0.07, 0]} color="#2a2038" roughness={0.5}>
        <boxGeometry args={[0.02, 0.14, 0.02]} />
      </Solid>
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.012, 12, 28]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.1} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[0.5, 0.2, 0]}>
        <torusGeometry args={[0.08, 0.011, 12, 28]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[0.4, 0, 0]}>
        <circleGeometry args={[0.07, 20]} />
        <meshBasicMaterial color="#e4d8ff" transparent opacity={0.28} side={2} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function Landmark({ id, accent, reduced }: { id: string; accent: string; reduced: boolean }) {
  switch (id) {
    case 'leaf-village':
      return <LeafVillage accent={accent} reduced={reduced} />
    case 'rain-island':
      return <RainIsland accent={accent} reduced={reduced} />
    case 'sound-island':
      return <SoundIsland accent={accent} reduced={reduced} />
    case 'sand-island':
      return <SandIsland accent={accent} reduced={reduced} />
    case 'mystery-island':
      return <MysteryIsland accent={accent} reduced={reduced} />
    case 'dreams-and-aspiration':
      return <DreamsIsland accent={accent} reduced={reduced} />
    case 'semiconductor-land':
      return <SemiconductorLand accent={accent} reduced={reduced} />
    case 'sss-tier-lands':
      return <SssTierLands accent={accent} reduced={reduced} />
    case 'isla-sorna':
      return <IslaSorna accent={accent} reduced={reduced} />
    case 'philippines':
      return <Philippines accent={accent} />
    case 'canada':
      return <Canada accent={accent} />
    case 'singapore':
      return <Singapore accent={accent} />
    case 'united-states':
      return <UnitedStates accent={accent} />
    case 'malaysia':
      return <Malaysia />
    case 'thailand':
      return <Thailand accent={accent} />
    case 'hong-kong':
      return <HongKong accent={accent} />
    case 'japan':
      return <Japan accent={accent} />
    case 'crislab':
      return <CrisLab accent={accent} />
    case 'marketlab':
      return <MarketLab accent={accent} />
    case 'adarna-writer':
      return <Adarna accent={accent} />
    case 'awkward-studio':
      return <Awkward accent={accent} />
    case 'oikonomia':
      return <Oikonomia accent={accent} />
    case 'ekklesia':
      return <Ekklesia accent={accent} />
    case 'dalisay-ui':
      return <Dalisay accent={accent} />
    case 'lantern-shoal':
      return <LanternShoal accent={accent} />
    case 'question-atoll':
      return <QuestionAtoll accent={accent} />
    case 'violet-gate':
      return <VioletGate accent={accent} />
    default:
      return null
  }
}
