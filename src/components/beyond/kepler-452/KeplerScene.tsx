import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  BEACON_CAPTURE,
  GRAVITY_RANGE,
  GRAVITY_SURFACE,
  KM_PER_UNIT,
  LAND_SPEED,
  ORBIT_OMEGA,
  ORBIT_R,
  PLANET_R,
  PLANET_VIEW_R,
  SHIP_START,
  STAR_R,
  TRANSIT_DIP_DISPLAY,
  TRANSIT_HOTSPOTS,
  FLIGHT_HOTSPOTS,
} from './data'
import type { KeplerHotspot, KeplerMode } from './data'
import {
  BEACON_DIR,
  TERRAIN_AMP,
  getCloudTexture,
  getPlanetTexture,
  getTerrainGeometry,
  heightAt,
  surfacePointAt,
} from './planet'

export interface TransitStats {
  flux: number
  transit: boolean
}

export interface FlightStats {
  alt: number
  speed: number
  beaconDist: number
  landed: boolean
}

export type FlightEvent = 'crash' | 'success'

const tmpV1 = new THREE.Vector3()
const tmpV2 = new THREE.Vector3()
const tmpV3 = new THREE.Vector3()
const tmpEuler = new THREE.Euler(0, 0, 0, 'YXZ')

const ATMOS_VERTEX = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vWorld;
void main() {
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}
`

// 薄而锐的大气边缘光：昼侧亮、夜侧隐，暖金调呼应"更厚的大气"
const ATMOS_FRAGMENT = /* glsl */ `
uniform vec3 uSunDir;
varying vec3 vN;
varying vec3 vV;
varying vec3 vWorld;
void main() {
  float rim = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 4.5);
  float day = clamp(dot(normalize(vWorld), uSunDir) * 0.5 + 0.5, 0.0, 1.0);
  float k = 0.15 + 0.85 * day;
  vec3 col = mix(vec3(0.35, 0.55, 1.0), vec3(0.85, 0.78, 0.6), day * 0.6);
  gl_FragColor = vec4(col * rim * 1.1 * k, rim * 0.5 * k);
}
`

function HotspotLabel({
  h,
  selected,
  onSelect,
  offset,
}: {
  h: KeplerHotspot
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

/** 半径为 r 的 xz 平面轨道圈 */
function OrbitRingLine({ r, color, opacity }: { r: number; color: string; opacity: number }) {
  const ring = useMemo(() => {
    const N = 128
    const pos = new Float32Array((N + 1) * 3)
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2
      pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    const line = new THREE.Line(g, m)
    line.frustumCulled = false
    return line
  }, [r, color, opacity])
  useEffect(
    () => () => {
      ring.geometry.dispose()
      ;(ring.material as THREE.Material).dispose()
    },
    [ring],
  )
  return <primitive object={ring} />
}

/** 模式一：凌日测光。行星绕恒星公转，轨道对齐视线时曲线出现凹陷 */
function TransitView({
  inclDeg,
  statsRef,
  selected,
  onSelect,
  isMobile,
}: {
  inclDeg: number
  statsRef: RefObject<TransitStats>
  selected: string | null
  onSelect: (id: string | null) => void
  isMobile: boolean
}) {
  const sunTex = useTexture('/textures/sun.png')
  const glow = useTexture('/textures/glow.png')
  const planetTex = useMemo(() => getPlanetTexture(), [])
  const camera = useThree((s) => s.camera)
  const carriage = useRef<THREE.Group>(null!)
  const planet = useRef<THREE.Group>(null!)
  const angle = useRef(0)

  useFrame((_, dt) => {
    angle.current += dt * ORBIT_OMEGA
    carriage.current.rotation.y = angle.current
    planet.current.rotation.y += dt * 0.3
    // 凌日判定：行星到"恒星→相机"视线的垂距足够小，且行星在恒星前方
    planet.current.getWorldPosition(tmpV1)
    const cam = camera.position
    tmpV2.copy(cam).normalize()
    const along = tmpV1.dot(tmpV2)
    const perpSq = Math.max(0, tmpV1.lengthSq() - along * along)
    const transit = along > 0 && perpSq < STAR_R * STAR_R * 0.9
    statsRef.current.transit = transit
    statsRef.current.flux = transit ? 1 - TRANSIT_DIP_DISPLAY : 1
  })

  const inclRad = THREE.MathUtils.degToRad(inclDeg)
  const starH = TRANSIT_HOTSPOTS.find((h) => h.id === 'kstar')!
  const orbitH = TRANSIT_HOTSPOTS.find((h) => h.id === 'korbit')!
  const signalH = TRANSIT_HOTSPOTS.find((h) => h.id === 'ksignal')!

  return (
    <>
      <color attach="background" args={['#02030a']} />
      <Stars radius={220} depth={120} count={isMobile ? 2200 : 4500} factor={4} saturation={0} fade speed={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2.2} decay={0} />
      <ambientLight intensity={0.4} />
      <mesh>
        <sphereGeometry args={[STAR_R, 48, 48]} />
        <meshBasicMaterial map={sunTex} toneMapped={false} />
      </mesh>
      <sprite scale={[16, 16, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffd76e"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[34, 34, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffbe4d"
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <group rotation={[inclRad, 0, 0]}>
        <OrbitRingLine r={ORBIT_R} color="#5a6f9f" opacity={0.45} />
        <group ref={carriage}>
          <group ref={planet} position={[ORBIT_R, 0, 0]}>
            <mesh>
              <sphereGeometry args={[PLANET_VIEW_R, 32, 32]} />
              <meshStandardMaterial map={planetTex} roughness={0.9} />
            </mesh>
          </group>
        </group>
      </group>
      <HotspotLabel h={starH} selected={selected} onSelect={onSelect} />
      <HotspotLabel h={orbitH} selected={selected} onSelect={onSelect} />
      <HotspotLabel h={signalH} selected={selected} onSelect={onSelect} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        minDistance={10}
        maxDistance={90}
      />
    </>
  )
}

/** 模式二：驾驶飞船自由飞行、着陆 452b */
function FlightView({
  statsRef,
  onEvent,
  autoPilot,
  selected,
  onSelect,
  isMobile,
}: {
  statsRef: RefObject<FlightStats>
  onEvent: (ev: FlightEvent) => void
  autoPilot: boolean
  selected: string | null
  onSelect: (id: string | null) => void
  isMobile: boolean
}) {
  const glow = useTexture('/textures/glow.png')
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const terrainGeo = useMemo(() => getTerrainGeometry(), [])
  const planetTex = useMemo(() => getPlanetTexture(), [])
  const cloudTex = useMemo(() => getCloudTexture(), [])
  const beaconPos = useMemo(() => surfacePointAt(BEACON_DIR, new THREE.Vector3()), [])
  const atmosUniforms = useMemo(
    () => ({ uSunDir: { value: new THREE.Vector3(-500, 180, -380).normalize() } }),
    [],
  )
  const hotspotPos = useMemo(() => {
    const up = BEACON_DIR
    const side = new THREE.Vector3(0, 1, 0).cross(up).normalize()
    const at = (upK: number, sideK: number): [number, number, number] => {
      const v = new THREE.Vector3().copy(beaconPos).addScaledVector(up, upK).addScaledVector(side, sideK)
      return [v.x, v.y, v.z]
    }
    return { gravity: at(2.2, 2.5), sky: at(11, -3), honest: at(4.5, -6) }
  }, [beaconPos])

  // 飞船状态
  const pos = useRef(new THREE.Vector3(...SHIP_START))
  const vel = useRef(new THREE.Vector3(0, 0, 0))
  const yaw = useRef(0)
  const pitch = useRef(-0.18)
  const keys = useRef(new Set<string>())
  const landedRef = useRef(false)
  const successSent = useRef(false)
  const lastCrash = useRef(0)
  const apT = useRef(0)
  const wasAuto = useRef(autoPilot)

  const clouds = useRef<THREE.Mesh>(null!)
  const beaconGlow = useRef<THREE.Sprite>(null!)
  const starsG = useRef<THREE.Group>(null!)

  // 进近航线（自动着陆）：起点 → 信标高空 → 信标上方 → 触地
  const approach = useMemo(() => {
    const hi = tmpV1.copy(beaconPos).multiplyScalar(1.55).clone()
    const above = tmpV1.copy(beaconPos).multiplyScalar(1.09).clone()
    const down = tmpV1.copy(beaconPos).multiplyScalar(1.008).clone()
    return new THREE.CatmullRomCurve3([new THREE.Vector3(...SHIP_START), hi, above, down], false, 'centripetal')
  }, [beaconPos])

  // 键盘
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.code)
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // 拖拽转向
  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let lx = 0
    let ly = 0
    const pd = (e: PointerEvent) => {
      dragging = true
      lx = e.clientX
      ly = e.clientY
    }
    const pm = (e: PointerEvent) => {
      if (!dragging) return
      yaw.current -= (e.clientX - lx) * 0.0042
      pitch.current = Math.min(1.5, Math.max(-1.5, pitch.current - (e.clientY - ly) * 0.0042))
      lx = e.clientX
      ly = e.clientY
    }
    const pu = () => {
      dragging = false
    }
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    return () => {
      el.removeEventListener('pointerdown', pd)
      window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu)
    }
  }, [gl])

  // 大气（雾 + 天空底色），随高度从黑空过渡到金色霾；用声明式 attach + ref 驱动
  const fogRef = useRef<THREE.Fog>(null!)
  const bgRef = useRef<THREE.Color>(null!)

  useFrame((state, dt) => {
    const cdt = Math.min(dt, 0.1)
    const rNow = pos.current.length()
    const dirNow = tmpV3.copy(pos.current).divideScalar(rNow)

    if (autoPilot) {
      // 自动着陆：沿进近航线插值
      if (apT.current < 1) {
        apT.current = Math.min(1, apT.current + cdt / 22)
        const t = apT.current
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        approach.getPoint(ease, tmpV1)
        tmpV2.copy(tmpV1).sub(pos.current)
        if (tmpV2.lengthSq() > 1e-8) {
          tmpV2.normalize()
          yaw.current = Math.atan2(-tmpV2.x, -tmpV2.z)
          pitch.current = Math.asin(Math.min(1, Math.max(-1, tmpV2.y)))
        }
        pos.current.copy(tmpV1)
        vel.current.set(0, 0, 0)
      }
      landedRef.current = apT.current >= 1
      wasAuto.current = true
    } else {
      if (wasAuto.current) {
        // 刚从自动切回手动：清零速度，从当前位置接管
        vel.current.set(0, 0, 0)
        wasAuto.current = false
        if (apT.current < 1) landedRef.current = false
      }
      const k = keys.current
      tmpEuler.set(pitch.current, yaw.current, 0, 'YXZ')
      const fwd = tmpV1.set(0, 0, -1).applyEuler(tmpEuler)
      const right = tmpV2.set(1, 0, 0).applyEuler(tmpEuler)
      const boost = k.has('ShiftLeft') || k.has('ShiftRight') ? 3 : 1
      if (k.has('KeyW')) vel.current.addScaledVector(fwd, 10 * boost * cdt)
      if (k.has('KeyS')) vel.current.multiplyScalar(Math.max(0, 1 - 2.2 * cdt))
      if (k.has('KeyA')) vel.current.addScaledVector(right, -6 * cdt)
      if (k.has('KeyD')) vel.current.addScaledVector(right, 6 * cdt)
      vel.current.multiplyScalar(Math.max(0, 1 - 0.32 * cdt))
      // 引力（近行星才显著）
      if (rNow < GRAVITY_RANGE) {
        const g = GRAVITY_SURFACE * (PLANET_R / rNow) ** 2
        vel.current.addScaledVector(dirNow, -g * cdt)
      }
      pos.current.addScaledVector(vel.current, cdt)
      // 地表碰撞：低速触地=着陆，高速=弹起
      const r2 = pos.current.length()
      const dir2 = tmpV3.copy(pos.current).divideScalar(r2)
      const floor = PLANET_R + heightAt(dir2.x, dir2.y, dir2.z) * TERRAIN_AMP + 0.28
      if (r2 < floor) {
        pos.current.copy(dir2).multiplyScalar(floor)
        const vn = vel.current.dot(dir2)
        const speed = vel.current.length()
        if (speed < LAND_SPEED * 1.8 && Math.abs(vn) < LAND_SPEED) {
          landedRef.current = true
          vel.current.set(0, 0, 0)
        } else if (!landedRef.current) {
          vel.current.addScaledVector(dir2, -vn * 1.35)
          vel.current.multiplyScalar(0.7)
          const now = performance.now()
          if (now - lastCrash.current > 1500) {
            onEventRef.current('crash')
            lastCrash.current = now
          }
        }
      }
      if (landedRef.current) {
        pos.current.copy(dir2).multiplyScalar(floor)
        if (k.has('KeyW')) {
          landedRef.current = false
          vel.current.addScaledVector(dir2, 4)
        }
      }
    }

    // 相机就位
    camera.position.copy(pos.current)
    tmpEuler.set(pitch.current, yaw.current, 0, 'YXZ')
    camera.quaternion.setFromEuler(tmpEuler)

    // HUD 读数与成功判定
    const r3 = pos.current.length()
    const dir3 = tmpV3.copy(pos.current).divideScalar(r3)
    const h = heightAt(dir3.x, dir3.y, dir3.z)
    const altUnits = Math.max(0, r3 - PLANET_R - h * TERRAIN_AMP)
    statsRef.current.alt = altUnits * KM_PER_UNIT
    statsRef.current.speed = vel.current.length() * 120
    statsRef.current.beaconDist = pos.current.distanceTo(beaconPos) * KM_PER_UNIT
    statsRef.current.landed = landedRef.current
    if (landedRef.current && pos.current.distanceTo(beaconPos) < BEACON_CAPTURE && !successSent.current) {
      successSent.current = true
      onEventRef.current('success')
    }

    // 大气过渡
    const kAtmo = Math.min(1, Math.max(0, 1 - altUnits / 14))
    const c1 = tmpColor1.set('#02030a')
    const c2 = tmpColor2.set('#33436b')
    const c3 = tmpColor3.set('#c9a05e')
    if (kAtmo < 0.5) tmpColor1.lerpColors(c1, c2, kAtmo * 2)
    else tmpColor1.lerpColors(c2, c3, (kAtmo - 0.5) * 2)
    fogRef.current.color.copy(tmpColor1)
    bgRef.current.copy(tmpColor1)
    fogRef.current.near = 120 - (120 - 2) * kAtmo
    fogRef.current.far = 500 - (500 - 70) * kAtmo
    if (starsG.current) starsG.current.visible = altUnits > 4

    // 云层自转 + 信标脉动
    clouds.current.rotation.y += cdt * 0.004
    const pulse = 1 + 0.25 * Math.sin(state.clock.elapsedTime * 3)
    beaconGlow.current.scale.setScalar(3.2 * pulse)
  })

  const gravityH = FLIGHT_HOTSPOTS.find((h) => h.id === 'kgravity')!
  const skyH = FLIGHT_HOTSPOTS.find((h) => h.id === 'ksky')!
  const honestH = FLIGHT_HOTSPOTS.find((h) => h.id === 'khonest')!

  return (
    <>
      <color ref={bgRef} attach="background" args={['#02030a']} />
      <fog ref={fogRef} attach="fog" args={['#02030a', 60, 420]} />
      <group ref={starsG}>
        <Stars radius={700} depth={200} count={isMobile ? 2200 : 4500} factor={4} saturation={0} fade speed={0.3} />
      </group>
      <directionalLight position={[-500, 180, -380]} intensity={1.8} color="#fff2d8" />
      <ambientLight intensity={0.42} />
      {/* 天上的母恒星：从地表看和太阳几乎一样大（雾外常亮） */}
      <sprite position={[-500, 180, -380]} scale={[110, 110, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffd76e"
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </sprite>
      <sprite position={[-500, 180, -380]} scale={[30, 30, 1]}>
        <spriteMaterial
          map={glow}
          color="#fff3cf"
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </sprite>
      {/* 行星本体：地形 + 海洋壳 + 云层 + 大气边缘光 */}
      <mesh geometry={terrainGeo}>
        <meshStandardMaterial map={planetTex} roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh>
        <sphereGeometry args={[PLANET_R * 1.001, 96, 96]} />
        <meshStandardMaterial color="#2a6d9e" transparent opacity={0.9} roughness={0.12} metalness={0.08} />
      </mesh>
      <mesh ref={clouds} scale={[1.035, 1.035, 1.035]}>
        <sphereGeometry args={[PLANET_R, 96, 96]} />
        <meshStandardMaterial map={cloudTex} transparent opacity={0.8} depthWrite={false} roughness={1} />
      </mesh>
      <mesh scale={[1.035, 1.035, 1.035]}>
        <sphereGeometry args={[PLANET_R, 64, 64]} />
        <shaderMaterial
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={atmosUniforms}
          vertexShader={ATMOS_VERTEX}
          fragmentShader={ATMOS_FRAGMENT}
        />
      </mesh>
      {/* 着陆信标 */}
      <group position={beaconPos}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 3, 12]} />
          <meshBasicMaterial color="#ff9a3c" toneMapped={false} />
        </mesh>
        <sprite ref={beaconGlow} position={[0, 3.4, 0]}>
          <spriteMaterial
            map={glow}
            color="#ffb050"
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
      <HotspotLabel h={gravityH} selected={selected} onSelect={onSelect} offset={hotspotPos.gravity} />
      <HotspotLabel h={skyH} selected={selected} onSelect={onSelect} offset={hotspotPos.sky} />
      <HotspotLabel h={honestH} selected={selected} onSelect={onSelect} offset={hotspotPos.honest} />
    </>
  )
}

const tmpColor1 = new THREE.Color()
const tmpColor2 = new THREE.Color()
const tmpColor3 = new THREE.Color()

/** 凌日模式机位（飞行模式的相机由飞船全权接管） */
function TransitCameraRig() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3
    update(): void
  } | null
  useEffect(() => {
    if (!controls) return
    camera.position.set(0, 3.5, 36)
    controls.target.set(0, 0, 0)
    controls.update()
  }, [camera, controls])
  return null
}

export default function KeplerScene({
  mode,
  inclDeg,
  transitStats,
  flightStats,
  onEvent,
  autoPilot,
  selected,
  onSelect,
  isMobile,
}: {
  mode: KeplerMode
  inclDeg: number
  transitStats: RefObject<TransitStats>
  flightStats: RefObject<FlightStats>
  onEvent: (ev: FlightEvent) => void
  autoPilot: boolean
  selected: string | null
  onSelect: (id: string | null) => void
  isMobile: boolean
}) {
  return mode === 'transit' ? (
    <>
      <TransitView
        inclDeg={inclDeg}
        statsRef={transitStats}
        selected={selected}
        onSelect={onSelect}
        isMobile={isMobile}
      />
      <TransitCameraRig />
    </>
  ) : (
    <FlightView
      statsRef={flightStats}
      onEvent={onEvent}
      autoPilot={autoPilot}
      selected={selected}
      onSelect={onSelect}
      isMobile={isMobile}
    />
  )
}
