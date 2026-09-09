export interface ScaleBody {
  id: string
  name: string
  nameEn: string
  color: string
  /** 场景半径：以地球半径为 1 */
  radius: number
  radiusText: string
  note: string
  texture?: string
  star?: boolean
}

const EARTH_R_KM = 6371
const SUN_R_KM = 696000

export const SCALE_BODIES: ScaleBody[] = [
  {
    id: 'earth',
    name: '地球',
    nameEn: 'EARTH',
    color: '#4d8fd1',
    radius: 1,
    radiusText: '6,371 km',
    note: '你的家',
    texture: '/textures/earth.png',
  },
  {
    id: 'sun',
    name: '太阳',
    nameEn: 'SUN',
    color: '#ffb340',
    radius: SUN_R_KM / EARTH_R_KM,
    radiusText: '约 69.6 万 km',
    note: '半径 = 109 个地球',
    texture: '/textures/sun.png',
    star: true,
  },
  {
    id: 'arcturus',
    name: '大角星',
    nameEn: 'ARCTURUS',
    color: '#ffa14d',
    radius: (25 * SUN_R_KM) / EARTH_R_KM,
    radiusText: '约 1,740 万 km',
    note: '半径 = 25 个太阳',
    star: true,
  },
  {
    id: 'betelgeuse',
    name: '参宿四',
    nameEn: 'BETELGEUSE',
    color: '#ff5a3c',
    radius: (700 * SUN_R_KM) / EARTH_R_KM,
    radiusText: '约 4.9 亿 km',
    note: '体积 ≈ 太阳的 3.4 亿倍',
    star: true,
  },
  {
    id: 'uy-scuti',
    name: '盾牌座 UY',
    nameEn: 'UY SCUTI',
    color: '#e84c3d',
    radius: (1708 * SUN_R_KM) / EARTH_R_KM,
    radiusText: '约 11.9 亿 km',
    note: '体积 ≈ 太阳的 50 亿倍',
    star: true,
  },
]

export const SCALE_POSITIONS: number[] = (() => {
  const xs: number[] = [0]
  for (let i = 1; i < SCALE_BODIES.length; i++) {
    xs.push(xs[i - 1] + (SCALE_BODIES[i - 1].radius + SCALE_BODIES[i].radius) * 1.35)
  }
  return xs
})()
