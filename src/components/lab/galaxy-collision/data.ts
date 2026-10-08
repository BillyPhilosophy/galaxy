import * as THREE from 'three'

export const COLLISION_STAGE_MARKS = [0, 0.16, 0.34, 0.52, 0.72, 1] as const

export interface CollisionStage {
  id: string
  label: string
  en: string
  time: string
  caption: string
  detail: string
}

export const COLLISION_STAGES: CollisionStage[] = [
  {
    id: 'today',
    label: '今天 · 遥遥相望',
    en: 'TODAY · FAR APART',
    time: '今天',
    caption: '那颗小光斑，是装着上万亿颗恒星的仙女座星系',
    detail: '它距离我们约 250 万光年。未来轨道仍有不确定性，这里展示的是一种可能的模型推演。',
  },
  {
    id: 'approach',
    label: '逐渐接近',
    en: 'THE APPROACH',
    time: '约 40 亿年后',
    caption: '仙女座铺满天空，但这不是明天，而是几十亿年后的可能未来',
    detail: '两座星系的共同引力改变彼此轨道，星系盘在天空中变得越来越大。',
  },
  {
    id: 'first-pass',
    label: '第一次近掠',
    en: 'FIRST PASS',
    time: '约 45 亿年后',
    caption: '它们不是撞碎，而是在跳一支超级慢的引力舞',
    detail: '恒星间距大得惊人，绝大多数恒星彼此穿过；星系整体形状却被引力强烈拉扯。',
  },
  {
    id: 'tidal-dance',
    label: '引力回旋',
    en: 'TIDAL DANCE',
    time: '约 50 亿年后',
    caption: '长长的潮汐尾，是引力在宇宙中画出的弧线',
    detail: '外层恒星被甩成长尾，两座星系减速后又被共同引力拉回。',
  },
  {
    id: 'second-pass',
    label: '再次相遇',
    en: 'SECOND ENCOUNTER',
    time: '约 60 亿年后',
    caption: '气体云互相挤压，一批恒星宝宝被点亮',
    detail: '恒星很少直接相撞，巨大的气体云却会碰撞、压缩，触发猛烈的恒星形成。',
  },
  {
    id: 'remnant',
    label: '新的大星系',
    en: 'A NEW GALAXY',
    time: '很久以后',
    caption: '两座旋涡渐渐合成一个更大、更圆的新星系',
    detail: '这只是众多可能未来中的一种。新的观测会继续帮助科学家修正这场宇宙预报。',
  },
]

/* ---------- 四种可能的结局 ---------- */

export type OutcomeId = 'merge' | 'loop' | 'headon' | 'miss'

export interface OutcomeMeta {
  id: OutcomeId
  label: string
  en: string
  short: string
  desc: string
  merge: boolean
}

export const OUTCOME_META: Record<OutcomeId, OutcomeMeta> = {
  merge: {
    id: 'merge',
    label: '一次近掠后合并',
    en: 'FIRST-PASS MERGER',
    short: '引力之舞',
    desc: '第一次擦肩后减速，被引力拉回来，合并成一个更大的星系',
    merge: true,
  },
  loop: {
    id: 'loop',
    label: '多次绕行后合并',
    en: 'COSMIC WALTZ',
    short: '宇宙舞伴',
    desc: '来回绕行好几圈，旋臂渐渐瓦解，最终紧紧抱在一起',
    merge: true,
  },
  headon: {
    id: 'headon',
    label: '接近正面碰撞',
    en: 'NEAR HEAD-ON',
    short: '正面相撞',
    desc: '几乎正对着撞上，星系盘互相穿过，激起一圈圈恒星涟漪',
    merge: true,
  },
  miss: {
    id: 'miss',
    label: '擦肩而过',
    en: 'CLOSE MISS',
    short: '没有合并',
    desc: '方向太偏或速度太快——它们隔着几十万光年打个招呼，然后各自远行',
    merge: false,
  },
}

