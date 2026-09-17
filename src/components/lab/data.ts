/**
 * 宇宙实验室（/lab）数据层 v2：全参数化的随机星系生成器。
 * 不再是固定模板轮换——每个星系由连续参数空间随机生成：
 * 旋臂数/旋紧度/棒强度/核心占比/盘厚度/椭率/环/星团亮点/调色板全部随机。
 * Math.random 只出现在本文件的模块级函数里。
 */
import * as THREE from 'three'

export type GalaxyKind = 'spiral' | 'barred' | 'elliptical' | 'irregular' | 'ring' | 'pair'

export interface GalaxyKindMeta {
  label: string
  en: string
  fact: string
}

export const GALAXY_KIND_META: Record<GalaxyKind, GalaxyKindMeta> = {
  spiral: {
    label: '螺旋星系',
    en: 'SPIRAL GALAXY',
    fact: '旋臂是恒星的产房——密度波扫过处，新恒星成批点亮',
  },
  barred: {
    label: '棒旋星系',
    en: 'BARRED SPIRAL',
    fact: '银河系自己也有根"棒"：约三分之二的螺旋星系都是棒旋',
  },
  elliptical: {
    label: '椭圆星系',
    en: 'ELLIPTICAL GALAXY',
    fact: '宇宙里的退休社区：几乎全是老年恒星，不再孕育新生命',
  },
  irregular: {
    label: '不规则星系',
    en: 'IRREGULAR GALAXY',
    fact: '被引力扯碎的形状——它们往往刚经历过一场碰撞',
  },
  ring: {
    label: '环状星系',
    en: 'RING GALAXY',
    fact: '像一枚弹孔：一个星系穿心穿过另一个星系留下的残骸',
  },
  pair: {
    label: '互撞双星系',
    en: 'COLLIDING PAIR',
    fact: '它们正在合并——几十亿年后，银河系和仙女座也会这样',
  },
}

export interface GalaxyPalette {
  core: string
  mid: string
  edge: string
  knot: string
}

/** 全随机星系参数（连续空间，每个星系都独一无二） */
export interface GalaxyParams {
  kind: GalaxyKind
  /** 旋臂数（0 = 椭圆星系，1 = 不规则） */
  arms: number
  /** 旋臂缠绕度 */
  wind: number
  /** 中心棒强度 0~1 */
  bar: number
  /** 核心质量占比 */
  bulge: number
  /** 盘厚度系数 */
  thickness: number
  /** 椭球压扁（椭圆星系用） */
  squashY: number
  squashZ: number
  /** 是否带环 */
  ring: boolean
  /** 恒星形成区亮点数 */
  knotCount: number
  radius: number
  palette: GalaxyPalette
}

let galaxySerial = 0

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.6
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]

/** 调色板：核心恒温暖白，盘缘色相全随机 */
function randomPalette(): GalaxyPalette {
  const hue = Math.random()
  const mid = new THREE.Color().setHSL(hue, 0.62, 0.7)
  const edge = new THREE.Color().setHSL((hue + 0.08) % 1, 0.55, 0.55)
  return {
    core: '#ffe3c0',
    mid: `#${mid.getHexString()}`,
    edge: `#${edge.getHexString()}`,
    knot: Math.random() < 0.5 ? '#ff9ad5' : '#8af0ff',
  }
}

export function randomGalaxyParams(): GalaxyParams {
  // 12% 概率是互撞双星系（栏目预告）
  if (Math.random() < 0.12) {
    return {
      kind: 'pair',
      arms: 2,
      wind: 2.6,
      bar: 0,
      bulge: 0.2,
      thickness: 0.03,
      squashY: 1,
      squashZ: 1,
      ring: false,
      knotCount: 6,
      radius: 15 + Math.random() * 4,
      palette: randomPalette(),
    }
  }
  const arms = pick([0, 2, 2, 2, 2, 3, 3, 4, 1] as const)
  const elliptical = arms === 0
  const ring = !elliptical && arms !== 1 && Math.random() < 0.14
  const kind: GalaxyKind = elliptical
    ? 'elliptical'
    : ring
      ? 'ring'
      : arms === 1
        ? 'irregular'
        : Math.random() < 0.45
          ? 'barred'
          : 'spiral'
  return {
    kind,
    arms,
    wind: 1.8 + Math.random() * 1.8,
    bar: kind === 'barred' ? 0.5 + Math.random() * 0.5 : 0,
    bulge: elliptical ? 0.5 + Math.random() * 0.3 : 0.14 + Math.random() * 0.24,
    thickness: 0.02 + Math.random() * 0.035,
    squashY: 0.45 + Math.random() * 0.45,
    squashZ: 0.4 + Math.random() * 0.5,
    ring,
    knotCount: arms >= 2 ? 3 + Math.floor(Math.random() * 6) : 0,
    radius: 16 + Math.random() * 11,
    palette: randomPalette(),
  }
}

