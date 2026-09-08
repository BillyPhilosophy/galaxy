import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { SUN } from '../../data/planets'
import { useStore } from '../../store'
import { bodyRegistry } from './registry'

export default function Sun() {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const texture = useTexture('/textures/sun.png')
  const glow = useTexture('/textures/glow.png')

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
  }, [texture])

  const showLabels = useStore((s) => s.showLabels)
  const selectedId = useStore((s) => s.selectedId)
  const select = useStore((s) => s.select)
  const selected = selectedId === 'sun'

  useEffect(() => {
    bodyRegistry.set('sun', groupRef.current)
    return () => {
      bodyRegistry.delete('sun')
    }
  }, [])

  useFrame((_, delta) => {
    const { paused, speed } = useStore.getState()
    if (!paused) meshRef.current.rotation.y += delta * speed * 0.05
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    select('sun')
  }
  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  }
  const handleOut = () => {
    document.body.style.cursor = 'auto'
  }

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut}>
        <sphereGeometry args={[SUN.radius, 64, 64]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* 光晕 */}
      <sprite scale={[30, 30, 1]}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[52, 52, 1]}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      {showLabels && (
        <Html position={[0, SUN.radius + 1.4, 0]} center zIndexRange={[5, 0]}>
          <button
            className={`planet-label${selected ? ' planet-label--active' : ''}`}
            onClick={() => select('sun')}
          >
            {SUN.name}
          </button>
        </Html>
      )}
    </group>
  )
}
