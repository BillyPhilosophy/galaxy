import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { eruptProgress, eruptionPulse, PISTOL_HOTSPOTS } from './data'

const SHELL_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uErupt;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aSpeed;
attribute float aRand;
attribute float aSize;
attribute float aShell;
attribute float aKind;
varying float vAlpha;
varying float vShell;
varying float vHot;
varying float vRim;

void main() {
  // 先猛后缓的膨胀剖面
  float ease = 1.0 - pow(1.0 - uErupt, 2.0);
  float rMax = mix(10.0, 16.0, aShell);
  // 极向略快，壳体微拉长
  float polar = 1.0 + 0.3 * abs(aDir.y);
  float r = rMax * ease * aSpeed * polar;
  // 介质墙：+X 一侧被星际介质拍扁——枪形是算出来的
  float wall = mix(7.5, 12.5, aShell) * (0.92 + uErupt * 0.08);
  float wallK = smoothstep(0.0, 0.35, aDir.x);
  // 贴近墙面的压缩气体被冲击增亮
  vHot = wallK * smoothstep(wall * 0.78, wall, r) * smoothstep(0.1, 0.5, uErupt);
  r = mix(r, min(r, wall), wallK);
  vec3 pos = aDir * r;
  // 枪形拉长
  pos.x *= 1.28;
  // 微湍流摆动，长出丝状纹理
  pos += vec3(
    sin(uTime * 0.5 + aRand * 6.2831 + aDir.y * 3.0),
    sin(uTime * 0.4 + aRand * 4.0 + aDir.z * 3.0),
    sin(uTime * 0.45 + aRand * 2.0 + aDir.x * 3.0)
  ) * (0.12 + uErupt * 0.35);

  vShell = aShell;
  vRim = smoothstep(0.93, 1.02, aSpeed);
  // 丝状团块最亮，亮缘环带次之，内部薄雾最淡；大云团降透明度
  float baseA = aKind < 0.5 ? 0.62 : (aKind < 1.5 ? 0.34 : 0.13);
  float puff = smoothstep(6.0, 10.0, aSize);
  vAlpha = baseA * (1.0 + vRim * 0.5 + vHot * 1.4) * (1.0 - puff * 0.7)
    * smoothstep(0.0, 0.04, uErupt) * mix(0.65, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (150.0 / -mv.z);
}
`

const SHELL_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying float vShell;
varying float vHot;
varying float vRim;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  // 内壳亮蓝白，外壳淡青；亮缘泛白，压缩侧被冲击染暖
  vec3 col = mix(vec3(0.62, 0.82, 1.0), vec3(0.42, 0.85, 0.78), vShell);
  col += vec3(0.22) * vRim;
  col = mix(col, vec3(1.0, 0.60, 0.48), vHot * 0.6);
  gl_FragColor = vec4(col, a);
}
`

const WIND_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aPhase;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  float t = fract(aPhase + uTime * 0.5 * uWind);
  vec3 pos = aDir * (2.6 + t * 32.0);
  vAlpha = (1.0 - t) * 0.2 * uWind * mix(0.4, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (130.0 / -mv.z);
}
`

const WIND_FRAGMENT = /* glsl */ `
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(0.7, 0.88, 1.0), a);
}
`

/** 丝状体：中心方向 + 紧密角散布，膨胀时团块整体外飞保持结构 */
interface Filament {
  dir: THREE.Vector3
  speed: number
  shell: number
}

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 1.6
}

function buildShells(count: number) {
  const FIL_PER_SHELL = 22
  const filaments: Filament[] = []
  const fv = new THREE.Vector3()
  for (let s = 0; s < 2; s++) {
    for (let f = 0; f < FIL_PER_SHELL; f++) {
      fv.randomDirection()
      if (Math.random() < 0.3) {
        fv.y *= 1.6
        fv.normalize()
      }
      filaments.push({ dir: fv.clone(), speed: 0.93 + Math.random() * 0.12, shell: s })
    }
  }

  const dirs = new Float32Array(count * 3)
  const speeds = new Float32Array(count)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  const shells = new Float32Array(count)
  const kinds = new Float32Array(count)
  const v = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    const kind = Math.random()
    if (kind < 0.62) {
      // 丝状团块
      const f = filaments[Math.floor(Math.random() * filaments.length)]
      v.copy(f.dir)
      v.x += gauss() * 0.055
      v.y += gauss() * 0.055
      v.z += gauss() * 0.055
      v.normalize()
      speeds[i] = f.speed + gauss() * 0.025
      shells[i] = f.shell
      kinds[i] = 0
      sizes[i] = 0.8 + Math.random() * 1.4
    } else if (kind < 0.9) {
      // 亮缘环带
      v.randomDirection()
      if (Math.random() < 0.3) {
        v.y *= 1.6
        v.normalize()
      }
      speeds[i] = 0.93 + Math.random() * 0.14
      shells[i] = Math.random() < 0.6 ? 0 : 1
      kinds[i] = 1
      sizes[i] = Math.random() < 0.07 ? 6 + Math.random() * 6 : 0.6 + Math.random() * 1.0
    } else {
      // 内部薄雾
      v.randomDirection()
      speeds[i] = 0.7 + Math.random() * 0.25
      shells[i] = Math.random() < 0.6 ? 0 : 1
      kinds[i] = 2
      sizes[i] = 0.5 + Math.random() * 0.8
    }
    dirs.set([v.x, v.y, v.z], i * 3)
    rands[i] = Math.random()
  }
  return { dirs, speeds, rands, sizes, shells, kinds }
}

function buildWind(count: number) {
  const dirs = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  const v = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    v.randomDirection()
    dirs.set([v.x, v.y, v.z], i * 3)
    phases[i] = Math.random()
    rands[i] = Math.random()
    sizes[i] = 0.5 + Math.random() * 0.9
  }
  return { dirs, phases, rands, sizes }
}

/** 五合星团的环境亮星 */
const CLUSTER_STARS: { pos: [number, number, number]; color: string; scale: number }[] = [
  { pos: [42, 20, -32], color: '#cfe4ff', scale: 8 },
  { pos: [-55, 8, -48], color: '#ffffff', scale: 6 },
  { pos: [-38, -22, 40], color: '#ffd9a0', scale: 7 },
  { pos: [60, -14, 22], color: '#9ecfff', scale: 5 },
  { pos: [24, 42, 48], color: '#ffffff', scale: 5 },
  { pos: [-64, 30, 10], color: '#ffb08a', scale: 6 },
]

function HyperGiant({ progressRef }: { progressRef: RefObject<number> }) {
  const star = useRef<THREE.Mesh>(null!)
  const s1 = useRef<THREE.Sprite>(null!)
  const s2 = useRef<THREE.Sprite>(null!)
  const s3 = useRef<THREE.Sprite>(null!)
  const glow = useTexture('/textures/glow.png')
  const smoothP = useRef(0)

  useFrame((state) => {
    smoothP.current += (progressRef.current - smoothP.current) * 0.08
    const p = smoothP.current
    const pulse = eruptionPulse(p)
    const t = state.clock.elapsedTime
    // LBV 表面永不平静：快速不规则呼吸
    const boil = 1 + 0.03 * (Math.sin(t * 9.1) * 0.5 + Math.sin(t * 14.7 + 1.3) * 0.5)
    star.current.scale.setScalar(boil * (1 + pulse * 0.2))
    s1.current.material.opacity = 0.55 + pulse * 0.45
    s1.current.scale.setScalar(9 * (1 + pulse * 1.6))
    s2.current.material.opacity = 0.14 + pulse * 0.22
    s2.current.scale.setScalar(22 + pulse * 34)
    // 腔内辉光：壳体形成后，内部被星光照亮的微弱蓝雾
    s3.current.material.opacity = 0.05 * eruptProgress(p) + pulse * 0.03
    s3.current.scale.setScalar(46)
  })

  return (
    <>
      <mesh ref={star}>
        <sphereGeometry args={[2, 48, 48]} />
        <meshBasicMaterial color="#cfe4ff" toneMapped={false} />
      </mesh>
      <sprite ref={s1}>
        <spriteMaterial
          map={glow}
          color="#9ecfff"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={s2}>
        <spriteMaterial
          map={glow}
          color="#8fb4ff"
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={s3}>
        <spriteMaterial
          map={glow}
          color="#6f9fff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </>
  )
}

function Shells({ progressRef, count }: { progressRef: RefObject<number>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const smoothP = useRef(0)

  const geometry = useMemo(() => {
    const { dirs, speeds, rands, sizes, shells, kinds } = buildShells(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aShell', new THREE.BufferAttribute(shells, 1))
    g.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uErupt: { value: 0 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  useFrame((state) => {
    smoothP.current += (progressRef.current - smoothP.current) * 0.08
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uErupt.value = eruptProgress(smoothP.current)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={SHELL_VERTEX}
        fragmentShader={SHELL_FRAGMENT}
      />
    </points>
  )
}

function StellarWind({ progressRef, count }: { progressRef: RefObject<number>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const smoothP = useRef(0)

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
    () => ({ uTime: { value: 0 }, uWind: { value: 1 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  useFrame((state) => {
    smoothP.current += (progressRef.current - smoothP.current) * 0.08
    const p = smoothP.current
    // 喷发时风力 ×3，壳体形成后星风持续
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uWind.value = 1 + 3 * eruptionPulse(p) + eruptProgress(p) * 0.4
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

function ClusterStars() {
  const glow = useTexture('/textures/glow.png')
  return (
    <>
      {CLUSTER_STARS.map((s, i) => (
        <sprite key={i} position={s.pos} scale={[s.scale, s.scale, 1]}>
          <spriteMaterial
            map={glow}
            color={s.color}
            transparent
            opacity={0.7}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </>
  )
}

export default function PistolScene({
  progressRef,
  selected,
  onSelect,
  counts,
}: {
  progressRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
  counts: { shells: number; wind: number }
}) {
  return (
    <>
      <color attach="background" args={['#020204']} />
      <Stars radius={260} depth={120} count={5000} factor={4} saturation={0} fade speed={0.3} />
      <HyperGiant progressRef={progressRef} />
      <Shells progressRef={progressRef} count={counts.shells} />
      <StellarWind progressRef={progressRef} count={counts.wind} />
      <ClusterStars />
      {PISTOL_HOTSPOTS.map((h) => (
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
        minDistance={12}
        maxDistance={160}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </>
  )
}
