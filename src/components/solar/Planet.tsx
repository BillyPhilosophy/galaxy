import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html, Line, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { MoonData, PlanetData, RingData } from '../../data/planets'
import { useStore } from '../../store'
import { bodyRegistry } from './registry'
import { orbitalPosition } from './orbit'

/** 卫星轨道圈：仅宿主行星被选中、或卫星被 hover/选中时显示 */
function MoonOrbitLine({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius])
    }
    return pts
  }, [radius])
  return <Line points={points} color="#8a93b8" transparent opacity={0.4} lineWidth={0.5} />
}

function Moon({ moon, hostSelected }: { moon: MoonData; hostSelected: boolean }) {
  const ref = useRef<THREE.Group>(null!)
  const angle = useRef(Math.random() * Math.PI * 2)
  const [hovered, setHovered] = useState(false)
  const selectedId = useStore((s) => s.selectedId)
  const select = useStore((s) => s.select)
  const selected = selectedId === moon.id

  useFrame((_, delta) => {
    const { paused, halted, speed } = useStore.getState()
    const d = paused || halted ? 0 : delta * speed
    angle.current += (d * Math.PI * 2) / moon.period
    ref.current.position.set(Math.cos(angle.current) * moon.distance, 0, Math.sin(angle.current) * moon.distance)
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    select(moon.id)
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
    <group ref={ref}>
      <mesh onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut}>
        <sphereGeometry args={[moon.size, 24, 24]} />
        <meshStandardMaterial
          color={moon.color}
          roughness={1}
          emissive={hovered || selected ? moon.color : '#000000'}
          emissiveIntensity={hovered ? 0.55 : selected ? 0.35 : 0}
        />
      </mesh>
      {/* 放大的透明点击热区，解决卫星太小难点中的问题 */}
      <mesh onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut}>
        <sphereGeometry args={[Math.max(moon.size * 2.5, 0.3), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {(hostSelected || hovered || selected) && <MoonOrbitLine radius={moon.distance} />}
      {(hovered || selected) && (
        <Html position={[0, moon.size + 0.3, 0]} center zIndexRange={[5, 0]}>
          <div className="moon-label">{moon.name}</div>
        </Html>
      )}
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

/** 行星/矮行星轨道线：有轨道要素时画倾斜椭圆，否则画正圆 */
function OrbitLine({ data, active }: { data: PlanetData; active: boolean }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    const n = data.orbit ? 220 : 160
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      if (data.orbit) pts.push(orbitalPosition(data.orbit, a))
      else pts.push([Math.cos(a) * data.distance, 0, Math.sin(a) * data.distance])
    }
    return pts
  }, [data])
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

interface GlobeProps {
  data: PlanetData
  meshRef: RefObject<THREE.Mesh | null>
  hovered: boolean
  selected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut: () => void
}

function TexturedGlobe({ data, meshRef, hovered, selected, ...handlers }: GlobeProps) {
  const texture = useTexture(data.texture!)
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
  }, [texture])
  return (
    <mesh ref={meshRef} {...handlers}>
      <sphereGeometry args={[data.radius, 48, 48]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.92}
        metalness={0.04}
        emissive={hovered || selected ? data.color : '#000000'}
        emissiveIntensity={hovered ? 0.3 : selected ? 0.18 : 0}
      />
    </mesh>
  )
}

/** 无贴图天体（如冥王星）的纯色球体 */
function PlainGlobe({ data, meshRef, hovered, selected, ...handlers }: GlobeProps) {
  return (
    <mesh ref={meshRef} {...handlers}>
      <sphereGeometry args={[data.radius, 48, 48]} />
      <meshStandardMaterial
        color={data.color}
        roughness={0.95}
        metalness={0.02}
        emissive={hovered || selected ? data.color : '#000000'}
        emissiveIntensity={hovered ? 0.35 : selected ? 0.22 : 0}
      />
    </mesh>
  )
}

export default function Planet({ data }: { data: PlanetData }) {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const angle = useRef(data.initialAngle)
  const [hovered, setHovered] = useState(false)

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
    const { paused, halted, speed } = useStore.getState()
    const d = paused || halted ? 0 : delta * speed
    // 椭圆轨道时 angle 为平近点角，公转速度随日心距变化（开普勒第二定律）
    angle.current += (d * Math.PI * 2) / data.orbitPeriod
    if (data.orbit) {
      const [x, y, z] = orbitalPosition(data.orbit, angle.current)
      groupRef.current.position.set(x, y, z)
    } else {
      const a = angle.current
      groupRef.current.position.set(Math.cos(a) * data.distance, 0, Math.sin(a) * data.distance)
    }
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

  const globeProps: GlobeProps = {
    data,
    meshRef,
    hovered,
    selected,
    onClick: handleClick,
    onPointerOver: handleOver,
    onPointerOut: handleOut,
  }

  return (
    <>
      <group ref={groupRef}>
        <group rotation={[0, 0, THREE.MathUtils.degToRad(data.tilt)]}>
          {data.texture ? <TexturedGlobe {...globeProps} /> : <PlainGlobe {...globeProps} />}
          {data.ring && <Ring data={data.ring} />}
        </group>
        {data.moons?.map((m) => (
          <Moon key={m.id} moon={m} hostSelected={selected} />
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
      {showOrbits && <OrbitLine data={data} active={selected} />}
    </>
  )
}
