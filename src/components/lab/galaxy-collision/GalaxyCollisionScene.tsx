import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { buildCollisionBuffers, COLLISION_STAGE_MARKS, stageIndexAt } from './data'

export type CollisionViewMode = 'sky' | 'cosmic'

const COLLISION_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uPixelRatio;
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
  float newborn = aBurst * encounter;
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

function CollisionPoints({ progressRef, count }: PointProps) {
  const material = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((state) => state.viewport.dpr)
  const data = useMemo(() => buildCollisionBuffers(count), [count])
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
    () => ({ uTime: { value: 0 }, uProgress: { value: 0 }, uPixelRatio: { value: dpr } }),
    [dpr],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
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

function buildSkyGalaxy(count: number) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const rands = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const r = Math.pow(((i * 47) % count) / count, 1.6) * 7
    const arm = i % 2
    const angle = arm * Math.PI + r * 1.25 + Math.sin(i * 12.9898) * 0.22
    positions.set([Math.cos(angle) * r, Math.sin(i * 3.17) * (0.22 + r * 0.055), Math.sin(angle) * r], i * 3)
    const core = r < 1.5
    colors.set(core ? [1, 0.84, 0.68] : [0.67, 0.74, 1], i * 3)
    sizes[i] = core ? 2.1 : 0.7 + (i % 5) * 0.16
    rands[i] = ((i * 31) % 97) / 97
  }
  return { positions, colors, sizes, rands }
}

function SkyAndromeda({ progressRef, count }: PointProps) {
  const material = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((state) => state.viewport.dpr)
  const data = useMemo(() => buildSkyGalaxy(count), [count])
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
    material.current.uniforms.uProgress.value = progressRef.current ?? 0
  })

  return (
    <points position={[4, 7, -72]} rotation={[0.17, -0.15, -0.2]} geometry={geometry} frustumCulled={false}>
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

const CAMERA_POSITIONS = [
  new THREE.Vector3(0, 94, 270),
  new THREE.Vector3(0, 82, 225),
  new THREE.Vector3(0, 58, 175),
  new THREE.Vector3(85, 55, 195),
  new THREE.Vector3(-55, 70, 170),
  new THREE.Vector3(0, 92, 205),
]
const CAMERA_TARGETS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(28, 0, 2),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
]
const SUN_TRACK = [
  new THREE.Vector3(-91, 0, 19),
  new THREE.Vector3(-58, 0, 13),
  new THREE.Vector3(-8, 1, 7),
  new THREE.Vector3(107, 5, 22),
  new THREE.Vector3(31, 2, 9),
  new THREE.Vector3(34, 12, 19),
]

function segmentAt(progress: number) {
  const stage = Math.min(stageIndexAt(progress), COLLISION_STAGE_MARKS.length - 2)
  const start = COLLISION_STAGE_MARKS[stage]
  const end = COLLISION_STAGE_MARKS[stage + 1]
  const raw = (progress - start) / (end - start)
  const t = Math.min(1, Math.max(0, raw))
  return { stage, t: t * t * (3 - 2 * t) }
}

function currentSun(progress: number, out: THREE.Vector3) {
  if (progress >= 1) return out.copy(SUN_TRACK[SUN_TRACK.length - 1])
  const { stage, t } = segmentAt(progress)
  return out.lerpVectors(SUN_TRACK[stage], SUN_TRACK[stage + 1], t)
}

function DirectorRig({
  progressRef,
  viewMode,
  focusSun,
  interactionRef,
  reducedMotion,
}: {
  progressRef: RefObject<number>
  viewMode: CollisionViewMode
  focusSun: boolean
  interactionRef: RefObject<number>
  reducedMotion: boolean
}) {
  const desiredPosition = useMemo(() => new THREE.Vector3(), [])
  const desiredTarget = useMemo(() => new THREE.Vector3(), [])
  const sun = useMemo(() => new THREE.Vector3(), [])
  const sunOffset = useMemo(() => new THREE.Vector3(20, 15, 28), [])
  const desiredQuat = useMemo(() => new THREE.Quaternion(), [])
  const lookMatrix = useMemo(() => new THREE.Matrix4(), [])

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera
    const progress = progressRef.current ?? 0
    if (viewMode === 'sky') {
      desiredPosition.set(0, 4, 18)
      desiredTarget.set(0, 7, -72)
    } else if (focusSun) {
      currentSun(progress, sun)
      desiredTarget.copy(sun)
      desiredPosition.copy(sun).add(sunOffset)
    } else {
      const { stage, t } = segmentAt(progress)
      desiredPosition.lerpVectors(CAMERA_POSITIONS[stage], CAMERA_POSITIONS[stage + 1], t)
      desiredTarget.lerpVectors(CAMERA_TARGETS[stage], CAMERA_TARGETS[stage + 1], t)
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
    const targetFov = viewMode === 'sky' ? 52 : focusSun ? 48 : 50 + Math.sin(progress * Math.PI) * 8
    if (Math.abs(camera.fov - targetFov) > 0.02) {
      camera.fov += (targetFov - camera.fov) * positionK
      camera.updateProjectionMatrix()
    }
  })
  return null
}

function SunBeacon({ progressRef, visible }: { progressRef: RefObject<number>; visible: boolean }) {
  const group = useRef<THREE.Group>(null!)
  const ring = useRef<THREE.Mesh>(null!)
  const sun = useMemo(() => new THREE.Vector3(), [])
  useFrame((state) => {
    currentSun(progressRef.current ?? 0, sun)
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
}: {
  progressRef: RefObject<number>
  viewMode: CollisionViewMode
  count: number
  focusSun: boolean
  reducedMotion: boolean
}) {
  const interactionRef = useRef(0)
  const cosmic = viewMode === 'cosmic'

  return (
    <>
      <color attach="background" args={[viewMode === 'sky' ? '#03040a' : '#010104']} />
      <BackgroundStars count={viewMode === 'sky' ? 1700 : 1100} />
      {cosmic ? (
        <CollisionPoints progressRef={progressRef} count={count} />
      ) : (
        <>
          <SkyAndromeda progressRef={progressRef} count={Math.max(3500, Math.floor(count * 0.12))} />
          <mesh position={[0, -18, -80]}>
            <planeGeometry args={[240, 44]} />
            <meshBasicMaterial color="#05070d" />
          </mesh>
        </>
      )}
      <SunBeacon progressRef={progressRef} visible={cosmic && focusSun} />
      <DirectorRig
        progressRef={progressRef}
        viewMode={viewMode}
        focusSun={focusSun}
        interactionRef={interactionRef}
        reducedMotion={reducedMotion}
      />
      <OrbitControls
        makeDefault
        key={viewMode}
        enabled={cosmic}
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
