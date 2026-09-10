import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { dilationAt, fallRadiusAt, BH_HOTSPOTS } from './blackHoleData'
import type { BhPhase } from './blackHoleData'

const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`

/** 全屏光线步进：引力弯折 + 吸积盘（多普勒增亮）+ 背景星空 */
function makeLensFragment(steps: number) {
  return /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uCamPos;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uFwd;
uniform float uTanFov;
uniform float uAspect;
uniform float uTime;
uniform float uFade;

#define RS 1.0
#define ISCO 3.0
#define DISK_OUT 9.0

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
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

vec3 skyColor(vec3 d) {
  vec3 col = vec3(0.010, 0.010, 0.018);
  // 银河带（倾斜平面）
  float band = exp(-pow(dot(d, normalize(vec3(0.15, 1.0, 0.25))), 2.0) * 6.0);
  col += vec3(0.10, 0.12, 0.20) * band * (0.35 + 0.65 * fbm(d * 6.0));
  // 两层星点
  for (int L = 0; L < 2; L++) {
    float sc = L == 0 ? 42.0 : 90.0;
    vec3 g = d * sc;
    vec3 id = floor(g);
    vec3 f = fract(g) - 0.5;
    float h = hash13(id);
    if (h > 0.985 - float(L) * 0.012) {
      float s = smoothstep(0.28, 0.02, length(f));
      col += mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.85, 0.7), hash13(id + 3.0)) * s * (0.4 + 0.6 * hash13(id + 7.0));
    }
  }
  return col;
}

vec4 diskSample(vec3 h, vec3 rd, float hr) {
  float t = (hr - ISCO) / (DISK_OUT - ISCO);
  float alpha = mix(0.85, 0.22, t);
  // 温度渐变：内缘白热 → 中部橙 → 外缘暗红
  vec3 c = mix(vec3(1.05, 0.95, 0.82), vec3(1.0, 0.5, 0.18), smoothstep(0.02, 0.4, t));
  c = mix(c, vec3(0.42, 0.10, 0.04), smoothstep(0.4, 1.0, t));
  // 湍流（角向随半径差速流动）
  float ang = atan(h.z, h.x);
  float turb = fbm(vec3(ang * 2.5 - uTime * (1.8 / hr), hr * 1.2, uTime * 0.1));
  c *= 0.55 + 0.9 * turb;
  // 多普勒增亮：朝我们转来的一侧更亮更蓝
  vec3 vel = vec3(-h.z, 0.0, h.x) / hr;
  float dop = dot(vel, -rd);
  c *= 1.0 + 0.75 * dop;
  c = mix(c, c.bgr * vec3(0.9, 1.0, 1.15), clamp(dop * 0.4, 0.0, 0.5));
  return vec4(c, alpha);
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  vec3 rd = normalize(uFwd + (uv.x * uAspect * uRight + uv.y * uUp) * uTanFov);
  vec3 p = uCamPos;
  // 角动量守恒的测地线近似：a = -1.5 h² p / r⁵
  vec3 h0 = cross(p, rd);
  float h2 = dot(h0, h0);
  vec3 col = vec3(0.0);
  float trans = 1.0;
  bool captured = false;
  for (int i = 0; i < ${steps}; i++) {
    float r2 = dot(p, p);
    float r = sqrt(r2);
    if (r < RS) {
      captured = true;
      break;
    }
    if (r > 260.0) break;
    float dt = clamp(r * 0.15, 0.05, 1.5);
    vec3 acc = -1.5 * h2 * p / (r2 * r2 * r);
    rd = normalize(rd + acc * dt);
    // 吸积盘平面 y=0 穿越检测
    float yNext = p.y + rd.y * dt;
    if (p.y * yNext < 0.0 && abs(rd.y) > 1e-4) {
      float tt = -p.y / rd.y;
      vec3 hp = p + rd * tt;
      float hr = length(hp.xz);
      if (hr > ISCO && hr < DISK_OUT) {
        vec4 s = diskSample(hp, rd, hr);
        col += trans * s.rgb * s.a * 1.35;
        trans *= 1.0 - s.a;
      }
    }
    p += rd * dt;
  }
  if (!captured) col += trans * skyColor(rd);
  gl_FragColor = vec4(col, uFade);
}
`
}

