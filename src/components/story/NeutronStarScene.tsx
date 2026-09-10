import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { beamOn, classifyNs, NS_HOTSPOTS } from './neutronStarData'
import type { NsParams, NsType } from './neutronStarData'

const BEAM_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uBeam;
uniform float uPixelRatio;
attribute float aDir;
attribute float aT;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  float t = fract(aT + uTime * 1.6);
  vec3 pos;
  pos.y = aDir * (1.0 + t * 13.0);
  float wob = t * 0.9;
  pos.x = sin(aRand * 6.2831 + t * 9.0) * wob * (0.3 + aRand * 0.7);
  pos.z = cos(aRand * 6.2831 + t * 9.0) * wob * (0.3 + aRand * 0.7);
  vAlpha = (1.0 - t) * 0.65 * uBeam * mix(0.5, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (120.0 / -mv.z) * (1.0 - t * 0.35);
}
`

const BEAM_FRAGMENT = /* glsl */ `
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(0.62, 0.9, 1.0), a);
}
`

const STREAM_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uOn;
uniform float uPixelRatio;
attribute float aPhase;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  float t = fract(aPhase + uTime * 0.4);
  vec3 start = vec3(16.0, 3.0, 0.0);
  vec3 pos = mix(start, vec3(0.0), t);
  float wob = (1.0 - t) * 1.6;
  pos.x += sin(aRand * 6.2831 + t * 11.0) * wob;
  pos.y += cos(aRand * 6.2831 + t * 11.0) * wob * 0.5;
  pos.z += sin(aRand * 4.0 + t * 11.0) * wob;
  vAlpha = sin(3.14159 * t) * 0.8 * uOn * mix(0.5, 1.0, aRand);

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
  gl_FragColor = vec4(vec3(1.0, 0.72, 0.42), a);
}
`

const DISK_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uOn;
uniform float uPixelRatio;
attribute float aRand;
attribute float aSize;
varying float vAlpha;
varying float vHeat;

void main() {
  vec3 seed = position;
  float r = length(seed.xz);
  float omega = 1.6 * pow(2.0 / r, 1.5);
  float ang = omega * uTime;
  float cs = cos(ang);
  float sn = sin(ang);
  vec3 pos = seed;
  pos.xz = mat2(cs, -sn, sn, cs) * pos.xz;
  vHeat = 1.0 - smoothstep(2.0, 6.0, r);
  vAlpha = (0.25 + vHeat * 0.55) * uOn * mix(0.6, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (110.0 / -mv.z);
}
`

const DISK_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying float vHeat;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.06, d) * vAlpha;
  if (a < 0.004) discard;
  vec3 col = mix(vec3(0.65, 0.35, 0.15), vec3(1.0, 0.85, 0.6), vHeat);
  gl_FragColor = vec4(col, a);
}
`

const BURST_VERTEX = /* glsl */ `
uniform float uBlast;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  vec3 pos = aDir * (1.0 + uBlast * (30.0 + aRand * 26.0));
  vAlpha = max(0.8 / (1.0 + uBlast * 6.0), 0.0) * mix(0.5, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (160.0 / -mv.z) * (1.0 + uBlast);
}
`

const BURST_FRAGMENT = /* glsl */ `
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.04, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(1.0, 0.85, 0.55), a);
}
`

function buildDirs(count: number, withPhase: boolean) {
  const dirs = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    dirs.set([Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)], i * 3)
    phases[i] = withPhase ? Math.random() : 0
    rands[i] = Math.random()
    sizes[i] = 0.5 + Math.random() * 1.0
  }
  return { dirs, phases, rands, sizes }
}

function buildBeam(count: number) {
  const dirs = new Float32Array(count)
  const ts = new Float32Array(count)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    dirs[i] = i % 2 === 0 ? 1 : -1
    ts[i] = Math.random()
    rands[i] = Math.random()
    sizes[i] = 0.6 + Math.random() * 1.0
  }
  return { dirs, ts, rands, sizes }
}

function buildDisk(count: number) {
  const positions = new Float32Array(count * 3)
  const rands = new Float32Array(count)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(THREE.MathUtils.lerp(4, 36, Math.random()))
    const a = Math.random() * Math.PI * 2
    positions.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.3, Math.sin(a) * r], i * 3)
    rands[i] = Math.random()
    sizes[i] = 0.5 + Math.random() * 0.9
  }
  return { positions, rands, sizes }
}

/** 偶极磁层线：r = L·sin²θ */
function buildMagnetoLines(shells: number[]) {
  return shells.map((L) => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI
      const r = L * Math.sin(th) * Math.sin(th)
      pts.push(new THREE.Vector3(r * Math.cos(th), r * Math.sin(th), 0))
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts)
    return g
  })
}

