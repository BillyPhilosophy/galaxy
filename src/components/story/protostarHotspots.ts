export interface ProtoHotspot {
  id: string
  label: string
  /** 标签在 3D 场景中的锚点 */
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const PROTO_HOTSPOTS: ProtoHotspot[] = [
  {
    id: 'core',
    label: '核心',
    pos: [0, 7, 0],
    title: '原恒星本体',
    desc: '直径约为太阳的 3 倍，靠引力收缩释放能量发光（开尔文-亥姆霍兹机制），而非核聚变。核心温度约 100 万 K，还不够点燃氢；表面只有约 3000–4000 K，发出暗红色的光。它的亮度会忽明忽暗——吸积率飙升时会发生猎户座 FU 型爆发。',
    facts: [
      { label: '能量来源', value: '引力收缩' },
      { label: '核心温度', value: '约 100 万 K' },
      { label: '表面温度', value: '约 3000–4000 K' },
      { label: '现像', value: 'FU Ori 型爆发' },
    ],
  },
  {
    id: 'disk',
    label: '吸积盘',
    pos: [21, 3.5, 0],
    title: '吸积盘',
    desc: '下落气体的角动量把它们甩成旋转的盘：内圈转得比外圈快，遵循开普勒定律。内缘温度超过 1000 K，尘埃颗粒在这里碰撞、聚集——这里是未来行星的建筑工地。',
    facts: [
      { label: '形成原因', value: '角动量守恒' },
      { label: '内缘温度', value: '> 1000 K' },
      { label: '旋转规律', value: '内快外慢（开普勒）' },
      { label: '意义', value: '行星诞生的摇篮' },
    ],
  },
  {
    id: 'jet',
    label: '双极喷流',
    pos: [0, 30, 0],
    title: '双极喷流',
    desc: '沿自转轴两极喷出的高速气流，速度可达每秒数百公里，能冲出数光年远。喷流带走多余的角动量，让恒星得以继续收缩；它们撞击并照亮周围气体时形成赫比格-哈罗天体——根部电离区呈蓝白色，末梢则泛起氢 α 发射线标志性的粉红。',
    facts: [
      { label: '速度', value: '100–300 km/s' },
      { label: '方向', value: '沿自转轴两极' },
      { label: '作用', value: '带走多余角动量' },
      { label: '遗迹', value: '赫比格-哈罗天体' },
    ],
  },
]
