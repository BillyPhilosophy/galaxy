/**
 * 开普勒-452b 世界生成器（纯 TS，无 React）。
 * 452b 从未被直接成像——地表样貌是种子化的程序噪声：科学猜想 + 程序想象。
 * 贴图与地形共享同一套噪声，轨道上看到的大陆就是着陆后踩的大地。
 * 种子固定 452：每次访问都是同一颗星球。
 */
import * as THREE from 'three'

/** 场景单位：行星半径 */
export const PLANET_R = 40
/** 地形起伏幅度（场景单位） */
export const TERRAIN_AMP = 1.6
/** 海平面阈值（噪声归一化值，约一半面积为海洋） */
export const SEA_LEVEL = 0.5

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

/** 置换表（由种子 452 洗牌） */
const PERM = new Uint8Array(512)
{
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  const rand = mulberry32(452)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = p[i]
    p[i] = p[j]
    p[j] = t
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]
}

const fade = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function lattice(ix: number, iy: number, iz: number): number {
  return PERM[(PERM[(PERM[ix & 255] + iy) & 255] + iz) & 255] / 255
}

/** 3D value noise：对方向向量取样，避免贴图在两极汇聚拉伸 */
function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const u = fade(fx)
  const v = fade(fy)
  const w = fade(fz)
  const n000 = lattice(ix, iy, iz)
  const n100 = lattice(ix + 1, iy, iz)
  const n010 = lattice(ix, iy + 1, iz)
  const n110 = lattice(ix + 1, iy + 1, iz)
  const n001 = lattice(ix, iy, iz + 1)
  const n101 = lattice(ix + 1, iy, iz + 1)
  const n011 = lattice(ix, iy + 1, iz + 1)
  const n111 = lattice(ix + 1, iy + 1, iz + 1)
  return lerp(
    lerp(lerp(n000, n100, u), lerp(n010, n110, u), v),
    lerp(lerp(n001, n101, u), lerp(n011, n111, u), v),
    w,
  )
}

