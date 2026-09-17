import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { colorForTemp } from '../../story/main-sequence/data'
import {
  AU,
  BETEL_HOTSPOTS,
  PULSE_SECONDS,
  STAR_R,
  SWAP_PLANETS,
  swapRadiusUnits,
} from './data'
import type { BetelHotspot, BetelMode } from './data'

// —— 沸腾的红超巨星表面：双尺度动画噪声做巨对流胞 ——
const BOIL_VERTEX = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vLocal;
void main() {
  vN = normalMatrix * normal;
  vLocal = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

const BOIL_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uDim;
uniform float uBoom;
varying vec3 vN;
varying vec3 vV;
varying vec3 vLocal;

float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.45, 45.164))) * 43758.5453); }
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i);
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

void main() {
  // 大胞缓慢漂移 + 小胞细节：整颗球一锅慢炖的岩浆
  float big = vnoise(vLocal * 0.9 + vec3(uTime * 0.05, uTime * 0.03, 0.0));
  float cells = vnoise(vLocal * 2.0 + big * 1.5 + vec3(0.0, 0.0, uTime * 0.07));
  vec3 col = mix(vec3(0.24, 0.05, 0.02), vec3(0.82, 0.29, 0.10), smoothstep(0.25, 0.62, cells));
  col = mix(col, vec3(0.95, 0.65, 0.25), smoothstep(0.68, 0.85, cells));
  // 临边昏暗
  float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  col *= 0.45 + 0.55 * mu;
  // 尘埃遮挡 → 整体变暗
  col *= 1.0 - uDim * 0.75;
  // 坍缩后转蓝白
  col = mix(col, vec3(0.8, 0.9, 1.2), uBoom);
  gl_FragColor = vec4(col, 1.0);
}
`

// —— 大暗化的尘埃云（暗色、普通混合） ——
const DUST_VERTEX = /* glsl */ `
uniform float uP;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aRand;
attribute float aSize;
varying float vA;
void main() {
  float e = 1.0 - pow(1.0 - uP, 2.0);
  vec3 pos = aDir * (4.2 + e * (5.0 + aRand * 9.0));
  pos += vec3(0.6, 0.8, 0.3) * e * 3.0;
  float life = sin(clamp(uP, 0.0, 1.0) * 3.14159);
  vA = life * (0.55 + 0.45 * aRand);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * (1.0 + e * 2.0) * uPixelRatio * (240.0 / -mv.z);
}
`

const DUST_FRAGMENT = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.1, d) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(0.09, 0.055, 0.035), a);
}
`

// —— 超新星壳层 ——
const SHELL_VERTEX = /* glsl */ `
uniform float uBoom;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aSpeed;
attribute float aRand;
attribute float aSize;
varying float vA;
varying float vR;
void main() {
  float e = 1.0 - pow(1.0 - uBoom, 2.2);
  float r = e * (10.0 + aSpeed * 26.0);
  vec3 pos = aDir * r;
  vR = clamp(r / 36.0, 0.0, 1.0);
  vA = smoothstep(0.0, 0.05, uBoom) * (1.0 - uBoom * 0.78) * (0.4 + 0.6 * aRand);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * (1.0 + e) * uPixelRatio * (150.0 / -mv.z);
}
`

const SHELL_FRAGMENT = /* glsl */ `
varying float vA;
varying float vR;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.08, d) * vA;
  if (a < 0.004) discard;
  vec3 col = mix(vec3(1.0, 0.98, 0.92), vec3(1.0, 0.72, 0.38), smoothstep(0.0, 0.4, vR));
  col = mix(col, vec3(0.75, 0.25, 0.12), smoothstep(0.4, 1.0, vR));
  gl_FragColor = vec4(col, a);
}
`

function buildPuff(count: number) {
  const dirs = new Float32Array(count * 3)
  const rands = new Float32Array(count)
  const speeds = new Float32Array(count)
  const sizes = new Float32Array(count)
  const v = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    v.randomDirection()
    dirs.set([v.x, v.y, v.z], i * 3)
    rands[i] = Math.random()
    speeds[i] = 0.6 + Math.random() * 0.6
    sizes[i] = 1.5 + Math.random() * 3
  }
  return { dirs, rands, speeds, sizes }
}