export interface GalaxySpec {
  id: number
  name: string
  en: string
  fact: string
  kind: GalaxyKind
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  rands: Float32Array
  radius: number
}

interface Acc {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  rands: Float32Array
}

const tmpCore = new THREE.Color()
const tmpMid = new THREE.Color()
const tmpEdge = new THREE.Color()
const tmpKnot = new THREE.Color()

function putStar(acc: Acc, i: number, x: number, y: number, z: number, r: number, R: number, pal: GalaxyPalette, size: number, knot = false) {
  acc.positions.set([x, y, z], i * 3)
  tmpCore.set(pal.core)
  tmpMid.set(pal.mid)
  tmpEdge.set(pal.edge)
  tmpKnot.set(pal.knot)
  const k = Math.min(1, r / R)
  const c = tmpCore
  if (k < 0.3) c.lerp(tmpMid, k / 0.3)
  else c.lerp(tmpEdge, (k - 0.3) / 0.7)
  if (knot) c.copy(tmpKnot)
  const j = 0.85 + Math.random() * 0.3
  acc.colors.set([c.r * j, c.g * j, c.b * j], i * 3)
  acc.sizes[i] = size
  acc.rands[i] = Math.random()
}

/** 旋臂采样点（供主体与星团亮点共用） */
function armPoint(p: GalaxyParams, armIdx: number, t: number, out: THREE.Vector3) {
  const R = p.radius
  const r = (0.14 + t * 0.86) * R
  const theta = (armIdx / p.arms) * Math.PI * 2 + t * p.wind * Math.PI
  const spread = 0.16 * (0.4 + t) * R * 0.35
  const bx = p.bar > 0 ? (armIdx % 2 === 0 ? 1 : -1) * 0.3 * p.bar * R : 0
  out.set(
    bx + Math.cos(theta) * r + gauss() * spread,
    gauss() * p.thickness * R * (1.2 - t * 0.8),
    Math.sin(theta) * r + gauss() * spread,
  )
  return r
}

function buildSingle(p: GalaxyParams, count: number): Acc {
  const acc: Acc = {
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    rands: new Float32Array(count),
  }
  const R = p.radius
  const v = new THREE.Vector3()
  // 星团亮点（恒星形成区）的中心预选好，沿旋臂分布
  const knotCenters: THREE.Vector3[] = []
  for (let k = 0; k < p.knotCount; k++) {
    const c = new THREE.Vector3()
    armPoint(p, k % Math.max(1, p.arms), 0.35 + Math.random() * 0.6, c)
    knotCenters.push(c)
  }
  const knotEach = p.knotCount > 0 ? Math.floor(count * 0.06 / p.knotCount) : 0

  let i = 0
  for (; i < count; i++) {
    const roll = Math.random()
    let x = 0
    let y = 0
    let z = 0
    let r = 0
    if (roll < p.bulge) {
      // 核心球
      v.randomDirection().multiplyScalar(Math.abs(gauss()) * 0.16 * R)
      x = v.x
      y = v.y * 0.75
      z = v.z
      r = Math.sqrt(x * x + y * y + z * z)
    } else if (p.kind === 'elliptical') {
      v.randomDirection().multiplyScalar(Math.abs(gauss()) * 0.45 * R)
      x = v.x
      y = v.y * p.squashY
      z = v.z * p.squashZ
      r = Math.sqrt(x * x + y * y + z * z)
    } else if (p.kind === 'irregular') {
      // 碎块云团
      const clump = (i * 7) % 6
      v.randomDirection().multiplyScalar(Math.abs(gauss()) * 0.22 * R)
      x = v.x + Math.cos((clump / 6) * Math.PI * 2) * 0.3 * R
      y = v.y * 0.5 + gauss() * 0.08 * R
      z = v.z + Math.sin((clump / 6) * Math.PI * 2) * 0.3 * R
      r = Math.sqrt(x * x + y * y + z * z)
    } else if (p.ring && roll > p.bulge + 0.25) {
      // 环
      const a = Math.random() * Math.PI * 2
      const rr = (0.62 + gauss() * 0.05) * R
      x = Math.cos(a) * rr
      y = gauss() * 0.03 * R
      z = Math.sin(a) * rr
      r = rr
    } else {
      // 棒 + 旋臂
      if (p.bar > 0 && Math.random() < 0.28 * p.bar) {
        x = (Math.random() * 2 - 1) * 0.3 * p.bar * R
        y = gauss() * 0.05 * R
        z = gauss() * 0.06 * R + x * 0.18
        r = Math.abs(x)
      } else {
        r = armPoint(p, i % p.arms, Math.pow(Math.random(), 0.8), v)
        x = v.x
        y = v.y
        z = v.z
      }
    }
    putStar(acc, i, x, y, z, r, R * 1.1, p.palette, 0.5 + Math.random() * 1.7)
    // 星团亮点：沿旋臂的粉/青色亮团
    if (p.knotCount > 0 && knotEach > 0 && i >= count - knotCenters.length * knotEach) {
      const ki = Math.floor((i - (count - knotCenters.length * knotEach)) / knotEach)
      const c = knotCenters[Math.min(knotCenters.length - 1, ki)]
      v.randomDirection().multiplyScalar(Math.abs(gauss()) * 0.05 * R)
      putStar(acc, i, c.x + v.x, c.y + v.y * 0.5, c.z + v.z, R, R * 1.1, p.palette, 2.2 + Math.random() * 1.4, true)
    }
  }
  return acc
}