/** 结局对阶段文案的覆盖（没合并的未来，后期文案完全不同） */
export const OUTCOME_STAGE_OVERRIDES: Partial<Record<OutcomeId, Record<number, Partial<CollisionStage>>>> = {
  miss: {
    2: {
      caption: '最近的一刻：它们隔着约 80 万光年打了个招呼',
      detail: '恒星依旧不会相撞，引力只把彼此的旋臂轻轻扯长了一点。',
    },
    3: {
      label: '擦肩而过',
      en: 'CLOSE MISS',
      caption: '它们没有停下，开始越飞越远',
      detail: '方向太偏、速度太快时，引力来不及把两座星系绑在一起。',
    },
    4: {
      label: '渐行渐远',
      en: 'DRIFTING APART',
      caption: '带着被扯变形的旋臂，各自走向深空',
      detail: '2025 年的新研究认为：未来 100 亿年内，合并发生的概率大约只有一半。',
    },
    5: {
      label: '仍是两座星系',
      en: 'STILL TWO GALAXIES',
      caption: '这一次，未来选择了“不合并”',
      detail: '回到实验台换一组速度和方向，就能看到完全不同的结局。',
    },
  },
  loop: {
    3: {
      caption: '第一次掠过只是序曲，引力把它们一次又一次拉回来',
      detail: '每绕一圈，轨道就缩小一点，旋臂也被扯得更松。',
    },
    4: {
      caption: '绕了一圈又一圈，两座星系终于分不开了',
      detail: '反复近掠让气体云多次压缩，一批又一批新恒星被点亮。',
    },
  },
  headon: {
    2: {
      caption: '几乎正对撞上！两座星系盘直接穿过了彼此',
      detail: '正面相遇时，恒星依旧从空隙中穿过，但整个星系盘被剧烈震荡。',
    },
    3: {
      label: '环形涟漪',
      en: 'RING RIPPLE',
      caption: '像石子落进水面，恒星的涟漪一圈圈荡开',
      detail: '正面穿过对方后，引力冲击波把恒星和气体外推成巨大的环。',
    },
    4: {
      caption: '穿过去之后，又被引力拽了回来',
      detail: '气体云在这次回头里猛烈挤压，点亮成片的恒星宝宝。',
    },
  },
}

interface OutcomeConfig {
  centers: [THREE.Vector3[], THREE.Vector3[]]
  spinMW: number[]
  spinAND: number[]
  tailScale: number
  burstBoost: number
  remnantSquashY: number
  remnantSquashZ: number
  miss?: boolean
  splash?: boolean
  camPositions?: THREE.Vector3[]
  camTargets?: THREE.Vector3[]
}

const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

export const OUTCOME_CONFIGS: Record<OutcomeId, OutcomeConfig> = {
  merge: {
    centers: [
      [vec(-112, -2, 16), vec(-76, -1, 10), vec(-25, 0, 4), vec(64, -3, -12), vec(27, 0, 5), vec(0, 0, 0)],
      [vec(116, 8, -18), vec(78, 5, -10), vec(25, 2, -3), vec(-66, 8, 15), vec(-28, 1, -5), vec(0, 0, 0)],
    ],
    spinMW: [0, 0.35, 0.9, 1.55, 2.35, 3.1],
    spinAND: [0, -0.29, -0.74, -1.27, -1.93, -2.54],
    tailScale: 1,
    burstBoost: 1,
    remnantSquashY: 0.62,
    remnantSquashZ: 0.82,
  },
  loop: {
    centers: [
      [vec(-112, -2, 16), vec(-74, -1, 10), vec(-18, 0, 5), vec(54, -4, -13), vec(-24, 2, 6), vec(0, 0, 0)],
      [vec(116, 8, -18), vec(76, 5, -10), vec(18, 1, -5), vec(-56, 6, 13), vec(22, -2, -6), vec(0, 0, 0)],
    ],
    spinMW: [0, 0.4, 1.05, 2.0, 3.15, 4.2],
    spinAND: [0, -0.33, -0.86, -1.64, -2.58, -3.44],
    tailScale: 1.15,
    burstBoost: 1.2,
    remnantSquashY: 0.58,
    remnantSquashZ: 0.8,
  },
  headon: {
    centers: [
      [vec(-112, -2, 16), vec(-70, -1, 10), vec(-13, 0, 2), vec(12, 0, -3), vec(5, 0, -1), vec(0, 0, 0)],
      [vec(116, 8, -18), vec(72, 5, -10), vec(13, 1, -2), vec(-12, 0, 3), vec(-5, 0, 1), vec(0, 0, 0)],
    ],
    spinMW: [0, 0.15, 0.35, 0.7, 1.0, 1.35],
    spinAND: [0, -0.12, -0.29, -0.57, -0.82, -1.11],
    tailScale: 0.9,
    burstBoost: 1.5,
    remnantSquashY: 0.8,
    remnantSquashZ: 0.92,
    splash: true,
  },
  miss: {
    centers: [
      [vec(-112, -2, 16), vec(-80, -4, 10), vec(-34, -6, 0), vec(6, -12, -10), vec(40, -16, -20), vec(86, -20, -30)],
      [vec(116, 8, -18), vec(84, 10, -12), vec(38, 12, -4), vec(-10, 16, 6), vec(-44, 18, 12), vec(-92, 22, 22)],
    ],
    spinMW: [0, 0.22, 0.5, 0.85, 1.15, 1.45],
    spinAND: [0, -0.18, -0.41, -0.7, -0.94, -1.19],
    tailScale: 0.5,
    burstBoost: 0.45,
    remnantSquashY: 1,
    remnantSquashZ: 1,
    miss: true,
    camPositions: [vec(0, 94, 270), vec(0, 82, 225), vec(0, 58, 185), vec(85, 60, 235), vec(-55, 78, 215), vec(0, 100, 255)],
    camTargets: [vec(0, 0, 0), vec(0, 0, 0), vec(0, 0, 0), vec(0, 2, -4), vec(-2, 0, -6), vec(-3, 1, -4)],
  },
}

