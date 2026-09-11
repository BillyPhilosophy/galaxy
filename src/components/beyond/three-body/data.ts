export type ThreeBodyMode = 'figure8' | 'lagrange' | 'chaos' | 'butterfly' | 'custom'

export interface TBody {
  p: [number, number, number]
  v: [number, number, number]
  m: number
}

export const BODY_COLORS = ['#f2f2f4', '#7de3ff', '#ff9a5c']
export const GHOST_COLOR = '#ff8f0c'

export const MODE_META: Record<ThreeBodyMode, { label: string; short: string; en: string; era: string }> = {
  figure8: { label: '8 字轨道', short: '8字', en: 'FIGURE-8 ORBIT', era: '恒纪元' },
  lagrange: { label: '拉格朗日三角', short: '三角', en: 'LAGRANGE TRIANGLE', era: '恒纪元' },
  chaos: { label: '混沌乱舞', short: '混沌', en: 'CHAOTIC DANCE', era: '乱纪元' },
  butterfly: { label: '蝴蝶效应', short: '蝴蝶', en: 'BUTTERFLY EFFECT', era: '乱纪元' },
  custom: { label: '自定义沙盒', short: '沙盒', en: 'SANDBOX', era: '乱纪元' },
}

const clone = (b: TBody): TBody => ({ p: [...b.p], v: [...b.v], m: b.m })

/** Chenciner–Montgomery 8 字轨道（G = m = 1），周期 T ≈ 6.33 */
const FIGURE8: TBody[] = [
  { p: [-0.97000436, 0, 0.24308753], v: [0.466203685, 0, 0.43236573], m: 1 },
  { p: [0.97000436, 0, -0.24308753], v: [0.466203685, 0, 0.43236573], m: 1 },
  { p: [0, 0, 0], v: [-0.93240737, 0, -0.86473146], m: 1 },
]

/** 拉格朗日等边三角形：ω = (Gm)^{1/2} / 3^{1/4}（R = 1） */
function makeLagrange(): TBody[] {
  const omega = Math.pow(3, -0.25)
  return [0, 1, 2].map((i) => {
    const th = (i * 2 * Math.PI) / 3
    return {
      p: [Math.cos(th), 0, Math.sin(th)],
      v: [-Math.sin(th) * omega, 0, Math.cos(th) * omega],
      m: 1,
    }
  })
}

/** 蝴蝶效应的确定性混沌底案 */
const BUTTERFLY_BASE: TBody[] = [
  { p: [-1.1, 0, 0.35], v: [0.28, 0, 0.42], m: 1 },
  { p: [1.05, 0, -0.25], v: [-0.18, 0, -0.36], m: 1 },
  { p: [0.15, 0, 0.95], v: [0.05, 0, -0.12], m: 1 },
]

/** 沙盒默认初条件（混沌风格） */
export const CUSTOM_DEFAULT: TBody[] = BUTTERFLY_BASE.map(clone)

/** 混沌乱舞：随机初条件，带一定角动量保证舞姿好看 */
function makeChaos(): TBody[] {
  const out: TBody[] = []
  for (let i = 0; i < 3; i++) {
    const px = (Math.random() * 2 - 1) * 1.1
    const pz = (Math.random() * 2 - 1) * 1.1
    const perp = Math.atan2(pz, px) + Math.PI / 2
    const sp = 0.3 + Math.random() * 0.2
    out.push({
      p: [px, 0, pz],
      v: [
        Math.cos(perp) * sp + (Math.random() - 0.5) * 0.3,
        0,
        Math.sin(perp) * sp + (Math.random() - 0.5) * 0.3,
      ],
      m: 0.8 + Math.random() * 0.4,
    })
  }
  return out
}

