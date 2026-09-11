import * as THREE from 'three'
import { colorForTemp } from '../main-sequence/data'

/** Ia 超新星彩蛋：吸积 6 秒，爆发后 8 秒进入尾声 */
export const SN_FEED_SECONDS = 6
export const SN_BLAST_SECONDS = 8

export type SnMode = 'cool' | 'feed' | 'blast' | 'aftermath'

/** 宇宙时间滑杆：t 0..1 → 10⁴ ~ 10¹⁵ 年 */
export const yearsAt = (t: number) => Math.pow(10, 4 + 11 * t)

/** 行星状星云完整度：1 = 完整，0 = 消散（寿命仅约几万年） */
export const nebulaAt = (t: number) => 1 - THREE.MathUtils.smoothstep(t, 0.02, 0.12)

/** 白矮星表面温度：10⁵ K 起步，按 Mestel 冷却律近似下降 */
export const wdTempAt = (t: number) => 1e5 * Math.pow(yearsAt(t) / 1e4, -0.28)

/** 光度（半径不变，L ∝ T⁴） */
export const wdLumAt = (t: number) => 0.1 * Math.pow(wdTempAt(t) / 1e5, 4)

/** 冷却颜色：2400 K 以下向黑色衰减 */
export function wdColorAt(t: number, target: THREE.Color): THREE.Color {
  const temp = wdTempAt(t)
  if (temp >= 2400) return target.copy(colorForTemp(temp))
  return target.copy(colorForTemp(2400)).multiplyScalar(Math.pow(temp / 2400, 1.5))
}

export interface WDStage {
  label: string
  en: string
}

export function wdStageOf(t: number): WDStage {
  if (t >= 0.99) return { label: '黑矮星 · 理论', en: 'BLACK DWARF · THEORETICAL' }
  if (t < 0.12) return { label: '行星状星云 · 最后的烟花', en: 'PLANETARY NEBULA' }
  const temp = wdTempAt(t)
  if (temp > 10000) return { label: '白矮星', en: 'WHITE DWARF' }
  if (temp > 2400) return { label: '冷却余烬', en: 'COOLING EMBER' }
  return { label: '红外残躯', en: 'INFRARED REMNANT' }
}

export function formatYears(y: number): string {
  if (y < 1e6) return `${(y / 1e4).toFixed(1)} 万年`
  if (y < 1e8) return `${(y / 1e6).toFixed(1)} 百万年`
  if (y < 1e12) return `${(y / 1e8).toFixed(1)} 亿年`
  return `${(y / 1e12).toFixed(1)} 万亿年`
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

export function formatWDLum(l: number): string {
  if (l >= 0.01) return `${l.toFixed(2)} L☉`
  const exp = Math.floor(Math.log10(l))
  const mant = l / Math.pow(10, exp)
  const sup = String(Math.abs(exp))
    .split('')
    .map((c) => SUPERSCRIPT[Number(c)])
    .join('')
  return `${mant.toFixed(1)}×10⁻${sup} L☉`
}

export interface WDHotspot {
  id: string
  label: string
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const WD_HOTSPOTS: WDHotspot[] = [
  {
    id: 'dwarf',
    label: '白矮星',
    pos: [0, 3.4, 0],
    title: '白矮星本体',
    desc: '只有地球大小，却保留着太阳大半的质量：一茶匙物质重达一吨。它不再燃烧，只靠余热发光，靠电子简并压对抗引力坍缩——是量子力学支撑着这颗星的骨架。',
    facts: [
      { label: '直径', value: '约地球大小' },
      { label: '密度', value: '每立方厘米约 1 吨' },
      { label: '支撑力', value: '电子简并压' },
      { label: '能源', value: '无 · 仅靠余热' },
    ],
  },
  {
    id: 'nebula',
    label: '行星状星云',
    pos: [17, 5, 8],
    title: '行星状星云',
    desc: '红巨星抛出的外壳被中心热核的紫外线点亮：内层的氧发出青绿光，外层的氢泛起粉红——这是恒星留给自己最后的烟花。它的寿命只有几万年，很快会消散在星际空间里。',
    facts: [
      { label: '发光原理', value: '紫外线电离' },
      { label: '青绿色', value: '电离氧 O III' },
      { label: '粉红色', value: '氢 α' },
      { label: '寿命', value: '仅约几万年' },
    ],
  },
  {
    id: 'crystal',
    label: '结晶碳核',
    pos: [0, -3.4, 0],
    title: '结晶碳核',
    desc: '在极致的密度下，核心的碳和氧已经结晶——某种意义上，每颗白矮星的心里都藏着一颗地球大小的钻石。随着冷却继续，它会变得越来越"硬"。',
    facts: [
      { label: '成分', value: '碳与氧' },
      { label: '状态', value: '已结晶' },
      { label: '戏称', value: '宇宙钻石' },
      { label: '随时间', value: '结晶度升高' },
    ],
  },
]
