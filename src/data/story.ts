export interface StoryChapter {
  id: string
  num: string
  title: string
  titleEn: string
  color: string
  teaser: string
  description: string
  facts: { label: string; value: string }[]
  /** 分岔支线：sun = 类日结局，massive = 大质量结局 */
  branch?: 'sun' | 'massive'
  /** 支线质量标签，如 '≤ 8 M☉' */
  mass?: string
  /** 该章结尾呈现"命运分岔"选择 */
  fork?: boolean
  prev?: string
  next?: string
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'nebula',
    num: '01',
    title: '星云',
    titleEn: 'NEBULA',
    color: '#b388ff',
    teaser: '恒星诞生于冰冷黑暗的尘埃云之中',
    description:
      '星云是由氢、氦与尘埃组成的巨大星际云，跨度可达数十光年。当某片区域在引力扰动下开始坍缩，一颗恒星的故事就此开篇。鹰状星云中著名的"创生之柱"，正是这样的恒星摇篮。',
    facts: [
      { label: '主要成分', value: '氢、氦与尘埃' },
      { label: '典型温度', value: '约 -263°C' },
      { label: '跨度', value: '可达数十光年' },
      { label: '代表', value: '鹰状星云"创生之柱"' },
    ],
    next: 'protostar',
  },
  {
    id: 'protostar',
    num: '02',
    title: '原恒星',
    titleEn: 'PROTOSTAR',
    color: '#ff9e7d',
    teaser: '引力聚拢质量，核心在黑暗中悄悄升温',
    description:
      '坍缩的气体在中心聚集成一颗致密的原恒星。此时核心还不够热，无法点燃核聚变，只能靠引力收缩释放能量，发出暗淡的红外光。这个积蓄力量的阶段会持续约数十万年。',
    facts: [
      { label: '能量来源', value: '引力收缩' },
      { label: '持续时间', value: '约数十万年' },
      { label: '核心状态', value: '尚未点燃聚变' },
      { label: '辐射', value: '以红外光为主' },
    ],
    prev: 'nebula',
    next: 'main-sequence',
  },
  {
    id: 'main-sequence',
    num: '03',
    title: '主序星',
    titleEn: 'MAIN SEQUENCE',
    color: '#ffd76e',
    teaser: '氢聚变点燃，进入一生最长的青壮年',
    description:
      '核心温度达到约 1000 万度，氢聚变成氦，向外的辐射压与向内的引力达成平衡——恒星进入主序阶段。这是一生中最稳定的时期：太阳已在这个阶段停留了约 46 亿年，还将再持续约 50 亿年。',
    facts: [
      { label: '能量来源', value: '氢核聚变' },
      { label: '占一生时长', value: '约 90%' },
      { label: '太阳已停留', value: '约 46 亿年' },
      { label: '平衡', value: '辐射压 vs 引力' },
    ],
    prev: 'protostar',
    next: 'red-giant',
  },
  {
    id: 'red-giant',
    num: '04',
    title: '红巨星',
    titleEn: 'RED GIANT',
    color: '#ff8f0c',
    teaser: '燃料将尽，恒星开始疯狂膨胀',
    description:
      '核心的氢耗尽后，平衡被打破：核心收缩，外壳却急剧膨胀、冷却变红。约 50 亿年后，太阳将膨胀成红巨星，吞没水星与金星。而大质量恒星会膨胀成更恐怖的红超巨星——从这里，命运开始分岔。',
    facts: [
      { label: '直径膨胀', value: '可达数百倍' },
      { label: '表面温度', value: '降至约 3000°C' },
      { label: '太阳的命运', value: '约 50 亿年后' },
      { label: '大质量版本', value: '红超巨星' },
    ],
    prev: 'main-sequence',
    fork: true,
  },
  {
    id: 'white-dwarf',
    num: '05A',
    title: '白矮星',
    titleEn: 'WHITE DWARF',
    color: '#e8ecff',
    teaser: '类日恒星的终点：一颗慢慢冷却的余烬',
    description:
      '红巨星的外壳被轻轻抛洒出去，形成绚丽的行星状星云，留下的核心成为白矮星——只有地球大小，却保留着太阳大半的质量。它不再产生能量，将在数百亿年里慢慢冷却，最终成为黑矮星。',
    facts: [
      { label: '前身', value: '质量 ≤ 8 倍太阳' },
      { label: '大小', value: '约等于地球' },
      { label: '密度', value: '每立方厘米约 1 吨' },
      { label: '最终归宿', value: '黑矮星' },
    ],
    branch: 'sun',
    mass: '≤ 8 M☉',
    prev: 'red-giant',
    next: 'galaxy',
  },
  {
    id: 'neutron-star',
    num: '05B',
    title: '中子星',
    titleEn: 'NEUTRON STAR',
    color: '#7de3ff',
    teaser: '超新星爆发之后，极致致密的遗骸',
    description:
      '8 到 20 倍太阳质量的恒星以超新星爆发结束一生，核心被引力压缩成直径仅约 20 公里的中子星——一茶匙物质就重达数十亿吨。高速旋转的中子星发出规律的射电脉冲，被称为脉冲星。',
    facts: [
      { label: '前身', value: '8–20 倍太阳质量' },
      { label: '直径', value: '仅约 20 公里' },
      { label: '密度', value: '每茶匙数十亿吨' },
      { label: '特殊形态', value: '脉冲星' },
    ],
    branch: 'massive',
    mass: '8–20 M☉',
    prev: 'red-giant',
    next: 'galaxy',
  },
  {
    id: 'black-hole',
    num: '05C',
    title: '黑洞',
    titleEn: 'BLACK HOLE',
    color: '#8b7ff0',
    teaser: '连光也无法逃脱的终点',
    description:
      '超过约 20 倍太阳质量的恒星，核心坍缩成黑洞：引力强到连光都无法逃脱。它的边界叫事件视界，任何物质一旦越过便永远消失。但黑洞并非宇宙吸尘器——只有靠得足够近，才会被它捕获。',
    facts: [
      { label: '前身', value: '质量 ≥ 20 倍太阳' },
      { label: '边界', value: '事件视界' },
      { label: '逃逸速度', value: '超过光速' },
      { label: '探测方式', value: '引力波与吸积盘辐射' },
    ],
    branch: 'massive',
    mass: '≥ 20 M☉',
    prev: 'red-giant',
    next: 'galaxy',
  },
  {
    id: 'galaxy',
    num: '06',
    title: '星系',
    titleEn: 'GALAXY',
    color: '#9db4ff',
    teaser: '尾声：上千亿个这样的故事，组成一条银河',
    description:
      '恒星诞生于星云，又将自己的物质归还给星际空间——新一代恒星从先辈的遗骸中升起。银河系中约有上千亿颗恒星，每一颗都在重复这样的循环。我们的太阳，不过是这条星河里的一粒微光。',
    facts: [
      { label: '银河系恒星', value: '约 1000–4000 亿颗' },
      { label: '银河系直径', value: '约 10 万光年' },
      { label: '太阳系位置', value: '猎户座旋臂' },
      { label: '物质循环', value: '恒星代代轮回' },
    ],
    prev: 'red-giant',
  },
]

export const MAIN_CHAPTERS = STORY_CHAPTERS.filter((c) => !c.branch && c.id !== 'galaxy')
export const SUN_BRANCH = STORY_CHAPTERS.filter((c) => c.branch === 'sun')
export const MASSIVE_BRANCH = STORY_CHAPTERS.filter((c) => c.branch === 'massive')
export const EPILOGUE = STORY_CHAPTERS.find((c) => c.id === 'galaxy')!

export function findChapter(id: string | null | undefined): StoryChapter | null {
  if (!id) return null
  return STORY_CHAPTERS.find((c) => c.id === id) ?? null
}

export function chapterNeighbor(id: string): {
  prev: StoryChapter | null
  next: StoryChapter | null
} {
  const ch = findChapter(id)
  return { prev: findChapter(ch?.prev), next: findChapter(ch?.next) }
}