export interface CollisionStats {
  clusters: number
  ejectedPct: number
}

export interface CollisionBuffers {
  stages: Float32Array[]
  colors: Float32Array
  sizes: Float32Array
  rands: Float32Array
  bursts: Float32Array
  stats: CollisionStats
}

interface ParticleSeed {
  local: THREE.Vector3
  radiusK: number
  angle: number
  galaxy: 0 | 1
  tail: number
  rand: number
  burst: number
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rand: () => number) {
  return (rand() + rand() + rand() - 1.5) * 1.35
}

function buildSeed(rand: () => number, galaxy: 0 | 1): ParticleSeed {
  const core = rand() < (galaxy === 0 ? 0.17 : 0.22)
  const radiusK = core ? Math.pow(rand(), 1.8) * 0.28 : 0.12 + Math.pow(rand(), 1.35) * 0.88
  const arms = galaxy === 0 ? 4 : 2
  const arm = Math.floor(rand() * arms)
  const angle = core
    ? rand() * Math.PI * 2
    : (arm / arms) * Math.PI * 2 + radiusK * (galaxy === 0 ? 9.2 : 7.4) + gauss(rand) * (0.08 + radiusK * 0.12)
  const radius = radiusK * (galaxy === 0 ? 48 : 57)
  const local = new THREE.Vector3(
    Math.cos(angle) * radius + gauss(rand) * (0.5 + radiusK * 1.2),
    gauss(rand) * (0.65 + radiusK * 0.85),
    Math.sin(angle) * radius + gauss(rand) * (0.5 + radiusK * 1.2),
  )
  const edge = Math.max(0, (radiusK - 0.48) / 0.52)
  return {
    local,
    radiusK,
    angle,
    galaxy,
    tail: Math.pow(edge, 1.6) * (0.4 + rand() * 0.6),
    rand: rand(),
    burst: !core && rand() < 0.075 ? 0.55 + rand() * 0.45 : rand() * 0.14,
  }
}

function stagePosition(seed: ParticleSeed, stage: number, out: THREE.Vector3, cfg: OutcomeConfig) {
  const side = seed.galaxy === 0 ? -1 : 1
  const center = cfg.centers[seed.galaxy][stage]
  const spin = (seed.galaxy === 0 ? cfg.spinMW : cfg.spinAND)[stage]
  out.copy(seed.local)

  const c = Math.cos(spin)
  const s = Math.sin(spin)
  const x = out.x * c - out.z * s
  const z = out.x * s + out.z * c
  out.set(x, out.y, z)

  const tilt = seed.galaxy === 0 ? -0.11 : 0.3
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  const ty = out.y * ct - out.z * st
  const tz = out.y * st + out.z * ct
  out.y = ty
  out.z = tz

  const tail = seed.tail * cfg.tailScale

  if (stage === 2) {
    out.x += side * tail * 20
    out.z += Math.sin(seed.angle * 1.5) * tail * 9
  } else if (stage === 3) {
    const arc = tail * (44 + seed.radiusK * 58)
    out.x += side * arc
    out.z += side * Math.sin(seed.angle + seed.rand * 1.4) * arc * 0.48
    out.y += Math.cos(seed.angle * 1.7) * tail * 7
    if (cfg.splash) {
      const r = Math.max(1, Math.hypot(out.x, out.z))
      const push = (10 + seed.rand * 26) * (0.25 + seed.tail * 0.6)
      out.x += (out.x / r) * push
      out.z += (out.z / r) * push
      out.y += gauss(() => seed.rand) * seed.tail * 4
    }
  } else if (stage === 4) {
    if (!cfg.miss) out.multiplyScalar(0.82)
    out.x += side * tail * (cfg.miss ? 16 : 30)
    out.z += Math.sin(seed.angle * 2) * tail * (cfg.miss ? 8 : 15)
  } else if (stage === 5) {
    if (cfg.miss) {
      out.x *= 1.16
      out.z *= 1.05
      out.x += side * tail * 10
    } else {
      const shell = 6 + Math.pow(seed.radiusK, 0.72) * 64
      const theta = seed.angle + seed.rand * 3.2
      const phi = Math.acos(2 * ((seed.rand * 7.31) % 1) - 1)
      out.set(
        Math.cos(theta) * Math.sin(phi) * shell,
        Math.cos(phi) * shell * cfg.remnantSquashY,
        Math.sin(theta) * Math.sin(phi) * shell * cfg.remnantSquashZ,
      )
      out.x += Math.sin(seed.rand * 31) * tail * 12
    }
  }

  out.add(center)
}

