/** 参宿四章（BEYOND · 06）数据层：大暗化 / 假如它是太阳 / 引爆超新星 */

export type BetelMode = 'dimming' | 'swap' | 'boom'

/** 模式一/三的恒星视觉半径 */
export const STAR_R = 5

// —— 模式一：大暗化 ——
/** 视觉脉动周期约 8 秒（真实约 400 天） */
export const PULSE_SECONDS = 8
/** 喷嚏全程约 12 秒 */
export const SNEEZE_SECONDS = 12

/** 视星等：基础脉动 0.5±0.15；喷嚏中盘跌到约 1.6（2020 大暗化） */
export function magAt(tSec: number, sneezeP: number): number {
  const pulse = 0.5 + 0.15 * Math.sin((tSec / PULSE_SECONDS) * Math.PI * 2)
  const dip = sneezeP > 0 && sneezeP < 1 ? 1.1 * Math.sin(sneezeP * Math.PI) : 0
  return pulse + dip
}

/** 尘埃云覆盖度（读数用，0~100%） */
export function dustCoverAt(sneezeP: number): number {
  if (sneezeP <= 0 || sneezeP >= 1) return 0
  return Math.round(Math.sin(sneezeP * Math.PI) * 38)
}

export interface BetelStage {
  label: string
  en: string
}

export function dimmingStageOf(sneezeP: number): BetelStage {
  if (sneezeP <= 0) return { label: '平静期 · 缓慢呼吸', en: 'QUIET PULSATION' }
  if (sneezeP < 0.2) return { label: '抛出尘埃云', en: 'DUST EJECTION' }
  if (sneezeP < 0.65) return { label: '大暗化 · 尘埃挡光', en: 'THE GREAT DIMMING' }
  if (sneezeP < 1) return { label: '恢复中 · 尘埃散开', en: 'CLEARING UP' }
  return { label: '平静期 · 缓慢呼吸', en: 'QUIET PULSATION' }
}

// —— 模式二：假如它是太阳 ——
/** 场景比例：1 倍太阳半径 = 0.25 单位，1 AU = 53.75 单位 */
export const RSUN = 0.25
export const AU = 53.75
/** 参宿四半径 ≈887 R☉ ≈ 4.13 AU：吞到火星轨道外，够不到木星 */
export const R_MAX_RSUN = 887

export interface SwapPlanet {
  id: string
  name: string
  au: number
  color: string
  /** 公转角速度（视觉） */
  speed: number
  /** 行星视觉大小 */
  size: number
}

export const SWAP_PLANETS: SwapPlanet[] = [
  { id: 'mercury', name: '水星', au: 0.39, color: '#b8a89a', speed: 0.9, size: 0.5 },
  { id: 'venus', name: '金星', au: 0.72, color: '#e8c47a', speed: 0.68, size: 0.75 },
  { id: 'earth', name: '地球', au: 1.0, color: '#4d8fd1', speed: 0.56, size: 0.8 },
  { id: 'mars', name: '火星', au: 1.52, color: '#c16538', speed: 0.45, size: 0.6 },
  { id: 'jupiter', name: '木星', au: 5.2, color: '#d8a86a', speed: 0.25, size: 2.6 },
  { id: 'saturn', name: '土星', au: 9.5, color: '#e0c896', speed: 0.18, size: 2.2 },
]

/** 半径（场景单位）：指数膨胀，前缓后猛；地球在 p≈0.79 被吞 */
export const swapRadiusUnits = (p: number) => Math.pow(R_MAX_RSUN, Math.min(1, Math.max(0, p))) * RSUN
export const swapRadiusRsun = (p: number) => Math.pow(R_MAX_RSUN, Math.min(1, Math.max(0, p)))

export function swapEngulfed(planet: SwapPlanet, p: number): boolean {
  return swapRadiusUnits(p) >= planet.au * AU
}

export function swapEngulfedCount(p: number): number {
  return SWAP_PLANETS.filter((pl) => swapEngulfed(pl, p)).length
}

/** 下一个轮到谁（都被吞完则返回 null） */
export function swapNextVictim(p: number): SwapPlanet | null {
  return SWAP_PLANETS.find((pl) => !swapEngulfed(pl, p)) ?? null
}

