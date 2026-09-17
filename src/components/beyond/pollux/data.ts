/**
 * 北河三章（BEYOND · 03）数据层。
 * 北河二（Castor）六合星为层级双星树；间距/周期为教学压缩的近似值
 * （真实值：A 对 9.2 天、B 对 2.9 天、AB 互绕约 445 年、C 对 0.81 天、C 绕 AB 约 1.4 万年）。
 */

// —— 北河二 · 层级双星树 ——

export interface StarLeaf {
  kind: 'star'
  id: string
  name: string
  color: string
  /** 视觉半径（场景单位） */
  r: number
  /** 质量（太阳质量），决定绕质心的分配 */
  m: number
}

export interface PairNode {
  kind: 'pair'
  id: string
  a: TreeNode
  b: TreeNode
  /** 两子体质心间距（场景单位） */
  sep: number
  /** 公转角速度 rad/s */
  omega: number
  phase: number
  /** 分辨力阈值：p 越过它才"掰开" */
  revealAt: number
}

export type TreeNode = StarLeaf | PairNode

export function massOf(node: TreeNode): number {
  return node.kind === 'star' ? node.m : massOf(node.a) + massOf(node.b)
}

const Aa: StarLeaf = { kind: 'star', id: 'aa', name: '北河二 Aa', color: '#f4f6ff', r: 0.3, m: 2.4 }
const Ab: StarLeaf = { kind: 'star', id: 'ab', name: '北河二 Ab', color: '#ff8a5c', r: 0.14, m: 0.6 }
const Ba: StarLeaf = { kind: 'star', id: 'ba', name: '北河二 Ba', color: '#fbfaf2', r: 0.26, m: 1.8 }
const Bb: StarLeaf = { kind: 'star', id: 'bb', name: '北河二 Bb', color: '#ff8a5c', r: 0.13, m: 0.6 }
const Ca: StarLeaf = { kind: 'star', id: 'ca', name: '北河二 Ca', color: '#ff9a70', r: 0.13, m: 0.6 }
const Cb: StarLeaf = { kind: 'star', id: 'cb', name: '北河二 Cb', color: '#ff9a70', r: 0.12, m: 0.55 }

export const PAIR_A: PairNode = { kind: 'pair', id: 'pairA', a: Aa, b: Ab, sep: 0.7, omega: 1.4, phase: 0, revealAt: 0.5 }
export const PAIR_B: PairNode = { kind: 'pair', id: 'pairB', a: Ba, b: Bb, sep: 0.6, omega: 2.2, phase: 2.1, revealAt: 0.5 }
export const PAIR_AB: PairNode = {
  kind: 'pair',
  id: 'pairAB',
  a: PAIR_A,
  b: PAIR_B,
  sep: 3.2,
  omega: 0.28,
  phase: 0.8,
  revealAt: 0.2,
}
export const PAIR_C: PairNode = {
  kind: 'pair',
  id: 'pairC',
  a: Ca,
  b: Cb,
  sep: 0.5,
  omega: 3.0,
  phase: 1.0,
  revealAt: 0.8,
}
/** C 对（远处的红矮双星）在根参考系里的轨道 */
export const C_ORBIT = { radius: 8, omega: 0.07, phase: 2.9 }

/** 揭示过渡：p 越过阈值后 0.12 区间内平滑散开 */
export function revealK(p: number, revealAt: number): number {
  const k = (p - revealAt) / 0.12
  const c = Math.min(1, Math.max(0, k))
  return c * c * (3 - 2 * c)
}

/** 北河二目前"看得见"的星数：1 → 2 → 4 → 6 */
export function castorCount(p: number): number {
  if (p < PAIR_AB.revealAt) return 1
  if (p < PAIR_A.revealAt) return 2
  if (p < PAIR_C.revealAt) return 4
  return 6
}

/** 北河三掰开行星的阈值（与内层双星同步现身） */
export const POLLUX_PLANET_REVEAL = 0.5

export interface SplitStage {
  label: string
  en: string
}

export function splitStageOf(p: number): SplitStage {
  if (p < PAIR_AB.revealAt) return { label: '肉眼所见 · 一对双子星', en: 'TWO DOTS IN THE SKY' }
  if (p < PAIR_A.revealAt) return { label: '掰开北河二 · 是双星！', en: 'CASTOR IS A BINARY' }
  if (p < PAIR_C.revealAt) return { label: '层层嵌套 · 北河三藏着行星', en: 'NESTED PAIRS & A HIDDEN PLANET' }
  return { label: '6 颗星 vs 1 星 1 行星', en: 'SIX STARS & ONE PLANET' }
}

