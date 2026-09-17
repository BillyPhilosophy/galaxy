/**
 * 大角星章节数据层。
 * 星表为简化的真实数据：J2000 赤经/赤纬 + 自行取常用天文年值的近似（形状与量级正确，
 * 精度约 0.5°，教学演示用）。pmRa 采用星表惯例 μ_α·cosδ，即赤经方向上的角速度。
 */

export interface SkyStar {
  id: string
  name: string
  /** 赤经，度 (J2000) */
  ra: number
  /** 赤纬，度 */
  dec: number
  /** 视星等 */
  mag: number
  /** 自行 mas/yr（赤经方向，已乘 cos δ） */
  pmRa: number
  /** 自行 mas/yr（赤纬方向） */
  pmDec: number
  color: string
}

/** 时间机器的量程：±10 万年 */
export const T_RANGE = 100000
/** 天球穹顶半径（场景单位） */
export const DOME_R = 900

const S = (id: string, name: string, ra: number, dec: number, mag: number, pmRa: number, pmDec: number, color: string): SkyStar =>
  ({ id, name, ra, dec, mag, pmRa, pmDec, color })

export const SKY_STARS: SkyStar[] = [
  // —— 北斗七星（勺柄弧线是导航的起点）——
  S('dubhe', '天枢', 165.93, 61.75, 1.79, -136, -35, '#ffd9a0'),
  S('merak', '天璇', 165.46, 56.38, 2.37, 81, 34, '#f0f4ff'),
  S('phecda', '天玑', 178.46, 53.69, 2.44, 108, 11, '#eef2ff'),
  S('megrez', '天权', 183.86, 57.03, 3.31, 104, 8, '#f2f4ff'),
  S('alioth', '玉衡', 193.51, 55.96, 1.77, 112, -8, '#f0f2ff'),
  S('mizar', '开阳', 200.98, 54.93, 2.27, 121, -22, '#f4f6ff'),
  S('alkaid', '摇光', 206.89, 49.31, 1.86, -122, -35, '#e8eeff'),
  // —— 牧夫座风筝 ——
  S('arcturus', '大角星', 213.92, 19.18, -0.05, -1093, -2000, '#ffb060'),
  S('izar', '梗河一', 221.25, 27.07, 2.35, -51, 20, '#ffe0b0'),
  S('seginus', '招摇', 218.02, 38.31, 3.03, -116, 151, '#f4f4f8'),
  S('delta-boo', '七公七', 228.88, 33.31, 3.47, -84, -110, '#fff2e0'),
  S('muphrid', '右摄提一', 208.67, 18.40, 2.68, -61, -354, '#fff0d8'),
  // —— 春季大弧线延伸 + 其它著名亮星 ——
  S('spica', '角宿一', 201.30, -11.16, 0.97, -43, -32, '#cfe0ff'),
  S('regulus', '轩辕十四', 152.09, 11.97, 1.35, -249, 6, '#d8e6ff'),
  S('polaris', '北极星', 37.95, 89.26, 1.98, 45, -12, '#ffe8b8'),
  S('vega', '织女一', 279.23, 38.78, 0.03, 201, 287, '#e4ecff'),
  S('deneb', '天津四', 310.36, 45.28, 1.25, 2, 2, '#eef2ff'),
  S('altair', '牛郎星', 297.70, 8.87, 0.77, 538, 386, '#f4f6ff'),
  S('antares', '心宿二', 247.35, -26.43, 0.96, -12, -23, '#ff6a4d'),
  S('pollux', '北河三', 116.33, 28.03, 1.14, -626, -46, '#ffc878'),
  S('capella', '五车二', 79.17, 45.99, 0.08, 76, -427, '#fff0c0'),
  S('sirius', '天狼星', 101.29, -16.72, -1.46, -546, -1223, '#e8f0ff'),
  S('procyon', '南河三', 114.83, 5.22, 0.34, -716, -1034, '#fbf8e8'),
  S('betelgeuse', '参宿四', 88.79, 7.41, 0.42, 28, 11, '#ff8a50'),
  S('rigel', '参宿七', 78.63, -8.20, 0.13, 1, -1, '#cfe0ff'),
]

export const ARC_STAR = SKY_STARS.find((s) => s.id === 'arcturus')!

/** 星座连线（star id 对） */
export const CONSTELLATION_LINES: [string, string][] = [
  // 北斗七星：勺斗闭合 + 勺柄
  ['dubhe', 'merak'],
  ['merak', 'phecda'],
  ['phecda', 'megrez'],
  ['megrez', 'dubhe'],
  ['megrez', 'alioth'],
  ['alioth', 'mizar'],
  ['mizar', 'alkaid'],
  // 牧夫座风筝
  ['arcturus', 'izar'],
  ['izar', 'delta-boo'],
  ['delta-boo', 'seginus'],
  ['seginus', 'arcturus'],
  ['arcturus', 'muphrid'],
]

/** 「沿勺柄找星」路径：玉衡→开阳→摇光→（弧线）→大角星→（直刺）→角宿一 */
export const ARC_GUIDE_IDS = ['alioth', 'mizar', 'alkaid', 'arcturus', 'spica']

