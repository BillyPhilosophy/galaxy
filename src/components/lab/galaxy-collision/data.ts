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

export interface CollisionBuffers {
  stages: Float32Array[]
  colors: Float32Array
  sizes: Float32Array
  rands: Float32Array
  bursts: Float32Array
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

const MW_CENTERS = [
  new THREE.Vector3(-112, -2, 16),
  new THREE.Vector3(-76, -1, 10),
  new THREE.Vector3(-25, 0, 4),
  new THREE.Vector3(64, -3, -12),
  new THREE.Vector3(27, 0, 5),
  new THREE.Vector3(0, 0, 0),
]
const ANDROMEDA_CENTERS = [
  new THREE.Vector3(116, 8, -18),
  new THREE.Vector3(78, 5, -10),
  new THREE.Vector3(25, 2, -3),
  new THREE.Vector3(-66, 8, 15),
  new THREE.Vector3(-28, 1, -5),
  new THREE.Vector3(0, 0, 0),
]

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

function stagePosition(seed: ParticleSeed, stage: number, out: THREE.Vector3) {
  const side = seed.galaxy === 0 ? -1 : 1
  const center = (seed.galaxy === 0 ? MW_CENTERS : ANDROMEDA_CENTERS)[stage]
  out.copy(seed.local)

  const spin = [0, 0.35, 0.9, 1.55, 2.35, 3.1][stage] * (seed.galaxy === 0 ? 1 : -0.82)
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

  if (stage === 2) {
    out.x += side * seed.tail * 20
    out.z += Math.sin(seed.angle * 1.5) * seed.tail * 9
  } else if (stage === 3) {
    const arc = seed.tail * (44 + seed.radiusK * 58)
    out.x += side * arc
    out.z += side * Math.sin(seed.angle + seed.rand * 1.4) * arc * 0.48
    out.y += Math.cos(seed.angle * 1.7) * seed.tail * 7
  } else if (stage === 4) {
    out.multiplyScalar(0.82)
    out.x += side * seed.tail * 30
    out.z += Math.sin(seed.angle * 2) * seed.tail * 15
  } else if (stage === 5) {
    const shell = 6 + Math.pow(seed.radiusK, 0.72) * 64
    const theta = seed.angle + seed.rand * 3.2
    const phi = Math.acos(2 * ((seed.rand * 7.31) % 1) - 1)
    out.set(
      Math.cos(theta) * Math.sin(phi) * shell,
      Math.cos(phi) * shell * 0.62,
      Math.sin(theta) * Math.sin(phi) * shell * 0.82,
    )
    out.x += Math.sin(seed.rand * 31) * seed.tail * 12
  }

  out.add(center)
}

export function buildCollisionBuffers(count: number): CollisionBuffers {
  const rand = mulberry32(202506)
  const stages = COLLISION_STAGE_MARKS.map(() => new Float32Array(count * 3))
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const rands = new Float32Array(count)
  const bursts = new Float32Array(count)
  const color = new THREE.Color()
  const out = new THREE.Vector3()

  for (let i = 0; i < count; i++) {
    const galaxy: 0 | 1 = i < count * 0.47 ? 0 : 1
    const seed = buildSeed(rand, galaxy)
    for (let stage = 0; stage < stages.length; stage++) {
      stagePosition(seed, stage, out)
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
  }

  return { stages: [...stages], colors, sizes, rands, bursts }
}

export function stageIndexAt(progress: number) {
  for (let i = COLLISION_STAGE_MARKS.length - 1; i >= 0; i--) {
    if (progress >= COLLISION_STAGE_MARKS[i]) return i
  }
  return 0
}

export function stageAt(progress: number) {
  return COLLISION_STAGES[stageIndexAt(progress)]
}

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