// —— 场景布局（掰开模式：左 Castor、右 Pollux） ——
export const CASTOR_POS: [number, number, number] = [-14, 0, 0]
export const POLLUX_POS: [number, number, number] = [14, 0, 0]
export const POLLUX_MINI = { starR: 1.5, orbitR: 4.2, planetOmega: 0.9, planetR: 0.4 }

// —— 摆动模式（视向速度法） ——
export const THESTIAS = { massMj: 2.3, periodD: 590, distAu: 1.64 }
export const POLLUX_MASS = 1.91
export const WOBBLE_ORBIT_R = 9
export const WOBBLE_STAR_R = 3
/** 行星公转的视角速度：一圈约 8 秒 */
export const WOBBLE_OMEGA = (2 * Math.PI) / 8
/** 木星质量 = 1/1047 太阳质量；恒星摆动半径（场景单位） */
export const WOBBLE_BASE = WOBBLE_ORBIT_R * (THESTIAS.massMj / 1047 / POLLUX_MASS)
export const WOBBLE_EXAG = 100

export interface PolluxHotspot {
  id: string
  label: string
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const SPLIT_HOTSPOTS: PolluxHotspot[] = [
  {
    id: 'castor',
    label: '北河二',
    pos: [-14, 6.5, 0],
    title: '北河二 · 六合星',
    desc: '肉眼看只是一颗白星，掰开才发现是三对双星层层嵌套：最内两对分别以 9.2 天和 2.9 天互绕，两大对之间 445 年转一圈，最远处还有一对红矮星，1.4 万年才绕一周。三颗星的系统容易乱套，但只要排好队、一层套一层，六颗星也能世世代代稳定共舞。',
    facts: [
      { label: '成员', value: '共 6 颗' },
      { label: '最内层', value: '9.2 天 / 圈' },
      { label: '最外层', value: '约 1.4 万年 / 圈' },
      { label: '距地球', value: '约 51 光年' },
    ],
  },
  {
    id: 'pollux',
    label: '北河三',
    pos: [14, 5, 0],
    title: '北河三 · 带行星的橙巨星',
    desc: '双子座的"弟弟"其实比"哥哥"亮——按拜耳编号 α 归北河二、β 归北河三，可 β 反而更亮。它是一颗膨胀到约 9 倍太阳宽的橙巨星，身边还带着一颗 2006 年才被发现的行星。',
    facts: [
      { label: '视星等', value: '1.14 · 双子座最亮' },
      { label: '半径', value: '约 8.8 倍太阳' },
      { label: '光度', value: '约 32 倍太阳' },
      { label: '行星', value: '北河三 b（Thestias）' },
    ],
  },
  {
    id: 'twins',
    label: '双子？',
    pos: [0, 9, 0],
    title: '真假双胞胎',
    desc: '希腊神话里，卡斯托耳与波吕克斯是生死不离的兄弟；中国星官里，它们是守卫银河渡口的"北河"。但真相是：两颗星相距 17 光年、互不相识，只是从地球看恰好排成一对。',
    facts: [
      { label: '希腊神话', value: '卡斯托耳与波吕克斯' },
      { label: '中国星官', value: '北河 · 井宿 · 银河渡口' },
      { label: '实际距离', value: '51 vs 34 光年' },
      { label: '真实关系', value: '毫无血缘' },
    ],
  },
]

export const WOBBLE_HOTSPOTS: PolluxHotspot[] = [
  {
    id: 'thestias',
    label: '北河三 b',
    pos: [0, 0, 0], // 场景内挂在行星组上，此值仅为占位
    title: '北河三 b · Thestias',
    desc: '一颗约 2.3 倍木星质量的气态巨行星，围着年迈的橙巨星转，一圈 590 天。2015 年它有了正式名字 Thestias——神话中双子兄弟的外公。',
    facts: [
      { label: '质量', value: '≥ 2.3 倍木星' },
      { label: '公转周期', value: '约 590 天' },
      { label: '距恒星', value: '1.64 AU' },
      { label: '发现年份', value: '2006 年' },
    ],
  },
  {
    id: 'wobble',
    label: '恒星在晃',
    pos: [0, -5.5, 0],
    title: '看不见的行星怎么找？',
    desc: '没人直接看见这颗行星——天文学家只看见北河三的光在一来一回地微微变化：那是行星拖着恒星绕质心打转的证据。真实的摆动只有恒星自身半径的 1/21，所以这里放大了 100 倍。',
    facts: [
      { label: '探测方法', value: '视向速度法' },
      { label: '真实摆动', value: '≈ 恒星半径的 1/21' },
      { label: '放大倍数', value: '×100' },
      { label: '关键', value: '恒星并非静止不动' },
    ],
  },
]