export function swapStageOf(p: number): BetelStage {
  const r = swapRadiusRsun(p)
  if (r < 2) return { label: '它还是太阳的大小', en: 'SUN-SIZED' }
  const n = swapEngulfedCount(p)
  const v = swapNextVictim(p)
  if (n === 0) return { label: '膨胀中 · 水星危险了', en: 'MERCURY IN DANGER' }
  if (v && !(v.id === 'jupiter')) return { label: `已吞没 ${n} 颗 · 下一个：${v.name}`, en: `${n} ENGULFED` }
  return { label: '参宿四 · 木星和土星幸存', en: 'JUPITER & SATURN SURVIVE' }
}

// —— 模式三：引爆超新星（视觉 1 秒 ≈ 3 天） ——
export const BOOM_SECONDS = 24

/** 爆炸后的第几天（boomT 0~1 → 0~150 天） */
export const boomDayAt = (boomT: number) => boomT * 150

/** 超新星亮度（相对满月的倍数）：快速上升，第 12 天到峰顶 ≈0.6 倍满月，随后数月衰减 */
export function snLunaAt(day: number): number {
  if (day <= 0) return 0
  if (day < 12) return 0.6 * Math.pow(day / 12, 1.5)
  return 0.6 * Math.exp(-(day - 12) / 55)
}

export function boomStageOf(boomT: number, started: boolean): BetelStage {
  if (!started) return { label: '一颗等着爆炸的星', en: 'READY TO POP' }
  if (boomT < 0.04) return { label: '核心坍缩', en: 'CORE COLLAPSE' }
  if (boomT < 0.55) return { label: 'II 型超新星爆发', en: 'TYPE II SUPERNOVA' }
  return { label: '中子星残骸', en: 'NEUTRON STAR REMNANT' }
}

// —— 热点 ——
export interface BetelHotspot {
  id: string
  label: string
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const BETEL_HOTSPOTS: BetelHotspot[] = [
  {
    id: 'star',
    label: '参宿四',
    pos: [0, 7.5, 0],
    title: '参宿四 · 沸腾的红色巨兽',
    desc: '猎户座右肩上的红超巨星：半径约 900 倍太阳，光度约 10 万倍，表面却只有约 3600 K。它的表面被少数几个巨大的对流胞占据，整颗球像一锅慢炖的岩浆。关键彩蛋：它只有约一千万岁——质量太大的恒星，活得快。',
    facts: [
      { label: '类型', value: 'M1-M2 Ia 红超巨星' },
      { label: '半径', value: '约 900 倍太阳' },
      { label: '光度', value: '约 10 万倍太阳' },
      { label: '年龄', value: '仅约 1000 万岁' },
    ],
  },
  {
    id: 'dust',
    label: '大暗化',
    pos: [-7, 4, 4],
    title: '2020 · 大暗化事件',
    desc: '2019 年底到 2020 年初，参宿四从 0.5 等跌到 1.6 等，全世界都以为它要爆炸了。结果它只是"打了个喷嚏"：喷出的一大团气体在远处凝成尘埃云，挡住了它自己的光。变暗 ≠ 爆炸。',
    facts: [
      { label: '亮度变化', value: '0.5 → 1.6 等' },
      { label: '原因', value: '尘埃云遮挡' },
      { label: '别名', value: 'The Great Dimming' },
      { label: '教训', value: '变暗不等于要爆炸' },
    ],
  },
  {
    id: 'rings',
    label: '吞掉行星',
    pos: [0, 6, AU],
    title: '假如它是太阳',
    desc: '把参宿四放到太阳系中心，它的表面会越过水星、金星、地球、火星的轨道，停在火星与木星之间。四颗岩石行星被吞没，木星和土星成了幸存者——只能隔着灼热远远看着。',
    facts: [
      { label: '被吞没', value: '水星 金星 地球 火星' },
      { label: '幸存', value: '木星 土星' },
      { label: '表面边缘', value: '≈ 4.1 AU' },
      { label: '地球轨道', value: '只到它"肚子"里' },
    ],
  },
  {
    id: 'remnant',
    label: '爆炸之后',
    pos: [3, 3, 0],
    title: '它随时会炸 · 也可能已经炸了',
    desc: '未来 10 万年内的某一天，参宿四将以 II 型超新星爆炸：亮如满月、连续几周白天可见，核心坍缩成中子星。中微子会比光早几小时穿过你的身体。别担心：600 多光年外的爆炸伤不到地球——而且它可能已经炸了，光还在路上。',
    facts: [
      { label: '峰值亮度', value: '≈ 0.6 倍满月' },
      { label: '白天可见', value: '连续数周' },
      { label: '残骸', value: '中子星（脉冲星）' },
      { label: '光速时差', value: '600 多年' },
    ],
  },
]
