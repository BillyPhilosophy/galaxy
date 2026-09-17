import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { randomGalaxySpec } from './data'
import type { GalaxySpec } from './data'

export interface EncounterInfo {
  name: string
  en: string
  fact: string
}

// —— 飞行参数（调手感都在这里） ——
const CRUISE_SPEED = 55
const APPROACH_SPEED = 18
const VISIT_SPEED = 9
/** 抵达当前星系时，下一座就放到这么远（注意力被占住，感觉不到它出现） */
const SPAWN_AHEAD = 300
const APPROACH_DIST = 150
const VISIT_DIST = 55
const LEAVE_DIST = 45
const DESPAWN_DIST = 95
const TUBE = 800
const FOV_BASE = 60
const FOV_WARP = 25

// —— 拉线星场：速度越快，星星拖得越长 ——
const WARP_VERTEX = /* glsl */ `
uniform float uCamZ;
uniform float uStretch;
attribute float aTail;
attribute vec3 aColor;
varying vec3 vColor;
void main() {
  float zRel = mod(position.z - uCamZ, ${TUBE.toFixed(1)}) - ${(TUBE / 2).toFixed(1)};
  vec3 world = vec3(position.x, position.y, uCamZ + zRel + uStretch * aTail);
  vColor = aColor;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`

const WARP_FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 0.85);
}
`

function buildWarpField(count: number) {
  const pos = new Float32Array(count * 2 * 3)
  const tail = new Float32Array(count * 2)
  const colors = new Float32Array(count * 2 * 3)
  const c = new THREE.Color()
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 2 - 1) * 90
    const y = (Math.random() * 2 - 1) * 90
    const z = Math.random() * TUBE
    const warm = Math.random() < 0.12
    c.set(warm ? '#ffd9b0' : Math.random() < 0.3 ? '#bcd2ff' : '#f2f5ff')
    const b = 0.45 + Math.random() * 0.55
    pos.set([x, y, z, x, y, z], i * 6)
    tail[i * 2] = 0
    tail[i * 2 + 1] = 1
    colors.set([c.r * b, c.g * b, c.b * b, c.r * b, c.g * b, c.b * b], i * 6)
  }
  return { pos, tail, colors }
}

function WarpField({ camZRef, stretchRef, count }: { camZRef: RefObject<number>; stretchRef: RefObject<number>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const geometry = useMemo(() => {
    const { pos, tail, colors } = buildWarpField(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aTail', new THREE.BufferAttribute(tail, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(() => ({ uCamZ: { value: 0 }, uStretch: { value: 0 } }), [])

  useFrame(() => {
    matRef.current.uniforms.uCamZ.value = camZRef.current ?? 0
    matRef.current.uniforms.uStretch.value = stretchRef.current ?? 0
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={WARP_VERTEX}
        fragmentShader={WARP_FRAGMENT}
      />
    </lineSegments>
  )
}

// —— 粒子星系 ——
const GALAXY_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aRand;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTw;
void main() {
  float rot = uTime * 0.02;
  float c = cos(rot);
  float s = sin(rot);
  vec3 p = vec3(c * position.x - s * position.z, position.y, s * position.x + c * position.z);
  vColor = aColor;
  vTw = 0.75 + 0.25 * sin(uTime * (0.8 + aRand * 2.0) + aRand * 6.2831);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * vTw * uPixelRatio * (140.0 / -mv.z);
}
`

const GALAXY_FRAGMENT = /* glsl */ `
uniform float uFade;
varying vec3 vColor;
varying float vTw;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.06, d) * 0.85 * vTw * uFade;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
}
`

interface Spawned {
  spec: GalaxySpec
  pos: [number, number, number]
  tilt: [number, number]
  dive: boolean
  z: number
  /** 已抵达（名牌已亮、下一座已生成） */
  arrived: boolean
}

/**
 * 单座星系：按相机距离自动淡入淡出。
 * 很远时是一颗缓慢亮起的"目的地亮点"；再近解析成粒子盘；
 * 掠到身后后淡出——完全消失才由外层卸载（dispose 几何与材质）。
 */