function LensQuad({ quality, fadeRef }: { quality: 'smooth' | 'hd'; fadeRef: RefObject<number> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(
    () => ({
      uCamPos: { value: new THREE.Vector3() },
      uRight: { value: new THREE.Vector3() },
      uUp: { value: new THREE.Vector3() },
      uFwd: { value: new THREE.Vector3() },
      uTanFov: { value: 0 },
      uAspect: { value: 1 },
      uTime: { value: 0 },
      uFade: { value: 0 },
    }),
    [],
  )

  const fragment = useMemo(() => makeLensFragment(quality === 'hd' ? 110 : 64), [quality])

  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera
    const m = cam.matrixWorld
    const u = matRef.current.uniforms
    u.uCamPos.value.copy(cam.position)
    u.uRight.value.setFromMatrixColumn(m, 0)
    u.uUp.value.setFromMatrixColumn(m, 1)
    u.uFwd.value.setFromMatrixColumn(m, 2).negate()
    u.uTanFov.value = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    u.uAspect.value = state.size.width / state.size.height
    u.uTime.value = state.clock.elapsedTime
    u.uFade.value = fadeRef.current
  })

  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={QUAD_VERTEX}
        fragmentShader={fragment}
        depthTest={false}
        depthWrite={false}
        transparent
      />
    </mesh>
  )
}

const BLAST_VERTEX = /* glsl */ `
uniform float uBlast;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  vec3 pos = aDir * (2.0 + uBlast * (70.0 + aRand * 60.0));
  vAlpha = max(0.8 / (1.0 + uBlast * 8.0), 0.0) * mix(0.5, 1.0, aRand);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (200.0 / -mv.z) * (1.0 + uBlast * 2.0);
}
`

const BLAST_FRAGMENT = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.04, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(0.75, 0.85, 1.0), a);
}
`

const JET_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aDir;
attribute float aT;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  float t = fract(aT + uTime * 0.9);
  vec3 pos;
  pos.y = aDir * (1.2 + t * 26.0);
  float wob = t * 1.1;
  pos.x = sin(aRand * 6.2831 + t * 8.0) * wob * (0.3 + aRand * 0.7);
  pos.z = cos(aRand * 6.2831 + t * 8.0) * wob * (0.3 + aRand * 0.7);
  vAlpha = (1.0 - t) * 0.55 * mix(0.5, 1.0, aRand);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (130.0 / -mv.z) * (1.0 - t * 0.3);
}
`

