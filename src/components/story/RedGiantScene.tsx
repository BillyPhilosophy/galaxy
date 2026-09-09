import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { engulfAt, GIANT_PLANETS, radiusAt, colorAt } from './redGiantData'
import { RG_HOTSPOTS } from './redGiantData'

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
uniform float uCell;
uniform float uBoil;
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
  // 红巨星的对流胞巨大而稀疏：噪声频率随膨胀降低，沸腾对比增强
  float g = fbm(p * uCell + vec3(0.0, uTime * 0.03, 0.0));
  float amp = mix(0.35, 0.65, uBoil);
  float granule = (1.0 - amp) + 2.0 * amp * g;
  vec3 col = uColor * granule;
  float limb = pow(max(dot(normalize(vNormalV), normalize(vViewV)), 0.0), 0.55);
  col *= 0.28 + 0.72 * limb;
  gl_FragColor = vec4(col, 1.0);
}
`

const LOSS_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uLoss;
uniform float uRadius;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aPhase;
attribute float aRand;
attribute float aSize;
varying float vAlpha;

void main() {
  float t = fract(aPhase + uTime * 0.045);
  vec3 pos = aDir * (uRadius * (1.05 + t * 1.7));
  pos += vec3(sin(aRand * 39.0), sin(aRand * 23.0), sin(aRand * 51.0)) * uRadius * 0.06;
  vAlpha = smoothstep(0.0, 0.08, t) * (1.0 - t) * 0.3 * uLoss * mix(0.5, 1.0, aRand);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (200.0 / -mv.z) * (uRadius * 0.08 + 1.0);
}
`

const LOSS_FRAGMENT = /* glsl */ `
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(0.72, 0.36, 0.20), a);
}
`

function buildLoss(count: number) {
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
    sizes[i] = 0.5 + Math.random() * 1.1
  }
  return { dirs, phases, rands, sizes }
}

function GiantStar({ progressRef }: { progressRef: RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const s1 = useRef<THREE.Sprite>(null!)
  const s2 = useRef<THREE.Sprite>(null!)
  const glow = useTexture('/textures/glow.png')
  const smoothP = useRef(0)
  const smoothColor = useRef(colorAt(0).clone())

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#ffd76e') },
      uTime: { value: 0 },
      uCell: { value: 7 },
      uBoil: { value: 0 },
    }),
    [],
  )

  useFrame((state) => {
    smoothP.current += (progressRef.current - smoothP.current) * 0.07
    const p = smoothP.current
    const r = radiusAt(p)
    smoothColor.current.lerp(colorAt(p), 0.08)
    matRef.current.uniforms.uColor.value.copy(smoothColor.current)
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uCell.value = THREE.MathUtils.lerp(7, 2.2, p)
    matRef.current.uniforms.uBoil.value = p
    // 巅峰期缓慢脉动（米拉型变星）
    const pulse =
      1 + 0.03 * Math.sin(state.clock.elapsedTime * 0.9) * THREE.MathUtils.smoothstep(p, 0.85, 1)
    meshRef.current.scale.setScalar(r * pulse)
    s1.current.material.color.copy(smoothColor.current)
    s1.current.material.opacity = 0.45
    s1.current.scale.setScalar(r * 3.6)
    s2.current.material.color.copy(smoothColor.current)
    s2.current.material.opacity = 0.12
    s2.current.scale.setScalar(r * 7)
  })

  return (
    <>
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
      <sprite ref={s1}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={s2}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </>
  )
}

const WHITE = new THREE.Color('#fff4e0')
const ORBIT_SEGMENTS = 128
const INITIAL_ANGLES = [0.8, 2.4, 4.4, 1.6]