function GalaxyPoints({ spawn, camZRef }: { spawn: Spawned; camZRef: RefObject<number> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const beacon = useRef<THREE.Sprite>(null!)
  const halo = useRef<THREE.Sprite>(null!)
  const dpr = useThree((s) => s.viewport.dpr)
  const glow = useMemo(() => makeGlowTexture(), [])
  const spec = spawn.spec

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(spec.positions, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(spec.colors, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(spec.sizes, 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(spec.rands, 1))
    return g
  }, [spec])
  useEffect(
    () => () => {
      geometry.dispose()
      matRef.current?.dispose()
    },
    [geometry],
  )

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: dpr }, uFade: { value: 0 } }),
    [dpr],
  )

  useFrame((_, dt) => {
    matRef.current.uniforms.uTime.value += dt
    const dist = (camZRef.current ?? 0) - spawn.z
    // 粒子盘淡入窗口拉长：从 260 外就开始若有若无地显形
    const kIn = 1 - Math.min(1, Math.max(0, (dist - 140) / 120))
    // 掠到身后 45~95 之间淡出
    const kOut = 1 - Math.min(1, Math.max(0, (-LEAVE_DIST - dist) / 40))
    matRef.current.uniforms.uFade.value = Math.min(kIn, kOut)
    // 目的地亮点：生成时（300 外）不可见，靠近中渐亮，粒子盘接手后熄灭
    const incoming = Math.min(1, Math.max(0, (300 - dist) / 140))
    ;(beacon.current.material as THREE.SpriteMaterial).opacity = incoming * (1 - kIn) * 0.75
    ;(halo.current.material as THREE.SpriteMaterial).opacity = 0.2 * Math.min(kIn, kOut)
  })

  return (
    <group position={[spawn.pos[0], spawn.pos[1], spawn.z]} rotation={[spawn.tilt[0], 0, spawn.tilt[1]]}>
      <points geometry={geometry} frustumCulled={false}>
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
      <sprite ref={beacon} scale={[spec.radius * 0.5, spec.radius * 0.5, 1]}>
        <spriteMaterial
          map={glow}
          color="#cfe0ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={halo} scale={[spec.radius * 2.6, spec.radius * 2.6, 1]}>
        <spriteMaterial
          map={glow}
          color="#b8c8ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

let glowTex: THREE.CanvasTexture | null = null
/** 软辉光贴图（模块单例，避免每座星系重建） */
function makeGlowTexture(): THREE.CanvasTexture {
  if (glowTex) return glowTex
  const S = 128
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  glowTex = new THREE.CanvasTexture(canvas)
  return glowTex
}

interface FlyState {
  z: number
  x: number
  y: number
  speed: number
  visitK: number
  roll: number
}

const tmpForward = new THREE.Vector3()
const tmpGalaxy = new THREE.Vector3()
const tmpLook = new THREE.Vector3()

export default function LabScene({
  onEncounter,
  isMobile,
}: {
  onEncounter: (info: EncounterInfo | null) => void
  isMobile: boolean
}) {
  const camera = useThree((s) => s.camera)
  const onEncounterRef = useRef(onEncounter)
  useEffect(() => {
    onEncounterRef.current = onEncounter
  }, [onEncounter])

  const [galaxies, setGalaxies] = useState<Spawned[]>([])
  const listRef = useRef<Spawned[]>([])
  /** 正在接近/参观的星系在队列里的下标 */
  const curIdx = useRef(0)
  const fly = useRef<FlyState>({ z: 0, x: 0, y: 0, speed: 30, visitK: 0, roll: 0 })
  const stretchRef = useRef(0)
  const camZRef = useRef(0)

  const spawn = (z: number) => {
    const spec = randomGalaxySpec(isMobile ? 10000 : 22000)
    const next: Spawned = {
      spec,
      pos: [(Math.random() * 2 - 1) * 26, (Math.random() * 2 - 1) * 16, 0],
      tilt: [(Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 1.1],
      dive: Math.random() < 0.3,
      z,
      arrived: false,
    }
    listRef.current = [...listRef.current, next]
    setGalaxies(listRef.current)
  }

  // 开场第一座星系（StrictMode 双挂载防重）
  useEffect(() => {
    if (listRef.current.length === 0) spawn(-SPAWN_AHEAD)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.1)
    const f = fly.current
    const cur = listRef.current[curIdx.current]
    if (!cur) return

    const remaining = f.z - cur.z
    let target = CRUISE_SPEED
    if (remaining < VISIT_DIST + LEAVE_DIST && remaining > -LEAVE_DIST) target = VISIT_SPEED
    else if (remaining < APPROACH_DIST) target = APPROACH_SPEED
    f.speed += (target - f.speed) * Math.min(1, cdt * 2.0)
    f.z -= f.speed * cdt

    // 抵达当前星系：亮名牌 + 立刻把下一座放到远处（趁注意力被占住）
    if (!cur.arrived && remaining < VISIT_DIST) {
      cur.arrived = true
      onEncounterRef.current({ name: cur.spec.name, en: cur.spec.en, fact: cur.spec.fact })
      spawn(f.z - SPAWN_AHEAD)
    }
    // 掠过完毕：目标移交下一座
    if (remaining < -LEAVE_DIST && curIdx.current < listRef.current.length - 1) {
      onEncounterRef.current(null)
      curIdx.current++
    }
    // 卸载彻底淡出的星系（几何与材质随之 dispose）
    while (listRef.current.length > 0 && curIdx.current > 0 && f.z - listRef.current[0].z < -DESPAWN_DIST) {
      listRef.current = listRef.current.slice(1)
      curIdx.current--
      setGalaxies(listRef.current)
    }

    // 横向掠过路径
    let tx = 0
    let ty = 0
    if (remaining < APPROACH_DIST) {
      const k = cur.dive ? 0.14 : 0.55
      tx = cur.pos[0] * k
      ty = cur.pos[1] * (cur.dive ? 0.85 : 0.45)
    }
    const prevX = f.x
    f.x += (tx - f.x) * Math.min(1, cdt * 1.2)
    f.y += (ty - f.y) * Math.min(1, cdt * 1.2)
    const rollTarget = Math.min(0.12, Math.max(-0.12, -(f.x - prevX) / Math.max(cdt, 1e-4) * 0.02))
    f.roll += (rollTarget - f.roll) * Math.min(1, cdt * 3)

    // 视线混合
    const kTarget = remaining < VISIT_DIST + 10 && remaining > -LEAVE_DIST ? 1 : 0
    f.visitK += (kTarget - f.visitK) * Math.min(1, cdt * 1.6)
    camera.position.set(f.x, f.y, f.z)
    camera.up.set(0, 1, 0)
    tmpForward.set(f.x * 0.5, f.y * 0.5, f.z - 120)
    tmpGalaxy.set(cur.pos[0], cur.pos[1], cur.z)
    tmpLook.lerpVectors(tmpForward, tmpGalaxy, f.visitK * 0.85)
    camera.lookAt(tmpLook)
    camera.rotateZ(f.roll)

    const speedK = Math.min(1, Math.max(0, (f.speed - VISIT_SPEED) / (CRUISE_SPEED - VISIT_SPEED)))
    const cam = camera as THREE.PerspectiveCamera
    const fov = FOV_BASE + FOV_WARP * speedK
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
    stretchRef.current = speedK * 2.6
    camZRef.current = f.z
  })

  return (
    <>
      <color attach="background" args={['#010103']} />
      <WarpField camZRef={camZRef} stretchRef={stretchRef} count={isMobile ? 1300 : 2600} />
      {galaxies.map((g) => (
        <GalaxyPoints key={g.spec.id} spawn={g} camZRef={camZRef} />
      ))}
    </>
  )
}
