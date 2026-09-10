import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { GALAXY_HOTSPOTS, SUN_POS } from './galaxyData'

const GALAXY_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute vec3 aColor;
attribute float aSize;
attribute float aRand;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vAlpha = 0.7 + 0.3 * sin(uTime * (0.4 + aRand) + aRand * 6.2831);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (380.0 / -mv.z);
}
`

const GALAXY_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.04, d) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor, a);
}
`

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 1.6
}

const ARM_PITCH = 0.2236

interface GalaxyData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  rands: Float32Array
  /** 旋臂粒子位置池，供超新星闪现采样 */
  armPositions: Float32Array
  armCount: number
}

function buildGalaxy(count: number): GalaxyData {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const rands = new Float32Array(count)
  const armPositions = new Float32Array(count * 3)
  let armCount = 0

  for (let i = 0; i < count; i++) {
    const kind = Math.random()
    let x = 0
    let y = 0
    let z = 0
    let cr = 1
    let cg = 1
    let cb = 1
    if (kind < 0.15) {
      // 核球 + 银棒（沿 X 拉长）
      if (Math.random() < 0.5) {
        x = gauss() * 9
        y = gauss() * 4
        z = gauss() * 4
      } else {
        x = gauss() * 5
        y = gauss() * 5
        z = gauss() * 5
      }
      cr = 1.0
      cg = 0.82
      cb = 0.55
    } else if (kind < 0.87) {
      // 四条旋臂：对数螺线 + 内侧尘埃带
      const arm = Math.floor(Math.random() * 4)
      const r = 8 + 92 * Math.pow(Math.random(), 1.4)
      const scatter = 0.1 + r * 0.0011
      const off = gauss() * scatter
      const th = (arm * Math.PI) / 2 + Math.log(r / 8) / ARM_PITCH + off
      const spread = 0.5 + r * 0.02
      x = Math.cos(th) * r + gauss() * spread
      z = Math.sin(th) * r + gauss() * spread
      y = gauss() * (1.0 + r * 0.012)
      const pink = Math.random() < 0.06
      const dark = off < -0.5 * scatter && Math.random() < 0.55
      if (dark) {
        cr = cg = cb = 0
      } else if (pink) {
        cr = 1.0
        cg = 0.42
        cb = 0.58
      } else if (r < 25) {
        cr = 0.95
        cg = 0.85
        cb = 0.65
      } else {
        cr = 0.72
        cg = 0.82
        cb = 1.0
      }
      armPositions.set([x, y, z], armCount * 3)
      armCount++
    } else {
      // 银晕
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r = 60 + Math.random() * 70
      x = r * Math.sin(ph) * Math.cos(th)
      y = r * Math.cos(ph) * 0.7
      z = r * Math.sin(ph) * Math.sin(th)
      cr = 0.55
      cg = 0.62
      cb = 0.78
    }
    positions.set([x, y, z], i * 3)
    const bright = 0.55 + Math.random() * 0.45
    colors.set([cr * bright, cg * bright, cb * bright], i * 3)
    // 少量大而软的粒子增加云气感
    sizes[i] = Math.random() < 0.04 ? 5 + Math.random() * 8 : 0.5 + Math.random() * 1.1
    rands[i] = Math.random()
  }
  return { positions, colors, sizes, rands, armPositions, armCount }
}

function GalaxyPoints({ data }: { data: GalaxyData }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(data.rands, 1))
    return g
  }, [data])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  useFrame((state) => {
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={GALAXY_VERTEX}
        fragmentShader={GALAXY_FRAGMENT}
      />
    </points>
  )
}

function makeSnStates(pool: number) {
  return Array.from({ length: pool }, () => ({ waiting: 0.3 + Math.random() * 2.5, t: -1 }))
}

const SN_POOL = 10

/** 超新星随机闪现：旋臂上的粒子随机炸开 */
function SupernovaPool({ data }: { data: GalaxyData }) {
  const glow = useTexture('/textures/glow.png')
  const sprites = useRef<(THREE.Sprite | null)[]>([])
  const states = useRef(makeSnStates(SN_POOL))

  useFrame((_, delta) => {
    states.current.forEach((st, i) => {
      const sp = sprites.current[i]
      if (!sp) return
      if (st.t < 0) {
        st.waiting -= delta
        if (st.waiting <= 0) {
          st.t = 0
          const idx = Math.floor(Math.random() * data.armCount) * 3
          sp.position.set(data.armPositions[idx], data.armPositions[idx + 1], data.armPositions[idx + 2])
        }
        return
      }
      st.t += delta
      const k = st.t / 1.3
      if (k >= 1) {
        st.t = -1
        st.waiting = 0.6 + Math.random() * 2.2
        sp.material.opacity = 0
      } else {
        sp.scale.setScalar(2 + k * 15)
        sp.material.opacity = (1 - k) * 0.85
      }
    })
  })

  return (
    <>
      {Array.from({ length: SN_POOL }, (_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sprites.current[i] = el
          }}
        >
          <spriteMaterial
            map={glow}
            color="#cfe4ff"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </>
  )
}

/** 太阳系信标：黄色标记 + 脉动光环 */
function SunBeacon() {
  const glow = useTexture('/textures/glow.png')
  const ring = useRef<THREE.Sprite>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const k = (t % 2) / 2
    ring.current.scale.setScalar(3 + k * 7)
    ring.current.material.opacity = (1 - k) * 0.6
  })

  return (
    <group position={SUN_POS}>
      <mesh>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial color="#ffd76e" toneMapped={false} />
      </mesh>
      <sprite scale={[6, 6, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffd76e"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={ring}>
        <spriteMaterial
          map={glow}
          color="#ffd76e"
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

const ORIGIN = new THREE.Vector3(0, 0, 0)
const SUN_VEC = new THREE.Vector3(...SUN_POS)
const DIR_START = new THREE.Vector3(0.35, 0.28, 1).normalize()
const DIR_END = new THREE.Vector3(0, 0.55, 0.84).normalize()

/** 拉远 rig：从太阳系旁飞到全银河俯瞰 */
function ZoomRig({ zoomRef }: { zoomRef: RefObject<number> }) {
  const applied = useRef(0)
  const target = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const prev = applied.current
    applied.current += (zoomRef.current - applied.current) * 0.08
    const t = applied.current
    const e = t * t * (3 - 2 * t)
    target.lerpVectors(SUN_VEC, ORIGIN, e)
    const controls = state.controls as { target: THREE.Vector3; update: () => void } | null
    if (controls) {
      controls.target.lerp(target, 0.12)
      controls.update()
    }
    if (Math.abs(t - prev) > 1e-5) {
      dir.lerpVectors(DIR_START, DIR_END, e).normalize()
      const dist = 6 * Math.pow(45, t)
      state.camera.position.copy(target).addScaledVector(dir, dist)
    }
  })
  return null
}

export default function GalaxyScene({
  zoomRef,
  selected,
  onSelect,
  count,
}: {
  zoomRef: RefObject<number>
  selected: string | null
  onSelect: (id: string | null) => void
  count: number
}) {
  const data = useMemo(() => buildGalaxy(count), [count])

  return (
    <>
      <color attach="background" args={['#020204']} />
      <GalaxyPoints data={data} />
      <SupernovaPool data={data} />
      <SunBeacon />
      <ZoomRig zoomRef={zoomRef} />
      {GALAXY_HOTSPOTS.map((h) => (
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
        minDistance={2}
        maxDistance={600}
        autoRotate
        autoRotateSpeed={0.25}
      />
    </>
  )
}
