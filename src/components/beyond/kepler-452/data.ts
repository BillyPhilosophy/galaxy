import { PLANET_R } from './planet'

export type KeplerMode = 'transit' | 'land'

// —— 凌日模式 ——
export const STAR_R = 4
export const ORBIT_R = 16
/** 视觉公转周期约 12 秒 */
export const ORBIT_OMEGA = (2 * Math.PI) / 12
export const PLANET_VIEW_R = 0.55
/** 真实挡光深度 0.018%——比蚊子飞过车头灯还微弱 */
export const TRANSIT_DEPTH_REAL = '0.018%'
/** 曲线图上的显示下凹（纵轴放大约 1200 倍） */
export const TRANSIT_DIP_DISPLAY = 0.22

export interface KeplerStage {
  label: string
  en: string
}

export function transitStageOf(inclDeg: number, transiting: boolean): KeplerStage {
  if (transiting) return { label: '凌日！亮度在跌', en: 'TRANSIT DETECTED' }
  if (Math.abs(inclDeg) < 1.5) return { label: '轨道对齐 · 等待下一次凌日', en: 'ALIGNED · WAITING' }
  return { label: '未对齐 · 一片平静', en: 'MISALIGNED · NO SIGNAL' }
}

// —— 飞行模式 ——
export { PLANET_R }
/** 452b 半径约 10,200 km（1.6 倍地球）→ 1 场景单位 ≈ 255 km */
export const KM_PER_UNIT = 255
export const SHIP_START: [number, number, number] = [0, PLANET_R * 0.65, PLANET_R * 3.75]
/** 引力作用范围（距行星中心） */
export const GRAVITY_RANGE = PLANET_R * 3
/** 地表重力手感（单位/秒²，约 2g 的体感） */
export const GRAVITY_SURFACE = 2.4
/** 安全着陆的法向速度阈值 */
export const LAND_SPEED = 2.2
/** 信标捕获半径（场景单位） */
export const BEACON_CAPTURE = 6
/** 云层高度（视觉，用于阶段标签） */
export const CLOUD_ALT = 1.4

export function flightStageOf(alt: number, landed: boolean): KeplerStage {
  if (landed) return { label: '已着陆 · 地球 2.0', en: 'TOUCHDOWN' }
  if (alt > 12) return { label: '轨道飞行', en: 'IN ORBIT' }
  if (alt > CLOUD_ALT) return { label: '进入大气 · 穿云中', en: 'ATMOSPHERE ENTRY' }
  return { label: '低空 · 注意减速', en: 'LOW ALTITUDE · SLOW DOWN' }
}

export interface KeplerHotspot {
  id: string
  label: string
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const TRANSIT_HOTSPOTS: KeplerHotspot[] = [
  {
    id: 'kstar',
    label: '开普勒-452',
    pos: [0, 6.5, 0],
    title: '开普勒-452 · 太阳的同族',
    desc: '一颗和太阳几乎同款的 G2V 恒星，只是更老：约 60 亿岁，比太阳大 10 亿年。它略大、略亮——看着它，就像看太阳中年以后的样子。',
    facts: [
      { label: '类型', value: 'G2V 黄矮星' },
      { label: '年龄', value: '约 60 亿年' },
      { label: '半径', value: '约 1.11 倍太阳' },
      { label: '距地球', value: '约 1400 光年' },
    ],
  },
  {
    id: 'korbit',
    label: '宜居带轨道',
    pos: [13, 3.5, 8],
    title: '452b 的轨道 · 宜居带正中',
    desc: '452b 距它的"太阳"1.04 倍日地距离，恰好落在液态水可以存在的宜居带里，一圈 385 天——它的一年只比地球多 20 天，连四季的长度都差不多。',
    facts: [
      { label: '公转周期', value: '约 385 天' },
      { label: '轨道半径', value: '1.04 AU' },
      { label: '行星直径', value: '约 1.6 倍地球' },
      { label: '位置', value: '宜居带内' },
    ],
  },
  {
    id: 'ksignal',
    label: '凌日信号',
    pos: [-12, -4, 10],
    title: '0.018% 的凹陷',
    desc: '行星从恒星前方掠过时，星光只暗了 0.018%——比蚊子飞过车头灯还微弱。开普勒望远镜盯着它看了 4 年，数到三次规律的凹陷才确认。而且轨道必须几乎侧对我们才有信号：绝大多数行星，我们永远抓不到。',
    facts: [
      { label: '挡光深度', value: '约 0.018%' },
      { label: '观测时长', value: '4 年 · 3 次凌日' },
      { label: '前提', value: '轨道几乎侧对地球' },
      { label: '发现年份', value: '2015 年宣布' },
    ],
  },
]

export const FLIGHT_HOTSPOTS: KeplerHotspot[] = [
  {
    id: 'kgravity',
    label: '重力 ×2',
    pos: [0, 0, 0], // 场景内锚在信标旁，此值为占位
    title: '超级地球的超重',
    desc: '如果 452b 是岩石行星，它的质量约为地球的 5 倍——表面重力接近 2g。你在这里体重翻倍，走路像背着另一个自己，跳一下都费劲。',
    facts: [
      { label: '质量', value: '约 5 倍地球' },
      { label: '表面重力', value: '≈ 2g' },
      { label: '体重', value: '地球上的 2 倍' },
      { label: '类型', value: '超级地球' },
    ],
  },
  {
    id: 'ksky',
    label: '金色的天空',
    pos: [0, 0, 0],
    title: '这里的天空是什么颜色？',
    desc: '更厚的大气可能会把天空染成偏金的暖色——但这只是猜想。头顶那颗恒星看起来倒是和太阳几乎一样大：它大了 11%，距离也远了 4.6%，刚好抵消。',
    facts: [
      { label: '大气', value: '更厚（猜想）' },
      { label: '天空颜色', value: '偏金 · 未知' },
      { label: '母恒星视大小', value: '≈ 地球上的太阳' },
      { label: '一年', value: '385 天' },
    ],
  },
  {
    id: 'khonest',
    label: '这是想象',
    pos: [0, 0, 0],
    title: '诚实的标注',
    desc: '452b 从未被直接看见过——1400 光年外，望远镜只记录到它挡光的凹陷。这颗星球的大陆、海洋、山川，全部是程序按科学猜想生成的样子。真实模样，要等未来的望远镜。',
    facts: [
      { label: '直接成像', value: '从未' },
      { label: '已知来自', value: '凌日测光' },
      { label: '地表样貌', value: '程序生成 · 猜想' },
      { label: '绰号', value: '地球的大表哥' },
    ],
  },
]
