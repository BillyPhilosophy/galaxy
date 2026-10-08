import { useEffect, useMemo, useRef, useState } from 'react'

const W = 720
const H = 440
const PER_CLOUD = 240

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

interface CloudParticle {
  angle: number
  radius: number
  speed: number
  size: number
  wobble: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  hue: string
}

function buildCloud(seed: number): CloudParticle[] {
  const rand = mulberry32(seed)
  return Array.from({ length: PER_CLOUD }, () => ({
    angle: rand() * Math.PI * 2,
    radius: Math.pow(rand(), 0.6) * 118 + 6,
    speed: (0.12 + rand() * 0.3) * (rand() < 0.5 ? 1 : -1),
    size: 7 + rand() * 20,
    wobble: rand() * Math.PI * 2,
  }))
}

function makeSprite(r: number, g: number, b: number) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, `rgba(${r},${g},${b},0.85)`)
  grad.addColorStop(0.4, `rgba(${r},${g},${b},0.28)`)
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  return c
}

interface StarLabProps {
  onClose(): void
  onIgnite(name: string): void
}

export default function StarLab({ onClose, onIgnite }: StarLabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [squeeze, setSqueeze] = useState(0.35)
  const [phase, setPhase] = useState<'play' | 'done'>('play')
  const [name, setName] = useState('')
  const squeezeRef = useRef(squeeze)
  const centers = useRef({ a: { x: W * 0.28, y: H * 0.52 }, b: { x: W * 0.72, y: H * 0.48 } })
  const drag = useRef<'a' | 'b' | null>(null)
  const phaseRef = useRef(phase)
  const sparks = useRef<Spark[]>([])
  const igniteAt = useRef(0)

  useEffect(() => {
    squeezeRef.current = squeeze
  }, [squeeze])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const cloudA = useMemo(() => buildCloud(11), [])
  const cloudB = useMemo(() => buildCloud(87), [])
  const sprites = useMemo(
    () => ({
      a: makeSprite(255, 143, 214),
      b: makeSprite(121, 239, 255),
      star: makeSprite(255, 244, 214),
      gold: makeSprite(255, 215, 155),
    }),
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    let raf = 0
    let last = performance.now()

    const drawCloud = (parts: CloudParticle[], center: { x: number; y: number }, sprite: HTMLCanvasElement, t: number) => {
      const sq = squeezeRef.current
      const shrink = 1 - sq * 0.45
      for (const p of parts) {
        p.angle += p.speed * 0.016 * (1 - sq * 0.4)
        const r = p.radius * shrink + Math.sin(t * 0.001 + p.wobble) * 4
        const x = center.x + Math.cos(p.angle) * r
        const y = center.y + Math.sin(p.angle) * r * 0.72
        const s = p.size * (0.8 + sq * 0.9)
        ctx.drawImage(sprite, x - s / 2, y - s / 2, s, s)
      }
    }

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'

      const { a, b } = centers.current
      drawCloud(cloudA, a, sprites.a, now)
      drawCloud(cloudB, b, sprites.b, now)

      // 接触度：距离越近、挤压越强，越容易点亮
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const contact = Math.max(0, 1 - d / 260) * (0.35 + 0.65 * squeezeRef.current)

      if (phaseRef.current === 'play') {
        // 接触辉光
        if (contact > 0.15) {
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          ctx.fillStyle = `rgba(255,244,214,${(contact * 0.5).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(mx, my, 30 + contact * 60, 0, Math.PI * 2)
          ctx.fill()
        }
        if (contact > 0.75) {
          phaseRef.current = 'done'
          igniteAt.current = now
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          const rand = Math.random
          const hues = ['#fff4d6', '#ffd79b', '#ff8fd6', '#79efff']
          for (let i = 0; i < 170; i++) {
            const ang = rand() * Math.PI * 2
            const sp = 26 + rand() * 150
            sparks.current.push({
              x: mx + (rand() - 0.5) * 46,
              y: my + (rand() - 0.5) * 46,
              vx: Math.cos(ang) * sp,
              vy: Math.sin(ang) * sp * 0.8,
              life: 1,
              size: 1.2 + rand() * 2.6,
              hue: hues[i % hues.length],
            })
          }
          setPhase('done')
        }
      }

      if (phaseRef.current === 'done') {
        // 冲击波光环
        const age = (now - igniteAt.current) / 1000
        if (age < 1.4) {
          ctx.strokeStyle = `rgba(255,244,214,${(0.7 * (1 - age / 1.4)).toFixed(3)})`
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, 26 + age * 170, 0, Math.PI * 2)
          ctx.stroke()
        }
        for (const s of sparks.current) {
          if (s.life <= 0) continue
          s.x += s.vx * dt
          s.y += s.vy * dt
          s.vx *= 0.985
          s.vy *= 0.985
          s.life -= dt * 0.32
          const alpha = Math.max(0, Math.min(1, s.life * 1.4))
          ctx.fillStyle = s.hue
          ctx.globalAlpha = alpha
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [cloudA, cloudB, sprites])

  const toLocal = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (phaseRef.current !== 'play') return
    const p = toLocal(e)
    const { a, b } = centers.current
    if (Math.hypot(p.x - a.x, p.y - a.y) < 130) drag.current = 'a'
    else if (Math.hypot(p.x - b.x, p.y - b.y) < 130) drag.current = 'b'
    if (drag.current) (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const p = toLocal(e)
    const c = centers.current[drag.current]
    c.x = Math.min(W - 60, Math.max(60, p.x))
    c.y = Math.min(H - 50, Math.max(50, p.y))
  }
  const onPointerUp = () => {
    drag.current = null
  }

  return (
    <div className="hud collision-quiz collision-starlab panel" role="dialog" aria-modal="true" aria-label="恒星幼儿园">
      <button className="collision-quiz-close" onClick={onClose} aria-label="关闭恒星幼儿园">
        ×
      </button>
      <div className="collision-kicker mono">恒星幼儿园 · STAR NURSERY</div>
      <div className="collision-quiz-title">把两团气体云推到一起，挤压出新的恒星宝宝！</div>
      <canvas
        ref={canvasRef}
        className="starlab-canvas"
        style={{ aspectRatio: `${W} / ${H}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {phase === 'play' ? (
        <div className="starlab-controls">
          <span className="starlab-label mono">挤压力</span>
          <input
            className="slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={squeeze}
            onChange={(e) => setSqueeze(Number(e.target.value))}
            aria-label="挤压力"
          />
          <span className="starlab-hint">拖动云团让它们相遇，再把挤压力调高</span>
        </div>
      ) : (
        <div className="collision-result correct">
          <b>点亮啦！一批恒星宝宝诞生了</b>
          <span>星系相撞时真正热闹的是气体云——它们互相挤压，才点亮了这些新恒星。</span>
          <div className="starlab-name-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 12))}
              placeholder="给这团星团起个名字"
              aria-label="星团名字"
            />
            <button onClick={() => onIgnite(name.trim() || '星宝宝团')}>把它带回星系 →</button>
          </div>
        </div>
      )}
    </div>
  )
}