function useNsRefs(nsRef: RefObject<NsParams>) {
  const smooth = useRef({ logP: -0.3, logB: 12, type: 'radio' as NsType, beam: 1, bNorm: 0.57 })
  const update = () => {
    const s = smooth.current
    s.logP = THREE.MathUtils.lerp(s.logP, nsRef.current.logP, 0.08)
    s.logB = THREE.MathUtils.lerp(s.logB, nsRef.current.logB, 0.08)
    const type = classifyNs({ logP: s.logP, logB: s.logB, companion: nsRef.current.companion })
    s.type = type
    s.beam = THREE.MathUtils.lerp(s.beam, beamOn(type) ? 1 : 0, 0.08)
    s.bNorm = THREE.MathUtils.clamp((s.logB - 8) / 7, 0, 1)
    return s
  }
  return { smooth, update }
}

function NsStar({ nsRef, onPulseRef }: { nsRef: RefObject<NsParams>; onPulseRef: RefObject<(() => void) | null> }) {
  const spinRef = useRef<THREE.Group>(null!)
  const magnetRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const s1 = useRef<THREE.Sprite>(null!)
  const glow = useTexture('/textures/glow.png')
  const { update } = useNsRefs(nsRef)
  const tmpQ = useMemo(() => new THREE.Quaternion(), [])
  const worldDir = useMemo(() => new THREE.Vector3(), [])
  const toCam = useMemo(() => new THREE.Vector3(), [])
  const starColor = useMemo(() => new THREE.Color('#dff4ff'), [])
  const coolColor = useMemo(() => new THREE.Color('#7a93b8'), [])
  const tmpColor = useMemo(() => new THREE.Color(), [])
  const wasFacing = useRef(false)

  useFrame((state, delta) => {
    const s = update()
    // 视觉转速：真实周期在 HUD 显示，画面压缩到可感知范围
    const pv = THREE.MathUtils.clamp(Math.pow(10, s.logP) * 0.4, 0.06, 2)
    spinRef.current.rotation.y += ((Math.PI * 2) / pv) * delta

    tmpColor.copy(starColor).lerp(coolColor, s.type === 'isolated' ? 1 : 0)
    ;(meshRef.current.material as THREE.MeshBasicMaterial).color.copy(tmpColor)
    const glowOp = s.type === 'isolated' ? 0.2 : 0.55
    s1.current.material.color.copy(tmpColor)
    s1.current.material.opacity = glowOp
    s1.current.scale.setScalar(6.5)

    // 脉冲检测：磁轴（局部 +Y）扫过相机方向时触发
    magnetRef.current.getWorldQuaternion(tmpQ)
    worldDir.set(0, 1, 0).applyQuaternion(tmpQ)
    toCam.copy(state.camera.position).normalize()
    const facing = worldDir.dot(toCam) > 0.9965
    if (facing && !wasFacing.current && s.beam > 0.5) onPulseRef.current?.()
    wasFacing.current = facing
  })

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color="#dff4ff" toneMapped={false} />
      </mesh>
      <sprite ref={s1}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <group ref={spinRef}>
        <group ref={magnetRef} rotation={[0, 0, 0.72]}>
          <MagnetoSphere nsRef={nsRef} />
          <Beams nsRef={nsRef} />
          <PoleSpots nsRef={nsRef} />
        </group>
      </group>
    </>
  )
}

function MagnetoSphere({ nsRef }: { nsRef: RefObject<NsParams> }) {
  const lines = useMemo(() => buildMagnetoLines([2.2, 3.2, 4.4, 5.8]), [])
  const mats = useRef<(THREE.LineBasicMaterial | null)[]>([])
  const { smooth, update } = useNsRefs(nsRef)
  useEffect(() => () => lines.forEach((g) => g.dispose()), [lines])

  useFrame(() => {
    update()
    const s = smooth.current
    const op = 0.05 + s.bNorm * 0.4
    const twisted = s.type === 'magnetar'
    mats.current.forEach((m, i) => {
      if (!m) return
      m.opacity = op * (1 - i * 0.16)
      m.color.set(twisted ? '#ff9a6e' : '#7de3ff')
    })
  })

  const rotations = useMemo(() => [0, Math.PI / 3, (2 * Math.PI) / 3], [])
  return (
    <>
      {rotations.map((ry) =>
        lines.map((g, i) => (
          <group key={`${ry}-${i}`} rotation={[0, ry + (i % 2) * 0.35, 0]}>
            <lineLoop geometry={g}>
              <lineBasicMaterial
                ref={(el) => {
                  mats.current[rotations.indexOf(ry) * lines.length + i] = el
                }}
                color="#7de3ff"
                transparent
                opacity={0.2}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </lineLoop>
          </group>
        )),
      )}
    </>
  )
}

