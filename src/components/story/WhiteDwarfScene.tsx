import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { nebulaAt, wdColorAt, wdTempAt, WD_HOTSPOTS } from './whiteDwarfData'
import type { SnMode } from './whiteDwarfData'

const NEBULA_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uDisperse;
uniform float uIonize;
uniform float uPixelRatio;
attribute float aRand;
attribute float aSize;
attribute float aTint;
varying float vAlpha;
varying float vTint;

void main() {
  // 星云缓慢旋转并整体膨胀，消散时进一步淡出
  float ang = uTime * 0.03;
  float cs = cos(ang);
  float sn = sin(ang);
  vec3 pos = position;
  pos.xz = mat2(cs, -sn, sn, cs) * pos.xz;
  pos *= 1.0 + uDisperse * 0.9 + sin(uTime * 0.1 + aRand * 6.2831) * 0.15;

  vTint = aTint;
  vAlpha = (1.0 - uDisperse) * (0.2 + 0.8 * uIonize) * 0.5 * mix(0.6, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (130.0 / -mv.z);
}
`

const NEBULA_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying float vTint;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  // 内层电离氧青绿 → 外层氢 α 粉红
  vec3 teal = vec3(0.30, 0.86, 0.78);
  vec3 pink = vec3(1.0, 0.36, 0.46);
  gl_FragColor = vec4(mix(teal, pink, vTint), a);
}
`

const STREAM_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uFeed;
uniform float uPixelRatio;
attribute float aPhase;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  // 伴星 → 白矮星的吸积流，绕轴线螺旋下落
  float t = fract(aPhase + uTime * 0.45);
  vec3 start = vec3(14.0, 2.0, 0.0);
  vec3 pos = mix(start, vec3(0.0), t);
  float wob = (1.0 - t) * 1.3;
  pos.x += sin(aRand * 6.2831 + t * 12.0) * wob;
  pos.y += cos(aRand * 6.2831 + t * 12.0) * wob * 0.6;
  pos.z += sin(aRand * 4.0 + t * 12.0) * wob;
  vAlpha = sin(3.14159 * t) * 0.85 * uFeed * mix(0.5, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (120.0 / -mv.z);
}
`

const STREAM_FRAGMENT = /* glsl */ `
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(1.0, 0.75, 0.45), a);
}
`

const BLAST_VERTEX = /* glsl */ `
uniform float uBlast;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aRand;
attribute float aSize;
varying float vAlpha;
varying float vT;

void main() {
  vec3 pos = aDir * (2.0 + uBlast * (60.0 + aRand * 70.0));
  vT = uBlast;
  // 冲击波亮度随膨胀衰减，但保留微弱残骸
  vAlpha = max(0.75 / (1.0 + uBlast * 9.0), 0.04) * mix(0.5, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (200.0 / -mv.z) * (1.0 + uBlast * 2.0);
}
`

const BLAST_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying float vT;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.04, d) * vAlpha;
  if (a < 0.004) discard;
  vec3 col = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.55, 0.25), min(vT * 1.4, 1.0));
  gl_FragColor = vec4(col, a);
}
`

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 1.6
}

function buildNebula(count: number) {
  const positions = new Float32Array(count * 3)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  const tints = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const kind = Math.random()
    let x = 0
    let y = 0
    let z = 0
    let tint = 1
    if (kind < 0.6) {
      // 环状主结构（指环星云式）：内缘青绿、外缘粉红
      const a = Math.random() * Math.PI * 2
      const tube = gauss() * 1.6
      const r = 15 + tube
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = gauss() * 1.4
      tint = THREE.MathUtils.clamp((r - 13) / 5, 0, 1)
    } else if (kind < 0.85) {
      // 内层球壳：青绿为主
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r = 7 + Math.random() * 7
      x = r * Math.sin(ph) * Math.cos(th)
      y = r * Math.cos(ph) * 0.75
      z = r * Math.sin(ph) * Math.sin(th)
      tint = Math.random() * 0.4
    } else {
      // 外围光晕：粉红
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r = 18 + Math.random() * 9
      x = r * Math.sin(ph) * Math.cos(th)
      y = r * Math.cos(ph) * 0.8
      z = r * Math.sin(ph) * Math.sin(th)
      tint = 0.7 + Math.random() * 0.3
    }
    positions.set([x, y, z], i * 3)
    rands[i] = Math.random()
    sizes[i] = Math.random() < 0.04 ? 6 + Math.random() * 7 : 0.5 + Math.random() * 1.4
    tints[i] = tint
  }
  return { positions, rands, sizes, tints }
}

function buildDirs(count: number) {
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
    sizes[i] = 0.6 + Math.random() * 1.2
  }
  return { dirs, phases, rands, sizes }
}

const COMPANION_POS = new THREE.Vector3(14, 2, 0)

