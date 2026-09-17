import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import type { StarSystemData } from '../../../data/systems'
import { useIsMobile } from '../../../hooks/use-mobile'
import ChapterShell from '../../story/ChapterShell'
import PolluxScene from './PolluxScene'
import type { PolluxMode } from './PolluxScene'
import {
  SPLIT_HOTSPOTS,
  WOBBLE_HOTSPOTS,
  castorCount,
  splitStageOf,
} from './data'

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

const ALL_HOTSPOTS = [...SPLIT_HOTSPOTS, ...WOBBLE_HOTSPOTS]

export default function PolluxSystem({ system }: { system: StarSystemData }) {
  const [mode, setMode] = useState<PolluxMode>('split')
  const [split, setSplit] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showPlanet, setShowPlanet] = useState(false)
  const [exag, setExag] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const splitRef = useRef(0)
  const isMobile = useIsMobile()

  const apply = useCallback((v: number) => {
    const c = Math.min(1, Math.max(0, v))
    splitRef.current = c
    setSplit(c)
  }, [])

  useEffect(() => {
    if (!playing || mode !== 'split') return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const v = splitRef.current + dt / 15
      apply(v)
      if (v >= 1) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, mode, apply])

  const switchMode = (m: PolluxMode) => {
    setMode(m)
    setPlaying(false)
    setSelectedId(null)
  }

  const selectedHotspot = ALL_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const stage = splitStageOf(split)
  const done = split >= 0.97

  const ch = {
    color: system.color,
    title: system.name,
    titleEn: system.nameEn,
    num: 'BEYOND · 03',
    teaser: `${system.starType} · ${system.distance}`,
    description: system.description,
    facts: system.facts,
  }

  const modeButtons = (
    <div className="tb-modes">
      <button className={`ctl-toggle${mode === 'split' ? ' on' : ''}`} onClick={() => switchMode('split')}>
        掰开双子
      </button>
      <button className={`ctl-toggle${mode === 'wobble' ? ' on' : ''}`} onClick={() => switchMode('wobble')}>
        看不见的行星
      </button>
    </div>
  )

  const controls = (
    <div className="hud chapter-controls panel">
      {mode === 'split' ? (
        <>
          <button className="ctl-btn" onClick={() => setPlaying(!playing)} title={playing ? '暂停' : '播放'}>
            {playing ? PauseIcon : PlayIcon}
          </button>
          <input
            className="slider chapter-slider"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={split}
            onChange={(e) => {
              setPlaying(false)
              apply(Number(e.target.value))
            }}
            aria-label="分辨力（把星星掰开）"
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
          {modeButtons}
          <div className="ctl-sep" />
          <div className="chapter-readouts mono">
            <span>
              北河二 已掰出 {castorCount(split)} 颗星 · 北河三{' '}
              {split >= 0.5 ? '1 星 1 行星' : '看起来 1 颗星'}
            </span>
            <span>相距 17 光年 · 毫无血缘的"双子"</span>
          </div>
        </>
      ) : (
        <>
          <div className="chapter-stage">
            <b>恒星摆动实验</b>
            <span className="mono">RADIAL VELOCITY · 2006</span>
          </div>
          <div className="ctl-sep" />
          {modeButtons}
          <div className="ctl-sep" />
          <div className="tb-modes">
            <button
              className={`ctl-toggle${showPlanet ? ' on' : ''}`}
              onClick={() => setShowPlanet(!showPlanet)}
            >
              显示行星
            </button>
            <button className={`ctl-toggle${exag ? ' on' : ''}`} onClick={() => setExag(!exag)}>
              摆动 ×100
            </button>
          </div>
          <div className="ctl-sep" />
          <div className="chapter-readouts mono">
            <span>行星 ≥2.3 倍木星 · 周期 590 天 · 距恒星 1.64 AU</span>
            <span>恒星摆动 ≈ 自身半径的 1/21 · {exag ? '已放大 ×100' : '真实比例 · 看不见'}</span>
          </div>
        </>
      )}
    </div>
  )

  return (
    <ChapterShell
      ch={ch}
      backTo="/"
      backLabel="← 返回首页"
      prev={{ title: '大角星', to: '/system/arcturus' }}
      next={{ title: '开普勒-452', to: '/system/kepler-452' }}
      controls={controls}
      selectedHotspot={selectedHotspot}
      onCloseHotspot={() => setSelectedId(null)}
      overlay={
        <>
          {mode === 'wobble' && !showPlanet && (
            <div className="hud ns-caption panel">
              行星是看不见的——先盯着恒星看，再打开「显示行星」和「摆动 ×100」
            </div>
          )}
          {mode === 'split' && done && (
            <div className="hud wd-ending panel">
              <div className="giant-fork-title">排队站在一起的陌生人</div>
              <p className="wd-ending-text">
                北河二在 51 光年外，北河三在 34 光年外——它们互不相识，只是从地球看恰好排成一对。眼睛会凑对，星空不会。
              </p>
              <Link to="/system/kepler-452" className="nebula-next wd-next-link">
                下一站 · 开普勒-452 →
              </Link>
            </div>
          )}
        </>
      }
    >
      <Canvas
        camera={{ position: [0, 8, 30], fov: 50, near: 0.1, far: 2000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <PolluxScene
            mode={mode}
            splitRef={splitRef}
            split={split}
            showPlanet={showPlanet}
            exag={exag}
            selected={selectedId}
            onSelect={setSelectedId}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>
    </ChapterShell>
  )
}