export function buildCollisionBuffers(count: number, outcome: OutcomeId = 'merge'): CollisionBuffers {
  const cfg = OUTCOME_CONFIGS[outcome]
  const rand = mulberry32(202506)
  const stages = COLLISION_STAGE_MARKS.map(() => new Float32Array(count * 3))
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const rands = new Float32Array(count)
  const bursts = new Float32Array(count)
  const color = new THREE.Color()
  const out = new THREE.Vector3()
  let clusterCount = 0
  let ejected = 0

  for (let i = 0; i < count; i++) {
    const galaxy: 0 | 1 = i < count * 0.47 ? 0 : 1
    const seed = buildSeed(rand, galaxy)
    for (let stage = 0; stage < stages.length; stage++) {
      stagePosition(seed, stage, out, cfg)
      stages[stage].set([out.x, out.y, out.z], i * 3)
    }

    if (seed.radiusK < 0.24) color.set(galaxy === 0 ? '#ffd79b' : '#efe2ff')
    else color.set(galaxy === 0 ? '#a9c9ff' : '#bcaaff')
    if (seed.burst > 0.5) color.set(seed.rand < 0.5 ? '#ff8fd6' : '#79efff')
    const brightness = 0.55 + rand() * 0.45
    colors.set([color.r * brightness, color.g * brightness, color.b * brightness], i * 3)
    sizes[i] = rand() < 0.025 ? 3.2 + rand() * 4.5 : 0.55 + rand() * 1.15
    rands[i] = seed.rand
    bursts[i] = seed.burst
    if (seed.burst > 0.5) clusterCount++
    if (seed.tail > 0.55) ejected++
  }

  return {
    stages: [...stages],
    colors,
    sizes,
    rands,
    bursts,
    stats: {
      clusters: Math.round((clusterCount * cfg.burstBoost) / 10) * 10,
      ejectedPct: Math.min(42, Math.max(2, Math.round((ejected / count) * 100 * cfg.tailScale))),
    },
  }
}

/** 轻量统计（证书用），不用真的建缓冲 */
export function outcomeStats(outcome: OutcomeId): CollisionStats {
  const cfg = OUTCOME_CONFIGS[outcome]
  const rand = mulberry32(778)
  let cluster = 0
  let ejected = 0
  const n = 4000
  for (let i = 0; i < n; i++) {
    const galaxy: 0 | 1 = i < n * 0.47 ? 0 : 1
    const seed = buildSeed(rand, galaxy)
    if (seed.burst > 0.5) cluster++
    if (seed.tail > 0.55) ejected++
  }
  return {
    clusters: Math.round(((cluster / n) * 80000 * cfg.burstBoost) / 10) * 10,
    ejectedPct: Math.min(42, Math.max(2, Math.round((ejected / n) * 100 * cfg.tailScale))),
  }
}

export function stageIndexAt(progress: number) {
  for (let i = COLLISION_STAGE_MARKS.length - 1; i >= 0; i--) {
    if (progress >= COLLISION_STAGE_MARKS[i]) return i
  }
  return 0
}

export function stageAt(progress: number, outcome: OutcomeId = 'merge') {
  const index = stageIndexAt(progress)
  const base = COLLISION_STAGES[index]
  const override = OUTCOME_STAGE_OVERRIDES[outcome]?.[index]
  return override ? { ...base, ...override } : base
}

