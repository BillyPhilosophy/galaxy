import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import type { StarSystemData } from '../../data/systems'
import { useIsMobile } from '../../hooks/use-mobile'
import ChapterShell from '../story/ChapterShell'
import PistolScene from './PistolScene'
import { ejectaAt, lumAt, pistolStageOf, PISTOL_HOTSPOTS } from './pistolData'

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

export default function PistolSystem({ system }: { system: StarSystemData }) {
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
      const v = progressRef.current + dt / 40
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

  const selectedHotspot = PISTOL_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const stage = pistolStageOf(progress)
  const done = progress >= 0.97
  const ejecta = ejectaAt(progress)

  const ch = {
    color: system.color,
    title: system.name,
    titleEn: system.nameEn,
    num: 'BEYOND · 01',
    teaser: `${system.starType} · ${system.distance}`,
    description: system.description,
    facts: system.facts,
  }

  const controls = (
    <div className="hud chapter-controls panel">
      <button
        className="ctl-btn"
        onClick={() => setPlaying(!playing)}
        title={playing ? '暂停' : '播放喷发'}
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
        aria-label="喷发进度"
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
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        <span>光度 约 {Math.round(lumAt(progress)).toLocaleString()} 万 L☉</span>
        <span>
          {ejecta > 0 ? `已抛出 ${ejecta.toFixed(1)} M☉ · 壳体 60 km/s` : '强星风持续外吹'}
        </span>
      </div>
    </div>
  )

  return (
    <ChapterShell
      ch={ch}
      backTo="/"
      backLabel="← 返回首页"
      next={{ title: '大角星', to: '/system/arcturus' }}
      controls={controls}
      selectedHotspot={selectedHotspot}
      onCloseHotspot={() => setSelectedId(null)}
      overlay={
        done && (
          <div className="hud wd-ending panel">
            <div className="giant-fork-title">它还能燃烧约百万年</div>
            <p className="wd-ending-text">
              然后以超新星谢幕——这样亮度的恒星，注定活得短而灿烂。
            </p>
            <Link to="/system/arcturus" className="nebula-next wd-next-link">
              下一站 · 大角星 →
            </Link>
          </div>
        )
      }
    >
      <Canvas
        camera={{ position: [0, 10, 42], fov: 50, near: 0.1, far: 2000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <PistolScene
            progressRef={progressRef}
            selected={selectedId}
            onSelect={setSelectedId}
            counts={isMobile ? { shells: 9000, wind: 2200 } : { shells: 20000, wind: 4500 }}
          />
        </Suspense>
      </Canvas>
    </ChapterShell>
  )
}