function PlanetaryNebula({ timeRef, count }: { timeRef: RefObject<number>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const smoothT = useRef(0)

  const geometry = useMemo(() => {
    const { positions, rands, sizes, tints } = buildNebula(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aTint', new THREE.BufferAttribute(tints, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDisperse: { value: 0 },
      uIonize: { value: 1 },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((state) => {
    smoothT.current += (timeRef.current - smoothT.current) * 0.07
    const t = smoothT.current
    const temp = wdTempAt(t)
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uDisperse.value = 1 - nebulaAt(t)
    // 中心星冷却后星云失去电离源而变暗
    matRef.current.uniforms.uIonize.value = THREE.MathUtils.clamp((temp - 3000) / 9000, 0, 1)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={NEBULA_VERTEX}
        fragmentShader={NEBULA_FRAGMENT}
      />
    </points>
  )
}

function DwarfStar({ timeRef, snModeRef }: { timeRef: RefObject<number>; snModeRef: RefObject<SnMode> }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const s1 = useRef<THREE.Sprite>(null!)
  const s2 = useRef<THREE.Sprite>(null!)
  const glow = useTexture('/textures/glow.png')
  const smoothT = useRef(0)
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame((state) => {
    smoothT.current += (timeRef.current - smoothT.current) * 0.07
    const t = smoothT.current
    const temp = wdTempAt(t)
    const hidden = snModeRef.current === 'blast' || snModeRef.current === 'aftermath'
    meshRef.current.visible = !hidden
    s1.current.visible = !hidden
    s2.current.visible = !hidden
    if (hidden) return
    wdColorAt(t, tmp)
    // 吸积喂食时亮度被推高
    const feedBoost = snModeRef.current === 'feed' ? 1.6 : 1
    ;(meshRef.current.material as THREE.MeshBasicMaterial).color.copy(tmp).multiplyScalar(feedBoost)
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 5.1) * 0.02
    meshRef.current.scale.setScalar(pulse)
    const glowOp = 0.85 * Math.pow(Math.min(temp / 1e5, 1), 0.5)
    s1.current.material.color.copy(tmp)
    s1.current.material.opacity = glowOp * feedBoost
    s1.current.scale.setScalar((6 + (temp / 1e5) * 6) * feedBoost)
    s2.current.material.color.copy(tmp)
    s2.current.material.opacity = glowOp * 0.3
    s2.current.scale.setScalar(14 + (temp / 1e5) * 10)
  })

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, 48, 48]} />
        <meshBasicMaterial color="#cfe0ff" toneMapped={false} />
      </mesh>
      <sprite ref={s1}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={s2}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </>
  )
}

function Companion({ snModeRef }: { snModeRef: RefObject<SnMode> }) {
  const group = useRef<THREE.Group>(null!)
  const glow = useTexture('/textures/glow.png')

  useFrame((state) => {
    const mode = snModeRef.current
    group.current.visible = mode === 'feed'
    if (mode === 'feed') {
      group.current.position.y = COMPANION_POS.y + Math.sin(state.clock.elapsedTime * 2.2) * 0.3
    }
  })

  return (
    <group ref={group} position={[COMPANION_POS.x, COMPANION_POS.y, COMPANION_POS.z]} visible={false}>
      <mesh>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color="#ff9a3c" toneMapped={false} />
      </mesh>
      <sprite scale={[10, 10, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff9a3c"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function FeedStream({ snModeRef, count }: { snModeRef: RefObject<SnMode>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const pointsRef = useRef<THREE.Points>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const feedP = useRef(0)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const { phases, rands, sizes } = buildDirs(count)
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFeed: { value: 0 },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((state, delta) => {
    const mode = snModeRef.current
    pointsRef.current.visible = mode === 'feed'
    if (mode === 'feed') feedP.current = Math.min(1, feedP.current + delta / 6)
    else if (mode === 'cool') feedP.current = 0
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uFeed.value = feedP.current
  })

  return (
    <points ref={pointsRef} geometry={geometry} visible={false}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={STREAM_VERTEX}
        fragmentShader={STREAM_FRAGMENT}
      />
    </points>
  )
}

function Shockwave({ snModeRef, count }: { snModeRef: RefObject<SnMode>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const pointsRef = useRef<THREE.Points>(null!)
  const flashRef = useRef<THREE.Sprite>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const glow = useTexture('/textures/glow.png')
  const blast = useRef(0)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const { dirs, phases, rands, sizes } = buildDirs(count)
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
      uBlast: { value: 0 },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((_, delta) => {
    const mode = snModeRef.current
    const active = mode === 'blast' || mode === 'aftermath'
    pointsRef.current.visible = active
    flashRef.current.visible = active
    if (mode === 'blast') blast.current += delta / 8
    else if (mode === 'aftermath') blast.current += delta * 0.02
    else blast.current = 0
    matRef.current.uniforms.uBlast.value = blast.current
    flashRef.current.material.opacity = Math.max(0, 0.9 - blast.current * 1.2)
    flashRef.current.scale.setScalar(6 + blast.current * 150)
  })

  return (
    <>
      <points ref={pointsRef} geometry={geometry} visible={false}>
        <shaderMaterial
          ref={matRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={uniforms}
          vertexShader={BLAST_VERTEX}
          fragmentShader={BLAST_FRAGMENT}
        />
      </points>
      <sprite ref={flashRef} visible={false}>
        <spriteMaterial
          map={glow}
          color="#fff4e0"
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </>
  )
}

export default function WhiteDwarfScene({
  timeRef,
  snModeRef,
  snMode,
  selected,
  onSelect,
  counts,
}: {
  timeRef: RefObject<number>
  snModeRef: RefObject<SnMode>
  snMode: SnMode
  selected: string | null
  onSelect: (id: string | null) => void
  counts: { nebula: number; stream: number; blast: number }
}) {
  const showLabels = snMode === 'cool'
  return (
    <>
      <color attach="background" args={['#020204']} />
      <Stars radius={300} depth={150} count={5000} factor={4} saturation={0} fade speed={0.3} />
      {snMode !== 'blast' && snMode !== 'aftermath' && (
        <PlanetaryNebula timeRef={timeRef} count={counts.nebula} />
      )}
      <DwarfStar timeRef={timeRef} snModeRef={snModeRef} />
      <Companion snModeRef={snModeRef} />
      <FeedStream snModeRef={snModeRef} count={counts.stream} />
      <Shockwave snModeRef={snModeRef} count={counts.blast} />
      {showLabels &&
        WD_HOTSPOTS.map((h) => (
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
        minDistance={8}
        maxDistance={200}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </>
  )
}
