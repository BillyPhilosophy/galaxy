import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  CASTOR_POS,
  C_ORBIT,
  PAIR_AB,
  PAIR_C,
  POLLUX_MINI,
  POLLUX_PLANET_REVEAL,
  POLLUX_POS,
  SPLIT_HOTSPOTS,
  WOBBLE_BASE,
  WOBBLE_EXAG,
  WOBBLE_HOTSPOTS,
  WOBBLE_OMEGA,
  WOBBLE_ORBIT_R,
  WOBBLE_STAR_R,
  massOf,
  revealK,
} from './data'
import type { PairNode, PolluxHotspot, StarLeaf, TreeNode } from './data'

export type PolluxMode = 'split' | 'wobble'

function HotspotLabel({
  h,
  selected,
  onSelect,
  offset,
}: {
  h: PolluxHotspot
  selected: string | null
  onSelect: (id: string | null) => void
  offset?: [number, number, number]
}) {
  return (
    <Html position={offset ?? h.pos} center zIndexRange={[5, 0]}>
      <button
        className={`planet-label${selected === h.id ? ' planet-label--active' : ''}`}
        onClick={() => onSelect(selected === h.id ? null : h.id)}
      >
        {h.label}
      </button>
    </Html>
  )
}

/** 单位半径的 xz 平面圆环（用 scale 调半径/透明度） */
function useOrbitRing(color: string) {
  const ring = useMemo(() => {
    const N = 96
    const pos = new Float32Array((N + 1) * 3)
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2
      pos.set([Math.cos(a), 0, Math.sin(a)], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })
    const line = new THREE.Line(g, m)
    line.frustumCulled = false
    return line
  }, [color])
  useEffect(
    () => () => {
      ring.geometry.dispose()
      ;(ring.material as THREE.Material).dispose()
    },
    [ring],
  )
  return ring
}

function StarDot({ star, glow }: { star: StarLeaf; glow: THREE.Texture }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[star.r, 20, 20]} />
        <meshBasicMaterial color={star.color} toneMapped={false} />
      </mesh>
      <sprite scale={[star.r * 5.5, star.r * 5.5, 1]}>
        <spriteMaterial
          map={glow}
          color={star.color}
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

/**
 * 层级双星节点：自身绕质心旋转；p 未过阈值时显示一颗合并光点（ghost），
 * 过阈值后两个子体从光点里"飞"出来。
 */
function PairView({
  pair,
  splitRef,
  glow,
}: {
  pair: PairNode
  splitRef: RefObject<number>
  glow: THREE.Texture
}) {
  const g = useRef<THREE.Group>(null!)
  const ghost = useRef<THREE.Sprite>(null!)
  const childA = useRef<THREE.Group>(null!)
  const childB = useRef<THREE.Group>(null!)
  const angle = useRef(pair.phase)
  const ghostSize = 0.55 + 0.28 * Math.sqrt(massOf(pair))

  useFrame((_, dt) => {
    angle.current += dt * pair.omega
    g.current.rotation.y = angle.current
    const k = revealK(splitRef.current ?? 0, pair.revealAt)
    const mA = massOf(pair.a)
    const mB = massOf(pair.b)
    const tot = mA + mB
    childA.current.position.set(-pair.sep * (mB / tot) * k, 0, 0)
    childB.current.position.set(pair.sep * (mA / tot) * k, 0, 0)
    const s = 0.4 + 0.6 * k
    childA.current.scale.setScalar(s)
    childB.current.scale.setScalar(s)
    childA.current.visible = k > 0.02
    childB.current.visible = k > 0.02
    const gm = ghost.current.material as THREE.SpriteMaterial
    gm.opacity = (1 - k) * 0.85
    ghost.current.scale.setScalar(ghostSize * (1 - 0.4 * k))
    ghost.current.visible = k < 0.98
  })

  return (
    <group ref={g}>
      <sprite ref={ghost}>
        <spriteMaterial
          map={glow}
          color="#dfe8ff"
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <group ref={childA}>
        <NodeContent node={pair.a} splitRef={splitRef} glow={glow} />
      </group>
      <group ref={childB}>
        <NodeContent node={pair.b} splitRef={splitRef} glow={glow} />
      </group>
    </group>
  )
}

function NodeContent({
  node,
  splitRef,
  glow,
}: {
  node: TreeNode
  splitRef: RefObject<number>
  glow: THREE.Texture
}) {
  return node.kind === 'star' ? (
    <StarDot star={node} glow={glow} />
  ) : (
    <PairView pair={node} splitRef={splitRef} glow={glow} />
  )
}