/* ---------- 太阳与导演镜头轨道（随结局变化） ---------- */

const SUN_OFFSETS = [vec(19, 2, 4), vec(19, 2, 4), vec(16, 3, 6), vec(46, 8, 30), vec(14, 4, 8), vec(20, 10, 14)]

export function sunTrackFor(outcome: OutcomeId): THREE.Vector3[] {
  return OUTCOME_CONFIGS[outcome].centers[0].map((c, i) => c.clone().add(SUN_OFFSETS[i]))
}

const DEFAULT_CAM_POSITIONS = [vec(0, 94, 270), vec(0, 82, 225), vec(0, 58, 175), vec(85, 55, 195), vec(-55, 70, 170), vec(0, 92, 205)]
const DEFAULT_CAM_TARGETS = [vec(0, 0, 0), vec(0, 0, 0), vec(0, 0, 0), vec(28, 0, 2), vec(0, 0, 0), vec(0, 0, 0)]

export function cameraTrackFor(outcome: OutcomeId) {
  const cfg = OUTCOME_CONFIGS[outcome]
  return {
    positions: cfg.camPositions ?? DEFAULT_CAM_POSITIONS,
    targets: cfg.camTargets ?? DEFAULT_CAM_TARGETS,
  }
}

/* ---------- 小G 引导文案 ---------- */

export const GUIDE_LINES: Record<string, string> = {
  today: '准备好了吗？这一次，我们要一次快进几十亿年！',
  approach: '仙女座越来越大……但离“撞上”还早着呢。',
  'first-pass': '仔细看：恒星们并没有撞在一起！',
  'tidal-dance': '这两条长长的尾巴，是引力画出来的弧线。',
  'second-pass': '气体云挤在一起，就会点亮新的恒星宝宝。去试试？',
  remnant: '一个新的星系诞生了——给它起个名字吧！',
}

export const GUIDE_OUTCOME_LINES: Partial<Record<OutcomeId, Record<string, string>>> = {
  miss: {
    'tidal-dance': '这一次它们只是打了个招呼，没有停下。',
    'second-pass': '看，它们越飞越远了。',
    remnant: '未来不是注定的——换条轨道，结局就不一样。',
  },
  loop: {
    'tidal-dance': '绕了一圈又一圈，像一对跳华尔兹的舞伴。',
    remnant: '绕了这么多圈，它们终于合成一个星系啦！',
  },
  headon: {
    'first-pass': '正面相遇！注意看，恒星还是没有互相撞上。',
    'tidal-dance': '涟漪一圈圈荡开，像石子落进水面。',
    remnant: '正面相撞之后，变成了一团圆圆的星系。',
  },
}

export function guideLineFor(outcome: OutcomeId, stageId: string) {
  return GUIDE_OUTCOME_LINES[outcome]?.[stageId] ?? GUIDE_LINES[stageId] ?? ''
}

/* ---------- 徽章 ---------- */

export interface BadgeDef {
  id: string
  mark: string
  name: string
  en: string
  desc: string
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: 'miss', mark: '擦', name: '擦肩而过', en: 'CLOSE MISS', desc: '见证两个星系没有合并的未来' },
  { id: 'loop', mark: '舞', name: '宇宙舞伴', en: 'COSMIC WALTZ', desc: '看它们绕行多圈后合并' },
  { id: 'tidal', mark: '潮', name: '潮汐画家', en: 'TIDAL PAINTER', desc: '亲眼看到最长的潮汐尾弧线' },
  { id: 'stars', mark: '星', name: '恒星幼儿园', en: 'STAR NURSERY', desc: '挤压气体云，点亮一批恒星宝宝' },
]

/* ---------- 栏目外壳 ---------- */

export const COLLISION_SHELL = {
  color: '#b8a8ff',
  title: '银河系 × 仙女座',
  titleEn: 'MILKY WAY × ANDROMEDA',
  num: 'LAB · 01',
  teaser: '亲手推动几十亿年的引力之舞',
  description:
    '这是一种可能未来的模型推演，而不是已经写好的结局。拖动时间，看看两座星系如何近掠、拉出潮汐尾，并可能合成一个新的大星系。',
  facts: [
    { label: '现在距离', value: '约 250 万光年' },
    { label: '是否必然合并', value: '仍不确定' },
    { label: '恒星直接相撞', value: '极其罕见' },
    { label: '真正热闹的地方', value: '气体云与恒星轨道' },
  ],
}
