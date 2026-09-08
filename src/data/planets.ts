export interface MoonData {
  name: string
  size: number
  distance: number
  period: number
  color: string
}

export interface RingData {
  texture: string
  inner: number
  outer: number
  opacity?: number
}

export interface BodyData {
  id: string
  name: string
  nameEn: string
  color: string
  radius: number
  tagline: string
  description: string
  facts: { label: string; value: string }[]
}

export interface PlanetData extends BodyData {
  distance: number
  orbitPeriod: number
  rotationPeriod: number
  tilt: number
  texture: string
  ring?: RingData
  moons?: MoonData[]
  initialAngle: number
}

export const SUN: BodyData = {
  id: 'sun',
  name: '太阳',
  nameEn: 'SUN',
  color: '#ffb340',
  radius: 5.5,
  tagline: '太阳系的心脏与能量之源',
  description:
    '太阳是太阳系的中心恒星，集中了太阳系 99.86% 的质量。核心的氢核聚变每秒将约 6 亿吨氢转化为能量，是地球上一切生命的最终能量来源。',
  facts: [
    { label: '类型', value: 'G2V 黄矮星' },
    { label: '直径', value: '1,392,700 km' },
    { label: '质量占比', value: '太阳系 99.86%' },
    { label: '表面温度', value: '5,505°C' },
    { label: '核心温度', value: '≈1,570 万°C' },
    { label: '年龄', value: '约 46 亿年' },
  ],
}