/** 北河二：层级六合星树（AB 系统 + 远处绕转的 C 对红矮星） */
function CastorTree({ splitRef, glow }: { splitRef: RefObject<number>; glow: THREE.Texture }) {
  const cFrame = useRef<THREE.Group>(null!)
  const cAngle = useRef(C_ORBIT.phase)

  useFrame((_, dt) => {
    cAngle.current += dt * C_ORBIT.omega
    cFrame.current.position.set(
      Math.cos(cAngle.current) * C_ORBIT.radius,
      0,
      Math.sin(cAngle.current) * C_ORBIT.radius,
    )
    // C 对在揭示前完全隐藏（它的光并进了那颗"单星"里）
    cFrame.current.visible = (splitRef.current ?? 0) > PAIR_C.revealAt - 0.06
  })

  return (
    <group position={CASTOR_POS}>
      <PairView pair={PAIR_AB} splitRef={splitRef} glow={glow} />
      <group ref={cFrame}>
        <PairView pair={PAIR_C} splitRef={splitRef} glow={glow} />
      </group>
    </group>
  )
}

/** 北河三（掰开模式）：橙巨星 + 随分辨力现身的行星 */
function PolluxMini({
  splitRef,
  split,
  glow,
  sunTex,
}: {
  splitRef: RefObject<number>
  split: number
  glow: THREE.Texture
  sunTex: THREE.Texture
}) {
  const star = useRef<THREE.Mesh>(null!)
  const halo = useRef<THREE.Sprite>(null!)
  const carriage = useRef<THREE.Group>(null!)
  const planet = useRef<THREE.Group>(null!)
  const angle = useRef(1.1)
  const ring = useOrbitRing('#5a6f9f')
  const ringRef = useRef<THREE.Line>(null!)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const p = splitRef.current ?? 0
    const k = revealK(p, POLLUX_PLANET_REVEAL)
    star.current.scale.setScalar(1 + 0.015 * Math.sin(t * 2.1))
    halo.current.material.opacity = 0.4 + 0.05 * Math.sin(t * 2.1)
    angle.current += dt * POLLUX_MINI.planetOmega
    carriage.current.rotation.y = angle.current
    planet.current.visible = k > 0.02
    planet.current.scale.setScalar(Math.max(0.001, k))
    const rm = ringRef.current.material as THREE.LineBasicMaterial
    rm.opacity = 0.4 * k
  })

  return (
    <group position={POLLUX_POS}>
      <mesh ref={star}>
        <sphereGeometry args={[POLLUX_MINI.starR, 40, 40]} />
        <meshBasicMaterial map={sunTex} color="#ffc078" toneMapped={false} />
      </mesh>
      <sprite ref={halo} scale={[6.5, 6.5, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff9a3c"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <primitive
        object={ring}
        ref={ringRef}
        scale={[POLLUX_MINI.orbitR, 1, POLLUX_MINI.orbitR]}
      />
      <group ref={carriage}>
        <group ref={planet} position={[POLLUX_MINI.orbitR, 0, 0]}>
          <mesh>
            <sphereGeometry args={[POLLUX_MINI.planetR, 24, 24]} />
            <meshBasicMaterial color="#c8b498" toneMapped={false} />
          </mesh>
          {split > 0.6 && (
            <Html position={[0, 0.9, 0]} center zIndexRange={[5, 0]}>
              <span className="planet-label">北河三 b</span>
            </Html>
          )}
        </group>
      </group>
    </group>
  )
}

function SplitView({
  splitRef,
  split,
  selected,
  onSelect,
}: {
  splitRef: RefObject<number>
  split: number
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const glow = useTexture('/textures/glow.png')
  const sunTex = useTexture('/textures/sun.png')
  const castorH = SPLIT_HOTSPOTS.find((h) => h.id === 'castor')!
  const polluxH = SPLIT_HOTSPOTS.find((h) => h.id === 'pollux')!
  const twinsH = SPLIT_HOTSPOTS.find((h) => h.id === 'twins')!

  return (
    <>
      <CastorTree splitRef={splitRef} glow={glow} />
      <PolluxMini splitRef={splitRef} split={split} glow={glow} sunTex={sunTex} />
      <HotspotLabel h={castorH} selected={selected} onSelect={onSelect} />
      <HotspotLabel h={polluxH} selected={selected} onSelect={onSelect} />
      <HotspotLabel h={twinsH} selected={selected} onSelect={onSelect} />
    </>
  )
}

/** 北河三特写：看不见的行星拖着恒星晃（视向速度法） */
function WobbleView({
  showPlanet,
  exag,
  selected,
  onSelect,
}: {
  showPlanet: boolean
  exag: boolean
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const glow = useTexture('/textures/glow.png')
  const sunTex = useTexture('/textures/sun.png')
  const starG = useRef<THREE.Group>(null!)
  const starMesh = useRef<THREE.Mesh>(null!)
  const planetG = useRef<THREE.Group>(null!)
  const planetMat = useRef<THREE.MeshBasicMaterial>(null!)
  const planetHalo = useRef<THREE.Sprite>(null!)
  const orbitRing = useOrbitRing('#5a6f9f')
  const orbitRingRef = useRef<THREE.Line>(null!)
  const wobbleRing = useOrbitRing('#ffb050')
  const wobbleRingRef = useRef<THREE.Line>(null!)
  const angle = useRef(0.6)
  const showK = useRef(0)
  const thestiasH = WOBBLE_HOTSPOTS.find((h) => h.id === 'thestias')!
  const wobbleH = WOBBLE_HOTSPOTS.find((h) => h.id === 'wobble')!

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    angle.current += dt * WOBBLE_OMEGA
    showK.current += ((showPlanet ? 1 : 0) - showK.current) * 0.12
    const px = Math.cos(angle.current) * WOBBLE_ORBIT_R
    const pz = Math.sin(angle.current) * WOBBLE_ORBIT_R
    planetG.current.position.set(px, 0, pz)
    // 恒星绕质心的反向小圈：真实值几乎为零，放大 ×100 才看得见
    const w = WOBBLE_BASE * (exag ? WOBBLE_EXAG : 1)
    starG.current.position.set((-px / WOBBLE_ORBIT_R) * w, 0, (-pz / WOBBLE_ORBIT_R) * w)
    starMesh.current.scale.setScalar(1 + 0.015 * Math.sin(t * 2.1))
    const k = showK.current
    planetMat.current.opacity = k * 0.95
    planetHalo.current.material.opacity = k * 0.5
    planetG.current.visible = k > 0.02
    const orm = orbitRingRef.current.material as THREE.LineBasicMaterial
    orm.opacity = 0.35 * k
    orbitRingRef.current.scale.setScalar(WOBBLE_ORBIT_R)
    const wrm = wobbleRingRef.current.material as THREE.LineBasicMaterial
    wobbleRingRef.current.visible = exag
    wobbleRingRef.current.scale.setScalar(w)
    wrm.opacity = 0.55
  })

  return (
    <>
      <group ref={starG}>
        <mesh ref={starMesh}>
          <sphereGeometry args={[WOBBLE_STAR_R, 48, 48]} />
          <meshBasicMaterial map={sunTex} color="#ffc078" toneMapped={false} />
        </mesh>
        <sprite scale={[13, 13, 1]}>
          <spriteMaterial
            map={glow}
            color="#ff9a3c"
            transparent
            opacity={0.45}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
      <primitive object={orbitRing} ref={orbitRingRef} />
      <primitive object={wobbleRing} ref={wobbleRingRef} />
      {/* 质心标记：恒星其实绕着它转 */}
      <mesh>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color="#9ab8d8" toneMapped={false} />
      </mesh>
      <group ref={planetG}>
        <mesh>
          <sphereGeometry args={[0.9, 24, 24]} />
          <meshBasicMaterial ref={planetMat} color="#c8b498" transparent toneMapped={false} />
        </mesh>
        <sprite ref={planetHalo} scale={[2.6, 2.6, 1]}>
          <spriteMaterial
            map={glow}
            color="#c8b498"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        {showPlanet && (
          <HotspotLabel h={thestiasH} selected={selected} onSelect={onSelect} offset={[0, 1.8, 0]} />
        )}
      </group>
      <HotspotLabel h={wobbleH} selected={selected} onSelect={onSelect} />
    </>
  )
}

/** 模式切换时把相机摆到对应机位 */
function CameraRig({ mode }: { mode: PolluxMode }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3
    update(): void
  } | null

  useEffect(() => {
    if (!controls) return
    if (mode === 'split') {
      camera.position.set(0, 8, 30)
      controls.target.set(0, 1, 0)
    } else {
      camera.position.set(0, 9, 24)
      controls.target.set(0, 0, 0)
    }
    controls.update()
  }, [mode, camera, controls])

  return null
}

export default function PolluxScene({
  mode,
  splitRef,
  split,
  showPlanet,
  exag,
  selected,
  onSelect,
  isMobile,
}: {
  mode: PolluxMode
  splitRef: RefObject<number>
  split: number
  showPlanet: boolean
  exag: boolean
  selected: string | null
  onSelect: (id: string | null) => void
  isMobile: boolean
}) {
  return (
    <>
      <color attach="background" args={['#030308']} />
      <Stars radius={200} depth={120} count={isMobile ? 2500 : 5000} factor={4} saturation={0} fade speed={0.3} />
      {mode === 'split' ? (
        <SplitView splitRef={splitRef} split={split} selected={selected} onSelect={onSelect} />
      ) : (
        <WobbleView showPlanet={showPlanet} exag={exag} selected={selected} onSelect={onSelect} />
      )}
      <CameraRig mode={mode} />
      <OrbitControls
        key={mode}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.8}
        minDistance={mode === 'split' ? 14 : 10}
        maxDistance={mode === 'split' ? 70 : 50}
      />
    </>
  )
}
