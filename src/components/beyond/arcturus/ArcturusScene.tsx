import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { colorForTemp } from '../../story/main-sequence/data'
import {
  ARC_GUIDE_IDS,
  ARC_POS,
  ARC_STAR,
  ARCTURUS_CMP,
  COMPARE_HOTSPOTS,
  CONSTELLATION_LINES,
  DOME_R,
  EARTH_ORBIT,
  MERCURY_ORBIT,
  SKY_HOTSPOTS,
  SKY_STARS,
  SUN_POS,
  T_RANGE,
  raDecToVec,
  starPosAt,
  sunMorphAt,
} from './data'
import type { ArcHotspot, SkyStar } from './data'

export type ArcMode = 'sky' | 'compare'

const STAR_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aRand;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTwinkle;

void main() {
  vColor = aColor;
  vTwinkle = 0.82 + 0.18 * sin(uTime * (1.2 + aRand * 2.2) + aRand * 6.2831);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * vTwinkle * uPixelRatio * (1400.0 / -mv.z);
}
`

const STAR_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vTwinkle;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.08, d);
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a * 0.95);
}
`

const starById = (id: string): SkyStar => SKY_STARS.find((s) => s.id === id)!

/** 牧夫座风筝五星的质心（热点锚点用） */
const KITE_IDS = ['arcturus', 'izar', 'seginus', 'delta-boo', 'muphrid']
function kiteCentroidAt(t: number): [number, number, number] {
  let x = 0
  let y = 0
  let z = 0
  for (const id of KITE_IDS) {
    const [sx, sy, sz] = starPosAt(starById(id), t)
    x += sx
    y += sy
    z += sz
  }
  const n = KITE_IDS.length
  const len = Math.sqrt(x * x + y * y + z * z) / DOME_R
  return [x / n / len, y / n / len, z / n / len]
}

function HotspotLabel({
  h,
  selected,
  onSelect,
  offset,
}: {
  h: ArcHotspot
  selected: string | null
  onSelect: (id: string | null) => void
  offset?: [number, number, number]
}) {
  return (
    <Html position={offset ?? [0, 0, 0]} center zIndexRange={[5, 0]}>
      <button
        className={`planet-label${selected === h.id ? ' planet-label--active' : ''}`}
        onClick={() => onSelect(selected === h.id ? null : h.id)}
      >
        {h.label}
      </button>
    </Html>
  )
}