function PlanetField({ progressRef }: { progressRef: RefObject<number> }) {
  const glow = useTexture('/textures/glow.png')
  const smoothP = useRef(0)
  const groups = useRef<(THREE.Group | null)[]>([])
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const glows = useRef<(THREE.Sprite | null)[]>([])
  const flashes = useRef<(THREE.Sprite | null)[]>([])
  const lines = useRef<(THREE.LineLoop | null)[]>([])
  const angles = useRef([...INITIAL_ANGLES])
  const dead = useRef(GIANT_PLANETS.map(() => false))
  const flashT = useRef(GIANT_PLANETS.map(() => -1))
  const baseColors = useMemo(() => GIANT_PLANETS.map((p) => new THREE.Color(p.color)), [])
  const tmpColor = useMemo(() => new THREE.Color(), [])

  const orbitGeometries = useMemo(
    () =>
      GIANT_PLANETS.map((p) => {
        const pts: number[] = []
        for (let i = 0; i < ORBIT_SEGMENTS; i++) {
          const a = (i / ORBIT_SEGMENTS) * Math.PI * 2
          pts.push(Math.cos(a) * p.orbitR, 0, Math.sin(a) * p.orbitR)
        }
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
        return g
      }),
    [],
  )
  useEffect(() => () => orbitGeometries.forEach((g) => g.dispose()), [orbitGeometries])

  useFrame((_, delta) => {
    smoothP.current += (progressRef.current - smoothP.current) * 0.07
    const p = smoothP.current
    GIANT_PLANETS.forEach((pl, i) => {
      const e = engulfAt(p, pl.orbitR)
      const group = groups.current[i]
      const mesh = meshes.current[i]
      const glowS = glows.current[i]
      const flash = flashes.current[i]
      const line = lines.current[i]
      if (!group || !mesh || !glowS || !flash || !line) return

      // 重置：膨胀退回后行星复活
      if (dead.current[i] && e < 0.05) {
        dead.current[i] = false
        flashT.current[i] = -1
        mesh.visible = true
        glowS.visible = true
        flash.visible = false
        ;(line.material as THREE.LineBasicMaterial).opacity = 0.1
      }

      if (!dead.current[i]) {
        angles.current[i] += pl.speed * delta * (1 + e * 0.8)
        const r = pl.orbitR * (1 - 0.5 * e)
        group.position.set(Math.cos(angles.current[i]) * r, 0, Math.sin(angles.current[i]) * r)
        // 坠入大气：烧白热、辉光增强
        tmpColor.copy(baseColors[i]).lerp(WHITE, e)
        ;(mesh.material as THREE.MeshBasicMaterial).color.copy(tmpColor)
        glowS.material.opacity = 0.4 + e * 0.5
        glowS.scale.setScalar(5 + e * 7)
        if (e >= 1) {
          dead.current[i] = true
          flashT.current[i] = 0
          mesh.visible = false
          glowS.visible = false
        }
      } else if (flashT.current[i] >= 0) {
        flashT.current[i] += delta
        const f = flashT.current[i] / 0.7
        flash.visible = f < 1
        flash.scale.setScalar(3 + f * 26)
        flash.material.opacity = 0.95 * Math.max(0, 1 - f)
        ;(line.material as THREE.LineBasicMaterial).opacity = Math.max(0.02, 0.1 - f * 0.08)
      }
    })
  })

  return (
    <>
      {GIANT_PLANETS.map((pl, i) => (
        <group key={pl.id}>
          <lineLoop
            ref={(el) => {
              lines.current[i] = el
            }}
            geometry={orbitGeometries[i]}
          >
            <lineBasicMaterial color="#8a8b98" transparent opacity={0.1} depthWrite={false} />
          </lineLoop>
          <group
            ref={(el) => {
              groups.current[i] = el
            }}
            position={[
              Math.cos(INITIAL_ANGLES[i]) * pl.orbitR,
              0,
              Math.sin(INITIAL_ANGLES[i]) * pl.orbitR,
            ]}
          >
            <mesh
              ref={(el) => {
                meshes.current[i] = el
              }}
            >
              <sphereGeometry args={[1.1, 16, 16]} />
              <meshBasicMaterial color={pl.color} toneMapped={false} />
            </mesh>
            <sprite
              ref={(el) => {
                glows.current[i] = el
              }}
              scale={[5, 5, 1]}
            >
              <spriteMaterial
                map={glow}
                color={pl.color}
                transparent
                opacity={0.4}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
            <sprite
              ref={(el) => {
                flashes.current[i] = el
              }}
              visible={false}
            >
              <spriteMaterial
                map={glow}
                color="#ffd9a0"
                transparent
                opacity={0.95}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          </group>
        </group>
      ))}
    </>
  )
}

