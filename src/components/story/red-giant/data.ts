import { colorForTemp } from '../main-sequence/data'

/** 场景比例：太阳半径 = 1，1 AU = 215 */
export const R_MAX = 250
export const AU_SCENE = 215

export interface GiantPlanet {
  id: string
  name: string
  orbitAu: number
  orbitR: number
  color: string
  /** 公转角速度（rad/s，视觉效果用） */
  speed: number
}

export const GIANT_PLANETS: GiantPlanet[] = [
  { id: 'mercury', name: '水星', orbitAu: 0.39, orbitR: 0.39 * AU_SCENE, color: '#b8a89a', speed: 0.5 },
  { id: 'venus', name: '金星', orbitAu: 0.72, orbitR: 0.72 * AU_SCENE, color: '#e8c47a', speed: 0.35 },
  { id: 'earth', name: '地球', orbitAu: 1.0, orbitR: AU_SCENE, color: '#4d8fd1', speed: 0.28 },
  { id: 'mars', name: '火星', orbitAu: 1.52, orbitR: 1.52 * AU_SCENE, color: '#c16538', speed: 0.22 },
]

/** 半径：1 → 250 R☉，p^2.2 让膨胀前缓后猛 */
export const radiusAt = (p: number) => 1 + (R_MAX - 1) * Math.pow(p, 2.2)

/** 表面温度：5778 → 2948 K */
export const tempAt = (p: number) => 5778 - 2830 * Math.pow(p, 1.5)

/** 光度：L = R²(T/5778)²，巅峰约 1.6 万 L☉——变冷却更亮 */
export const lumAt = (p: number) => {
  const r = radiusAt(p)
  const t = tempAt(p)
  return r * r * Math.pow(t / 5778, 2)
}

export const colorAt = (p: number) => colorForTemp(tempAt(p))

/** 行星被吞没的进度：0 = 安全，0→1 坠落中，1 = 汽化 */
export const engulfAt = (p: number, orbitR: number) => {
  const r = radiusAt(p)
  return Math.min(1, Math.max(0, (r - orbitR) / (orbitR * 0.18)))
}

export type PlanetFate = '存活' | '坠落中' | '已吞没' | '幸存 · 焦土'

export function planetFate(p: number, planet: GiantPlanet): PlanetFate {
  const r = radiusAt(p)
  if (r >= planet.orbitR * 1.18) return '已吞没'
  if (r >= planet.orbitR) return '坠落中'
  if (planet.id === 'mars' && p > 0.9) return '幸存 · 焦土'
  return '存活'
}

export const FATE_COLORS: Record<PlanetFate, string> = {
  存活: '#4ddb8a',
  坠落中: '#ffb85e',
  已吞没: '#55565e',
  '幸存 · 焦土': '#c16538',
}

export interface GiantStage {
  label: string
  en: string
}

export function giantStageOf(p: number): GiantStage {
  if (p < 0.1) return { label: '主序末期', en: 'LATE MAIN SEQUENCE' }
  if (p < 0.38) return { label: '亚巨星', en: 'SUBGIANT' }
  if (p < 0.62) return { label: '红巨星膨胀', en: 'EXPANDING' }
  if (p < 0.95) return { label: '吞没内行星', en: 'ENGULFING' }
  return { label: '红巨星巅峰', en: 'TIP OF RED GIANT' }
}

export interface RGHotspot {
  id: string
  label: string
  /** 标签锚点类型：贴恒星北极 / 贴包层斜面 / 固定在地球轨道附近 */
  anchor: 'pole' | 'limb' | 'graveyard'
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const RG_HOTSPOTS: RGHotspot[] = [
  {
    id: 'core',
    label: '致密氦核',
    anchor: 'pole',
    title: '收缩中的氦核',
    desc: '氢耗尽后，氦核心在引力下不断收缩升温，却迟迟达不到氦聚变所需的 1 亿度。正是核心收缩释放的引力能，把外层大气吹了出去。当核心最终点燃"氦闪"，恒星会短暂回稳——然后走向各自的结局。',
    facts: [
      { label: '核心成分', value: '氦' },
      { label: '氦聚变温度', value: '约 1 亿 K' },
      { label: '关键事件', value: '氦闪' },
      { label: '能量来源', value: '引力收缩' },
    ],
  },
  {
    id: 'envelope',
    label: '稀薄包层',
    anchor: 'limb',
    title: '巨大的稀薄包层',
    desc: '红巨星的外壳巨大却稀薄得惊人：表面附近的密度比地球大气还低，近乎真空。对流胞每个都有地球轨道大小，缓慢翻滚让亮度发生脉动——米拉型变星的光变周期可达数百天。',
    facts: [
      { label: '表面密度', value: '低于地球大气' },
      { label: '对流胞尺度', value: '地球轨道级' },
      { label: '表现', value: '亮度脉动' },
      { label: '归宿', value: '被抛成行星状星云' },
    ],
  },
  {
    id: 'graveyard',
    label: '行星坟场',
    anchor: 'graveyard',
    title: '行星坟场',
    desc: '膨胀的恒星表面会追上靠得太近的行星：水星、金星先后葬身火海，地球也在劫难逃——潮汐阻力与包层摩擦会让它螺旋下坠、蒸发殆尽。即使个别模型认为地球能幸免，表面也早已被烤成熔岩。火星将成为最近的见证者。',
    facts: [
      { label: '水星 0.39 AU', value: '已吞没' },
      { label: '金星 0.72 AU', value: '已吞没' },
      { label: '地球 1.0 AU', value: '临界·主流模型吞没' },
      { label: '火星 1.52 AU', value: '幸存但焦土' },
    ],
  },
]