const D2R = Math.PI / 180

/** 球面坐标 → 场景位置 */
export function raDecToVec(ra: number, dec: number, r: number): [number, number, number] {
  const c = Math.cos(dec * D2R)
  return [r * c * Math.cos(ra * D2R), r * Math.sin(dec * D2R), -r * c * Math.sin(ra * D2R)]
}

/** 恒星在 t 年后（可负）的位置：自行直接推在赤经赤纬上 */
export function starPosAt(star: SkyStar, tYears: number, r = DOME_R): [number, number, number] {
  const ra = star.ra + (star.pmRa * tYears) / 3.6e6
  const dec = Math.min(89.9, Math.max(-89.9, star.dec + (star.pmDec * tYears) / 3.6e6))
  return raDecToVec(ra, dec, r)
}

// —— 大角星的运动学（线性近似） ——
const D0_PC = 11.26 // 今天距离 36.7 ly
const VR = -5.19 * 1.0227e-6 // 径向速度 pc/yr（负 = 正在接近）
const VT = 118.1 * 1.0227e-6 // 切向速度 pc/yr
const ABS_MAG = -0.3 // 绝对星等

/** 距地球（光年） */
export function arcDistAt(tYears: number): number {
  const d2 = D0_PC * D0_PC + 2 * D0_PC * VR * tYears + (VR * VR + VT * VT) * tYears * tYears
  return Math.sqrt(d2) * 3.26156
}

/** 视星等：今天 −0.05，±10 万年时约 +0.8（变暗但仍肉眼可见） */
export function arcMagAt(tYears: number): number {
  return ABS_MAG + 5 * Math.log10(arcDistAt(tYears) / 3.26156 / 10)
}

/** 相对今天，它在天上挪了多远（度） */
export function arcTraveledDeg(tYears: number): number {
  const [x0, y0, z0] = starPosAt(ARC_STAR, 0, 1)
  const [x1, y1, z1] = starPosAt(ARC_STAR, tYears, 1)
  const dot = Math.min(1, Math.max(-1, x0 * x1 + y0 * y1 + z0 * z1))
  return (Math.acos(dot) * 180) / Math.PI
}

/** 满月角直径约 0.53°，给小朋友换成"几个月亮" */
export const moonsOf = (deg: number) => deg / 0.53

export function formatYears(t: number): string {
  if (t === 0) return '今天'
  const abs = Math.abs(t)
  const body = abs >= 10000 ? `${(abs / 10000).toFixed(1)} 万年` : `${abs.toLocaleString()} 年`
  return t < 0 ? `${body}前` : `${body}后`
}

export interface ArcStage {
  label: string
  en: string
}

export function arcStageOf(t: number): ArcStage {
  if (t <= -60000) return { label: '远古 · 它在北方高处', en: 'HIGH IN THE NORTH' }
  if (t <= -20000) return { label: '缓缓南下', en: 'DRIFTING SOUTH' }
  if (t <= 20000) return { label: '今天 · 北天最亮的星', en: 'BRIGHTEST OF THE NORTHERN SKY' }
  if (t <= 60000) return { label: '正在远去', en: 'SLIPPING AWAY' }
  return { label: '未来 · 溜向南方低空', en: 'OFF TO THE SOUTHERN SKY' }
}

