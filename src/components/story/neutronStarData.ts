export type NsType = 'radio' | 'milli' | 'magnetar' | 'accreting' | 'isolated'

export interface NsParams {
  /** log10 自转周期（秒），范围 -3 ~ 1（1ms ~ 10s） */
  logP: number
  /** log10 表面磁场（高斯），范围 8 ~ 15 */
  logB: number
  companion: boolean
}

export const NS_LOGP_MIN = -3
export const NS_LOGP_MAX = 1
export const NS_LOGB_MIN = 8
export const NS_LOGB_MAX = 15

/** 脉冲星死亡线：B < 1.7×10¹¹·P² 时射电束熄灭 */
export const DEATH_LINE_C = 11.23

export function classifyNs({ logP, logB, companion }: NsParams): NsType {
  if (companion) return 'accreting'
  if (logB >= 14) return 'magnetar'
  if (logB < DEATH_LINE_C + 2 * logP) return 'isolated'
  if (logP <= -2 && logB <= 10) return 'milli'
  return 'radio'
}

export const NS_TYPE_META: Record<NsType, { label: string; en: string; color: string }> = {
  radio: { label: '射电脉冲星', en: 'RADIO PULSAR', color: '#7de3ff' },
  milli: { label: '毫秒脉冲星', en: 'MILLISECOND PULSAR', color: '#4ddbd0' },
  magnetar: { label: '磁星', en: 'MAGNETAR', color: '#ff7a5c' },
  accreting: { label: '吸积中子星', en: 'X-RAY ACCRETER', color: '#ffb85e' },
  isolated: { label: '孤立冷却中子星', en: 'ISOLATED COOLING', color: '#9da0a8' },
}

/** 射电束是否点亮（灯塔效应） */
export const beamOn = (t: NsType) => t === 'radio' || t === 'milli' || t === 'magnetar'

export function formatPeriod(logP: number): string {
  const p = Math.pow(10, logP)
  if (logP < -2) return `${(p * 1000).toFixed(2)} ms`
  if (logP < 0) return `${(p * 1000).toFixed(1)} ms`
  return `${p.toFixed(2)} s`
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

export function formatField(logB: number): string {
  const sup = String(Math.round(logB))
    .split('')
    .map((c) => SUPERSCRIPT[Number(c)])
    .join('')
  return `10${sup} G`
}

export interface NsHotspot {
  id: string
  label: string
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const NS_HOTSPOTS: NsHotspot[] = [
  {
    id: 'beam',
    label: '磁极射电束',
    pos: [5.5, 4.5, 0],
    title: '磁极射电束',
    desc: '中子星的磁轴与自转轴并不重合：磁极发出的射电束像灯塔一样随自转扫过太空。地球每收到一次脉冲，它就转完了一圈——脉冲周期即自转周期，稳定度堪比原子钟。',
    facts: [
      { label: '发光位置', value: '磁极' },
      { label: '扫过地球', value: '每圈一次' },
      { label: '周期稳定度', value: '堪比原子钟' },
      { label: '能量来源', value: '自转能' },
    ],
  },
  {
    id: 'magneto',
    label: '磁层',
    pos: [0, 7.5, 0],
    title: '磁层',
    desc: '中子星磁场可达 10¹² 高斯——是地球磁场的千万亿倍；磁星的 10¹⁵ 高斯更是可观测宇宙之最。强磁层把带电粒子加速到接近光速，沿磁极喷出形成射电束。',
    facts: [
      { label: '普通脉冲星', value: '10¹² G' },
      { label: '磁星', value: '10¹⁴–10¹⁵ G' },
      { label: '对比', value: '地球磁场的千万亿倍' },
      { label: '作用', value: '加速粒子成束' },
    ],
  },
  {
    id: 'core',
    label: '简并核心',
    pos: [0, -3, 0],
    title: '简并核心',
    desc: '直径仅约 20 公里，质量却比太阳还大：一茶匙物质重达数十亿吨。它靠中子简并压对抗引力，内部可能是超流体，甚至藏着更奇异的夸克物质。',
    facts: [
      { label: '直径', value: '约 20 km' },
      { label: '密度', value: '每茶匙数十亿吨' },
      { label: '支撑力', value: '中子简并压' },
      { label: '内部', value: '或含超流体 / 夸克物质' },
    ],
  },
]

export interface NsTourStep {
  logP: number
  logB: number
  companion: boolean
  caption: string
  seconds: number
}

export const NS_TOUR: NsTourStep[] = [
  { logP: -1.3, logB: 12.5, companion: false, caption: '诞生于超新星：一颗高速自转的射电脉冲星', seconds: 4 },
  { logP: 0.3, logB: 12, companion: false, caption: '亿万年间不断减速，脉冲越来越慢', seconds: 5 },
  { logP: 0.85, logB: 9.4, companion: false, caption: '越过死亡线——射电束熄灭，陷入沉寂', seconds: 4.5 },
  { logP: 0.85, logB: 9.0, companion: true, caption: '如果它有一颗伴星…吸积开始了', seconds: 4 },
  { logP: -1.8, logB: 9.0, companion: true, caption: '物质带着角动量落下，自转被重新加速', seconds: 6 },
  { logP: -2.6, logB: 8.8, companion: false, caption: '毫秒脉冲星：被复活的年老中子星', seconds: 4.5 },
]
