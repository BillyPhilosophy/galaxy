import type { OrbitElements } from '../../data/planets'

const D2R = Math.PI / 180
const TWO_PI = Math.PI * 2

/** 牛顿迭代解开普勒方程 M = E − e·sinE，返回偏近点角 E */
function solveKepler(M: number, e: number): number {
  // 归一化到 [-π, π]，保证迭代稳定收敛
  M = ((((M % TWO_PI) + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI - Math.PI
  let E = M
  for (let k = 0; k < 5; k++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  }
  return E
}

/**
 * 轨道要素 + 平近点角 M → 日心场景坐标（y 轴向上，太阳位于椭圆焦点）。
 * a/e 决定轨道形状与大小，i/node/peri（度）决定轨道面在空间的朝向；
 * 满足开普勒第二定律：天体在近日点运动更快。
 */
export function orbitalPosition(o: OrbitElements, M: number): [number, number, number] {
  const E = solveKepler(M, o.e)
  const nu =
    2 * Math.atan2(Math.sqrt(1 + o.e) * Math.sin(E / 2), Math.sqrt(1 - o.e) * Math.cos(E / 2))
  const r = (o.a * (1 - o.e * o.e)) / (1 + o.e * Math.cos(nu))
  const u = nu + o.peri * D2R
  const cosN = Math.cos(o.node * D2R)
  const sinN = Math.sin(o.node * D2R)
  const cosI = Math.cos(o.i * D2R)
  const sinI = Math.sin(o.i * D2R)
  return [
    r * (cosN * Math.cos(u) - sinN * Math.sin(u) * cosI),
    r * Math.sin(u) * sinI,
    r * (sinN * Math.cos(u) + cosN * Math.sin(u) * cosI),
  ]
}
