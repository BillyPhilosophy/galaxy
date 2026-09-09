import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { MS_HOTSPOTS, starFromMass } from './mainSequenceData'
import type { MainSeqStar } from './mainSequenceData'

/** 场景半径基数：1 R☉ = 6 场景单位 */
const R_BASE = 6
/** 宜居带显示：1 AU ≈ 60 场景单位，光度超过 40 L☉ 后截断（否则环会远到看不见） */
const AU_SCENE = 60
const HZ_L_CAP = 40

const STAR_VERTEX = /* glsl */ `
varying vec3 vObjPos;
varying vec3 vNormalV;
varying vec3 vViewV;

void main() {
  vObjPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalMatrix * normal;
  vViewV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

const STAR_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uSpots;
varying vec3 vObjPos;
varying vec3 vNormalV;
varying vec3 vViewV;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.13;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 p = normalize(vObjPos);
  // 米粒组织：缓慢流动的对流胞
  float g = fbm(p * 7.0 + vec3(0.0, uTime * 0.04, 0.0));
  float granule = 0.8 + 0.4 * g;
  // 黑子：第二层噪声阈值化，冷星多热星少
  float sn = fbm(p * 2.6 + vec3(7.31));
  float spot = smoothstep(0.74 - uSpots * 0.18, 0.92, sn) * uSpots;
  vec3 col = uColor * granule * (1.0 - spot * 0.7);
  // 临边昏暗
  float limb = pow(max(dot(normalize(vNormalV), normalize(vViewV)), 0.0), 0.6);
  col *= 0.3 + 0.7 * limb;
  gl_FragColor = vec4(col, 1.0);
}
`

const WIND_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform float uRadius;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aPhase;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  float speed = mix(0.05, 0.16, uWind);
  float t = fract(aPhase + uTime * speed);
  vec3 pos = aDir * (uRadius * 1.05 + t * uRadius * 3.5);
  pos += vec3(sin(aRand * 40.0), sin(aRand * 31.0), sin(aRand * 27.0)) * uRadius * 0.05;
  vAlpha = smoothstep(0.0, 0.1, t) * (1.0 - t) * mix(0.12, 0.45, uWind) * mix(0.5, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (140.0 / -mv.z) * (uRadius / 6.0);
}
`

const WIND_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.5), a);
}
`

const PROM_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uRadius;
uniform float uProm;
uniform float uPixelRatio;
attribute vec3 aF1;
attribute vec3 aApex;
attribute vec3 aF2;
attribute float aPhase;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  float t = fract(aPhase + uTime * 0.12);
  // 二次贝塞尔：一足升起 → 拱顶 → 另一足落下
  vec3 p = mix(mix(aF1, aApex, t), mix(aApex, aF2, t), t);
  vec3 pos = p * uRadius;
  vAlpha = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t)) * uProm * mix(0.5, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (130.0 / -mv.z) * (uRadius / 6.0);
}
`

const PROM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.3, 0.12), 0.6), a);
}
`

function buildWind(count: number) {
  const dirs = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    dirs.set([Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)], i * 3)
    phases[i] = Math.random()
    rands[i] = Math.random()
    sizes[i] = 0.5 + Math.random() * 0.9
  }
  return { dirs, phases, rands, sizes }
}

function buildProminences(arcCount: number, perArc: number) {
  const count = arcCount * perArc
  const f1 = new Float32Array(count * 3)
  const apex = new Float32Array(count * 3)
  const f2 = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const axis = new THREE.Vector3()
  for (let a = 0; a < arcCount; a++) {
    // 每个拱：两个相邻足点 + 抬高的拱顶（单位球空间，渲染时乘半径）
    v1.randomDirection()
    axis.randomDirection()
    v2.copy(v1).applyAxisAngle(axis, 0.35 + Math.random() * 0.25)
    const apexV = v1.clone().add(v2).normalize().multiplyScalar(1.3 + Math.random() * 0.25)
    for (let i = 0; i < perArc; i++) {
      const idx = a * perArc + i
      f1.set([v1.x, v1.y, v1.z], idx * 3)
      f2.set([v2.x, v2.y, v2.z], idx * 3)
      apex.set([apexV.x, apexV.y, apexV.z], idx * 3)
      phases[idx] = Math.random()
      rands[idx] = Math.random()
      sizes[idx] = 0.6 + Math.random() * 0.9
    }
  }
  return { f1, apex, f2, phases, rands, sizes }
}

