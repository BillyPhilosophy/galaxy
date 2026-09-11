import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { PROTO_HOTSPOTS } from './data'

/** 开场过渡时长（秒）：相机推近 + 各部件淡入 */
const INTRO_SECONDS = 5

const DISK_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uAccretion;
uniform float uIntro;
uniform float uPixelRatio;
attribute float aRand;
attribute float aSize;
varying float vAlpha;
varying float vHeat;

void main() {
  vec3 seed = position;
  float r = length(seed.xz);
  // 开普勒旋转：ω ∝ r^-1.5，内圈快外圈慢
  float omega = 0.55 * pow(4.0 / r, 1.5) * (0.35 + 0.65 * uAccretion);
  float ang = omega * uTime;
  float cs = cos(ang);
  float sn = sin(ang);
  vec3 pos = seed;
  pos.xz = mat2(cs, -sn, sn, cs) * pos.xz;
  pos.y += sin(uTime * 0.8 + aRand * 6.2831) * 0.12;

  vHeat = 1.0 - smoothstep(4.0, 30.0, r);
  vAlpha = (0.20 + vHeat * uAccretion * 0.48) * uIntro * mix(0.65, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (120.0 / -mv.z);
}
`

const DISK_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying float vHeat;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.06, d) * vAlpha;
  if (a < 0.004) discard;
  vec3 hot = vec3(1.0, 0.85, 0.62);
  vec3 mid = vec3(0.95, 0.45, 0.22);
  vec3 cold = vec3(0.42, 0.20, 0.12);
  vec3 col = mix(cold, mid, smoothstep(0.0, 0.55, vHeat));
  col = mix(col, hot, smoothstep(0.55, 1.0, vHeat));
  gl_FragColor = vec4(col, a);
}
`

const JET_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uAccretion;
uniform float uIntro;
uniform float uPixelRatio;
attribute float aDir;
attribute float aPhase;
attribute float aRand;
attribute float aSize;
varying float vAlpha;
varying float vFade;

void main() {
  float speed = mix(0.10, 0.22, uAccretion);
  float t = fract(aPhase + uTime * speed);
  // 螺旋进动的锥形喷流
  float helixR = (0.5 + t * 2.4) * (1.0 + uAccretion * 0.5);
  float helixA = aRand * 6.2831 + uTime * 0.6 * aDir + t * 10.0;
  vec3 pos;
  pos.y = aDir * (3.5 + t * 55.0);
  pos.x = cos(helixA) * helixR * (0.3 + aRand * 0.7);
  pos.z = sin(helixA) * helixR * (0.3 + aRand * 0.7);

  vAlpha = (1.0 - t) * (0.16 + 0.42 * uAccretion) * uIntro * mix(0.6, 1.0, aRand);
  vFade = t;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (110.0 / -mv.z) * (1.0 - t * 0.4);
}
`

const JET_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying float vFade;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  // 根部电离蓝白 → 末梢 Hα 粉红（赫比格-哈罗天体的标志色）
  vec3 col = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.40, 0.60), smoothstep(0.12, 0.9, vFade));
  gl_FragColor = vec4(col, a);
}
`

const ENVELOPE_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uIntro;
uniform float uPixelRatio;
attribute vec3 aLand;
attribute float aPhase;
attribute float aSize;
varying float vAlpha;

void main() {
  float t = fract(aPhase + uTime * 0.028);
  // 加速下落（t² 模拟引力加速），落点汇入吸积盘
  vec3 pos = mix(position, aLand, t * t);
  pos.y += sin(uTime * 0.5 + aPhase * 6.2831) * 0.3;
  vAlpha = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.85, 1.0, t)) * 0.5 * uIntro;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (120.0 / -mv.z);
}
`

const ENVELOPE_FRAGMENT = /* glsl */ `
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(0.58, 0.48, 0.72), a);
}
`

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 1.6
}

function buildDisk(count: number) {
  const positions = new Float32Array(count * 3)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // 按面积均匀并略偏向内缘
    const r = Math.sqrt(THREE.MathUtils.lerp(16, 900, Math.pow(Math.random(), 0.8)))
    const a = Math.random() * Math.PI * 2
    positions.set([Math.cos(a) * r, gauss() * (0.25 + r * 0.05), Math.sin(a) * r], i * 3)
    rands[i] = Math.random()
    sizes[i] = 0.5 + Math.random() * 1.1
  }
  return { positions, rands, sizes }
}

function buildJets(count: number) {
  const dirs = new Float32Array(count)
  const phases = new Float32Array(count)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    dirs[i] = i % 2 === 0 ? 1 : -1
    phases[i] = Math.random()
    rands[i] = Math.random()
    sizes[i] = 0.6 + Math.random() * 1.0
  }
  return { dirs, phases, rands, sizes }
}

function buildEnvelope(count: number) {
  const positions = new Float32Array(count * 3)
  const lands = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // 起点：外围球壳
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    const r = 46 + Math.random() * 10
    positions.set(
      [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.8, r * Math.sin(ph) * Math.sin(th)],
      i * 3,
    )
    // 落点：盘面 r 5..14
    const lr = 5 + Math.random() * 9
    const la = Math.random() * Math.PI * 2
    lands.set([Math.cos(la) * lr, gauss() * 0.4, Math.sin(la) * lr], i * 3)
    phases[i] = Math.random()
    sizes[i] = 0.6 + Math.random() * 1.0
  }
  return { positions, lands, phases, sizes }
}

interface SystemProps {
  accretionRef: RefObject<number>
  count: number
}

function useIntro() {
  const introStart = useRef<number | null>(null)
  return (elapsed: number) => {
    if (introStart.current === null) introStart.current = elapsed
    return THREE.MathUtils.smoothstep(
      Math.min((elapsed - introStart.current) / INTRO_SECONDS, 1),
      0,
      1,
    )
  }
}

function Disk({ accretionRef, count }: SystemProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const smooth = useRef(0.35)
  const intro = useIntro()

  const geometry = useMemo(() => {
    const { positions, rands, sizes } = buildDisk(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAccretion: { value: 0.35 },
      uIntro: { value: 0 },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((state) => {
    smooth.current += (accretionRef.current - smooth.current) * 0.08
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uAccretion.value = smooth.current
    matRef.current.uniforms.uIntro.value = intro(state.clock.elapsedTime)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={DISK_VERTEX}
        fragmentShader={DISK_FRAGMENT}
      />
    </points>
  )
}

function Jets({ accretionRef, count }: SystemProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const smooth = useRef(0.35)
  const intro = useIntro()

  const geometry = useMemo(() => {
    const { dirs, phases, rands, sizes } = buildJets(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAccretion: { value: 0.35 },
      uIntro: { value: 0 },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((state) => {
    smooth.current += (accretionRef.current - smooth.current) * 0.08
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uAccretion.value = smooth.current
    matRef.current.uniforms.uIntro.value = intro(state.clock.elapsedTime)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={JET_VERTEX}
        fragmentShader={JET_FRAGMENT}
      />
    </points>
  )
}

function Envelope({ count }: { count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const intro = useIntro()

  const geometry = useMemo(() => {
    const { positions, lands, phases, sizes } = buildEnvelope(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aLand', new THREE.BufferAttribute(lands, 3))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((state) => {
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uIntro.value = intro(state.clock.elapsedTime)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={ENVELOPE_VERTEX}
        fragmentShader={ENVELOPE_FRAGMENT}
      />
    </points>
  )
}

function CoreStar({ accretionRef }: { accretionRef: RefObject<number> }) {
  const star = useRef<THREE.Mesh>(null!)
  const s1 = useRef<THREE.Sprite>(null!)
  const s2 = useRef<THREE.Sprite>(null!)
  const glow = useTexture('/textures/glow.png')
  const smooth = useRef(0.35)
  const tmp = useMemo(() => new THREE.Color(), [])
  const intro = useIntro()

  useFrame((state) => {
    smooth.current += (accretionRef.current - smooth.current) * 0.08
    const a = smooth.current
    const t = state.clock.elapsedTime
    const introV = intro(t)
    // 原恒星光度天然不稳：双正弦叠加伪随机闪烁，吸积越猛闪得越凶
    const flicker =
      1 + (Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.7 + 1.7) * 0.5) * (0.04 + a * 0.1)
    const pulse = 1 + 0.025 * Math.sin(t * 7.3) * (0.5 + a)
    star.current.scale.set(pulse, 0.9 * pulse, pulse)
    tmp.setRGB(1.0, 0.42, 0.18).multiplyScalar(0.7 + a * 0.55 + (flicker - 1) * 0.8)
    ;(star.current.material as THREE.MeshBasicMaterial).color.copy(tmp)
    s1.current.material.opacity = (0.35 + a * 0.45) * flicker * introV
    s1.current.scale.setScalar(14 + a * 10)
    s2.current.material.opacity = (0.1 + a * 0.16) * introV
    s2.current.scale.setScalar(30 + a * 22)
  })

  return (
    <>
      <mesh ref={star} scale={[1, 0.9, 1]}>
        <sphereGeometry args={[3, 48, 48]} />
        <meshBasicMaterial color="#ff6b35" toneMapped={false} />
      </mesh>
      <sprite ref={s1}>
        <spriteMaterial
          map={glow}
          color="#ff7a3c"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={s2}>
        <spriteMaterial
          map={glow}
          color="#c96a8a"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </>
  )
}

/** 开场：相机从远处推近，期间禁用轨道控制 */
function IntroRig() {
  const start = useMemo(() => new THREE.Vector3(0, 64, 175), [])
  const end = useMemo(() => new THREE.Vector3(0, 26, 85), [])
  const done = useRef(false)

  useFrame((state) => {
    if (done.current) return
    const t = Math.min(state.clock.elapsedTime / INTRO_SECONDS, 1)
    const e = 1 - Math.pow(1 - t, 3)
    state.camera.position.lerpVectors(start, end, e)
    state.camera.lookAt(0, 0, 0)
    const controls = state.controls as { enabled: boolean } | null
    if (controls) controls.enabled = t >= 1
    if (t >= 1) done.current = true
  })
  return null
}

export default function ProtostarScene({
  accretionRef,
  selected,
  onSelect,
  counts,
}: {
  accretionRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
  counts: { disk: number; jets: number; envelope: number }
}) {
  return (
    <>
      <color attach="background" args={['#020204']} />
      <Stars radius={300} depth={140} count={5000} factor={4} saturation={0} fade speed={0.3} />
      <CoreStar accretionRef={accretionRef} />
      <Disk accretionRef={accretionRef} count={counts.disk} />
      <Jets accretionRef={accretionRef} count={counts.jets} />
      <Envelope count={counts.envelope} />
      <IntroRig />
      {PROTO_HOTSPOTS.map((h) => (
        <Html key={h.id} position={h.pos} center zIndexRange={[5, 0]}>
          <button
            className={`planet-label${selected === h.id ? ' planet-label--active' : ''}`}
            onClick={() => onSelect(selected === h.id ? null : h.id)}
          >
            {h.label}
          </button>
        </Html>
      ))}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.8}
        minDistance={18}
        maxDistance={220}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  )
}
