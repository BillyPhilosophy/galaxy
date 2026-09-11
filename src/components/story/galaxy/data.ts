/** 银河场景比例：盘半径 = 100 单位，1 单位 ≈ 500 光年 */
export const GALAXY_DISK_R = 100

/** 太阳系位置：猎户臂，距银心 52 单位（≈2.6 万光年） */
export const SUN_POS: [number, number, number] = [45.2, 0, 25.7]

/** 拉远滑杆：相机距离 6 → 270 单位（视野约 3,000 → 135,000 光年） */
export const zoomDistAt = (t: number) => 6 * Math.pow(45, t)

export function formatView(dist: number): string {
  const ly = dist * 500
  if (ly < 10000) return `${Math.round(ly).toLocaleString()} 光年`
  return `${(ly / 1e4).toFixed(1)} 万光年`
}

export interface GalaxyHotspot {
  id: string
  label: string
  pos: [number, number, number]
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export const GALAXY_HOTSPOTS: GalaxyHotspot[] = [
  {
    id: 'sagitta-a',
    label: '银心 · 人马座A*',
    pos: [0, 5, 0],
    title: '银心超大质量黑洞',
    desc: '银河系中心藏着一颗 430 万倍太阳质量的超大质量黑洞——人马座A*。你在大质量支线见过的黑洞，放大百万倍就是它。周围的恒星以每秒上千公里的速度绕它狂奔，这是它存在的铁证。',
    facts: [
      { label: '质量', value: '约 430 万 M☉' },
      { label: '类型', value: '超大质量黑洞' },
      { label: '证据', value: '恒星轨道狂奔' },
      { label: '首张照片', value: '2022 年 · EHT' },
    ],
  },
  {
    id: 'arm',
    label: '旋臂 · 恒星工厂',
    pos: [-67.5, 4, -18.8],
    title: '旋臂 · 恒星工厂',
    desc: '旋臂不是固定的结构，而是一道缓慢扫过的密度波：气体在臂里被压缩，点燃一批批蓝色年轻恒星和粉红电离云。你之前看过的星云与原恒星故事，此刻正在臂里上演。',
    facts: [
      { label: '本质', value: '密度波' },
      { label: '产物', value: '蓝巨星与 HII 区' },
      { label: '粉色点', value: '电离氢云' },
      { label: '你的旅程', value: '正在这里上演' },
    ],
  },
  {
    id: 'halo',
    label: '银晕与核球',
    pos: [0, 55, -30],
    title: '银晕与核球',
    desc: '核球挤满了年老的红色恒星；更外围的银晕稀疏散布着古老的恒星与球状星团——它们是银河系第一代居民的遗迹。球状星团里的老年中子星被吸积复活，正是毫秒脉冲星的故乡。',
    facts: [
      { label: '核球', value: '年老红恒星' },
      { label: '银晕居民', value: '球状星团' },
      { label: '年龄', value: '可达 130 亿年' },
      { label: '毫秒脉冲星故乡', value: '球状星团' },
    ],
  },
  {
    id: 'sun',
    label: '太阳系 · YOU ARE HERE',
    pos: [SUN_POS[0], 4.5, SUN_POS[2]],
    title: '太阳系位置',
    desc: '距银心约 2.6 万光年，猎户臂内侧的边缘——不在中心，也不在郊外，恰好处在平静宜居的郊区。银河系两千亿颗恒星里的一颗，花了 46 亿年看完了自己的一生。',
    facts: [
      { label: '距银心', value: '约 2.6 万光年' },
      { label: '所在旋臂', value: '猎户臂（本地臂）' },
      { label: '绕银心一圈', value: '约 2.3 亿年' },
      { label: '年龄', value: '46 亿年' },
    ],
  },
]