/** 每帧跟随某颗星（或某个计算位置）的容器，Html 标签放里面即可随动 */
function FollowGroup({ pos, children }: { pos: () => [number, number, number]; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  useFrame(() => {
    const [x, y, z] = pos()
    g.current.position.set(x, y, z)
  })
  return <group ref={g}>{children}</group>
}

/** 星点静态属性（尺寸/随机相位/颜色）——模块级函数，与 pistol 的 buildShells 同套路 */
function buildSkyStarAttrs() {
  const count = SKY_STARS.length
  const sizes = new Float32Array(count)
  const rands = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  const c = new THREE.Color()
  SKY_STARS.forEach((s, i) => {
    sizes[i] = Math.min(7, Math.max(1.7, 3.4 - s.mag * 1.1)) * 1.6
    rands[i] = Math.random()
    c.set(s.color)
    colors.set([c.r, c.g, c.b], i * 3)
  })
  return { sizes, rands, colors }
}

/** 真实星表星点：位置每帧在 CPU 端按自行推算（只有二十几颗，成本可忽略） */
function SkyPoints({ tYearsRef }: { tYearsRef: RefObject<number> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)

  const geoms = useMemo(() => {
    const { sizes, rands, colors } = buildSkyStarAttrs()
    const g = new THREE.BufferGeometry()
    const pos = new THREE.BufferAttribute(new Float32Array(SKY_STARS.length * 3), 3)
    pos.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute('position', pos)
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    return [g]
  }, [])
  const geometry = geoms[0]
  useEffect(() => () => geoms.forEach((g) => g.dispose()), [geoms])

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  useFrame((state) => {
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    const t = tYearsRef.current ?? 0
    const attr = geoms[0].getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    SKY_STARS.forEach((s, i) => {
      const [x, y, z] = starPosAt(s, t)
      arr[i * 3] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z
    })
    attr.needsUpdate = true
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={STAR_VERTEX}
        fragmentShader={STAR_FRAGMENT}
      />
    </points>
  )
}

/** 星座连线：跟着自行一起变形，"星座会散架"的核心视觉 */
function ConstellationLines({ tYearsRef }: { tYearsRef: RefObject<number> }) {
  const lineObjs = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new THREE.BufferAttribute(new Float32Array(CONSTELLATION_LINES.length * 2 * 3), 3)
    pos.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute('position', pos)
    const m = new THREE.LineBasicMaterial({
      color: '#3d5a8f',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
    const lines = new THREE.LineSegments(g, m)
    lines.frustumCulled = false
    return [lines]
  }, [])
  useEffect(
    () => () =>
      lineObjs.forEach((l) => {
        l.geometry.dispose()
        ;(l.material as THREE.Material).dispose()
      }),
    [lineObjs],
  )

  useFrame(() => {
    const t = tYearsRef.current ?? 0
    const attr = lineObjs[0].geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    CONSTELLATION_LINES.forEach(([a, b], i) => {
      const [ax, ay, az] = starPosAt(starById(a), t)
      const [bx, by, bz] = starPosAt(starById(b), t)
      arr.set([ax, ay, az, bx, by, bz], i * 6)
    })
    attr.needsUpdate = true
  })

  return <primitive object={lineObjs[0]} />
}

/** 大角星 ±10 万年的轨迹：静态渐变线，两端暗、今天最亮——"它在天上写字" */
function ArcTrail() {
  const obj = useMemo(() => {
    const N = 60
    const pos = new Float32Array((N + 1) * 3)
    const col = new Float32Array((N + 1) * 3)
    const c = new THREE.Color('#ffa14d')
    for (let i = 0; i <= N; i++) {
      const t = -T_RANGE + (2 * T_RANGE * i) / N
      const [x, y, z] = starPosAt(ARC_STAR, t)
      pos.set([x, y, z], i * 3)
      const k = Math.pow(1 - Math.abs((i / N) * 2 - 1), 1.5)
      col.set([c.r * k, c.g * k, c.b * k], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const m = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const line = new THREE.Line(g, m)
    line.frustumCulled = false
    return line
  }, [])
  useEffect(
    () => () => {
      obj.geometry.dispose()
      ;(obj.material as THREE.Material).dispose()
    },
    [obj],
  )
  return <primitive object={obj} />
}

/** 「沿勺柄找它」导航弧：玉衡→开阳→摇光→弧线→大角星→直刺→角宿一，逐段生长 */
function ArcGuide({ tYearsRef, guideNonce }: { tYearsRef: RefObject<number>; guideNonce: number }) {
  const prog = useRef(0.0001)
  const lineRef = useRef<THREE.Line>(null!)
  const G = 90

  const parts = useMemo(() => {
    const anchors = ARC_GUIDE_IDS.map(() => new THREE.Vector3())
    const curve = new THREE.CatmullRomCurve3(anchors, false, 'centripetal')
    const g = new THREE.BufferGeometry()
    const pos = new THREE.BufferAttribute(new Float32Array((G + 1) * 3), 3)
    pos.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute('position', pos)
    const m = new THREE.LineBasicMaterial({
      color: '#ffb050',
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const line = new THREE.Line(g, m)
    line.frustumCulled = false
    return [{ line, curve, anchors, tmp: new THREE.Vector3() }]
  }, [])
  useEffect(
    () => () =>
      parts.forEach((p) => {
        p.line.geometry.dispose()
        ;(p.line.material as THREE.Material).dispose()
      }),
    [parts],
  )

  useEffect(() => {
    prog.current = 0.0001
  }, [guideNonce])

  useFrame((_, dt) => {
    if (prog.current < 1) prog.current = Math.min(1, prog.current + dt / 3)
    const t = tYearsRef.current ?? 0
    const { line, curve, anchors, tmp } = parts[0]
    ARC_GUIDE_IDS.forEach((id, i) => {
      const [x, y, z] = starPosAt(starById(id), t)
      anchors[i].set(x, y, z)
    })
    const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i <= G; i++) {
      curve.getPoint(i / G, tmp)
      arr[i * 3] = tmp.x
      arr[i * 3 + 1] = tmp.y
      arr[i * 3 + 2] = tmp.z
    }
    attr.needsUpdate = true
    const done = prog.current >= 1
    line.geometry.setDrawRange(0, done ? G + 1 : Math.max(2, Math.floor(prog.current * (G + 1))))
    const m = lineRef.current.material as THREE.LineBasicMaterial
    m.opacity = done ? 0.3 : 0.95
  })

  return <primitive object={parts[0].line} ref={lineRef} />
}

/** 大角星标记：橙色辉光 + 呼吸，热点标签跟随 */
function ArcturusMarker({
  tYearsRef,
  selected,
  onSelect,
}: {
  tYearsRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const glow = useTexture('/textures/glow.png')
  const g = useRef<THREE.Group>(null!)
  const s1 = useRef<THREE.Sprite>(null!)
  const hotspot = SKY_HOTSPOTS.find((h) => h.id === 'star')!

  useFrame((state) => {
    const [x, y, z] = starPosAt(ARC_STAR, tYearsRef.current ?? 0)
    g.current.position.set(x, y, z)
    const t = state.clock.elapsedTime
    s1.current.scale.setScalar(24 * (1 + 0.07 * Math.sin(t * 1.9)))
  })

  return (
    <group ref={g}>
      <sprite ref={s1}>
        <spriteMaterial
          map={glow}
          color="#ff9a3c"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[8, 8, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffd9a8"
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <HotspotLabel h={hotspot} selected={selected} onSelect={onSelect} offset={[0, 16, 0]} />
    </group>
  )
}

function SkyView({
  tYearsRef,
  selected,
  onSelect,
  guideNonce,
}: {
  tYearsRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
  guideNonce: number
}) {
  const dipperHotspot = SKY_HOTSPOTS.find((h) => h.id === 'dipper')!
  const bootesHotspot = SKY_HOTSPOTS.find((h) => h.id === 'bootes')!
  const trailHotspot = SKY_HOTSPOTS.find((h) => h.id === 'trail')!
  const trailAnchor = useMemo(() => starPosAt(ARC_STAR, 60000), [])

  return (
    <>
      <SkyPoints tYearsRef={tYearsRef} />
      <ConstellationLines tYearsRef={tYearsRef} />
      <ArcTrail />
      <ArcGuide tYearsRef={tYearsRef} guideNonce={guideNonce} />
      <ArcturusMarker tYearsRef={tYearsRef} selected={selected} onSelect={onSelect} />
      <FollowGroup pos={() => starPosAt(starById('megrez'), tYearsRef.current ?? 0)}>
        <HotspotLabel h={dipperHotspot} selected={selected} onSelect={onSelect} offset={[0, 12, 0]} />
      </FollowGroup>
      <FollowGroup pos={() => kiteCentroidAt(tYearsRef.current ?? 0)}>
        <HotspotLabel h={bootesHotspot} selected={selected} onSelect={onSelect} offset={[0, 14, 0]} />
      </FollowGroup>
      <group position={trailAnchor}>
        <HotspotLabel h={trailHotspot} selected={selected} onSelect={onSelect} offset={[0, -14, 0]} />
      </group>
    </>
  )
}

/** 轨道圆环（xz 平面） */
function OrbitRing({ center, radius, color }: { center: [number, number, number]; radius: number; color: string }) {
  const obj = useMemo(() => {
    const N = 128
    const pos = new Float32Array((N + 1) * 3)
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2
      pos.set([center[0] + Math.cos(a) * radius, center[1], center[2] + Math.sin(a) * radius], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false })
    const line = new THREE.Line(g, m)
    line.frustumCulled = false
    return line
  }, [center, radius, color])
  useEffect(
    () => () => {
      obj.geometry.dispose()
      ;(obj.material as THREE.Material).dispose()
    },
    [obj],
  )
  return <primitive object={obj} />
}

/** 左侧：太阳，随 morph 从今天的样子膨胀成大角星 */
function SunMorphStar({
  morphRef,
  selected,
  onSelect,
}: {
  morphRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const sunTex = useTexture('/textures/sun.png')
  const glow = useTexture('/textures/glow.png')
  const mesh = useRef<THREE.Mesh>(null!)
  const mat = useRef<THREE.MeshBasicMaterial>(null!)
  const halo = useRef<THREE.Sprite>(null!)
  const labelWrap = useRef<THREE.Group>(null!)
  const hotspot = COMPARE_HOTSPOTS.find((h) => h.id === 'sun')!

  useFrame(() => {
    const { r, temp } = sunMorphAt(morphRef.current ?? 0)
    mesh.current.scale.setScalar(r)
    mat.current.color.copy(colorForTemp(temp))
    halo.current.scale.setScalar(r * 3.2 + 4)
    labelWrap.current.position.y = r + 9
  })

  return (
    <group position={SUN_POS}>
      <mesh ref={mesh}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial ref={mat} map={sunTex} toneMapped={false} />
      </mesh>
      <sprite ref={halo}>
        <spriteMaterial
          map={glow}
          color="#ffbf70"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <group ref={labelWrap}>
        <HotspotLabel h={hotspot} selected={selected} onSelect={onSelect} />
      </group>
    </group>
  )
}

/** 右侧：大角星本尊，缓慢慵懒地呼吸 */
function ArcturusBall({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const sunTex = useTexture('/textures/sun.png')
  const glow = useTexture('/textures/glow.png')
  const mesh = useRef<THREE.Mesh>(null!)
  const hotspot = COMPARE_HOTSPOTS.find((h) => h.id === 'arcturus-cmp')!

  useFrame((state) => {
    const t = state.clock.elapsedTime
    mesh.current.scale.setScalar(1 + 0.012 * (Math.sin(t * 1.7) + 0.5 * Math.sin(t * 2.9 + 1)))
  })

  return (
    <group position={ARC_POS}>
      <mesh ref={mesh}>
        <sphereGeometry args={[ARCTURUS_CMP.r, 48, 48]} />
        <meshBasicMaterial map={sunTex} color="#ffb168" toneMapped={false} />
      </mesh>
      <sprite scale={[95, 95, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff9435"
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[52, 52, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffb060"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <HotspotLabel h={hotspot} selected={selected} onSelect={onSelect} offset={[0, ARCTURUS_CMP.r + 10, 0]} />
    </group>
  )
}

/** 沿轨道缓行的参照行星（水星 / 地球），地球带标签 */
function OrbitDot({
  radius,
  size,
  color,
  tex,
  speed,
  phase,
  children,
}: {
  radius: number
  size: number
  color?: string
  tex?: THREE.Texture
  speed: number
  phase: number
  children?: ReactNode
}) {
  const g = useRef<THREE.Group>(null!)
  const angle = useRef(phase)
  useFrame((_, dt) => {
    angle.current += dt * speed
    g.current.position.set(
      SUN_POS[0] + Math.cos(angle.current) * radius,
      0,
      SUN_POS[2] + Math.sin(angle.current) * radius,
    )
  })
  return (
    <group ref={g}>
      <mesh>
        <sphereGeometry args={[size, 24, 24]} />
        <meshBasicMaterial map={tex} color={color} toneMapped={false} />
      </mesh>
      {children}
    </group>
  )
}

function CompareView({
  morphRef,
  selected,
  onSelect,
}: {
  morphRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const earthTex = useTexture('/textures/earth.png')
  const earthHotspot = COMPARE_HOTSPOTS.find((h) => h.id === 'earth')!

  return (
    <>
      <SunMorphStar morphRef={morphRef} selected={selected} onSelect={onSelect} />
      <ArcturusBall selected={selected} onSelect={onSelect} />
      <OrbitRing center={SUN_POS} radius={MERCURY_ORBIT} color="#44608f" />
      <OrbitRing center={SUN_POS} radius={EARTH_ORBIT} color="#3d5a8f" />
      <OrbitDot radius={MERCURY_ORBIT} size={1.1} color="#b8a89a" speed={0.25} phase={1.2} />
      <OrbitDot radius={EARTH_ORBIT} size={1.6} tex={earthTex} speed={0.06} phase={3.6}>
        <HotspotLabel h={earthHotspot} selected={selected} onSelect={onSelect} offset={[0, 6, 0]} />
      </OrbitDot>
    </>
  )
}

/** 模式切换时把相机摆到对应机位 */
function CameraRig({ mode }: { mode: ArcMode }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3
    update(): void
  } | null

  useEffect(() => {
    if (!controls) return
    if (mode === 'sky') {
      // 躺进穹顶里，面朝北斗—大角星方向（RA≈195°, Dec≈+40°）
      const [x, y, z] = raDecToVec(195, 40, 140)
      camera.position.set(-x, -y, -z)
      controls.target.set(0, 0, 0)
    } else {
      camera.position.set(-20, 70, 300)
      controls.target.set(-20, 0, 0)
    }
    controls.update()
  }, [mode, camera, controls])

  return null
}

export default function ArcturusScene({
  mode,
  tYearsRef,
  morphRef,
  selected,
  onSelect,
  guideNonce,
  isMobile,
}: {
  mode: ArcMode
  tYearsRef: RefObject<number>
  morphRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
  guideNonce: number
  isMobile: boolean
}) {
  return (
    <>
      <color attach="background" args={['#02030a']} />
      <Stars radius={1300} depth={80} count={isMobile ? 2200 : 4500} factor={3} saturation={0} fade speed={0} />
      {mode === 'sky' ? (
        <SkyView tYearsRef={tYearsRef} selected={selected} onSelect={onSelect} guideNonce={guideNonce} />
      ) : (
        <CompareView morphRef={morphRef} selected={selected} onSelect={onSelect} />
      )}
      <CameraRig mode={mode} />
      <OrbitControls
        key={mode}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.5}
        enableZoom={mode === 'compare'}
        minDistance={100}
        maxDistance={700}
        autoRotate={mode === 'sky'}
        autoRotateSpeed={0.25}
      />
    </>
  )
}