export const PLANETS: PlanetData[] = [
  {
    id: 'mercury',
    name: '水星',
    nameEn: 'MERCURY',
    color: '#b8a89a',
    radius: 0.55,
    distance: 13,
    orbitPeriod: 7.2,
    rotationPeriod: 18,
    tilt: 0.03,
    texture: '/textures/mercury.png',
    initialAngle: 0.9,
    tagline: '离太阳最近的行星',
    description:
      '水星是太阳系最小、离太阳最近的行星。它几乎没有大气层，表面布满陨石坑，昼夜温差超过 600°C，是太阳系中的温差之最。',
    facts: [
      { label: '直径', value: '4,879 km' },
      { label: '距太阳', value: '5,791 万 km' },
      { label: '公转周期', value: '88 天' },
      { label: '自转周期', value: '58.6 天' },
      { label: '表面温度', value: '-173 ~ 427°C' },
      { label: '卫星', value: '0 颗' },
    ],
  },
  {
    id: 'venus',
    name: '金星',
    nameEn: 'VENUS',
    color: '#e8c47a',
    radius: 0.92,
    distance: 17,
    orbitPeriod: 18.5,
    rotationPeriod: -30,
    tilt: 177.4,
    texture: '/textures/venus.png',
    initialAngle: 2.6,
    tagline: '夜空中最亮的行星',
    description:
      '金星被浓厚的二氧化碳大气包裹，失控的温室效应让表面温度高达 464°C，比水星还要炎热。它的自转方向与众不同——在金星上，太阳从西边升起。',
    facts: [
      { label: '直径', value: '12,104 km' },
      { label: '距太阳', value: '1.082 亿 km' },
      { label: '公转周期', value: '225 天' },
      { label: '自转周期', value: '243 天 · 逆行' },
      { label: '平均温度', value: '464°C' },
      { label: '卫星', value: '0 颗' },
    ],
  },
  {
    id: 'earth',
    name: '地球',
    nameEn: 'EARTH',
    color: '#4d8fd1',
    radius: 1,
    distance: 22,
    orbitPeriod: 30,
    rotationPeriod: 8,
    tilt: 23.4,
    texture: '/textures/earth.png',
    initialAngle: 4.4,
    moons: [{ name: '月球', size: 0.27, distance: 2.1, period: 2.3, color: '#c9c9c9' }],
    tagline: '目前已知唯一存在生命的星球',
    description:
      '地球是目前已知唯一存在生命的行星。液态水覆盖了约 71% 的表面，适宜的大气层与磁场共同守护着这颗蓝色星球上的万物。',
    facts: [
      { label: '直径', value: '12,756 km' },
      { label: '距太阳', value: '1.496 亿 km' },
      { label: '公转周期', value: '365.25 天' },
      { label: '自转周期', value: '23.9 小时' },
      { label: '平均温度', value: '15°C' },
      { label: '卫星', value: '1 颗' },
    ],
  },
  {
    id: 'mars',
    name: '火星',
    nameEn: 'MARS',
    color: '#c16538',
    radius: 0.72,
    distance: 27.5,
    orbitPeriod: 56.4,
    rotationPeriod: 8.5,
    tilt: 25.2,
    texture: '/textures/mars.png',
    initialAngle: 1.7,
    tagline: '红色的沙漠世界',
    description:
      '火星因表面的氧化铁而呈现红色，拥有太阳系最高的火山——奥林帕斯山。它是人类探测器造访最多的行星，也是未来载人深空探测的首选目标。',
    facts: [
      { label: '直径', value: '6,792 km' },
      { label: '距太阳', value: '2.279 亿 km' },
      { label: '公转周期', value: '687 天' },
      { label: '自转周期', value: '24.6 小时' },
      { label: '平均温度', value: '-63°C' },
      { label: '卫星', value: '2 颗' },
    ],
  },
  {
    id: 'jupiter',
    name: '木星',
    nameEn: 'JUPITER',
    color: '#d8b083',
    radius: 2.7,
    distance: 38,
    orbitPeriod: 356,
    rotationPeriod: 3.2,
    tilt: 3.1,
    texture: '/textures/jupiter.png',
    initialAngle: 5.3,
    moons: [
      { name: '木卫一', size: 0.13, distance: 3.6, period: 1.2, color: '#d8c98f' },
      { name: '木卫二', size: 0.11, distance: 4.1, period: 1.8, color: '#c9b8a8' },
      { name: '木卫三', size: 0.19, distance: 4.7, period: 2.6, color: '#9a918a' },
      { name: '木卫四', size: 0.17, distance: 5.4, period: 3.6, color: '#7a6f66' },
    ],
    tagline: '行星之王',
    description:
      '木星是太阳系体积与质量最大的行星，足以装下 1,300 个地球。标志性的大红斑是一场已经持续了数百年的巨型风暴。',
    facts: [
      { label: '直径', value: '139,820 km' },
      { label: '距太阳', value: '7.785 亿 km' },
      { label: '公转周期', value: '11.9 年' },
      { label: '自转周期', value: '9.9 小时' },
      { label: '云顶温度', value: '-108°C' },
      { label: '卫星', value: '95 颗' },
    ],
  },
  {
    id: 'saturn',
    name: '土星',
    nameEn: 'SATURN',
    color: '#e3cf9e',
    radius: 2.3,
    distance: 48,
    orbitPeriod: 884,
    rotationPeriod: 3.5,
    tilt: 26.7,
    texture: '/textures/saturn.png',
    initialAngle: 3.1,
    ring: { texture: '/textures/saturn_ring.png', inner: 3.1, outer: 5.3 },
    tagline: '光环之冠',
    description:
      '土星以壮观的光环闻名，光环由无数冰粒与岩石碎屑构成，宽逾 20 万公里，厚度却常常不足百米。它的平均密度比水还低。',
    facts: [
      { label: '直径', value: '116,460 km' },
      { label: '距太阳', value: '14.3 亿 km' },
      { label: '公转周期', value: '29.4 年' },
      { label: '自转周期', value: '10.7 小时' },
      { label: '云顶温度', value: '-139°C' },
      { label: '卫星', value: '146 颗' },
    ],
  },
  {
    id: 'uranus',
    name: '天王星',
    nameEn: 'URANUS',
    color: '#9fd8dd',
    radius: 1.6,
    distance: 58,
    orbitPeriod: 2522,
    rotationPeriod: -5.5,
    tilt: 97.8,
    texture: '/textures/uranus.png',
    initialAngle: 0.2,
    ring: { texture: '/textures/uranus_ring.png', inner: 2.4, outer: 3.2, opacity: 0.7 },
    tagline: '躺着自转的冰巨星',
    description:
      '天王星的自转轴倾角接近 98°，几乎"躺"在轨道面上公转，一次极昼或极夜可持续 21 年。大气中的甲烷赋予它淡雅的青绿色。',
    facts: [
      { label: '直径', value: '50,724 km' },
      { label: '距太阳', value: '28.7 亿 km' },
      { label: '公转周期', value: '84 年' },
      { label: '自转周期', value: '17.2 小时 · 逆行' },
      { label: '云顶温度', value: '-197°C' },
      { label: '卫星', value: '28 颗' },
    ],
  },
  {
    id: 'neptune',
    name: '海王星',
    nameEn: 'NEPTUNE',
    color: '#4d6fe0',
    radius: 1.55,
    distance: 67,
    orbitPeriod: 4947,
    rotationPeriod: 5.5,
    tilt: 28.3,
    texture: '/textures/neptune.png',
    initialAngle: 5.9,
    tagline: '最遥远的蓝色风暴',
    description:
      '海王星是离太阳最远的行星，也是第一颗先由数学计算预测、再被望远镜证实的行星。这里刮着太阳系最强的风，风速可超过 2,000 km/h。',
    facts: [
      { label: '直径', value: '49,244 km' },
      { label: '距太阳', value: '44.95 亿 km' },
      { label: '公转周期', value: '164.8 年' },
      { label: '自转周期', value: '16.1 小时' },
      { label: '云顶温度', value: '-201°C' },
      { label: '卫星', value: '16 颗' },
    ],
  },
]

export const ALL_BODIES: BodyData[] = [SUN, ...PLANETS]

export function focusDistance(id: string): number {
  const body = ALL_BODIES.find((b) => b.id === id)
  if (!body) return 10
  return Math.max(body.radius * 6.5 + 1.5, 5)
}