/** 分形叠加，输出约 [0,1] */
export function fbm(x: number, y: number, z: number, octaves = 5): number {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += noise3(x * freq, y * freq, z * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

/** 大陆形状：大陆尺度 + 细节尺度混合，未夹断（海平面以下为负） */
function rawHeight(dx: number, dy: number, dz: number): number {
  const base = fbm(dx * 1.6 + 7.3, dy * 1.6 + 7.3, dz * 1.6 + 7.3)
  const detail = fbm(dx * 6.5 + 2.1, dy * 6.5 + 2.1, dz * 6.5 + 2.1, 4)
  return (base * 0.78 + detail * 0.22 - SEA_LEVEL) / (1 - SEA_LEVEL)
}

/** 海拔：海平面为 0，陆地向上（最大约 0.5） */
export function heightAt(dx: number, dy: number, dz: number): number {
  return Math.max(0, rawHeight(dx, dy, dz))
}

/** 湿度噪声（决定绿草原 ↔ 干棕地） */
function moistureAt(dx: number, dy: number, dz: number): number {
  return fbm(dx * 3.1 + 11.7, dy * 3.1 + 11.7, dz * 3.1 + 11.7, 4)
}

/** 地表点（含地形起伏） */
export function surfacePointAt(dir: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const h = heightAt(dir.x, dir.y, dir.z)
  return out.copy(dir).multiplyScalar(PLANET_R + h * TERRAIN_AMP + 0.02)
}

/** 信标方向：从一组候选里挑一个沿海低地（种子固定，结果恒定） */
export const BEACON_DIR = (() => {
  const v = new THREE.Vector3()
  for (let lat = 8; lat <= 42; lat += 7) {
    for (let lon = 0; lon < 360; lon += 18) {
      const la = (lat * Math.PI) / 180
      const lo = (lon * Math.PI) / 180
      v.set(Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo))
      const h = heightAt(v.x, v.y, v.z)
      if (h > 0.02 && h < 0.12) return v.clone().normalize()
    }
  }
  return new THREE.Vector3(0, 0.3, 1).normalize()
})()

type RGB = [number, number, number]
const mix3 = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

const DEEP: RGB = [15, 48, 92]
const SHALLOW: RGB = [42, 118, 150]
const GRASS: RGB = [74, 126, 62]
const DRY: RGB = [148, 134, 88]
const ROCK: RGB = [150, 138, 128]
const ICE: RGB = [232, 240, 246]

function surfaceColor(dx: number, dy: number, dz: number): RGB {
  const h = rawHeight(dx, dy, dz)
  const absLat = Math.abs(dy)
  if (h <= 0) {
    const depth = Math.min(1, -h / 0.35)
    return mix3(SHALLOW, DEEP, depth)
  }
  const dry = 1 - moistureAt(dx, dy, dz)
  let col = mix3(GRASS, DRY, dry * 0.85)
  col = mix3(col, ROCK, Math.min(1, Math.max(0, (h - 0.22) / 0.22)))
  // 极地 + 高山积雪
  const iceK = Math.max(absLat > 0.85 ? 1 : 0, Math.min(1, (h - 0.34) / 0.12))
  return mix3(col, ICE, iceK)
}

// —— 模块级单例：整章共享一份，不随组件卸载销毁 ——
let planetTex: THREE.CanvasTexture | null = null
let cloudTex: THREE.CanvasTexture | null = null
let terrainGeo: THREE.SphereGeometry | null = null

export function getPlanetTexture(): THREE.CanvasTexture {
  if (planetTex) return planetTex
  const W = 1024
  const H = 512
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    // three.js 球体 UV：v=1 在北极；canvas 第一行是图片顶部
    const lat = (0.5 - y / H) * Math.PI
    const cl = Math.cos(lat)
    const sl = Math.sin(lat)
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2 - Math.PI
      const dx = cl * Math.cos(lon)
      const dz = cl * Math.sin(lon)
      const [r, g, b] = surfaceColor(dx, sl, dz)
      const i = (y * W + x) * 4
      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  planetTex = new THREE.CanvasTexture(canvas)
  planetTex.colorSpace = THREE.SRGBColorSpace
  return planetTex
}

export function getCloudTexture(): THREE.CanvasTexture {
  if (cloudTex) return cloudTex
  const W = 1024
  const H = 512
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    const lat = (0.5 - y / H) * Math.PI
    const cl = Math.cos(lat)
    const sl = Math.sin(lat)
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2 - Math.PI
      const dx = cl * Math.cos(lon)
      const dz = cl * Math.sin(lon)
      // 更细碎的一朵朵云：频率拉高、覆盖率压低
      const n = fbm(dx * 6.5 + 31, sl * 6.5 + 31, dz * 6.5 + 31, 5)
      // 纬度方向拉伸出的条状云带
      const band = fbm(sl * 8 + 3, cl * 0.8, lon * 0.3, 3)
      const a = Math.min(1, Math.max(0, (n * 0.8 + band * 0.2 - 0.54) / 0.2))
      const i = (y * W + x) * 4
      d[i] = 245
      d[i + 1] = 248
      d[i + 2] = 252
      d[i + 3] = Math.round(a * 165)
    }
  }
  ctx.putImageData(img, 0, 0)
  cloudTex = new THREE.CanvasTexture(canvas)
  cloudTex.colorSpace = THREE.SRGBColorSpace
  return cloudTex
}

export function getTerrainGeometry(): THREE.SphereGeometry {
  if (terrainGeo) return terrainGeo
  const g = new THREE.SphereGeometry(PLANET_R, 256, 192)
  const pos = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const r = PLANET_R + heightAt(v.x, v.y, v.z) * TERRAIN_AMP
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r)
  }
  g.computeVertexNormals()
  terrainGeo = g
  return g
}
