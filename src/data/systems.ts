export interface StarSystemData {
  id: string
  name: string
  nameEn: string
  /** 恒星光谱色，用于列表圆点与详情页点缀 */
  color: string
  starType: string
  distance: string
  description: string
  facts: { label: string; value: string }[]
}

export const STAR_SYSTEMS: StarSystemData[] = [
  {
    id: 'pistol-star',
    name: '手枪星',
    nameEn: 'PISTOL STAR',
    color: '#8fb4ff',
    starType: '蓝特超巨星',
    distance: '约 25,000 光年',
    description:
      '手枪星是银河系中光度最高的恒星之一，一颗罕见的蓝特超巨星，藏身于人马座方向的五合星团中。它的光度约为太阳的 160 万倍，剧烈抛出的物质形成了壮观的手枪星云。',
    facts: [
      { label: '类型', value: '蓝特超巨星' },
      { label: '距地球', value: '约 25,000 光年' },
      { label: '星座', value: '人马座' },
      { label: '光度', value: '约 160 万倍太阳' },
    ],
  },
  {
    id: 'arcturus',
    name: '大角星',
    nameEn: 'ARCTURUS',
    color: '#ffa14d',
    starType: '橙巨星',
    distance: '约 36.7 光年',
    description:
      '大角星是北天夜空最亮的恒星，一颗已经步入晚年的橙巨星。它已燃尽核心的氢，体积膨胀到太阳的约 25 倍，预示着太阳数十亿年后的模样。',
    facts: [
      { label: '类型', value: 'K1.5 III 橙巨星' },
      { label: '距地球', value: '约 36.7 光年' },
      { label: '星座', value: '牧夫座' },
      { label: '视星等', value: '-0.05' },
    ],
  },
  {
    id: 'kepler-452',
    name: '开普勒-452',
    nameEn: 'KEPLER-452',
    color: '#ffd76e',
    starType: 'G2V 黄矮星',
    distance: '约 1,400 光年',
    description:
      '开普勒-452 是一颗与太阳极为相似的 G 型主序星。它的行星开普勒-452b 位于宜居带内，直径约为地球的 1.6 倍，被称为"地球 2.0"，是最受关注的超级地球之一。',
    facts: [
      { label: '类型', value: 'G2V 黄矮星' },
      { label: '距地球', value: '约 1,400 光年' },
      { label: '星座', value: '天鹅座' },
      { label: '著名行星', value: '开普勒-452b（超级地球）' },
    ],
  },
  {
    id: 'proxima-centauri',
    name: '比邻星',
    nameEn: 'PROXIMA CENTAURI',
    color: '#ff6b5e',
    starType: 'M5.5V 红矮星',
    distance: '约 4.24 光年',
    description:
      '比邻星是离太阳系最近的恒星，一颗小而暗的红矮星。它的行星比邻星 b 位于宜居带内，是一颗超级地球，也是人类未来星际探测最有可能造访的第一站。',
    facts: [
      { label: '类型', value: 'M5.5V 红矮星' },
      { label: '距地球', value: '约 4.24 光年' },
      { label: '星座', value: '半人马座' },
      { label: '著名行星', value: '比邻星 b（超级地球）' },
    ],
  },
]

export function findSystem(id: string | null | undefined): StarSystemData | null {
  if (!id) return null
  return STAR_SYSTEMS.find((s) => s.id === id) ?? null
}