function HotspotLabel({
  h,
  selected,
  onSelect,
  offset,
}: {
  h: BetelHotspot
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

function OrbitRingLine({ r, color, opacity }: { r: number; color: string; opacity: number }) {
  const ring = useMemo(() => {
    const N = 128
    const pos = new Float32Array((N + 1) * 3)
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2
      pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    const line = new THREE.Line(g, m)
    line.frustumCulled = false
    return line
  }, [r, color, opacity])
  useEffect(
    () => () => {
      ring.geometry.dispose()
      ;(ring.material as THREE.Material).dispose()
    },
    [ring],
  )
  return <primitive object={ring} />
}

/** 沸腾星本体：模式一共用（uDim=尘埃遮挡），模式三坍缩（uBoom） */
function BoilingStar({
  dimRef,
  boomTRef,
}: {
  dimRef?: RefObject<number>
  boomTRef?: RefObject<number>
}) {
  const glow = useTexture('/textures/glow.png')
  const mesh = useRef<THREE.Mesh>(null!)
  const mat = useRef<THREE.ShaderMaterial>(null!)
  const halo = useRef<THREE.Sprite>(null!)

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uDim: { value: 0 }, uBoom: { value: 0 } }),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const dim = dimRef?.current ?? 0
    const boomT = boomTRef?.current ?? 0
    // 坍缩窗口：boomT 0 → 0.05 完成
    const collapse = boomTRef ? Math.min(1, boomT / 0.05) : 0
    const pulse = 1 + 0.02 * Math.sin((t / PULSE_SECONDS) * Math.PI * 2)
    mesh.current.scale.setScalar(pulse * (1 - collapse * 0.94))
    mat.current.uniforms.uTime.value = t
    mat.current.uniforms.uDim.value = dim
    mat.current.uniforms.uBoom.value = collapse
    const hm = halo.current.material as THREE.SpriteMaterial
    hm.opacity = (0.42 * (1 - dim * 0.8)) * (1 - collapse)
    halo.current.scale.setScalar(15 * (1 + 0.05 * Math.sin(t * 0.8)))
  })

  return (
    <>
      <mesh ref={mesh}>
        <sphereGeometry args={[STAR_R, 96, 96]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={BOIL_VERTEX}
          fragmentShader={BOIL_FRAGMENT}
        />
      </mesh>
      <sprite ref={halo} scale={[15, 15, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff6a2a"
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </>
  )
}

/** 模式一：大暗化 */
function DimmingView({
  sneezeRef,
  selected,
  onSelect,
  isMobile,
}: {
  sneezeRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
  isMobile: boolean
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const count = isMobile ? 700 : 1500

  const geometry = useMemo(() => {
    const { dirs, rands, sizes } = buildPuff(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({ uP: { value: 0 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  // 喷嚏进度 → 尘埃变暗系数
  const dimRef = useRef(0)
  useFrame(() => {
    const p = sneezeRef.current ?? 0
    const life = p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0
    dimRef.current = life
    matRef.current.uniforms.uP.value = p
  })

  const starH = BETEL_HOTSPOTS.find((h) => h.id === 'star')!
  const dustH = BETEL_HOTSPOTS.find((h) => h.id === 'dust')!

  return (
    <>
      <color attach="background" args={['#040203']} />
      <Stars radius={220} depth={120} count={isMobile ? 2200 : 4500} factor={4} saturation={0} fade speed={0.3} />
      <BoilingStar dimRef={dimRef} />
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          transparent
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={DUST_VERTEX}
          fragmentShader={DUST_FRAGMENT}
        />
      </points>
      <HotspotLabel h={starH} selected={selected} onSelect={onSelect} />
      <HotspotLabel h={dustH} selected={selected} onSelect={onSelect} />
    </>
  )
}

const tmpHot = new THREE.Color()

/** 模式二：假如它是太阳 */
function SwapView({
  swapRef,
  swap,
  selected,
  onSelect,
  isMobile,
}: {
  swapRef: RefObject<number>
  swap: number
  selected: string | null
  onSelect: (id: string | null) => void
  isMobile: boolean
}) {
  const sunTex = useTexture('/textures/sun.png')
  const glow = useTexture('/textures/glow.png')
  const sun = useRef<THREE.Mesh>(null!)
  const sunMat = useRef<THREE.MeshBasicMaterial>(null!)
  const halo = useRef<THREE.Sprite>(null!)
  const labelWrap = useRef<THREE.Group>(null!)
  const planetGs = useRef<(THREE.Group | null)[]>([])
  const ringRefs = useRef<(THREE.Line | null)[]>([])
  const angles = useRef(SWAP_PLANETS.map((_, i) => i * 1.13))

  useFrame((_, dt) => {
    const p = swapRef.current ?? 0
    const r = swapRadiusUnits(p)
    sun.current.scale.setScalar(r)
    sunMat.current.color.copy(colorForTemp(5778 - 2178 * p))
    halo.current.scale.setScalar(r * 2.6 + 1)
    labelWrap.current.position.y = r + 5
    SWAP_PLANETS.forEach((pl, i) => {
      angles.current[i] += pl.speed * dt
      const a = angles.current[i]
      const g = planetGs.current[i]
      if (!g) return
      const orbitR = pl.au * AU
      // 吞没系数：恒星表面越过轨道后 0.15 区间内烧尽
      const k = Math.min(1, Math.max(0, (r - orbitR) / (orbitR * 0.15)))
      const effR = orbitR * (1 - 0.25 * k)
      g.position.set(Math.cos(a) * effR, 0, Math.sin(a) * effR)
      g.scale.setScalar(Math.max(0.001, 1 - k))
      g.visible = k < 0.999
      const mesh = g.children[0] as THREE.Mesh
      const m = mesh.material as THREE.MeshBasicMaterial
      // 临近被吞时烧红
      const heat = Math.min(1, Math.max(0, (r / orbitR - 0.55) / 0.45))
      m.color.set(pl.color).lerp(tmpHot.set('#ff8a3c'), heat)
      const ring = ringRefs.current[i]
      if (ring) {
        const rm = ring.material as THREE.LineBasicMaterial
        rm.color.set(k >= 1 ? '#5a2420' : heat > 0.4 ? '#8a5a3a' : '#3d5a8f')
        rm.opacity = k >= 1 ? 0.22 : 0.45
      }
    })
  })

  const ringsH = BETEL_HOTSPOTS.find((h) => h.id === 'rings')!
  const starH = BETEL_HOTSPOTS.find((h) => h.id === 'star')!

  return (
    <>
      <color attach="background" args={['#040203']} />
      <Stars radius={800} depth={200} count={isMobile ? 2200 : 4500} factor={4} saturation={0} fade speed={0.3} />
      <mesh ref={sun}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial ref={sunMat} map={sunTex} toneMapped={false} />
      </mesh>
      <sprite ref={halo}>
        <spriteMaterial
          map={glow}
          color="#ff8a4a"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      {SWAP_PLANETS.map((pl, i) => {
        const k = Math.min(1, Math.max(0, (swapRadiusUnits(swap) - pl.au * AU) / (pl.au * AU * 0.15)))
        return (
          <group key={pl.id}>
            <OrbitRingLine r={pl.au * AU} color="#3d5a8f" opacity={0.45} />
            <group
              ref={(el) => {
                planetGs.current[i] = el
              }}
            >
              <mesh>
                <sphereGeometry args={[pl.size, 20, 20]} />
                <meshBasicMaterial color={pl.color} toneMapped={false} />
              </mesh>
              {k < 0.999 && (
                <Html position={[0, pl.size + 1.6, 0]} center zIndexRange={[5, 0]}>
                  <span className="planet-label" style={k > 0 ? { color: '#ff8a5c' } : undefined}>
                    {pl.name}
                    {k > 0 ? ' · 坠落中' : ''}
                  </span>
                </Html>
              )}
            </group>
          </group>
        )
      })}
      <group ref={labelWrap}>
        <HotspotLabel h={starH} selected={selected} onSelect={onSelect} offset={[0, 0, 0]} />
      </group>
      <HotspotLabel h={ringsH} selected={selected} onSelect={onSelect} />
    </>
  )
}

/** 模式三：引爆超新星 */
function BoomView({
  boomTRef,
  selected,
  onSelect,
  isMobile,
}: {
  boomTRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
  isMobile: boolean
}) {
  const shellMat = useRef<THREE.ShaderMaterial>(null!)
  const pulsar = useRef<THREE.Group>(null!)
  const beams = useRef<THREE.Group>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const count = isMobile ? 4000 : 8000

  const geometry = useMemo(() => {
    const { dirs, rands, speeds, sizes } = buildPuff(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({ uBoom: { value: 0 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  useFrame((_, dt) => {
    const t = boomTRef.current ?? 0
    // 坍缩窗口结束后壳层膨胀
    const shellP = Math.min(1, Math.max(0, (t - 0.04) / 0.75))
    shellMat.current.uniforms.uBoom.value = shellP
    pulsar.current.visible = t > 0.12
    beams.current.rotation.y += dt * 3.2
  })

  const remnantH = BETEL_HOTSPOTS.find((h) => h.id === 'remnant')!

  return (
    <>
      <color attach="background" args={['#040203']} />
      <Stars radius={220} depth={120} count={isMobile ? 2200 : 4500} factor={4} saturation={0} fade speed={0.3} />
      <BoilingStar boomTRef={boomTRef} />
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={shellMat}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={uniforms}
          vertexShader={SHELL_VERTEX}
          fragmentShader={SHELL_FRAGMENT}
        />
      </points>
      {/* 中子星残骸：蓝白小点 + 旋转脉冲光束 */}
      <group ref={pulsar} visible={false}>
        <mesh>
          <sphereGeometry args={[0.5, 24, 24]} />
          <meshBasicMaterial color="#cfe8ff" toneMapped={false} />
        </mesh>
        <group ref={beams} rotation={[0.5, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <planeGeometry args={[16, 0.5]} />
            <meshBasicMaterial
              color="#9ecfff"
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
            <planeGeometry args={[16, 0.5]} />
            <meshBasicMaterial
              color="#9ecfff"
              transparent
              opacity={0.35}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </group>
      <HotspotLabel h={remnantH} selected={selected} onSelect={onSelect} />
    </>
  )
}

/** 模式切换时把相机摆到对应机位 */
function CameraRig({ mode }: { mode: BetelMode }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3
    update(): void
  } | null

  useEffect(() => {
    if (!controls) return
    if (mode === 'swap') {
      camera.position.set(0, 60, 170)
    } else if (mode === 'boom') {
      camera.position.set(0, 8, 40)
    } else {
      camera.position.set(0, 6, 26)
    }
    controls.target.set(0, 0, 0)
    controls.update()
  }, [mode, camera, controls])

  return null
}

export default function BetelgeuseScene({
  mode,
  sneezeRef,
  swapRef,
  swap,
  boomTRef,
  selected,
  onSelect,
  isMobile,
}: {
  mode: BetelMode
  sneezeRef: RefObject<number>
  swapRef: RefObject<number>
  swap: number
  boomTRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
  isMobile: boolean
}) {
  return (
    <>
      {mode === 'dimming' && (
        <DimmingView sneezeRef={sneezeRef} selected={selected} onSelect={onSelect} isMobile={isMobile} />
      )}
      {mode === 'swap' && (
        <SwapView swapRef={swapRef} swap={swap} selected={selected} onSelect={onSelect} isMobile={isMobile} />
      )}
      {mode === 'boom' && (
        <BoomView boomTRef={boomTRef} selected={selected} onSelect={onSelect} isMobile={isMobile} />
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
        minDistance={mode === 'swap' ? 20 : mode === 'boom' ? 10 : 9}
        maxDistance={mode === 'swap' ? 600 : mode === 'boom' ? 120 : 60}
      />
    </>
  )
}
