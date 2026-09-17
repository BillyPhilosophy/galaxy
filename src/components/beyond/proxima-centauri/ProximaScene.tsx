import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { ORBIT_OMEGA, ORBIT_R, PLANET_R, PROXIMA_HOTSPOTS, STAR_R } from './data'
import type { ProximaHotspot } from './data'

export interface ProximaStats {
  flare: number
}

const PLANET_VERTEX = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vLocal;
void main() {
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * 永昼永夜行星：昼面焦土 → 晨昏带绿环 → 夜面冰封。
 * 世界空间向阳度分区；uAtmos 把热量送往夜面（绿带变宽、冰层退缩）；
 * uFlare 让昼面过曝发白。带边界用局部噪声打碎。
 */
const PLANET_FRAGMENT = /* glsl */ `
uniform vec3 uStarDir;
uniform float uAtmos;
uniform float uFlare;
uniform float uTime;
varying vec3 vNormalW;
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
  float sunK = dot(normalize(vNormalW), uStarDir);
  // 带边界抖动，不生硬
  float s = sunK + (vnoise(vLocal * 2.2) - 0.5) * 0.14;
  // 大气均热：有效向阳度整体向夜面推移
  float eff = s + uAtmos * 0.38 - 0.05;

  // 反照率（被红矮星红光染色前的固有色）
  vec3 dayA = mix(vec3(0.55, 0.30, 0.15), vec3(0.70, 0.45, 0.22), vnoise(vLocal * 4.0));
  vec3 termA = mix(vec3(0.22, 0.48, 0.28), vec3(0.17, 0.42, 0.38), vnoise(vLocal * 5.0 + 3.0));
  vec3 nightA = mix(vec3(0.35, 0.50, 0.65), vec3(0.70, 0.80, 0.88), vnoise(vLocal * 4.5 + 7.0));

  vec3 alb = nightA;
  alb = mix(alb, termA, smoothstep(-0.22, -0.02, eff));
  alb = mix(alb, dayA, smoothstep(0.12, 0.4, eff));

  // 光照：红矮星的红橙色光 + 向阳点衰减；夜面只剩微弱蓝黑环境光
  float direct = pow(clamp(sunK, 0.0, 1.0), 0.85);
  vec3 starlight = vec3(1.0, 0.62, 0.45);
  float band = smoothstep(-0.22, -0.02, eff) * (1.0 - smoothstep(0.12, 0.4, eff));
  vec3 lightCol = starlight * (direct * 1.25)
    + vec3(0.10, 0.14, 0.22) * (0.35 + uAtmos * 0.4)
    + vec3(0.45, 0.28, 0.18) * band * 0.5; // 晨昏带的"永恒黄昏"暖光
  vec3 col = alb * lightCol;

  // 晨昏带的呼吸微光：生命环
  col += termA * band * 0.20 * (0.5 + 0.5 * sin(uTime * 1.7));

  // 耀斑：昼面过曝
  col = mix(col, vec3(1.0, 0.96, 0.9), uFlare * clamp(sunK, 0.0, 1.0) * 0.7);
  col *= 1.0 + uFlare * 0.3;

  gl_FragColor = vec4(col, 1.0);
}
`

function HotspotLabel({
  h,
  selected,
  onSelect,
  offset,
}: {
  h: ProximaHotspot
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

/** 每帧跟随行星公转位置的容器（热点标签放里面） */
function FollowPlanet({
  thetaRef,
  children,
}: {
  thetaRef: RefObject<number>
  children: ReactNode
}) {
  const g = useRef<THREE.Group>(null!)
  useFrame(() => {
    const t = thetaRef.current ?? 0
    g.current.position.set(Math.cos(t) * ORBIT_R, 0, Math.sin(t) * ORBIT_R)
  })
  return <group ref={g}>{children}</group>
}

function OrbitRing({ r }: { r: number }) {
  const ring = useMemo(() => {
    const N = 128
    const pos = new Float32Array((N + 1) * 3)
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2
      pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const m = new THREE.LineBasicMaterial({ color: '#5a4a6f', transparent: true, opacity: 0.45, depthWrite: false })
    const line = new THREE.Line(g, m)
    line.frustumCulled = false
    return line
  }, [r])
  useEffect(
    () => () => {
      ring.geometry.dispose()
      ;(ring.material as THREE.Material).dispose()
    },
    [ring],
  )
  return <primitive object={ring} />
}

const STAR_BASE = new THREE.Color('#8a2a1a')
const STAR_FLARE = new THREE.Color('#ffd9c0')

export default function ProximaScene({
  atmosRef,
  flareRef,
  statsRef,
  selected,
  onSelect,
  isMobile,
}: {
  atmosRef: RefObject<number>
  flareRef: RefObject<number>
  statsRef: RefObject<ProximaStats>
  selected: string | null
  onSelect: (id: string | null) => void
  isMobile: boolean
}) {
  const glow = useTexture('/textures/glow.png')
  const star = useRef<THREE.Mesh>(null!)
  const starMat = useRef<THREE.MeshBasicMaterial>(null!)
  const halo1 = useRef<THREE.Sprite>(null!)
  const flareSprite = useRef<THREE.Sprite>(null!)
  const carriage = useRef<THREE.Group>(null!)
  const planetMat = useRef<THREE.ShaderMaterial>(null!)
  const theta = useRef(0)
  const amp = useRef(0)

  const planetUniforms = useMemo(
    () => ({
      uStarDir: { value: new THREE.Vector3(-1, 0, 0) },
      uAtmos: { value: 0 },
      uFlare: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  )

  useFrame((state, dt) => {
    const cdt = Math.min(dt, 0.1)
    const t = state.clock.elapsedTime
    // 耀斑：目标强度由外部（按钮/自动）设置，这里快攻慢衰
    const target = flareRef.current ?? 0
    flareRef.current = Math.max(0, target - cdt * 0.55)
    amp.current += (target - amp.current) * Math.min(1, 7 * cdt)
    const f = amp.current
    statsRef.current.flare = f

    // 公转（车厢反向旋转，与行星位置 (cosθ, 0, sinθ)·R 的绕向一致；
    // 行星自转常量 π 叠加 = 同一面永朝恒星，潮汐锁定）
    theta.current += cdt * ORBIT_OMEGA
    const th = theta.current
    carriage.current.rotation.y = -th

    // 恒星：暗红 + 沸腾；耀斑时闪白
    const boil = 1 + 0.025 * (Math.sin(t * 5.1) * 0.5 + Math.sin(t * 8.7 + 1.3) * 0.5)
    star.current.scale.setScalar(boil * (1 + f * 0.35))
    starMat.current.color.copy(STAR_BASE).lerp(STAR_FLARE, f * 0.75)
    halo1.current.scale.setScalar(9 * (1 + f * 1.2))
    ;(halo1.current.material as THREE.SpriteMaterial).opacity = 0.4 + f * 0.4
    flareSprite.current.scale.setScalar(4 + f * 34)
    ;(flareSprite.current.material as THREE.SpriteMaterial).opacity = f * 0.85

    // 行星 shader
    const u = planetMat.current.uniforms
    u.uTime.value = t
    u.uAtmos.value = atmosRef.current ?? 0
    u.uFlare.value = f
    // 恒星相对行星的方向（恒星在原点）
    u.uStarDir.value.set(-Math.cos(th), 0, -Math.sin(th))
  })

  const starH = PROXIMA_HOTSPOTS.find((h) => h.id === 'star')!
  const planetH = PROXIMA_HOTSPOTS.find((h) => h.id === 'planet')!
  const termH = PROXIMA_HOTSPOTS.find((h) => h.id === 'terminator')!
  const flareH = PROXIMA_HOTSPOTS.find((h) => h.id === 'flare')!

  return (
    <>
      <color attach="background" args={['#050308']} />
      <Stars radius={220} depth={120} count={isMobile ? 2200 : 4500} factor={4} saturation={0} fade speed={0.3} />
      {/* 红矮星 */}
      <mesh ref={star}>
        <sphereGeometry args={[STAR_R, 48, 48]} />
        <meshBasicMaterial ref={starMat} color="#8a2a1a" toneMapped={false} />
      </mesh>
      <sprite ref={halo1}>
        <spriteMaterial
          map={glow}
          color="#c2410c"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={flareSprite} scale={[4, 4, 1]}>
        <spriteMaterial
          map={glow}
          color="#fff3e0"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <OrbitRing r={ORBIT_R} />
      {/* 行星：车厢公转 + 自转常量 π = 同一面永朝恒星 */}
      <group ref={carriage}>
        <group position={[ORBIT_R, 0, 0]}>
          <mesh rotation={[0, Math.PI, 0]}>
            <sphereGeometry args={[PLANET_R, 64, 64]} />
            <shaderMaterial
              ref={planetMat}
              uniforms={planetUniforms}
              vertexShader={PLANET_VERTEX}
              fragmentShader={PLANET_FRAGMENT}
            />
          </mesh>
          {/* 纪念陨石坑：永远朝向恒星——潮汐锁定的可视化锚点 */}
          <mesh position={[PLANET_R * 0.94, 0.35, 0]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshBasicMaterial color="#4a3220" toneMapped={false} />
          </mesh>
        </group>
      </group>
      <HotspotLabel h={starH} selected={selected} onSelect={onSelect} />
      <HotspotLabel h={flareH} selected={selected} onSelect={onSelect} />
      <FollowPlanet thetaRef={theta}>
        <HotspotLabel h={planetH} selected={selected} onSelect={onSelect} />
        <HotspotLabel h={termH} selected={selected} onSelect={onSelect} />
      </FollowPlanet>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.8}
        minDistance={8}
        maxDistance={42}
        autoRotate
        autoRotateSpeed={0.25}
      />
    </>
  )
}
