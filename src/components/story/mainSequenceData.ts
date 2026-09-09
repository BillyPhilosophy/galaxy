import * as THREE from 'three'

export interface MainSeqStar {
  /** 质量（太阳质量） */
  mass: number
  /** 光度（太阳光度） */
  luminosity: number
  /** 半径（太阳半径） */
  radius: number
  /** 表面温度 K */
  temp: number
  /** 光谱型标签，如 G2V */
  typeLabel: string
  color: THREE.Color
  colorHex: string
  /** 主序寿命（年） */
  lifetimeYears: number
  fate: string
  fateColor: string
  /** 是否接近太阳（G2V） */
  isSun: boolean
}

/** 黑体色温锚点：温度 K → 颜色 */
const TEMP_ANCHORS: [number, string][] = [
  [2400, '#ff4a2e'],
  [3700, '#ff7a3c'],
  [5200, '#ffb85e'],
  [6000, '#ffe9b0'],
  [7500, '#ffffff'],
  [10000, '#d8e4ff'],
  [42000, '#9db8ff'],
]

export function colorForTemp(t: number): THREE.Color {
  const clamped = THREE.MathUtils.clamp(t, TEMP_ANCHORS[0][0], TEMP_ANCHORS[TEMP_ANCHORS.length - 1][0])
  for (let i = 0; i < TEMP_ANCHORS.length - 1; i++) {
    const [t0, c0] = TEMP_ANCHORS[i]
    const [t1, c1] = TEMP_ANCHORS[i + 1]
    if (clamped >= t0 && clamped <= t1) {
      return new THREE.Color(c0).lerp(new THREE.Color(c1), (clamped - t0) / (t1 - t0))
    }
  }
  return new THREE.Color(TEMP_ANCHORS[TEMP_ANCHORS.length - 1][1])
}

/** 光谱型分段（哈佛分类，按表面温度） */
const SPECTRAL_BANDS: [number, string][] = [
  [30000, 'O'],
  [10000, 'B'],
  [7500, 'A'],
  [6000, 'F'],
  [5200, 'G'],
  [3700, 'K'],
  [0, 'M'],
]

function spectralLabel(t: number): string {
  for (let i = 0; i < SPECTRAL_BANDS.length - 1; i++) {
    const hot = SPECTRAL_BANDS[i][0]
    const cold = SPECTRAL_BANDS[i + 1][0]
    if (t > cold && t <= (i === 0 ? Infinity : hot)) {
      const letter = SPECTRAL_BANDS[i === 0 ? 0 : i][1]
      const hi = i === 0 ? 42000 : hot
      // 子型数字 0（最热）→ 9（最冷）
      const digit = Math.min(9, Math.floor(((hi - t) / (hi - cold)) * 10))
      return `${letter}${digit}V`
    }
  }
  return 'M9V'
}

/** 由质量推导主序星全部参数（近似质光/质径关系） */
export function starFromMass(m: number): MainSeqStar {
  const luminosity = Math.pow(m, 3.5)
  const radius = Math.pow(m, 0.74)
  const temp = 5778 * Math.pow(luminosity / (radius * radius), 0.25)
  const color = colorForTemp(temp)
  const lifetimeYears = 1e10 * (m / luminosity)
  const fate = m < 8 ? '红巨星 → 白矮星' : m <= 20 ? '超新星 → 中子星' : '超新星 → 黑洞'
  const fateColor = m < 8 ? '#ffb85e' : m <= 20 ? '#7de3ff' : '#8b7ff0'
  return {
    mass: m,
    luminosity,
    radius,
    temp,
    typeLabel: spectralLabel(temp),
    color,
    colorHex: `#${color.getHexString()}`,
    lifetimeYears,
    fate,
    fateColor,
    isSun: Math.abs(m - 1) < 0.06,
  }
}

export function formatLifetime(y: number): string {
  if (y >= 1e12) return `${(y / 1e12).toFixed(1)} 万亿年`
  if (y >= 1e8) return `${(y / 1e8).toFixed(1)} 亿年`
  if (y >= 1e4) return `${(y / 1e4).toFixed(0)} 万年`
  return `${Math.round(y)} 年`
}

export function formatLum(l: number): string {
  if (l < 0.1) return `${l.toFixed(3)} L☉`
  if (l < 10) return `${l.toFixed(2)} L☉`
  if (l < 1000) return `${l.toFixed(1)} L☉`
  return `${(l / 1000).toFixed(1)} 千 L☉`
}

/** 赫罗图主序带采样点（对数质量 0.2–30 M☉） */
export const HR_SAMPLES = Array.from({ length: 26 }, (_, i) => {
  const m = 0.2 * Math.pow(150, i / 25)
  const s = starFromMass(m)
  return { temp: s.temp, luminosity: s.luminosity }
})

export interface MSHotspot {
  id: string
  label: string
  /** 标签锚点 = dir × 恒星场景半径 */
  dir: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const MS_HOTSPOTS: MSHotspot[] = [
  {
    id: 'fusion',
    label: '聚变核心',
    dir: [0, 1.55, 0],
    title: '核心聚变炉',
    desc: '主序星的能量来自核心的氢核聚变：太阳每秒将约 6 亿吨氢聚变成氦。向外的辐射压与向内的引力精确平衡，恒星因此能稳定燃烧数十亿年。太阳这样的恒星走质子-质子链反应，更大质量的恒星则靠 CNO 循环。',
    facts: [
      { label: '能量来源', value: '氢核聚变' },
      { label: '太阳每秒消耗', value: '约 6 亿吨氢' },
      { label: '稳定机制', value: '辐射压 vs 引力' },
      { label: '大质量恒星', value: 'CNO 循环' },
    ],
  },
  {
    id: 'surface',
    label: '米粒与黑子',
    dir: [0.85, 0.72, 0.42],
    title: '米粒组织与黑子',
    desc: '恒星表面翻滚着对流形成的"米粒组织"：每个米粒约 1000 公里宽，只存在几分钟就消失。磁场抑制对流的地方形成较暗的黑子——越冷的恒星黑子越多，红矮星常常"满脸斑点"。',
    facts: [
      { label: '米粒尺寸', value: '约 1,000 km' },
      { label: '米粒寿命', value: '约几分钟' },
      { label: '黑子成因', value: '磁场抑制对流' },
      { label: '规律', value: '恒星越冷黑子越多' },
    ],
  },
  {
    id: 'wind',
    label: '恒星风',
    dir: [0.6, 0.95, 2.3],
    title: '恒星风',
    desc: '恒星外层大气不断吹出带电粒子流。太阳风速度约 400 km/s，它塑造行星磁层、吹出彗星的长尾；大质量热星的星风猛烈得多，一生能吹走自身可观的质量。',
    facts: [
      { label: '太阳风速', value: '约 400 km/s' },
      { label: '影响', value: '磁层与彗尾' },
      { label: '热星星风', value: '可吹走大量质量' },
    ],
  },
]