const JET_FRAGMENT = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), a);
}
`

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

/** 开场：蓝色超巨星塌缩 → 超新星冲击波 */
function IntroCollapse({ phase, flashDoneRef }: { phase: BhPhase; flashDoneRef: RefObject<boolean> }) {
  const star = useRef<THREE.Mesh>(null!)
  const starGlow = useRef<THREE.Sprite>(null!)
  const burstRef = useRef<THREE.Points>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const glow = useTexture('/textures/glow.png')
  const blast = useRef(-1)
  const count = 3000

  const geometry = useMemo(() => {
    const { dirs, phases, rands, sizes } = buildDirs(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(() => ({ uBlast: { value: 0 }, uPixelRatio: { value: dpr } }), [dpr])

  useFrame((state, delta) => {
    if (phase !== 'intro') {
      star.current.visible = false
      starGlow.current.visible = false
      burstRef.current.visible = false
      return
    }
    const t = state.clock.elapsedTime
    // 前 2.2s：超巨星核心塌缩缩小；随后冲击波
    if (t < 2.2) {
      const k = 1 - Math.pow(t / 2.2, 2.2) * 0.94
      star.current.scale.setScalar(Math.max(k, 0.06))
      starGlow.current.scale.setScalar(14 * k)
      star.current.visible = true
      starGlow.current.visible = true
      burstRef.current.visible = false
    } else {
      if (!flashDoneRef.current) flashDoneRef.current = true
      star.current.visible = false
      starGlow.current.visible = false
      if (blast.current < 0) blast.current = 0
      blast.current += delta
      burstRef.current.visible = blast.current < 1.6
      matRef.current.uniforms.uBlast.value = blast.current
    }
  })

  return (
    <>
      <mesh ref={star}>
        <sphereGeometry args={[4, 48, 48]} />
        <meshBasicMaterial color="#9db8ff" toneMapped={false} />
      </mesh>
      <sprite ref={starGlow}>
        <spriteMaterial
          map={glow}
          color="#9db8ff"
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <points ref={burstRef} geometry={geometry} visible={false}>
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
    </>
  )
}

/** 坠入探测器：红移 + 意大利面化 + 冻结于视界 */
function Probe({ phase, onFrozenRef }: { phase: BhPhase; onFrozenRef: RefObject<(() => void) | null> }) {
  const group = useRef<THREE.Group>(null!)
  const mesh = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Sprite>(null!)
  const glow = useTexture('/textures/glow.png')
  const startAt = useRef<number | null>(null)
  const angle = useRef(0.8)
  const frozenNotified = useRef(false)
  const tmpColor = useMemo(() => new THREE.Color(), [])
  const redColor = useMemo(() => new THREE.Color('#ff2a14'), [])

  useFrame((state, delta) => {
    const visible = phase === 'falling' || phase === 'frozen'
    group.current.visible = visible
    if (!visible) {
      startAt.current = null
      frozenNotified.current = false
      angle.current = 0.8
      return
    }
    if (startAt.current === null) startAt.current = state.clock.elapsedTime
    const el = state.clock.elapsedTime - startAt.current
    const r = fallRadiusAt(el)
    angle.current += (1.4 / Math.pow(r, 1.5)) * delta
    group.current.position.set(Math.cos(angle.current) * r, 0.35, Math.sin(angle.current) * r)
    group.current.lookAt(0, 0.35, 0)

    const dil = dilationAt(r)
    // 红移：白 → 红 → 暗淡
    const redK = THREE.MathUtils.clamp((dil - 1) / 3, 0, 1)
    tmpColor.setRGB(1, 1, 1).lerp(redColor, redK)
    tmpColor.multiplyScalar(1 / (1 + (dil - 1) * 0.7))
    ;(mesh.current.material as THREE.MeshBasicMaterial).color.copy(tmpColor)
    // 潮汐拉长（意大利面化）
    const stretch = 1 + Math.min((8 / (r * r * r)) * 2.2, 7)
    mesh.current.scale.set(1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch), stretch)
    glowRef.current.material.color.copy(tmpColor)
    glowRef.current.material.opacity = phase === 'frozen' ? 0.12 : 0.55 / (1 + (dil - 1) * 0.6)

    if (phase === 'falling' && r - 1 < 0.06 && !frozenNotified.current) {
      frozenNotified.current = true
      onFrozenRef.current?.()
    }
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={mesh}>
        <coneGeometry args={[0.3, 1.1, 12]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <sprite ref={glowRef} scale={[3, 3, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffffff"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function buildJets(count: number) {
  const dirs = new Float32Array(count)
  const ts = new Float32Array(count)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    dirs[i] = i % 2 === 0 ? 1 : -1
    ts[i] = Math.random()
    rands[i] = Math.random()
    sizes[i] = 0.6 + Math.random()
  }
  return { dirs, ts, rands, sizes }
}

function Jets({ visible }: { visible: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const count = 1600

  const geometry = useMemo(() => {
    const { dirs, ts, rands, sizes } = buildJets(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 1))
    g.setAttribute('aT', new THREE.BufferAttribute(ts, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: dpr } }), [dpr])

  useFrame((state) => {
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <points geometry={geometry} visible={visible}>
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

/** 同步渲染分辨率（画质开关） */
function DprSync({ quality }: { quality: 'smooth' | 'hd' }) {
  const setDpr = useThree((s) => s.setDpr)
  useEffect(() => {
    setDpr(quality === 'hd' ? Math.min(window.devicePixelRatio, 2) : 1)
  }, [quality, setDpr])
  return null
}

export default function BlackHoleScene({
  phase,
  quality,
  jetsOn,
  fadeRef,
  flashDoneRef,
  onFrozenRef,
  selected,
  onSelect,
}: {
  phase: BhPhase
  quality: 'smooth' | 'hd'
  jetsOn: boolean
  fadeRef: RefObject<number>
  flashDoneRef: RefObject<boolean>
  onFrozenRef: RefObject<(() => void) | null>
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <>
      <color attach="background" args={['#020204']} />
      <LensQuad key={quality} quality={quality} fadeRef={fadeRef} />
      <DprSync quality={quality} />
      <IntroCollapse phase={phase} flashDoneRef={flashDoneRef} />
      <Probe phase={phase} onFrozenRef={onFrozenRef} />
      <Jets visible={jetsOn && phase !== 'intro'} />
      {phase !== 'intro' &&
        BH_HOTSPOTS.map((h) => (
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
        minDistance={6}
        maxDistance={140}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  )
}
