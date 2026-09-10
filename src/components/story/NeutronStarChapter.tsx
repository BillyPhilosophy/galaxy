import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { StoryChapter } from '../../data/story'
import { useIsMobile } from '../../hooks/use-mobile'
import ChapterShell from './ChapterShell'
import NeutronStarScene from './NeutronStarScene'
import {
  classifyNs,
  DEATH_LINE_C,
  formatField,
  formatPeriod,
  NS_LOGB_MAX,
  NS_LOGB_MIN,
  NS_LOGP_MAX,
  NS_LOGP_MIN,
  NS_TOUR,
  NS_TYPE_META,
  NS_HOTSPOTS,
} from './neutronStarData'
import type { NsType } from './neutronStarData'

const PAD_W = 220
const PAD_H = 160
const PAD_PAD = 16

function padX(logP: number) {
  return PAD_PAD + ((logP - NS_LOGP_MIN) / (NS_LOGP_MAX - NS_LOGP_MIN)) * (PAD_W - 2 * PAD_PAD)
}
function padY(logB: number) {
  return PAD_PAD + (1 - (logB - NS_LOGB_MIN) / (NS_LOGB_MAX - NS_LOGB_MIN)) * (PAD_H - 2 * PAD_PAD)
}

/** 二维参数图垫：横轴自转周期（对数），纵轴磁场（对数），含死亡线与形态分区 */
function NsPad({
  logP,
  logB,
  type,
  onChange,
}: {
  logP: number
  logB: number
  type: NsType
  onChange: (logP: number, logB: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  const fromEvent = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (e.clientX - rect.left - PAD_PAD) / (rect.width - 2 * PAD_PAD)))
    const fy = Math.min(1, Math.max(0, (e.clientY - rect.top - PAD_PAD) / (rect.height - 2 * PAD_PAD)))
    onChange(
      NS_LOGP_MIN + fx * (NS_LOGP_MAX - NS_LOGP_MIN),
      NS_LOGB_MIN + (1 - fy) * (NS_LOGB_MAX - NS_LOGB_MIN),
    )
  }

  // 死亡线：logB = 11.23 + 2·logP，取图垫范围内的一段
  const dl = { x1: (8 - DEATH_LINE_C) / 2, y1: 8, x2: 1, y2: DEATH_LINE_C + 2 }

  return (
    <div className="hud ns-pad panel">
      <div className="hr-title mono">中子星图谱 · B-P MAP</div>
      <svg
        ref={svgRef}
        width={PAD_W}
        height={PAD_H}
        viewBox={`0 0 ${PAD_W} ${PAD_H}`}
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          fromEvent(e)
        }}
        onPointerMove={(e) => {
          if (dragging.current) fromEvent(e)
        }}
        onPointerUp={() => {
          dragging.current = false
        }}
      >
        <line
          x1={padX(dl.x1)}
          y1={padY(dl.y1)}
          x2={padX(dl.x2)}
          y2={padY(dl.y2)}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text x={padX(-1)} y={padY(14.6)} className="ns-pad-label">
          磁星
        </text>
        <text x={padX(-0.4)} y={padY(12)} className="ns-pad-label">
          射电脉冲星
        </text>
        <text x={padX(-2.75)} y={padY(8.7)} className="ns-pad-label">
          毫秒脉冲星
        </text>
        <text x={padX(0.35)} y={padY(8.7)} className="ns-pad-label">
          死亡谷
        </text>
        <circle cx={padX(logP)} cy={padY(logB)} r="5.5" fill={NS_TYPE_META[type].color} stroke="#fff" strokeWidth="1" />
      </svg>
      <div className="hr-axes mono">
        <span>周期 1ms</span>
        <span>磁场 ↑</span>
        <span>10s</span>
      </div>
    </div>
  )
}

/** 脉冲波形图：滚动折线，脉冲/暴发时出尖峰 */
function WavePanel({ spikeRef }: { spikeRef: React.RefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buf = useRef(new Float32Array(220))

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    let raf = 0
    const draw = () => {
      const b = buf.current
      b.copyWithin(0, 1)
      let v = 0.04 + Math.random() * 0.05
      if (spikeRef.current >= 2) {
        v = 1
        spikeRef.current = 0
      } else if (spikeRef.current >= 1) {
        v = 0.85
        spikeRef.current = 0
      }
      b[b.length - 1] = v
      ctx.clearRect(0, 0, 220, 56)
      ctx.strokeStyle = 'rgba(125,227,255,0.9)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < b.length; i++) {
        const y = 50 - b[i] * 44
        if (i === 0) ctx.moveTo(i, y)
        else ctx.lineTo(i, y)
      }
      ctx.stroke()
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [spikeRef])

  return (
    <div className="hud ns-wave panel">
      <div className="hr-title mono">脉冲波形 · PULSE PROFILE</div>
      <canvas ref={canvasRef} width={220} height={56} />
    </div>
  )
}

