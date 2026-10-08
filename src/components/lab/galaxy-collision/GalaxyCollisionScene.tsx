import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  buildCollisionBuffers,
  cameraTrackFor,
  COLLISION_STAGE_MARKS,
  OUTCOME_CONFIGS,
  stageIndexAt,
  sunTrackFor,
} from './data'
import type { OutcomeId } from './data'

export type CollisionViewMode = 'sky' | 'cosmic' | 'future'

const COLLISION_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uPixelRatio;
uniform float uBurstBoost;
attribute vec3 aStage1;
attribute vec3 aStage2;
attribute vec3 aStage3;
attribute vec3 aStage4;
attribute vec3 aStage5;
attribute vec3 aColor;
attribute float aSize;
attribute float aRand;
attribute float aBurst;
varying vec3 vColor;
varying float vAlpha;

float ease(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

void main() {
  vec3 p;
  float localT;
  if (uProgress < 0.16) {
    localT = ease(uProgress / 0.16);
    p = mix(position, aStage1, localT);
  } else if (uProgress < 0.34) {
    localT = ease((uProgress - 0.16) / 0.18);
    p = mix(aStage1, aStage2, localT);
  } else if (uProgress < 0.52) {
    localT = ease((uProgress - 0.34) / 0.18);
    p = mix(aStage2, aStage3, localT);
  } else if (uProgress < 0.72) {
    localT = ease((uProgress - 0.52) / 0.20);
    p = mix(aStage3, aStage4, localT);
  } else {
    localT = ease((uProgress - 0.72) / 0.28);
    p = mix(aStage4, aStage5, localT);
  }

  float encounter = smoothstep(0.18, 0.36, uProgress) * (1.0 - smoothstep(0.88, 1.0, uProgress));
  float newborn = min(1.0, aBurst * uBurstBoost) * encounter;
  vColor = mix(aColor, vec3(0.75, 0.95, 1.0), newborn * 0.42);
  vAlpha = 0.66 + 0.34 * sin(uTime * (0.45 + aRand) + aRand * 6.2831);
  vAlpha += newborn * (0.35 + 0.25 * sin(uTime * 3.0 + aRand * 20.0));

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * (1.0 + newborn * 2.2) * uPixelRatio * (220.0 / max(1.0, -mv.z));
}
`

const POINT_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.06, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
}
`

const SKY_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uPixelRatio;
attribute float aSize;
attribute float aRand;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float spread = mix(0.4, 7.2, smoothstep(0.0, 0.38, uProgress));
  vec3 p = position * spread;
  p.z *= 0.22;
  p.x += sin(aRand * 20.0 + uProgress * 4.0) * uProgress * 0.18;
  vColor = aColor;
  vAlpha = 0.72 + 0.28 * sin(uTime * 0.55 + aRand * 18.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (115.0 / max(1.0, -mv.z));
}
`

interface PointProps {
  progressRef: RefObject<number>
  count: number
}

function CollisionPoints({ progressRef, count, outcome }: PointProps & { outcome: OutcomeId }) {
  const material = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((state) => state.viewport.dpr)
  const data = useMemo(() => buildCollisionBuffers(count, outcome), [count, outcome])
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(data.stages[0], 3))
    for (let i = 1; i < data.stages.length; i++) {
      result.setAttribute(`aStage${i}`, new THREE.BufferAttribute(data.stages[i], 3))
    }
    result.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3))
    result.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1))
    result.setAttribute('aRand', new THREE.BufferAttribute(data.rands, 1))
    result.setAttribute('aBurst', new THREE.BufferAttribute(data.bursts, 1))
    return result
  }, [data])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPixelRatio: { value: dpr },
      uBurstBoost: { value: 1 },
    }),
    [dpr],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => {
    material.current.uniforms.uBurstBoost.value = OUTCOME_CONFIGS[outcome].burstBoost
  }, [outcome])
  useFrame((state) => {
    material.current.uniforms.uTime.value = state.clock.elapsedTime
    material.current.uniforms.uProgress.value = progressRef.current ?? 0
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={COLLISION_VERTEX}
        fragmentShader={POINT_FRAGMENT}
      />
    </points>
  )
}

function buildStars(count: number) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const rands = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const theta = i * 2.399963 + (i % 17) * 0.13
    const y = 1 - ((i + 0.5) / count) * 2
    const radius = Math.sqrt(1 - y * y)
    const distance = 420 + ((i * 71) % 240)
    positions.set([Math.cos(theta) * radius * distance, y * distance, Math.sin(theta) * radius * distance], i * 3)
    const warm = i % 13 === 0
    colors.set(warm ? [0.95, 0.76, 0.58] : [0.66, 0.76, 1], i * 3)
    sizes[i] = i % 29 === 0 ? 2.2 : 0.65 + (i % 7) * 0.08
    rands[i] = ((i * 37) % 101) / 101
  }
  return { positions, colors, sizes, rands }
}

function BackgroundStars({ count }: { count: number }) {
  const data = useMemo(() => buildStars(count), [count])
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    result.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3))
    result.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1))
    result.setAttribute('aRand', new THREE.BufferAttribute(data.rands, 1))
    return result
  }, [data])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ uTime: { value: 0 }, uProgress: { value: 0 }, uPixelRatio: { value: 1 } }}
        vertexShader={/* glsl */ `
          attribute vec3 aColor;
          attribute float aSize;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vColor = aColor;
            vAlpha = 0.75;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = aSize;
          }
        `}
        fragmentShader={POINT_FRAGMENT}
      />
    </points>
  )
}

function buildSkyGalaxy(count: number, warm: boolean) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const rands = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const r = Math.pow(((i * 47) % count) / count, warm ? 1.9 : 1.6) * 7
    const arm = i % 2
    const angle = arm * Math.PI + r * (warm ? 0.5 : 1.25) + Math.sin(i * 12.9898) * 0.22
    positions.set([Math.cos(angle) * r, Math.sin(i * 3.17) * (0.22 + r * 0.055), Math.sin(angle) * r], i * 3)
    const core = r < 1.5
    if (warm) colors.set(core ? [1, 0.82, 0.6] : [0.95, 0.72, 0.66], i * 3)
    else colors.set(core ? [1, 0.84, 0.68] : [0.67, 0.74, 1], i * 3)
    sizes[i] = core ? 2.1 : 0.7 + (i % 5) * 0.16
    rands[i] = ((i * 31) % 97) / 97
  }
  return { positions, colors, sizes, rands }
}

interface SkyGalaxyProps extends PointProps {
  warm?: boolean
  fixedProgress?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}

function SkyAndromeda({
  progressRef,
  count,
  warm = false,
  fixedProgress,
  position,
  rotation,
  scale,
}: SkyGalaxyProps) {
  const material = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((state) => state.viewport.dpr)
  const data = useMemo(() => buildSkyGalaxy(count, warm), [count, warm])
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    result.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3))
    result.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1))
    result.setAttribute('aRand', new THREE.BufferAttribute(data.rands, 1))
    return result
  }, [data])
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uProgress: { value: 0 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((state) => {
    material.current.uniforms.uTime.value = state.clock.elapsedTime
    material.current.uniforms.uProgress.value = fixedProgress ?? progressRef.current ?? 0
  })

  return (
    <points geometry={geometry} frustumCulled={false} position={position} rotation={rotation} scale={scale}>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={SKY_VERTEX}
        fragmentShader={POINT_FRAGMENT}
      />
    </points>
  )
}

const HORIZON_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const HORIZON_FRAGMENT = /* glsl */ `
varying vec2 vUv;
uniform vec3 uColor;
void main() {
  float a = smoothstep(1.0, 0.55, vUv.y);
  vec3 col = uColor + vec3(0.035, 0.045, 0.085) * smoothstep(0.35, 0.8, vUv.y);
  gl_FragColor = vec4(col, a);
}
`

/** 地平线剪影：底部不透明、向上平滑消隐，避免硬边接缝 */
function Horizon({ color }: { color: string }) {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(color) } }), [color])
  return (
    <mesh position={[0, -18, -80]}>
      <planeGeometry args={[240, 52]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={HORIZON_VERTEX}
        fragmentShader={HORIZON_FRAGMENT}
      />
    </mesh>
  )
}

function segmentAt(progress: number) {
  const stage = Math.min(stageIndexAt(progress), COLLISION_STAGE_MARKS.length - 2)
  const start = COLLISION_STAGE_MARKS[stage]
  const end = COLLISION_STAGE_MARKS[stage + 1]
  const raw = (progress - start) / (end - start)
  const t = Math.min(1, Math.max(0, raw))
  return { stage, t: t * t * (3 - 2 * t) }
}

function currentSun(progress: number, track: THREE.Vector3[], out: THREE.Vector3) {
  if (progress >= 1) return out.copy(track[track.length - 1])
  const { stage, t } = segmentAt(progress)
  return out.lerpVectors(track[stage], track[stage + 1], t)
}

function DirectorRig({
  progressRef,
  viewMode,
  focusSun,
  outcome,
  interactionRef,
  reducedMotion,
}: {
  progressRef: RefObject<number>
  viewMode: CollisionViewMode
  focusSun: boolean
  outcome: OutcomeId
  interactionRef: RefObject<number>
  reducedMotion: boolean
}) {
  const desiredPosition = useMemo(() => new THREE.Vector3(), [])
  const desiredTarget = useMemo(() => new THREE.Vector3(), [])
  const sun = useMemo(() => new THREE.Vector3(), [])
  const sunOffset = useMemo(() => new THREE.Vector3(36, 26, 52), [])
  const desiredQuat = useMemo(() => new THREE.Quaternion(), [])
  const lookMatrix = useMemo(() => new THREE.Matrix4(), [])
  const camTrack = useMemo(() => cameraTrackFor(outcome), [outcome])
  const sunTrack = useMemo(() => sunTrackFor(outcome), [outcome])

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera
    const progress = progressRef.current ?? 0
    if (viewMode === 'sky') {
      desiredPosition.set(0, 4, 18)
      desiredTarget.set(0, 7, -72)
    } else if (viewMode === 'future') {
      desiredPosition.set(0, 6, 20)
      desiredTarget.set(0, 16, -72)
    } else if (focusSun) {
      currentSun(progress, sunTrack, sun)
      desiredTarget.copy(sun)
      desiredPosition.copy(sun).add(sunOffset)
    } else {
      const { stage, t } = segmentAt(progress)
      desiredPosition.lerpVectors(camTrack.positions[stage], camTrack.positions[stage + 1], t)
      desiredTarget.lerpVectors(camTrack.targets[stage], camTrack.targets[stage + 1], t)
    }

    if ((interactionRef.current ?? 0) > 0 && viewMode === 'cosmic' && !focusSun) {
      interactionRef.current = Math.max(0, (interactionRef.current ?? 0) - delta)
      return
    }

    const positionK = reducedMotion ? 1 : 1 - Math.exp(-delta * 2.2)
    const rotationK = reducedMotion ? 1 : 1 - Math.exp(-delta * 3.5)
    camera.position.lerp(desiredPosition, positionK)
    lookMatrix.lookAt(camera.position, desiredTarget, camera.up)
    desiredQuat.setFromRotationMatrix(lookMatrix)
    camera.quaternion.slerp(desiredQuat, rotationK)
    const targetFov = viewMode === 'sky' ? 52 : viewMode === 'future' ? 58 : focusSun ? 50 : 50 + Math.sin(progress * Math.PI) * 8
    if (Math.abs(camera.fov - targetFov) > 0.02) {
      camera.fov += (targetFov - camera.fov) * positionK
      camera.updateProjectionMatrix()
    }
  })
  return null
}

function SunBeacon({
  progressRef,
  visible,
  track,
}: {
  progressRef: RefObject<number>
  visible: boolean
  track: THREE.Vector3[]
}) {
  const group = useRef<THREE.Group>(null!)
  const ring = useRef<THREE.Mesh>(null!)
  const sun = useMemo(() => new THREE.Vector3(), [])
  useFrame((state) => {
    currentSun(progressRef.current ?? 0, track, sun)
    group.current.position.copy(sun)
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.16
    ring.current.scale.setScalar(pulse)
  })
  return (
    <group ref={group} visible={visible}>
      <mesh>
        <sphereGeometry args={[1.05, 12, 12]} />
        <meshBasicMaterial color="#ffd86f" toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 2.4, 40]} />
        <meshBasicMaterial color="#ffd86f" transparent opacity={0.72} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function GalaxyCollisionScene({
  progressRef,
  viewMode,
  count,
  focusSun,
  reducedMotion,
  outcome,
}: {
  progressRef: RefObject<number>
  viewMode: CollisionViewMode
  count: number
  focusSun: boolean
  reducedMotion: boolean
  outcome: OutcomeId
}) {
  const interactionRef = useRef(0)
  const cosmic = viewMode === 'cosmic'
  const skyLike = viewMode === 'sky' || viewMode === 'future'
  const sunTrack = useMemo(() => sunTrackFor(outcome), [outcome])

  return (
    <>
      <color attach="background" args={[skyLike ? '#03040a' : '#010104']} />
      <BackgroundStars count={skyLike ? 1700 : 1100} />
      {cosmic ? (
        <CollisionPoints progressRef={progressRef} count={count} outcome={outcome} />
      ) : viewMode === 'future' ? (
        <>
          <SkyAndromeda
            progressRef={progressRef}
            count={Math.max(4200, Math.floor(count * 0.14))}
            warm
            fixedProgress={1}
            position={[0, 18, -74]}
            rotation={[0.38, -0.08, -0.12]}
            scale={2.3}
          />
          <Horizon color="#070509" />
        </>
      ) : (
        <>
          <SkyAndromeda
            progressRef={progressRef}
            count={Math.max(3500, Math.floor(count * 0.12))}
            position={[4, 7, -72]}
            rotation={[0.17, -0.15, -0.2]}
          />
          <Horizon color="#05070d" />
        </>
      )}
      <SunBeacon progressRef={progressRef} visible={cosmic && focusSun} track={sunTrack} />
      <DirectorRig
        progressRef={progressRef}
        viewMode={viewMode}
        focusSun={focusSun}
        outcome={outcome}
        interactionRef={interactionRef}
        reducedMotion={reducedMotion}
      />
      <OrbitControls
        makeDefault
        key={viewMode}
        enabled={cosmic && !focusSun}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.48}
        zoomSpeed={0.7}
        minDistance={45}
        maxDistance={420}
        autoRotate={cosmic && !reducedMotion && !focusSun}
        autoRotateSpeed={0.12}
        onStart={() => {
          interactionRef.current = 4
        }}
        onEnd={() => {
          interactionRef.current = 3
        }}
      />
    </>
  )
}