export function makeBodies(mode: ThreeBodyMode, custom?: TBody[]): TBody[] {
  switch (mode) {
    case 'figure8':
      return FIGURE8.map(clone)
    case 'lagrange':
      return makeLagrange()
    case 'butterfly':
      return BUTTERFLY_BASE.map(clone)
    case 'custom':
      return (custom ?? CUSTOM_DEFAULT).map(clone)
    default:
      return makeChaos()
  }
}

/** 蝴蝶对照系统：0 号星 x 偏移 0.001 */
export function makeGhost(base: TBody[]): TBody[] {
  const g = base.map(clone)
  g[0].p[0] += 0.001
  return g
}

const EPS2 = 0.0025

type Vec3Arr = [number, number, number][]

function computeAccel(bodies: TBody[], out: Vec3Arr) {
  for (const a of out) {
    a[0] = 0
    a[1] = 0
    a[2] = 0
  }
  for (let i = 0; i < bodies.length; i++) {
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue
      const dx = bodies[j].p[0] - bodies[i].p[0]
      const dy = bodies[j].p[1] - bodies[i].p[1]
      const dz = bodies[j].p[2] - bodies[i].p[2]
      const r2 = dx * dx + dy * dy + dz * dz + EPS2
      const inv = bodies[j].m / (r2 * Math.sqrt(r2))
      out[i][0] += dx * inv
      out[i][1] += dy * inv
      out[i][2] += dz * inv
    }
  }
}

/** 速度 Verlet 一步 */
export function verletStep(bodies: TBody[], dt: number, a0: Vec3Arr, a1: Vec3Arr) {
  computeAccel(bodies, a0)
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    b.p[0] += b.v[0] * dt + 0.5 * a0[i][0] * dt * dt
    b.p[1] += b.v[1] * dt + 0.5 * a0[i][1] * dt * dt
    b.p[2] += b.v[2] * dt + 0.5 * a0[i][2] * dt * dt
  }
  computeAccel(bodies, a1)
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    b.v[0] += 0.5 * (a0[i][0] + a1[i][0]) * dt
    b.v[1] += 0.5 * (a0[i][1] + a1[i][1]) * dt
    b.v[2] += 0.5 * (a0[i][2] + a1[i][2]) * dt
  }
}

export function energyOf(bodies: TBody[]): number {
  let ke = 0
  let pe = 0
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    ke += 0.5 * b.m * (b.v[0] ** 2 + b.v[1] ** 2 + b.v[2] ** 2)
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].p[0] - b.p[0]
      const dy = bodies[j].p[1] - b.p[1]
      const dz = bodies[j].p[2] - b.p[2]
      pe -= (b.m * bodies[j].m) / Math.sqrt(dx * dx + dy * dy + dz * dz + EPS2)
    }
  }
  return ke + pe
}

export function minSeparation(bodies: TBody[]): number {
  let min = Infinity
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].p[0] - bodies[i].p[0]
      const dy = bodies[j].p[1] - bodies[i].p[1]
      const dz = bodies[j].p[2] - bodies[i].p[2]
      min = Math.min(min, Math.sqrt(dx * dx + dy * dy + dz * dz))
    }
  }
  return min
}

/** 被抛离判定：距质心足够远且径向向外 */
export function ejectedIndex(bodies: TBody[]): number {
  const mTot = bodies.reduce((s, b) => s + b.m, 0)
  const cx = bodies.reduce((s, b) => s + b.p[0] * b.m, 0) / mTot
  const cz = bodies.reduce((s, b) => s + b.p[2] * b.m, 0) / mTot
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    const dx = b.p[0] - cx
    const dz = b.p[2] - cz
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d > 16 && dx * b.v[0] + dz * b.v[2] > 0) return i
  }
  return -1
}

/** 两套系统的平均位置偏差（蝴蝶效应读数） */
export function divergence(a: TBody[], b: TBody[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    s +=
      Math.abs(a[i].p[0] - b[i].p[0]) +
      Math.abs(a[i].p[1] - b[i].p[1]) +
      Math.abs(a[i].p[2] - b[i].p[2])
  }
  return s / a.length
}