export default function NeutronStarChapter({
  ch,
  prev,
  next,
}: {
  ch: StoryChapter
  prev: StoryChapter | null
  next: StoryChapter | null
}) {
  const [logP, setLogP] = useState(-0.3)
  const [logB, setLogB] = useState(12)
  const [companion, setCompanion] = useState(false)
  const [pulseCount, setPulseCount] = useState(0)
  const [touring, setTouring] = useState(false)
  const [caption, setCaption] = useState<string | null>(null)
  const [quakeNote, setQuakeNote] = useState(false)
  const [flash, setFlash] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const nsRef = useRef({ logP: -0.3, logB: 12, companion: false })
  useEffect(() => {
    nsRef.current = { logP, logB, companion }
  }, [logP, logB, companion])

  const spikeRef = useRef(0)
  const burstRef = useRef(0)
  const onPulseRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    onPulseRef.current = () => {
      setPulseCount((c) => c + 1)
      spikeRef.current = Math.max(spikeRef.current, 1)
    }
  }, [])

  const type = classifyNs({ logP, logB, companion })
  const meta = NS_TYPE_META[type]
  const selectedHotspot = NS_HOTSPOTS.find((h) => h.id === selectedId) ?? null

  // 吸积回生：伴星开启后自转持续加速，圆点在图上自动左移
  useEffect(() => {
    if (!companion) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      setLogP((p) => Math.max(NS_LOGP_MIN, p - dt * 0.3))
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [companion])

  // 吸积态：周期性 X 射线爆发
  useEffect(() => {
    if (type !== 'accreting') return
    const id = setInterval(() => {
      burstRef.current += 1
      spikeRef.current = 2
    }, 9000)
    return () => clearInterval(id)
  }, [type])

  // 一生导览：按脚本巡演参数空间
  const tourTarget = useRef({ logP: -0.3, logB: 12 })
  useEffect(() => {
    if (!touring) return
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const run = () => {
      if (i >= NS_TOUR.length) {
        setTouring(false)
        setCaption(null)
        return
      }
      const s = NS_TOUR[i]
      tourTarget.current = { logP: s.logP, logB: s.logB }
      setCompanion(s.companion)
      setCaption(s.caption)
      timer = setTimeout(() => {
        i += 1
        run()
      }, s.seconds * 1000)
    }
    run()
    return () => clearTimeout(timer)
  }, [touring])

  useEffect(() => {
    if (!touring) return
    let raf = 0
    const step = () => {
      setLogP((p) => p + (tourTarget.current.logP - p) * 0.06)
      setLogB((b) => b + (tourTarget.current.logB - b) * 0.06)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [touring])

  const applyPad = useCallback((p: number, b: number) => {
    setTouring(false)
    setCaption(null)
    setLogP(p)
    setLogB(b)
  }, [])

  const triggerQuake = () => {
    burstRef.current += 1
    spikeRef.current = 2
    setFlash(true)
    setTimeout(() => setFlash(false), 500)
    setQuakeNote(true)
    setTimeout(() => setQuakeNote(false), 3200)
  }

  const controls = (
    <div className="hud chapter-controls panel">
      <div className="chapter-stage">
        <b style={{ color: meta.color }}>{meta.label}</b>
        <span className="mono">{meta.en}</span>
      </div>
      <div className="ctl-sep" />
      <button className={`ctl-toggle${companion ? ' on' : ''}`} onClick={() => setCompanion(!companion)}>
        伴星
      </button>
      {type === 'magnetar' && (
        <button className="ctl-toggle on" onClick={triggerQuake}>
          触发星震
        </button>
      )}
      <button
        className={`ctl-toggle${touring ? ' on' : ''}`}
        onClick={() => {
          if (touring) setCaption(null)
          setTouring(!touring)
        }}
      >
        {touring ? '停止导览' : '一生导览'}
      </button>
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        {quakeNote ? (
          <>
            <span>磁能释放 ≈ 4×10⁴⁶ erg</span>
            <span>软伽马重复暴 SGR</span>
          </>
        ) : (
          <>
            <span>
              周期 {formatPeriod(logP)} · 磁场 {formatField(logB)}
            </span>
            <span>脉冲计数 {pulseCount}</span>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      <ChapterShell
        ch={ch}
        prev={prev}
        next={next}
        controls={controls}
        selectedHotspot={selectedHotspot}
        onCloseHotspot={() => setSelectedId(null)}
        overlay={
          <>
          <NsPad logP={logP} logB={logB} type={type} onChange={applyPad} />
          <WavePanel spikeRef={spikeRef} />
          {caption && touring && <div className="hud ns-caption panel">{caption}</div>}
          </>
        }
      >
        <Canvas
          camera={{ position: [0, 10, 26], fov: 50, near: 0.1, far: 2000 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <NeutronStarScene
              nsRef={nsRef}
              selected={selectedId}
              onSelect={setSelectedId}
              onPulseRef={onPulseRef}
              burstRef={burstRef}
              counts={isMobile ? { stream: 600, disk: 1300, burst: 1400 } : { stream: 1200, disk: 2600, burst: 2800 }}
            />
          </Suspense>
        </Canvas>
      </ChapterShell>
      <div className={`sn-flash${flash ? ' on' : ''}`} />
    </>
  )
}
