import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  BODY_COLORS,
  divergence,
  ejectedIndex,
  energyOf,
  GHOST_COLOR,
  makeBodies,
  makeGhost,
  minSeparation,
  verletStep,
} from './threeBodyData'
import type { TBody, ThreeBodyMode } from './threeBodyData'

const DT = 0.004
const SUBSTEPS = 12
const TRAIL_N = 700
/** 速度箭头比例：1 场景单位箭头 = 0.35 速度 */
const ARROW_SCALE = 1 / 0.35

export interface SimStats {
  t: number
  minSep: number
  drift: number
  div: number
}

interface SimState {
  bodies: TBody[]
  ghost: TBody[] | null
  t: number
  e0: number
  ejected: boolean
}

type Scratch = [number, number, number][]
function makeScratch(): Scratch {
  return [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
}

/** 单个系统（本体 + 拖尾），位置每帧由积分器写入 */
function SystemVisual({
  simRef,
  ghost,
  hidden,
  resetKey,
}: {
  simRef: RefObject<SimState>
  ghost: boolean
  hidden: boolean
  resetKey: string
}) {
  const glow = useTexture('/textures/glow.png')
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const glows = useRef<(THREE.Sprite | null)[]>([])
  const counts = useRef([0, 0, 0])

  // 有序平移缓冲：copyWithin 左移 + 末尾写入，零拷贝绑定
  const hist = useMemo(() => [0, 1, 2].map(() => new Float32Array(TRAIL_N * 3)), [])
  const lineObjs = useMemo(
    () =>
      hist.map((h) => {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.BufferAttribute(h, 3))
        g.setDrawRange(0, 0)
        const l = new THREE.Line(
          g,
          new THREE.LineBasicMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        )
        l.frustumCulled = false
        return l
      }),
    [hist],
  )
  useEffect(() => {
    lineObjs.forEach((l, i) => {
      const m = l.material as THREE.LineBasicMaterial
      m.color.set(ghost ? GHOST_COLOR : BODY_COLORS[i])
      m.opacity = ghost ? 0.3 : 0.55
    })
  }, [lineObjs, ghost])
  useEffect(
    () => () =>
      lineObjs.forEach((l) => {
        l.geometry.dispose()
        ;(l.material as THREE.Material).dispose()
      }),
    [lineObjs],
  )

  useEffect(() => {
    counts.current = [0, 0, 0]
    lineObjs.forEach((l) => l.geometry.setDrawRange(0, 0))
  }, [resetKey, lineObjs])

  useFrame(() => {
    const list = ghost ? simRef.current.ghost : simRef.current.bodies
    if (!list) return
    list.forEach((b, i) => {
      meshes.current[i]?.position.set(b.p[0], b.p[1], b.p[2])
      glows.current[i]?.position.set(b.p[0], b.p[1], b.p[2])
      if (hidden) return
      const line = lineObjs[i]
      const h = hist[i]
      const total = counts.current[i]
      if (total >= TRAIL_N) h.copyWithin(0, 3)
      const idx = Math.min(total, TRAIL_N - 1)
      h[idx * 3] = b.p[0]
      h[idx * 3 + 1] = b.p[1]
      h[idx * 3 + 2] = b.p[2]
      counts.current[i] = total + 1
      line.geometry.setDrawRange(0, Math.min(total + 1, TRAIL_N))
      ;(line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    })
  })

  const color = (i: number) => (ghost ? GHOST_COLOR : BODY_COLORS[i])

  return (
    <>
      {[0, 1, 2].map((i) => (
        <group key={i} visible={!hidden}>
          <mesh
            ref={(el) => {
              meshes.current[i] = el
            }}
          >
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshBasicMaterial color={color(i)} toneMapped={false} />
          </mesh>
          <sprite
            ref={(el) => {
              glows.current[i] = el
            }}
            scale={[1.1, 1.1, 1]}
          >
            <spriteMaterial
              map={glow}
              color={color(i)}
              transparent
              opacity={ghost ? 0.3 : 0.6}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <primitive object={lineObjs[i]} />
        </group>
      ))}
    </>
  )
}

/** 沙盒编辑：星体拖拽定位 + 速度箭头尖端拖拽调速度 */
function SandboxEditor({
  customRef,
  editing,
}: {
  customRef: RefObject<TBody[]>
  editing: boolean
}) {
  const glow = useTexture('/textures/glow.png')
  const dragRef = useRef<{ kind: 'body' | 'tip'; i: number } | null>(null)
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const sprites = useRef<(THREE.Sprite | null)[]>([])
  const tips = useRef<(THREE.Mesh | null)[]>([])
  const arrows = useRef<(THREE.ArrowHelper | null)[]>([])
  const dirV = useMemo(() => new THREE.Vector3(), [])
  const tipV = useMemo(() => new THREE.Vector3(), [])
  const controlsState = useThree((s) => s.controls) as { enabled: boolean } | null
  const controlsRef = useRef(controlsState)
  useEffect(() => {
    controlsRef.current = controlsState
  }, [controlsState])

  useFrame(() => {
    if (!editing) return
    customRef.current.forEach((b, i) => {
      meshes.current[i]?.position.set(b.p[0], b.p[1], b.p[2])
      sprites.current[i]?.position.set(b.p[0], b.p[1], b.p[2])
      tipV.set(
        b.p[0] + b.v[0] * ARROW_SCALE,
        b.p[1] + b.v[1] * ARROW_SCALE,
        b.p[2] + b.v[2] * ARROW_SCALE,
      )
      tips.current[i]?.position.copy(tipV)
      const arrow = arrows.current[i]
      if (arrow) {
        dirV.set(b.v[0], b.v[1], b.v[2])
        const len = dirV.length() * ARROW_SCALE
        arrow.position.set(b.p[0], b.p[1], b.p[2])
        if (len > 1e-4) {
          arrow.setDirection(dirV.normalize())
          arrow.setLength(len, 0.25, 0.15)
          arrow.visible = true
        } else {
          arrow.visible = false
        }
      }
    })
  })

  if (!editing) return null

  const endDrag = () => {
    dragRef.current = null
    if (controlsRef.current) controlsRef.current.enabled = true
  }

  return (
    <>
      {/* 隐形拖拽平面（XZ） */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          const drag = dragRef.current
          if (!drag) return
          const b = customRef.current[drag.i]
          if (drag.kind === 'body') {
            b.p = [e.point.x, 0, e.point.z]
          } else {
            b.v = [
              (e.point.x - b.p[0]) / ARROW_SCALE,
              0,
              (e.point.z - b.p[2]) / ARROW_SCALE,
            ]
          }
        }}
        onPointerUp={endDrag}
      >
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              meshes.current[i] = el
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              dragRef.current = { kind: 'body', i }
              if (controlsRef.current) controlsRef.current.enabled = false
            }}
          >
            <sphereGeometry args={[0.2, 24, 24]} />
            <meshBasicMaterial color={BODY_COLORS[i]} toneMapped={false} />
          </mesh>
          <sprite
            ref={(el) => {
              sprites.current[i] = el
            }}
            scale={[1.3, 1.3, 1]}
          >
            <spriteMaterial
              map={glow}
              color={BODY_COLORS[i]}
              transparent
              opacity={0.6}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <arrowHelper
            ref={(el) => {
              arrows.current[i] = el
            }}
            args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.5, BODY_COLORS[i], 0.25, 0.15]}
          />
          <mesh
            ref={(el) => {
              tips.current[i] = el
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              dragRef.current = { kind: 'tip', i }
              if (controlsRef.current) controlsRef.current.enabled = false
            }}
          >
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshBasicMaterial
              color={BODY_COLORS[i]}
              toneMapped={false}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

