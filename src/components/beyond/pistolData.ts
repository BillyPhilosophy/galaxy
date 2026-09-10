/** 巨喷发在手枪星进度轴上的位置 */
export const ERUPT_P = 0.15

/** 喷发后进程：0 = 未喷发，1 = 今天的手枪星云 */
export function eruptProgress(p: number) {
  return Math.min(1, Math.max(0, (p - ERUPT_P) / 0.8))
}

/** 喷发脉冲：光度在喷发点附近的瞬时冲高 */
export function eruptionPulse(p: number) {
  const d = (p - ERUPT_P) / 0.06
  return Math.exp(-d * d)
}

/** 光度（万 L☉）：平静 160 万，喷发峰值约 1,000 万 */
export function lumAt(p: number) {
  return 160 * (1 + eruptionPulse(p) * 5.25)
}

/** 已抛出质量（M☉）：喷发起 0 → 10 */
export function ejectaAt(p: number) {
  return 10 * Math.min(1, Math.max(0, (p - ERUPT_P) / 0.3))
}

export interface PistolStage {
  label: string
  en: string
}

export function pistolStageOf(p: number): PistolStage {
  if (p < 0.12) return { label: '蓝特超巨星 · 平静期', en: 'QUIET HYPERGIANT' }
  if (p < 0.22) return { label: '巨喷发', en: 'GREAT ERUPTION' }
  if (p < 0.7) return { label: '双壳抛射', en: 'SHELL EJECTION' }
  if (p < 0.95) return { label: '膨胀减速', en: 'DECELERATING' }
  return { label: '今天的手枪星云', en: 'PISTOL NEBULA TODAY' }
}

export interface PistolHotspot {
  id: string
  label: string
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const PISTOL_HOTSPOTS: PistolHotspot[] = [
  {
    id: 'star',
    label: '蓝特超巨星',
    pos: [0, 4, 0],
    title: '蓝特超巨星',
    desc: '手枪星是已知最亮的恒星之一：光度约 160 万倍太阳——它 20 秒发出的光，够太阳烧一整年。如此狂暴的光度来自逼近爱丁顿极限的引力-辐射平衡，也让它的表面永远无法平静。',
    facts: [
      { label: '类型', value: '蓝特超巨星 LBV' },
      { label: '光度', value: '约 160 万 L☉' },
      { label: '20 秒', value: '≈ 太阳一年的输出' },
      { label: '状态', value: '逼近爱丁顿极限' },
    ],
  },
  {
    id: 'nebula',
    label: '手枪星云',
    pos: [8.5, 2.5, 0],
    title: '手枪星云（双壳层）',
    desc: '约 6000 年前的一次巨喷发抛出了近 10 个太阳质量的物质，形成内外两层壳体。壳体一侧被五合星团周围的星际介质压缩拍扁——"手枪"的形状，是环境压力留下的证词。',
    facts: [
      { label: '形成', value: '约 6000 年前' },
      { label: '抛出质量', value: '约 10 M☉' },
      { label: '壳体', value: '内外双层' },
      { label: '膨胀速度', value: '约 60 km/s' },
    ],
  },
  {
    id: 'cluster',
    label: '五合星团',
    pos: [40, 18, -30],
    title: '五合星团',
    desc: '手枪星并不孤独：它属于五合星团——银河系质量最大的年轻星团之一，位于银心附近。团里挤满了大质量恒星，正是它们的星风与辐射，共同雕刻着手枪星云。',
    facts: [
      { label: '类型', value: '年轻大质量星团' },
      { label: '位置', value: '邻近银心' },
      { label: '成员', value: '数十颗大质量恒星' },
      { label: '作用', value: '共同雕刻星云' },
    ],
  },
]
