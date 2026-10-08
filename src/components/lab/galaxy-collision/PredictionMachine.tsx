import { useEffect, useRef, useState } from 'react'

const W = 520
const H = 380
const DOTS = 100

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

interface Dot {
  delay: number
  dur: number
  x0: number
  y0: number
  cx: number
  cy: number
  x2: number
  y2: number
  merge: boolean
  hue: string
  settled: boolean
  sx: number
  sy: number
}

const JAR = {
  left: { x: 44, y: H - 148, w: 148, h: 126 },
  right: { x: W - 192, y: H - 148, w: 148, h: 126 },
}

function buildDots(seed: number): Dot[] {
  const rand = mulberry32(seed)
  const mergeTarget = 50 + Math.round((rand() - 0.5) * 10)
  const dots: Dot[] = []
  for (let i = 0; i < DOTS; i++) {
    const merge = i < mergeTarget
    const jar = merge ? JAR.left : JAR.right
    dots.push({
      delay: i * 14 + rand() * 120,
      dur: 1250 + rand() * 650,
      x0: W / 2 + (rand() - 0.5) * 26,
      y0: 34,
      cx: rand() * W,
      cy: 70 + rand() * 110,
      x2: jar.x + 22 + rand() * (jar.w - 44),
      y2: jar.y + 6,
      merge,
      hue: rand() < 0.5 ? '#ffd79b' : '#bcaaff',
      settled: false,
      sx: 0,
      sy: 0,
    })
  }
  // 打乱落罐顺序，不让孩子看出规律
  for (let i = dots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[dots[i], dots[j]] = [dots[j], dots[i]]
    dots[i].delay = i * 14 + rand() * 120
  }
  return dots
}

function bez(t: number, p0: number, p1: number, p2: number) {
  const u = 1 - t
  return u * u * p0 + 2 * u * t * p1 + t * t * p2
}

export default function PredictionMachine({ onClose }: { onClose(): void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [done, setDone] = useState<{ merge: number; miss: number } | null>(null)
  const [round, setRound] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const dots = buildDots(202506 + round * 977)
    const settled: { x: number; y: number; hue: string }[] = []
    let mergeCount = 0
    let missCount = 0
    let raf = 0
    let finished = false
    const t0 = performance.now()

    const drawJar = (jar: typeof JAR.left, label: string, count: number) => {
      ctx.strokeStyle = 'rgba(184,168,255,0.5)'
      ctx.fillStyle = 'rgba(139,127,240,0.08)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(jar.x, jar.y, jar.w, jar.h, 12)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(236,236,245,0.85)'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, jar.x + jar.w / 2, jar.y - 10)
      ctx.fillStyle = '#ffd79b'
      ctx.font = 'bold 16px sans-serif'
      ctx.fillText(String(count), jar.x + jar.w / 2, jar.y - 28)
    }

    const step = (now: number) => {
      const t = now - t0
      ctx.clearRect(0, 0, W, H)

      // 发射口
      ctx.fillStyle = 'rgba(255,215,155,0.9)'
      ctx.beginPath()
      ctx.arc(W / 2, 30, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,215,155,0.35)'
      ctx.beginPath()
      ctx.arc(W / 2, 30, 12 + Math.sin(t / 300) * 2, 0, Math.PI * 2)
      ctx.stroke()

      drawJar(JAR.left, '合并', mergeCount)
      drawJar(JAR.right, '没有合并', missCount)

      for (const s of settled) {
        ctx.fillStyle = s.hue
        ctx.beginPath()
        ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2)
        ctx.fill()
      }

      let allSettled = true
      for (const d of dots) {
        if (d.settled) continue
        const local = (t - d.delay) / d.dur
        if (local < 0) {
          allSettled = false
          continue
        }
        if (local >= 1) {
          d.settled = true
          const jar = d.merge ? JAR.left : JAR.right
          const idx = d.merge ? mergeCount++ : missCount++
          const cols = 16
          d.sx = jar.x + 12 + (idx % cols) * ((jar.w - 24) / (cols - 1))
          d.sy = jar.y + jar.h - 10 - Math.floor(idx / cols) * 7
          settled.push({ x: d.sx, y: d.sy, hue: d.hue })
          continue
        }
        allSettled = false
        const e = local * local * (3 - 2 * local)
        const x = bez(e, d.x0, d.cx, d.x2)
        const y = bez(e, d.y0, d.cy, d.y2)
        ctx.fillStyle = d.hue
        ctx.beginPath()
        ctx.arc(x, y, 2.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.16)'
        ctx.beginPath()
        ctx.arc(bez(Math.max(0, e - 0.05), d.x0, d.cx, d.x2), bez(Math.max(0, e - 0.05), d.y0, d.cy, d.y2), 1.6, 0, Math.PI * 2)
        ctx.fill()
      }

      if (allSettled && !finished) {
        finished = true
        setDone({ merge: mergeCount, miss: missCount })
        return
      }
      if (!finished) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [round])

  return (
    <div className="hud collision-quiz collision-machine panel" role="dialog" aria-modal="true" aria-label="宇宙预测机">
      <button className="collision-quiz-close" onClick={onClose} aria-label="关闭预测机">
        ×
      </button>
      <div className="collision-kicker mono">宇宙预测机 · 100 FUTURES</div>
      <div className="collision-quiz-title">发射 100 个未来，看看有多少个会合并！</div>
      <canvas ref={canvasRef} className="machine-canvas" style={{ aspectRatio: `${W} / ${H}` }} />
      {!done && <div className="machine-hint mono">每个小球都是一个稍有不同的未来……</div>}
      {done && (
        <div className="collision-result correct">
          <b>
            合并 {done.merge} 个 · 没有合并 {done.miss} 个
          </b>
          <span>科学有时候不是一个答案，而是一群可能的未来。新的观测会让预报越来越准。</span>
          <div className="machine-actions">
            <button
              onClick={() => {
                setDone(null)
                setRound((r) => r + 1)
              }}
            >
              再发射一次
            </button>
            <button onClick={onClose}>回到星系 →</button>
          </div>
        </div>
      )}
    </div>
  )
}