function buildPair(p: GalaxyParams, count: number): Acc {
  const acc: Acc = {
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    rands: new Float32Array(count),
  }
  const R = p.radius
  const half = Math.floor(count * 0.42)
  const subA: GalaxyParams = { ...p, kind: 'spiral', bar: 0, ring: false, knotCount: 0, radius: R * 0.55 }
  const subB: GalaxyParams = { ...p, kind: 'spiral', bar: 0, ring: false, knotCount: 0, radius: R * 0.45 }
  const a = buildSingle(subA, half)
  const b = buildSingle(subB, half)
  acc.positions.set(a.positions.subarray(0, half * 3), 0)
  acc.colors.set(a.colors.subarray(0, half * 3), 0)
  acc.sizes.set(a.sizes.subarray(0, half), 0)
  acc.rands.set(a.rands.subarray(0, half), 0)
  acc.positions.set(b.positions.subarray(0, half * 3), half * 3)
  acc.colors.set(b.colors.subarray(0, half * 3), half * 3)
  acc.sizes.set(b.sizes.subarray(0, half), half)
  acc.rands.set(b.rands.subarray(0, half), half)
  // 摆位：A 左下、B 右上
  for (let i = 0; i < half; i++) {
    acc.positions[i * 3] -= R * 0.5
    acc.positions[i * 3 + 1] -= R * 0.1
  }
  for (let i = half; i < half * 2; i++) {
    acc.positions[i * 3] += R * 0.48
    acc.positions[i * 3 + 1] += R * 0.14
  }
  // 潮汐桥
  const v = new THREE.Vector3()
  for (let i = half * 2; i < count; i++) {
    const t = Math.random()
    v.set(
      -R * 0.5 + t * R * 0.98 + gauss() * R * 0.05,
      -R * 0.1 + t * R * 0.24 + gauss() * R * 0.04,
      gauss() * R * 0.06,
    )
    putStar(acc, i, v.x, v.y, v.z, R * 0.6, R * 1.1, p.palette, 0.4 + Math.random() * 1.1)
  }
  return acc
}

const NAME_PREFIX = ['NGC', 'UGC', 'ESO', 'Arp', 'MCG'] as const

/** 随机生成一座独一无二的星系（名牌 + 粒子数据） */
export function randomGalaxySpec(count: number): GalaxySpec {
  const params = randomGalaxyParams()
  const acc = params.kind === 'pair' ? buildPair(params, count) : buildSingle(params, count)
  const meta = GALAXY_KIND_META[params.kind]
  const catalog = `${pick(NAME_PREFIX)}-${100 + Math.floor(Math.random() * 900)}`
  return {
    id: ++galaxySerial,
    name: `${meta.label} ${catalog}`,
    en: `${meta.en} · ${catalog}`,
    fact: meta.fact,
    kind: params.kind,
    ...acc,
    radius: params.radius,
  }
}

// —— 栏目表 ——
export interface LabChapter {
  id: string
  name: string
  nameEn: string
  teaser: string
  status: 'wip'
}

export const LAB_CHAPTERS: LabChapter[] = [
  {
    id: 'galaxy-collision',
    name: '当银河系与仙女座星系相撞',
    nameEn: 'MILKY WAY × ANDROMEDA',
    teaser: '40 亿年后的天空',
    status: 'wip',
  },
]

export function findLabChapter(id: string | null | undefined): LabChapter | null {
  if (!id) return null
  return LAB_CHAPTERS.find((c) => c.id === id) ?? null
}