export default function ThreeBodyScene({
  mode,
  runId,
  editing,
  customRef,
  statsRef,
  onEjectRef,
}: {
  mode: ThreeBodyMode
  runId: number
  editing: boolean
  customRef: RefObject<TBody[]>
  statsRef: RefObject<SimStats>
  onEjectRef: RefObject<(() => void) | null>
}) {
  const simRef = useRef<SimState>({ bodies: [], ghost: null, t: 0, e0: 0, ejected: false })
  const a0 = useRef<Scratch>(makeScratch())
  const a1 = useRef<Scratch>(makeScratch())

  // 模式切换 / 重开 / 沙盒起跑：重置积分器
  useEffect(() => {
    const bodies = makeBodies(mode, customRef.current)
    simRef.current = {
      bodies,
      ghost: mode === 'butterfly' ? makeGhost(bodies) : null,
      t: 0,
      e0: energyOf(bodies),
      ejected: false,
    }
  }, [mode, runId, customRef])

  useFrame((_, delta) => {
    if (delta > 0.1) return // 掉帧保护
    if (editing) return
    const sim = simRef.current
    if (!sim.bodies.length) return
    for (let s = 0; s < SUBSTEPS; s++) {
      verletStep(sim.bodies, DT, a0.current, a1.current)
      if (sim.ghost) verletStep(sim.ghost, DT, a0.current, a1.current)
    }
    sim.t += DT * SUBSTEPS
    if (!sim.ejected && (mode === 'chaos' || mode === 'custom')) {
      if (ejectedIndex(sim.bodies) >= 0) {
        sim.ejected = true
        onEjectRef.current?.()
      }
    }
    const stats = statsRef.current
    stats.t = sim.t
    stats.minSep = minSeparation(sim.bodies)
    stats.drift = Math.abs((energyOf(sim.bodies) - sim.e0) / sim.e0)
    stats.div = sim.ghost ? divergence(sim.bodies, sim.ghost) : 0
  })

  const resetKey = `${mode}-${runId}`

  return (
    <>
      <color attach="background" args={['#020204']} />
      <SystemVisual simRef={simRef} ghost={false} hidden={editing} resetKey={resetKey} />
      {mode === 'butterfly' && (
        <SystemVisual simRef={simRef} ghost hidden={editing} resetKey={resetKey} />
      )}
      <SandboxEditor customRef={customRef} editing={editing} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.8}
        minDistance={2}
        maxDistance={80}
      />
    </>
  )
}
