import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html, Line, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { MoonData, PlanetData, RingData } from '../../data/planets'
import { useStore } from '../../store'
import { bodyRegistry } from './registry'

function Moon({ moon }: { moon: MoonData }) {
  const ref = useRef<THREE.Group>(null!)
  const angle = useRef(Math.random() * Math.PI * 2)
  useFrame((_, delta) => {
    const { paused, speed } = useStore.getState()
    const d = paused ? 0 : delta * speed
    angle.current += (d * Math.PI * 2) / moon.period
    ref.current.position.set(Math.cos(angle.current) * moon.distance, 0, Math.sin(angle.current) * moon.distance)
  })
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[moon.size, 24, 24]} />
        <meshStandardMaterial color={moon.color} roughness={1} />
      </mesh>
    </group>
  )
}

function Ring({ data }: { data: RingData }) {
  const tex = useTexture(data.texture)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[data.inner, data.outer, 128]} />
      <meshBasicMaterial
        map={tex}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        opacity={data.opacity ?? 1}
      />
    </mesh>
  )
}

function OrbitLine({ radius, active }: { radius: number; active: boolean }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius])
    }
    return pts
  }, [radius])
  return (
    <Line
      points={points}
      color={active ? '#ff8f0c' : '#454c66'}
      transparent
      opacity={active ? 0.85 : 0.45}
      lineWidth={active ? 1.2 : 0.6}
    />
  )
}

export default function Planet({ data }: { data: PlanetData }) {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const angle = useRef(data.initialAngle)
  const [hovered, setHovered] = useState(false)

  const texture = useTexture(data.texture)
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
  }, [texture])

  const selectedId = useStore((s) => s.selectedId)
  const showOrbits = useStore((s) => s.showOrbits)
  const showLabels = useStore((s) => s.showLabels)
  const select = useStore((s) => s.select)
  const selected = selectedId === data.id

  useEffect(() => {
    bodyRegistry.set(data.id, groupRef.current)
    return () => {
      bodyRegistry.delete(data.id)
    }
  }, [data.id])

  useFrame((_, delta) => {
    const { paused, speed } = useStore.getState()
    const d = paused ? 0 : delta * speed
    angle.current += (d * Math.PI * 2) / data.orbitPeriod
    const a = angle.current
    groupRef.current.position.set(Math.cos(a) * data.distance, 0, Math.sin(a) * data.distance)
    meshRef.current.rotation.y += (d * Math.PI * 2) / data.rotationPeriod
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    select(data.id)
  }
  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }
  const handleOut = () => {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  return (
    <>
      <group ref={groupRef}>
        <group rotation={[0, 0, THREE.MathUtils.degToRad(data.tilt)]}>
          <mesh ref={meshRef} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut}>
            <sphereGeometry args={[data.radius, 48, 48]} />
            <meshStandardMaterial
              map={texture}
              roughness={0.92}
              metalness={0.04}
              emissive={hovered || selected ? data.color : '#000000'}
              emissiveIntensity={hovered ? 0.3 : selected ? 0.18 : 0}
            />
          </mesh>
          {data.ring && <Ring data={data.ring} />}
        </group>
        {data.moons?.map((m) => (
          <Moon key={m.name} moon={m} />
        ))}
        {showLabels && (
          <Html position={[0, data.radius + 0.85, 0]} center zIndexRange={[5, 0]}>
            <button
              className={`planet-label${selected ? ' planet-label--active' : ''}`}
              onClick={() => select(data.id)}
            >
              {data.name}
            </button>
          </Html>
        )}
      </group>
      {showOrbits && <OrbitLine radius={data.distance} active={selected} />}
    </>
  )
}