/** 黑子数量：冷星多，6500 K 以上几乎没有 */
function spotAmount(temp: number) {
  return THREE.MathUtils.clamp((6500 - temp) / 4000, 0, 1)
}
/** 日珥强度：红矮星狂暴，热星安静 */
function promAmount(temp: number) {
  return THREE.MathUtils.clamp(1.3 - temp / 8000, 0.25, 1)
}
/** 恒星风强度：越热越猛 */
function windAmount(temp: number) {
  return THREE.MathUtils.clamp(0.15 + (temp - 2500) / 12000, 0.15, 1)
}

function StarSurface({ starRef }: { starRef: RefObject<MainSeqStar> }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const smoothColor = useRef(starFromMass(1).color.clone())
  const smooth = useRef({ radius: 6, spots: spotAmount(5778) })

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#ffb85e') },
      uTime: { value: 0 },
      uSpots: { value: 0.18 },
    }),
    [],
  )

  useFrame((state, delta) => {
    const s = starRef.current
    smoothColor.current.lerp(s.color, 0.07)
    smooth.current.radius = THREE.MathUtils.lerp(smooth.current.radius, s.radius * R_BASE, 0.07)
    smooth.current.spots = THREE.MathUtils.lerp(smooth.current.spots, spotAmount(s.temp), 0.07)
    matRef.current.uniforms.uColor.value.copy(smoothColor.current)
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uSpots.value = smooth.current.spots
    meshRef.current.rotation.y += delta * 0.05
    meshRef.current.scale.setScalar(smooth.current.radius)
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={STAR_VERTEX}
        fragmentShader={STAR_FRAGMENT}
        toneMapped={false}
      />
    </mesh>
  )
}

function Corona({ starRef }: { starRef: RefObject<MainSeqStar> }) {
  const s1 = useRef<THREE.Sprite>(null!)
  const s2 = useRef<THREE.Sprite>(null!)
  const glow = useTexture('/textures/glow.png')
  const smoothColor = useRef(starFromMass(1).color.clone())
  const smoothR = useRef(6)

  useFrame((state) => {
    const s = starRef.current
    smoothColor.current.lerp(s.color, 0.07)
    smoothR.current = THREE.MathUtils.lerp(smoothR.current, s.radius * R_BASE, 0.07)
    const flicker = 1 + Math.sin(state.clock.elapsedTime * 3.1) * 0.04
    s1.current.material.color.copy(smoothColor.current)
    s1.current.material.opacity = 0.5 * flicker
    s1.current.scale.setScalar(smoothR.current * 3.4 * flicker)
    s2.current.material.color.copy(smoothColor.current)
    s2.current.material.opacity = 0.14
    s2.current.scale.setScalar(smoothR.current * 6.5)
  })

  return (
    <>
      <sprite ref={s1}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={s2}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </>
  )
}

