import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import type { StoryChapter } from '../../data/story'
import { useIsMobile } from '../../hooks/use-mobile'
import ChapterShell from './ChapterShell'
import NebulaScene from './NebulaScene'

const PlayIcon = (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
    <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
  </svg>
)
const PauseIcon = (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
    <rect x="2" y="1.5" width="2.6" height="9" fill="currentColor" />
    <rect x="7.4" y="1.5" width="2.6" height="9" fill="currentColor" />
  </svg>
)
const ResetIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M3 12a9 9 0 1 0 2.6-6.4" />
    <path d="M3 4v5h5" />
  </svg>
)

interface Stage {
  label: string
  en: string
}

function stageOf(p: number): Stage {
  if (p < 0.15) return { label: '冰冷星云', en: 'COLD NEBULA' }
  if (p < 0.45) return { label: '引力扰动', en: 'GRAVITATIONAL DISTURBANCE' }
  if (p < 0.85) return { label: '引力坍缩', en: 'COLLAPSING' }
  return { label: '原恒星诞生', en: 'PROTOSTAR BORN' }
}

/** 核心温度：10 K 对数升至约 100 万 K */
function formatTemp(p: number): string {
  const t = 10 * Math.pow(1e5, p)
  if (t < 1000) return `${Math.round(t)} K`
  if (t < 10000) return `${(t / 1000).toFixed(1)} 千 K`
  if (t < 1e6) return `${(t / 1e4).toFixed(1)} 万 K`
  return `${Math.round(t / 1e4)} 万 K`
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** 核心密度：10³ → 10¹⁸ 原子/cm³ */
function formatDensity(p: number): string {
  const exp = 3 + Math.round(15 * p)
  const sup = String(exp)
    .split('')
    .map((c) => SUPERSCRIPT[Number(c)])
    .join('')
  return `10${sup} 原子/cm³`
}

export default function NebulaChapter({
  ch,
  prev,
  next,
}: {
  ch: StoryChapter
  prev: StoryChapter | null
  next: StoryChapter | null
}) {
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const progressRef = useRef(0)
  const isMobile = useIsMobile()

  const apply = useCallback((v: number) => {
    const c = Math.min(1, Math.max(0, v))
    progressRef.current = c
    setProgress(c)
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const v = progressRef.current + dt / 30
      apply(v)
      if (v >= 1) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, apply])

  const stage = stageOf(progress)
  const done = progress >= 0.98

  const controls = (
    <div className="hud chapter-controls panel">
      <button
        className="ctl-btn"
        onClick={() => setPlaying(!playing)}
        title={playing ? '暂停' : '播放坍缩'}
      >
        {playing ? PauseIcon : PlayIcon}
      </button>
      <input
        className="slider chapter-slider"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        onChange={(e) => {
          setPlaying(false)
          apply(Number(e.target.value))
        }}
        aria-label="坍缩进度"
      />
      <button
        className="ctl-btn"
        onClick={() => {
          setPlaying(false)
          apply(0)
        }}
        title="重置"
      >
        {ResetIcon}
      </button>
      <div className="ctl-sep" />
      <div className="chapter-stage">
        <b>{stage.label}</b>
        <span className="mono">{stage.en}</span>
      </div>
      <div className="chapter-readouts mono">
        <span>核心温度 {formatTemp(progress)}</span>
        <span>核心密度 {formatDensity(progress)}</span>
      </div>
    </div>
  )

  return (
    <ChapterShell
      ch={ch}
      prev={prev}
      next={next}
      controls={controls}
      overlay={
        done && (
          <Link to="/story/protostar" className="nebula-next">
            原恒星已诞生 · 下一章 →
          </Link>
        )
      }
    >
      <Canvas
        camera={{ position: [0, 30, 95], fov: 50, near: 0.1, far: 1500 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <NebulaScene progressRef={progressRef} count={isMobile ? 9000 : 22000} />
        </Suspense>
      </Canvas>
    </ChapterShell>
  )
}
