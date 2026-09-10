/** 黑洞场景常数：史瓦西半径 = 1 场景单位 */
export const BH_RS = 1
export const BH_ISCO = 3
export const BH_DISK_OUT = 9

/** 探测器坠落：从 20 rₛ 指数逼近视界——远方观测者永远看不到它到达 */
export const FALL_R0 = 20
export const FALL_TAU = 2.6
export const FALL_FREEZE_R = 1.06

export const fallRadiusAt = (elapsed: number) => 1 + (FALL_R0 - 1) * Math.exp(-elapsed / FALL_TAU)

/** 固有时流逝率 dτ/dt = √(1 − rₛ/r)，贴近视界时趋于 0（时钟冻结） */
export const properRateAt = (r: number) => Math.sqrt(Math.max(1 - BH_RS / r, 0))

/** 引力时间膨胀 = 引力红移 z+1 = 1/√(1 − rₛ/r) */
export const dilationAt = (r: number) => 1 / Math.max(properRateAt(r), 1e-4)

export type BhPhase = 'intro' | 'steady' | 'falling' | 'frozen'

export interface BHHotspot {
  id: string
  label: string
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const BH_HOTSPOTS: BHHotspot[] = [
  {
    id: 'horizon',
    label: '事件视界',
    pos: [0, 2.4, 0],
    title: '事件视界',
    desc: '史瓦西半径围成的球面——一颗 10 倍太阳质量的黑洞，视界直径约 60 公里。它不是物体的表面，而是时空的单向膜：任何物质、任何信号一旦越过，都再也无法返回。',
    facts: [
      { label: '定义', value: '有去无回的边界' },
      { label: '10 M☉ 直径', value: '约 60 km' },
      { label: '本质', value: '时空单向膜' },
      { label: '逃逸速度', value: '超过光速' },
    ],
  },
  {
    id: 'disk',
    label: '吸积盘',
    pos: [5.5, 1.1, 0],
    title: '吸积盘',
    desc: '被潮汐力撕碎的气体在最内稳定圆轨道（ISCO）外旋转下落，内缘温度高达数百万度、辐射 X 射线。盘面一侧明显更亮——那是朝我们高速转来的相对论性多普勒增亮。',
    facts: [
      { label: '内缘', value: 'ISCO 最内稳定轨道' },
      { label: '温度', value: '数百万 K' },
      { label: '辐射', value: 'X 射线' },
      { label: '亮不对称', value: '多普勒增亮' },
    ],
  },
  {
    id: 'photon',
    label: '光子球',
    pos: [0, -2.4, 0],
    title: '光子球',
    desc: '在 1.5 倍史瓦西半径处，引力恰好能把光弯成圆形轨道。你在黑洞边缘看到的亮环，是绕了黑洞整整一圈、又飞回你眼睛里的光。',
    facts: [
      { label: '半径', value: '1.5 rₛ' },
      { label: '轨道', value: '光的圆轨道' },
      { label: '亮环', value: '光子环' },
      { label: '含义', value: '视线绕了黑洞一圈' },
    ],
  },
]