function Beams({ nsRef }: { nsRef: RefObject<NsParams> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const { smooth, update } = useNsRefs(nsRef)
  const count = 1400

  const geometry = useMemo(() => {
    const { dirs, ts, rands, sizes } = buildBeam(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 1))
    g.setAttribute('aT', new THREE.BufferAttribute(ts, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uBeam: { value: 1 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  useFrame((state) => {
    update()
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uBeam.value = smooth.current.beam * (smooth.current.type === 'magnetar' ? 0.5 : 1)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={BEAM_VERTEX}
        fragmentShader={BEAM_FRAGMENT}
      />
    </points>
  )
}

function PoleSpots({ nsRef }: { nsRef: RefObject<NsParams> }) {
  const top = useRef<THREE.Mesh>(null!)
  const bottom = useRef<THREE.Mesh>(null!)
  const { update } = useNsRefs(nsRef)

  useFrame(() => {
    const s = update()
    const accreting = s.type === 'accreting'
    const scale = accreting ? 1.8 : 1
    const opacity = accreting ? 1 : 0.55
    ;[top.current, bottom.current].forEach((m) => {
      m.scale.setScalar(scale)
      ;(m.material as THREE.MeshBasicMaterial).color.set(accreting ? '#ffffff' : '#aee6ff')
      ;(m.material as THREE.MeshBasicMaterial).opacity = opacity
    })
  })

  return (
    <>
      <mesh ref={top} position={[0, 1.02, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#aee6ff" toneMapped={false} transparent opacity={0.55} />
      </mesh>
      <mesh ref={bottom} position={[0, -1.02, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#aee6ff" toneMapped={false} transparent opacity={0.55} />
      </mesh>
    </>
  )
}

function Companion({ nsRef }: { nsRef: RefObject<NsParams> }) {
  const group = useRef<THREE.Group>(null!)
  const glow = useTexture('/textures/glow.png')
  useFrame((state) => {
    group.current.visible = nsRef.current.companion
    group.current.position.y = 3 + Math.sin(state.clock.elapsedTime * 1.8) * 0.3
  })
  return (
    <group ref={group} position={[16, 3, 0]} visible={false}>
      <mesh>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshBasicMaterial color="#ff9a3c" toneMapped={false} />
      </mesh>
      <sprite scale={[11, 11, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff9a3c"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function FeedStream({ nsRef, count }: { nsRef: RefObject<NsParams>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const pointsRef = useRef<THREE.Points>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const on = useRef(0)

  const geometry = useMemo(() => {
    const { phases, rands, sizes } = buildDirs(count, true)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uOn: { value: 0 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  useFrame((state) => {
    on.current = THREE.MathUtils.lerp(on.current, nsRef.current.companion ? 1 : 0, 0.06)
    pointsRef.current.visible = on.current > 0.02
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uOn.value = on.current
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

function AccretionDisk({ nsRef, count }: { nsRef: RefObject<NsParams>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const pointsRef = useRef<THREE.Points>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const on = useRef(0)

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
    () => ({ uTime: { value: 0 }, uOn: { value: 0 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  useFrame((state) => {
    on.current = THREE.MathUtils.lerp(on.current, nsRef.current.companion ? 1 : 0, 0.06)
    pointsRef.current.visible = on.current > 0.02
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uOn.value = on.current
  })

  return (
    <points ref={pointsRef} geometry={geometry} visible={false}>
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

/** 星震暴发（磁星）/ X 射线爆发（吸积）共用的球壳粒子喷发 */
function Burst({ triggerRef, count }: { triggerRef: RefObject<number>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const pointsRef = useRef<THREE.Points>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const blast = useRef(-1)

  const geometry = useMemo(() => {
    const { dirs, phases, rands, sizes } = buildDirs(count, false)
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
  const lastTrigger = useRef(0)

  useFrame((_, delta) => {
    if (triggerRef.current !== lastTrigger.current) {
      lastTrigger.current = triggerRef.current
      blast.current = 0
    }
    if (blast.current >= 0 && blast.current < 1.6) {
      blast.current += delta
      pointsRef.current.visible = true
    } else {
      pointsRef.current.visible = false
    }
    matRef.current.uniforms.uBlast.value = Math.max(0, blast.current)
  })

  return (
    <points ref={pointsRef} geometry={geometry} visible={false}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={BURST_VERTEX}
        fragmentShader={BURST_FRAGMENT}
      />
    </points>
  )
}

export default function NeutronStarScene({
  nsRef,
  selected,
  onSelect,
  onPulseRef,
  burstRef,
  counts,
}: {
  nsRef: RefObject<NsParams>
  selected: string | null
  onSelect: (id: string | null) => void
  onPulseRef: RefObject<(() => void) | null>
  burstRef: RefObject<number>
  counts: { stream: number; disk: number; burst: number }
}) {
  return (
    <>
      <color attach="background" args={['#020204']} />
      <Stars radius={300} depth={150} count={5000} factor={4} saturation={0} fade speed={0.3} />
      <NsStar nsRef={nsRef} onPulseRef={onPulseRef} />
      <Companion nsRef={nsRef} />
      <FeedStream nsRef={nsRef} count={counts.stream} />
      <AccretionDisk nsRef={nsRef} count={counts.disk} />
      <Burst triggerRef={burstRef} count={counts.burst} />
      {NS_HOTSPOTS.map((h) => (
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
        maxDistance={160}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </>
  )
}