function MassLoss({ progressRef, count }: { progressRef: RefObject<number>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const smoothP = useRef(0)

  const geometry = useMemo(() => {
    const { dirs, phases, rands, sizes } = buildLoss(count)
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
      uLoss: { value: 0 },
      uRadius: { value: 1 },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((state) => {
    smoothP.current += (progressRef.current - smoothP.current) * 0.07
    const p = smoothP.current
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uRadius.value = radiusAt(p)
    matRef.current.uniforms.uLoss.value = THREE.MathUtils.smoothstep(p, 0.82, 1)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={LOSS_VERTEX}
        fragmentShader={LOSS_FRAGMENT}
      />
    </points>
  )
}

/** 相机随恒星膨胀拉远，保证行星轨道陆续进入画面 */
function ExpandRig({ progressRef }: { progressRef: RefObject<number> }) {
  const smoothP = useRef(0)
  const lastDist = useRef(46)

  useFrame((state) => {
    smoothP.current += (progressRef.current - smoothP.current) * 0.07
    const r = radiusAt(smoothP.current)
    const target = Math.max(r * 3.0, 46)
    if (Math.abs(target - lastDist.current) / lastDist.current > 0.003) {
      const factor = THREE.MathUtils.lerp(1, target / lastDist.current, 0.08)
      state.camera.position.multiplyScalar(factor)
      lastDist.current *= factor
    }
    const controls = state.controls as { minDistance: number; maxDistance: number } | null
    if (controls) {
      controls.minDistance = Math.max(r * 1.5, 12)
      controls.maxDistance = 900
    }
  })
  return null
}

/** 热点标签：pole/limb 锚点跟随恒星半径，graveyard 固定在地球轨道附近 */
function HotspotLabels({
  progressRef,
  selected,
  onSelect,
}: {
  progressRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const poleRef = useRef<THREE.Group>(null!)
  const limbRef = useRef<THREE.Group>(null!)
  const smoothP = useRef(0)

  useFrame(() => {
    smoothP.current += (progressRef.current - smoothP.current) * 0.07
    const r = radiusAt(smoothP.current)
    poleRef.current.position.set(0, r * 1.04 + 2, 0)
    limbRef.current.position.set(r * 0.65, r * 0.72, r * 0.46)
  })

  const labelFor = (h: (typeof RG_HOTSPOTS)[number]) => (
    <button
      className={`planet-label${selected === h.id ? ' planet-label--active' : ''}`}
      onClick={() => onSelect(selected === h.id ? null : h.id)}
    >
      {h.label}
    </button>
  )

  return (
    <>
      {RG_HOTSPOTS.map((h) => {
        if (h.anchor === 'pole')
          return (
            <group key={h.id} ref={poleRef}>
              <Html center zIndexRange={[5, 0]}>
                {labelFor(h)}
              </Html>
            </group>
          )
        if (h.anchor === 'limb')
          return (
            <group key={h.id} ref={limbRef}>
              <Html center zIndexRange={[5, 0]}>
                {labelFor(h)}
              </Html>
            </group>
          )
        return (
          <group key={h.id} position={[150, 8, 150]}>
            <Html center zIndexRange={[5, 0]}>
              {labelFor(h)}
            </Html>
          </group>
        )
      })}
    </>
  )
}

export default function RedGiantScene({
  progressRef,
  selected,
  onSelect,
  counts,
}: {
  progressRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
  counts: { loss: number }
}) {
  return (
    <>
      <color attach="background" args={['#020204']} />
      <Stars radius={600} depth={300} count={5000} factor={4} saturation={0} fade speed={0.3} />
      <GiantStar progressRef={progressRef} />
      <PlanetField progressRef={progressRef} />
      <MassLoss progressRef={progressRef} count={counts.loss} />
      <ExpandRig progressRef={progressRef} />
      <HotspotLabels progressRef={progressRef} selected={selected} onSelect={onSelect} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.8}
        minDistance={12}
        maxDistance={900}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </>
  )
}
