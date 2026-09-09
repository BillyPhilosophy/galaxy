import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Link, useNavigate } from 'react-router'
import * as THREE from 'three'
import { SCALE_BODIES, SCALE_POSITIONS } from '../data/scale'
import type { ScaleBody } from '../data/scale'

const MAX_T = SCALE_BODIES.length - 1
/** 取景系数：相机距离 = 天体半径 × FIT，保证目标占画面约六成高 */
const FIT = 4.2

function Rig({ tRef }: { tRef: RefObject<number> }) {
  const smooth = useRef(0)
  const look = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera
    smooth.current += (tRef.current - smooth.current) * 0.07
    const t = THREE.MathUtils.clamp(smooth.current, 0, MAX_T)
    const i = Math.min(Math.floor(t), MAX_T - 1)
    const e = (t - i) ** 2 * (3 - 2 * (t - i))
    const x = THREE.MathUtils.lerp(SCALE_POSITIONS[i], SCALE_POSITIONS[i + 1], e)
    const d = Math.exp(
      THREE.MathUtils.lerp(
        Math.log(SCALE_BODIES[i].radius * FIT),
        Math.log(SCALE_BODIES[i + 1].radius * FIT),
        e,
      ),
    )
    look.set(x, 0, 0)
    camera.position.set(x, d * 0.22, d)
    camera.lookAt(look)
    camera.near = Math.max(d / 500, 0.01)
    camera.far = d * 8 + SCALE_POSITIONS[MAX_T] + SCALE_BODIES[MAX_T].radius * 4
    camera.updateProjectionMatrix()
  })
  return null
}

function BodyMesh({ body, x }: { body: ScaleBody; x: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const raw = useTexture(body.texture ?? '/textures/glow.png')
  const glow = useTexture('/textures/glow.png')

  const tex = useMemo(() => {
    const t = raw.clone()
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [raw])

  useFrame((_, delta) => {
    meshRef.current.rotation.y += delta * 0.05
  })

  return (
    <group position={[x, 0, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[body.radius, 64, 64]} />
        <meshBasicMaterial
          map={body.texture ? tex : undefined}
          color={body.texture ? '#ffffff' : body.color}
          toneMapped={false}
        />
      </mesh>
      {body.star && (
        <>
          <sprite scale={[body.radius * 4.6, body.radius * 4.6, 1]}>
            <spriteMaterial
              map={glow}
              color={body.color}
              transparent
              opacity={0.5}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <sprite scale={[body.radius * 8.5, body.radius * 8.5, 1]}>
            <spriteMaterial
              map={glow}
              color={body.color}
              transparent
              opacity={0.15}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </>
      )}
    </group>
  )
}

export default function StoryScale() {
  const [t, setT] = useState(0)
  const tRef = useRef(0)
  const navigate = useNavigate()

  const apply = useCallback((v: number) => {
    const c = THREE.MathUtils.clamp(v, 0, MAX_T)
    tRef.current = c
    setT(c)
  }, [])

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      apply(tRef.current + e.deltaY * 0.0016)
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') apply(Math.round(tRef.current) + 1)
      if (e.key === 'ArrowLeft') apply(Math.round(tRef.current) - 1)
      if (e.key === 'Escape') navigate('/story')
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [apply, navigate])

  const current = SCALE_BODIES[Math.round(t)]

  return (
    <div className="scale-page">
      <div className="scale-stars" />
      <Canvas
        camera={{ position: [0, 1, FIT], fov: 45, near: 0.001, far: 2000000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Rig tRef={tRef} />
          {SCALE_BODIES.map((b, i) => (
            <BodyMesh key={b.id} body={b} x={SCALE_POSITIONS[i]} />
          ))}
        </Suspense>
      </Canvas>
      <div className="scale-hud scale-top">
        <Link to="/story" className="scale-back">
          ← 时间轴
        </Link>
        <div className="scale-title">
          尺度阶梯
          <small className="mono">LADDER OF SCALE</small>
        </div>
      </div>
      <div className="scale-hud scale-bottom panel">
        <div className="scale-card">
          <div className="scale-name">{current.name}</div>
          <div className="scale-en mono">{current.nameEn}</div>
          <div className="scale-note">{current.note}</div>
          <div className="scale-km mono">半径 {current.radiusText}</div>
        </div>
        <input
          type="range"
          className="slider scale-slider"
          min={0}
          max={MAX_T}
          step={0.01}
          value={t}
          onChange={(e) => apply(parseFloat(e.target.value))}
          aria-label="缩放尺度"
        />
        <div className="scale-steps">
          {SCALE_BODIES.map((b, i) => (
            <button
              key={b.id}
              className={`scale-step${i === Math.round(t) ? ' active' : ''}`}
              onClick={() => apply(i)}
            >
              {b.name}
            </button>
          ))}
        </div>
        <div className="scale-hint mono">滚轮 / ← → 键缩放</div>
      </div>
    </div>
  )
}
