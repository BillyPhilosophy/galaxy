import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uPixelRatio;
attribute float aRand;
attribute float aSize;
attribute float aTint;
varying float vAlpha;
varying float vTint;
varying float vHeat;

void main() {
  vec3 seed = position;
  float r0 = length(seed);
  // 越靠近核心越早坍缩，核心粒子 vHeat 也越高
  float coreness = 1.0 - smoothstep(0.0, 34.0, r0);
  float delay = aRand * 0.35 * (1.0 - coreness * 0.7);
  float p = clamp((uProgress - delay) / (1.0 - delay), 0.0, 1.0);

  // 湍流漂移，坍缩接管后逐渐冻结
  vec3 drift = vec3(
    sin(uTime * 0.06 + seed.y * 0.31 + aRand * 6.2831),
    sin(uTime * 0.05 + seed.z * 0.27 + aRand * 4.0),
    sin(uTime * 0.055 + seed.x * 0.29 + aRand * 2.0)
  ) * 1.8 * (1.0 - p * 0.9);

  // 坍缩：半径收缩 + 内侧旋转更快（角动量守恒）
  float shrink = mix(1.0, 0.10, p);
  float swirl = p * 6.0 / (1.0 + r0 * 0.08);
  float cs = cos(swirl);
  float sn = sin(swirl);
  vec3 pos = seed;
  pos.xz = mat2(cs, -sn, sn, cs) * pos.xz;
  pos = pos * shrink + drift;

  vHeat = p * coreness;
  vTint = aTint;
  // 大云团半透明；粒子向中心汇聚后逐颗降透明度防止白曝
  float puff = smoothstep(4.0, 10.0, aSize);
  vAlpha = mix(0.55, 0.10, p) * (1.0 - puff * 0.72);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (160.0 / -mv.z) * mix(1.0, 0.55, p);
}
`

const FRAGMENT = /* glsl */ `
varying float vAlpha;
varying float vTint;
varying float vHeat;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.04, d) * vAlpha;
  if (a < 0.003) discard;
  vec3 violet = vec3(0.66, 0.50, 1.00);
  vec3 blue = vec3(0.34, 0.58, 1.00);
  vec3 pink = vec3(1.00, 0.44, 0.64);
  vec3 cold = vTint < 0.5
    ? mix(violet, blue, vTint * 2.0)
    : mix(blue, pink, vTint * 2.0 - 1.0);
  vec3 hot = vec3(1.0, 0.62, 0.24);
  gl_FragColor = vec4(mix(cold, hot, vHeat), a);
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
    if (kind < 0.15) {
      // 中心致密核球
      x = gauss() * 4
      y = gauss() * 4
      z = gauss() * 4
    } else if (kind < 0.75) {
      // 五条旋臂纤维丝
      const arm = Math.floor(Math.random() * 5)
      const t = Math.pow(Math.random(), 0.7)
      const ang = (arm / 5) * Math.PI * 2 + t * 2.6
      const r = 7 + t * 36
      x = Math.cos(ang) * r + gauss() * 2.4
      z = Math.sin(ang) * r + gauss() * 2.4
      y = gauss() * (1.6 + t * 2.6)
    } else {
      // 外围弥散光晕
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r = 13 + Math.random() * 33
      x = r * Math.sin(ph) * Math.cos(th)
      y = r * Math.cos(ph) * 0.7
      z = r * Math.sin(ph) * Math.sin(th)
    }
    positions.set([x, y, z], i * 3)
    rands[i] = Math.random()
    // 3% 大而软的云团，增加体积感
    sizes[i] = Math.random() < 0.03 ? 8 + Math.random() * 10 : 0.6 + Math.random() * 1.8
    tints[i] = Math.random()
  }
  return { positions, rands, sizes, tints }
}

function NebulaParticles({ progressRef, count }: { progressRef: RefObject<number>; count: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const dpr = useThree((s) => s.viewport.dpr)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const { positions, rands, sizes, tints } = buildNebula(count)
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
      uProgress: { value: 0 },
      uPixelRatio: { value: dpr },
    }),
    [dpr],
  )

  useFrame((state) => {
    const m = matRef.current
    m.uniforms.uTime.value = state.clock.elapsedTime
    m.uniforms.uProgress.value += (progressRef.current - m.uniforms.uProgress.value) * 0.06
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
      />
    </points>
  )
}

const COLD_CORE = new THREE.Color('#8b7ff0')
const HOT_CORE = new THREE.Color('#ff8f3c')

function CoreGlow({ progressRef }: { progressRef: RefObject<number> }) {
  const s1 = useRef<THREE.Sprite>(null!)
  const s2 = useRef<THREE.Sprite>(null!)
  const star = useRef<THREE.Mesh>(null!)
  const glow = useTexture('/textures/glow.png')
  const tmp = useMemo(() => new THREE.Color(), [])
  const smooth = useRef(0)

  useFrame(() => {
    smooth.current += (progressRef.current - smooth.current) * 0.06
    const p = smooth.current
    tmp.copy(COLD_CORE).lerp(HOT_CORE, p)
    s1.current.scale.setScalar(10 + p * 26)
    s1.current.material.color.copy(tmp)
    s1.current.material.opacity = 0.26 + p * 0.62
    s2.current.scale.setScalar(22 + p * 60)
    s2.current.material.color.copy(tmp)
    s2.current.material.opacity = 0.1 + p * 0.18
    // 坍缩尾声：原恒星亮起
    const born = THREE.MathUtils.clamp((p - 0.8) / 0.2, 0, 1)
    star.current.visible = born > 0
    star.current.scale.setScalar(0.6 + born * 1.6)
    ;(star.current.material as THREE.MeshBasicMaterial).opacity = born
  })

  return (
    <>
      <sprite ref={s1}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.26}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={s2}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <mesh ref={star} visible={false}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} transparent opacity={0} />
      </mesh>
    </>
  )
}

export default function NebulaScene({
  progressRef,
  count,
}: {
  progressRef: RefObject<number>
  count: number
}) {
  return (
    <>
      <color attach="background" args={['#020204']} />
      <Stars radius={260} depth={120} count={5000} factor={4} saturation={0} fade speed={0.3} />
      <NebulaParticles progressRef={progressRef} count={count} />
      <CoreGlow progressRef={progressRef} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.8}
        minDistance={20}
        maxDistance={240}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </>
  )
}