function StellarWind({ starRef, count }: { starRef: RefObject<MainSeqStar>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const smooth = useRef({ radius: 6, wind: windAmount(5778) })
  const smoothColor = useRef(starFromMass(1).color.clone())

  const geometry = useMemo(() => {
    const { dirs, phases, rands, sizes } = buildWind(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 0.3 },
      uRadius: { value: 6 },
      uColor: { value: new THREE.Color('#ffd9a0') },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((state) => {
    const s = starRef.current
    smooth.current.radius = THREE.MathUtils.lerp(smooth.current.radius, s.radius * R_BASE, 0.07)
    smooth.current.wind = THREE.MathUtils.lerp(smooth.current.wind, windAmount(s.temp), 0.07)
    smoothColor.current.lerp(s.color, 0.07)
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uWind.value = smooth.current.wind
    matRef.current.uniforms.uRadius.value = smooth.current.radius
    matRef.current.uniforms.uColor.value.copy(smoothColor.current)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={WIND_VERTEX}
        fragmentShader={WIND_FRAGMENT}
      />
    </points>
  )
}

function Prominences({ starRef, arcs, perArc }: { starRef: RefObject<MainSeqStar>; arcs: number; perArc: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const smooth = useRef({ radius: 6, prom: promAmount(5778) })
  const smoothColor = useRef(starFromMass(1).color.clone())
  const count = arcs * perArc

  const geometry = useMemo(() => {
    const { f1, apex, f2, phases, rands, sizes } = buildProminences(arcs, perArc)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aF1', new THREE.BufferAttribute(f1, 3))
    g.setAttribute('aApex', new THREE.BufferAttribute(apex, 3))
    g.setAttribute('aF2', new THREE.BufferAttribute(f2, 3))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [arcs, perArc, count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRadius: { value: 6 },
      uProm: { value: 0.6 },
      uColor: { value: new THREE.Color('#ff8a5c') },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((state) => {
    const s = starRef.current
    smooth.current.radius = THREE.MathUtils.lerp(smooth.current.radius, s.radius * R_BASE, 0.07)
    smooth.current.prom = THREE.MathUtils.lerp(smooth.current.prom, promAmount(s.temp), 0.07)
    smoothColor.current.lerp(s.color, 0.07)
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uRadius.value = smooth.current.radius
    matRef.current.uniforms.uProm.value = smooth.current.prom
    matRef.current.uniforms.uColor.value.copy(smoothColor.current)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={PROM_VERTEX}
        fragmentShader={PROM_FRAGMENT}
      />
    </points>
  )
}

function HabitableZone({ starRef, visible }: { starRef: RefObject<MainSeqStar>; visible: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null!)
  const earthRef = useRef<THREE.Group>(null!)
  const glow = useTexture('/textures/glow.png')

  useFrame((state) => {
    const L = Math.min(starRef.current.luminosity, HZ_L_CAP)
    const hzOut = AU_SCENE * Math.sqrt(L)
    ringRef.current.scale.setScalar(hzOut)
    const hzMid = hzOut * 1.31
    const a = state.clock.elapsedTime * 0.12
    earthRef.current.position.set(Math.cos(a) * hzMid, 0, Math.sin(a) * hzMid)
  })

  return (
    <group visible={visible}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.56, 1, 96]} />
        <meshBasicMaterial
          color="#4ddb8a"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color="#4d8fd1" toneMapped={false} />
        </mesh>
        <sprite scale={[3.2, 3.2, 1]}>
          <spriteMaterial
            map={glow}
            color="#4d8fd1"
            transparent
            opacity={0.4}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
    </group>
  )
}

/** 相机随恒星半径等比缩放取景 */
function FitRig({ starRef }: { starRef: RefObject<MainSeqStar> }) {
  const lastR = useRef(6)

  useFrame((state) => {
    const targetR = starRef.current.radius * R_BASE
    if (Math.abs(targetR - lastR.current) / lastR.current > 0.005) {
      const factor = THREE.MathUtils.lerp(1, targetR / lastR.current, 0.1)
      state.camera.position.multiplyScalar(factor)
      lastR.current *= factor
    }
    const controls = state.controls as { minDistance: number; maxDistance: number } | null
    if (controls) {
      controls.minDistance = targetR * 1.7
      controls.maxDistance = targetR * 10 + 160
    }
  })
  return null
}

export default function MainSequenceScene({
  starRef,
  star,
  hzOn,
  selected,
  onSelect,
  counts,
}: {
  starRef: RefObject<MainSeqStar>
  star: MainSeqStar
  hzOn: boolean
  selected: string | null
  onSelect: (id: string | null) => void
  counts: { wind: number; promArcs: number; promPerArc: number }
}) {
  return (
    <>
      <color attach="background" args={['#020204']} />
      <Stars radius={400} depth={200} count={5000} factor={4} saturation={0} fade speed={0.3} />
      <StarSurface starRef={starRef} />
      <Corona starRef={starRef} />
      <StellarWind starRef={starRef} count={counts.wind} />
      <Prominences starRef={starRef} arcs={counts.promArcs} perArc={counts.promPerArc} />
      <HabitableZone starRef={starRef} visible={hzOn} />
      <FitRig starRef={starRef} />
      {MS_HOTSPOTS.map((h) => {
        const r = star.radius * R_BASE
        return (
          <Html key={h.id} position={[h.dir[0] * r, h.dir[1] * r, h.dir[2] * r]} center zIndexRange={[5, 0]}>
            <button
              className={`planet-label${selected === h.id ? ' planet-label--active' : ''}`}
              onClick={() => onSelect(selected === h.id ? null : h.id)}
            >
              {h.label}
            </button>
          </Html>
        )
      })}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.8}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </>
  )
}