export interface ArcHotspot {
  id: string
  label: string
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

/** 观星模式热点；位置由场景按 id 实时计算（star 跟随大角星） */
export const SKY_HOTSPOTS: ArcHotspot[] = [
  {
    id: 'star',
    label: '大角星',
    title: '大角星 · 橙色巨星',
    desc: '北天夜空最亮的恒星。它的表面比太阳凉，却因为膨胀到太阳的 25 倍宽，总亮度反而是太阳的约 170 倍。此刻照进你眼睛的光，是 37 年前从它表面出发的。',
    facts: [
      { label: '类型', value: 'K1.5 III 橙巨星' },
      { label: '视星等', value: '−0.05（北天最亮）' },
      { label: '距地球', value: '约 36.7 光年' },
      { label: '半径', value: '约 25 倍太阳' },
    ],
  },
  {
    id: 'dipper',
    label: '北斗七星',
    title: '北斗七星 · 导航起点',
    desc: '找大角星的诀窍：沿着勺柄三颗星画一条弧线滑出去，第一颗撞见的亮橙色星星就是它。不过七星其实各奔东西——拖动时间条，你会看到勺子慢慢散架。',
    facts: [
      { label: '口诀', value: '沿勺柄弧线找大角' },
      { label: '成员', value: '天枢 → 摇光 共 7 颗' },
      { label: '自行', value: '每颗星方向都不同' },
      { label: '最佳观赏', value: '春季夜晚' },
    ],
  },
  {
    id: 'bootes',
    label: '牧夫座 · 龙角',
    title: '牧夫座 · 东方苍龙的角',
    desc: '中国古人把这片星空看作东方苍龙的角——"二月二，龙抬头"说的就是春天黄昏龙角升起。1933 年芝加哥世博会用它 40 年前发出的光点亮会场；夏威夷人叫它 Hōkūleʻa"欢乐之星"，靠它横渡太平洋。',
    facts: [
      { label: '中国', value: '东方苍龙之角' },
      { label: '1933 世博会', value: '用它的光开幕' },
      { label: '夏威夷', value: 'Hōkūleʻa 欢乐之星' },
      { label: '星座形状', value: '一只大风筝' },
    ],
  },
  {
    id: 'trail',
    label: '过路人',
    title: '一位飞驰的过路人',
    desc: '大角星是从银晕来的老年星，正以每秒 122 公里的速度从我们附近呼啸而过——比高铁快一千多倍。每一千年它在天上挪约一个满月的宽度；一百多万年后，它将暗到肉眼再也看不见。',
    facts: [
      { label: '空间速度', value: '约 122 km/s' },
      { label: '每一千年', value: '≈ 一个月亮宽' },
      { label: '来历', value: '银晕的老年星' },
      { label: '结局', value: '一百多万年后淡出肉眼' },
    ],
  },
]

/** 对比模式热点（位置静态，场景内直接使用） */
export const COMPARE_HOTSPOTS: (ArcHotspot & { pos: [number, number, number] })[] = [
  {
    id: 'sun',
    label: '未来的太阳',
    pos: [-70, 16, 0],
    title: '太阳 · 快进 70 亿年',
    desc: '烧完核心的氢之后，太阳会膨胀成一颗橙巨星——就像右边的大角星那样。它连水星轨道都还够不着，但会把地球的天空烤成橙色。放心，它不会爆炸：太阳太轻，最后只会安静地脱下外衣，变成一颗白矮星。',
    facts: [
      { label: '半径', value: '×25.4' },
      { label: '表面温度', value: '5778 → 约 4300 K' },
      { label: '光度', value: '× 约 170' },
      { label: '结局', value: '白矮星 · 不爆炸' },
    ],
  },
  {
    id: 'arcturus-cmp',
    label: '大角星',
    pos: [70, 36, 0],
    title: '大角星 · 现在进行时',
    desc: '大角星的质量和太阳几乎一样，所以它就是太阳晚年的"剧透"。它已经烧完核心的氢，正在用核心外的一层氢壳继续燃烧，把自己吹成了今天的橙色大块头。',
    facts: [
      { label: '质量', value: '约 1.1 倍太阳' },
      { label: '半径', value: '约 25.4 倍太阳' },
      { label: '光度', value: '约 170 倍太阳' },
      { label: '燃料', value: '核心外的氢壳' },
    ],
  },
  {
    id: 'earth',
    label: '地球（放大示意）',
    pos: [-70, 30, 215],
    title: '地球 · 一个小蓝点',
    desc: '真实比例下，地球只有太阳的 1/109 宽——放在大角星旁边连一个像素都不到，这里把它放大了。等到太阳变成巨星，从地球看，天上的太阳会有 13 倍宽。',
    facts: [
      { label: '直径', value: '太阳的 1/109' },
      { label: '日地距离', value: '≈ 215 倍太阳半径' },
      { label: '那时看太阳', value: '13 倍宽的大橙盘' },
    ],
  },
]

// —— 对比模式常量与插值 ——
export const SUN_NOW = { r: 1, temp: 5778, lum: 1 }
export const ARCTURUS_CMP = { r: 25.4, temp: 4300, lum: 170 }
/** 场景布局：太阳在左、大角星在右（场景单位 = 太阳半径） */
export const SUN_POS: [number, number, number] = [-70, 0, 0]
export const ARC_POS: [number, number, number] = [70, 0, 0]
/** 水星轨道 0.39 AU ≈ 84 倍太阳半径；地球轨道 215 倍 */
export const MERCURY_ORBIT = 84
export const EARTH_ORBIT = 215

export interface SunMorph {
  r: number
  temp: number
  lum: number
}

/**
 * 太阳 → 大角星 的形变插值。p^1.6 让膨胀前缓后猛；
 * 光度为朝向实测值 ≈170 L☉ 的展示插值（R、T 直接套黑体公式会落到 200 左右，
 * 与常用实测值 170 略有出入，这里取对小朋友更权威的 170）。
 */
export function sunMorphAt(p: number): SunMorph {
  const c = Math.min(1, Math.max(0, p))
  return {
    r: 1 + (ARCTURUS_CMP.r - 1) * Math.pow(c, 1.6),
    temp: SUN_NOW.temp - (SUN_NOW.temp - ARCTURUS_CMP.temp) * c,
    lum: 1 + (ARCTURUS_CMP.lum - 1) * Math.pow(c, 1.8),
  }
}

export function morphStageOf(p: number): ArcStage {
  if (p < 0.05) return { label: '太阳 · 今天', en: 'THE SUN TODAY' }
  if (p < 0.55) return { label: '核心氢尽 · 开始膨胀', en: 'CORE HYDROGEN EXHAUSTED' }
  if (p < 0.95) return { label: '膨胀成橙巨星', en: 'SWELLING INTO A GIANT' }
  return { label: '70 亿年后 · 大角星同款', en: 'THE SUN, ~7 GYR FROM NOW' }
}
