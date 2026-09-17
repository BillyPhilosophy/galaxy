/** 比邻星章（BEYOND · 05）数据层：永昼永夜的世界 */

export const STAR_R = 3
export const ORBIT_R = 8
export const PLANET_R = 1.4
/** 视觉公转周期约 14 秒；行星自转与之严格同步（潮汐锁定） */
export const ORBIT_OMEGA = (2 * Math.PI) / 14

// —— 温度读数（教学示意 °C，趋势真实：大气把昼面的热送往夜面） ——
/** 昼面：干热 → 温和 */
export const tempDayC = (a: number) => Math.round(77 - 30 * a)
/** 晨昏带：始终温和 */
export const tempTermC = (a: number) => Math.round(7 + 10 * a)
/** 夜面：冰封 → 厚大气时回到冰点上下 */
export const tempNightC = (a: number) => Math.round(-83 + 95 * a)

export interface ProximaStage {
  label: string
  en: string
}

export function proximaStageOf(a: number): ProximaStage {
  if (a < 0.15) return { label: '裸岩世界 · 冰火两重天', en: 'FIRE AND ICE' }
  if (a < 0.55) return { label: '薄大气 · 晨昏带有液态水', en: 'THIN AIR · TWILIGHT OASIS' }
  return { label: '厚大气 · 昼夜都在回暖', en: 'THICK AIR · WARMING NIGHT' }
}

export interface ProximaHotspot {
  id: string
  label: string
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const PROXIMA_HOTSPOTS: ProximaHotspot[] = [
  {
    id: 'star',
    label: '比邻星',
    pos: [0, 4.6, 0],
    title: '比邻星 · 最近的邻居',
    desc: '离太阳最近的恒星，只有 4.2 光年——可它小到直径只比木星大一半，暗到肉眼完全看不见。它是半人马 α 三合星的一员（没错，就是三体那个家），作为红矮星，它能安静燃烧上万亿年。',
    facts: [
      { label: '类型', value: 'M5.5V 红矮星' },
      { label: '距地球', value: '4.246 光年 · 最近' },
      { label: '视星等', value: '11.1 · 肉眼不可见' },
      { label: '直径', value: '≈ 1.5 倍木星' },
    ],
  },
  {
    id: 'planet',
    label: '比邻星 b',
    pos: [0, 2.3, 0], // 挂在行星跟随组上
    title: '比邻星 b · 11 天过新年',
    desc: '2016 年发现的超级地球，约 1.3 倍地球质量，恰好位于宜居带。但它离恒星只有日地距离的 1/20——一年只有 11.2 天，蜡烛太近，代价是被恒星牢牢抓住。',
    facts: [
      { label: '发现', value: '2016 年' },
      { label: '质量', value: '约 1.3 倍地球' },
      { label: '一年', value: '11.2 天' },
      { label: '位置', value: '宜居带内' },
    ],
  },
  {
    id: 'terminator',
    label: '晨昏带',
    pos: [1.9, -0.9, 0], // 挂在行星跟随组上
    title: '永恒黄昏带',
    desc: '行星被潮汐锁定：自转一圈和公转一圈同样快，所以永远同一面朝着恒星——和月球永远一面朝地球一个道理。昼面永昼、夜面永夜，只有晨昏线上太阳永远挂在天边，这里最可能有液态水。',
    facts: [
      { label: '自转 = 公转', value: '11.2 天' },
      { label: '类比', value: '月球永远一面朝地球' },
      { label: '晨昏带', value: '永恒黄昏 · 可能有水' },
      { label: '关键', value: '大气越厚夜面越暖' },
    ],
  },
  {
    id: 'flare',
    label: '耀斑',
    pos: [2.6, 3.6, 0],
    title: '红矮星的坏脾气',
    desc: '红矮星是耀星：几分钟内亮度可以暴涨几十倍。2017 年的一次大耀斑让比邻星在可见光下亮了 68 倍，行星承受的紫外线轰炸是地球的几百倍——这是晨昏带生命的头号敌人。',
    facts: [
      { label: '2017 大耀斑', value: '增亮 68 倍' },
      { label: '辐射轰炸', value: '≈ 地球的数百倍' },
      { label: '特点', value: '年轻红矮星更暴躁' },
      { label: '影响', value: '可能剥离行星大气' },
    ],
  },
]
