import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import type { StarSystemData } from '../../../data/systems'
import { useIsMobile } from '../../../hooks/use-mobile'
import ChapterShell from '../../story/ChapterShell'
import ArcturusScene from './ArcturusScene'
import type { ArcMode } from './ArcturusScene'
import {
  COMPARE_HOTSPOTS,
  MERCURY_ORBIT,
  SKY_HOTSPOTS,
  T_RANGE,
  arcDistAt,
  arcMagAt,
  arcStageOf,
  arcTraveledDeg,
  formatYears,
  morphStageOf,
  moonsOf,
  sunMorphAt,
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

const ALL_HOTSPOTS = [...SKY_HOTSPOTS, ...COMPARE_HOTSPOTS]

export default function ArcturusSystem({ system }: { system: StarSystemData }) {
  const [mode, setMode] = useState<ArcMode>('sky')
  const [tYears, setTYears] = useState(0)
  const [morph, setMorph] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [guideNonce, setGuideNonce] = useState(0)
  const tYearsRef = useRef(0)
  const morphRef = useRef(0)
  const isMobile = useIsMobile()

  const applyT = useCallback((v: number) => {
    const c = Math.min(T_RANGE, Math.max(-T_RANGE, v))
    tYearsRef.current = c
    setTYears(c)
  }, [])

  const applyMorph = useCallback((v: number) => {
    const c = Math.min(1, Math.max(0, v))
    morphRef.current = c
    setMorph(c)
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (mode === 'sky') {
        // 全程 20 万年约 40 秒
        const v = tYearsRef.current + dt * 5000
        applyT(v)
        if (v >= T_RANGE) {
          setPlaying(false)
          return
        }
      } else {
        const v = morphRef.current + dt / 20
        applyMorph(v)
        if (v >= 1) {
          setPlaying(false)
          return
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, mode, applyT, applyMorph])

  const switchMode = (m: ArcMode) => {
    setMode(m)
    setPlaying(false)
    setSelectedId(null)
  }

  const selectedHotspot = ALL_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const skyStage = arcStageOf(tYears)
  const cmpStage = morphStageOf(morph)
  const morphNow = sunMorphAt(morph)
  const traveled = arcTraveledDeg(tYears)
  const skyDone = tYears >= T_RANGE - 500
  const cmpDone = morph >= 0.999

  const ch = {
    color: system.color,
    title: system.name,
    titleEn: system.nameEn,
    num: 'BEYOND · 02',
    teaser: `${system.starType} · ${system.distance}`,
    description: system.description,
    facts: system.facts,
  }

  const controls = (
    <div className="hud chapter-controls panel">
      <button
        className="ctl-btn"
        onClick={() => setPlaying(!playing)}
        title={playing ? '暂停' : mode === 'sky' ? '播放时间机器' : '播放膨胀'}
      >
        {playing ? PauseIcon : PlayIcon}
      </button>
      {mode === 'sky' ? (
        <input
          className="slider chapter-slider"
          type="range"
          min={-T_RANGE}
          max={T_RANGE}
          step={500}
          value={tYears}
          onChange={(e) => {
            setPlaying(false)
            applyT(Number(e.target.value))
          }}
          aria-label="时间机器（相对今天的年数）"
        />
      ) : (
        <input
          className="slider chapter-slider"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={morph}
          onChange={(e) => {
            setPlaying(false)
            applyMorph(Number(e.target.value))
          }}
          aria-label="太阳膨胀进度"
        />
      )}
      <button
        className="ctl-btn"
        onClick={() => {
          setPlaying(false)
          if (mode === 'sky') applyT(0)
          else applyMorph(0)
        }}
        title="重置"
      >
        {ResetIcon}
      </button>
      <div className="ctl-sep" />
      <div className="chapter-stage">
        <b>{mode === 'sky' ? skyStage.label : cmpStage.label}</b>
        <span className="mono">{mode === 'sky' ? skyStage.en : cmpStage.en}</span>
      </div>
      <div className="ctl-sep" />
      <div className="tb-modes">
        <button className={`ctl-toggle${mode === 'sky' ? ' on' : ''}`} onClick={() => switchMode('sky')}>
          观星
        </button>
        <button
          className={`ctl-toggle${mode === 'compare' ? ' on' : ''}`}
          onClick={() => switchMode('compare')}
        >
          对比太阳
        </button>
      </div>
      {mode === 'sky' && (
        <>
          <div className="ctl-sep" />
          <button className="ctl-toggle" onClick={() => setGuideNonce((n) => n + 1)} title="重播导航弧线">
            沿勺柄找它 →
          </button>
        </>
      )}
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        {mode === 'sky' ? (
          <>
            <span>
              {formatYears(tYears)} · 距地球 {arcDistAt(tYears).toFixed(1)} 光年 · 视星等{' '}
              {arcMagAt(tYears).toFixed(2)}
            </span>
            <span>
              已偏离今天的位置 {traveled.toFixed(1)}° ≈ {moonsOf(traveled).toFixed(1)} 个月亮
            </span>
          </>
        ) : (
          <>
            <span>
              半径 ×{morphNow.r.toFixed(1)} · 表面 {Math.round(morphNow.temp).toLocaleString()} K · 光度 ×
              {Math.round(morphNow.lum)}
            </span>
            <span>水星轨道还在 {(MERCURY_ORBIT / morphNow.r).toFixed(1)} 倍之外 · 够不着</span>
          </>
        )}
      </div>
    </div>
  )

  return (
    <ChapterShell
      ch={ch}
      backTo="/"
      backLabel="← 返回首页"
      prev={{ title: '手枪星', to: '/system/pistol-star' }}
      next={{ title: '开普勒-452', to: '/system/kepler-452' }}
      controls={controls}
      selectedHotspot={selectedHotspot}
      onCloseHotspot={() => setSelectedId(null)}
      overlay={
        <>
          {mode === 'sky' && skyDone && (
            <div className="hud wd-ending panel">
              <div className="giant-fork-title">它只是路过</div>
              <p className="wd-ending-text">
                十万年后，它溜到了南方低空，暗了一点，却还在走。再给它一百多万年，这位银晕来客会彻底淡出肉眼——能赶上它最亮的时代，恰好是我们。
              </p>
              <Link to="/system/kepler-452" className="nebula-next wd-next-link">
                下一站 · 开普勒-452 →
              </Link>
            </div>
          )}
          {mode === 'compare' && cmpDone && (
            <div className="hud wd-ending panel">
              <div className="giant-fork-title">太阳不会爆炸</div>
              <p className="wd-ending-text">
                和大角星一样，太阳老了以后不会轰轰烈烈地炸开，只会安静地脱下外衣，留下一颗白矮星慢慢冷却。
              </p>
            </div>
          )}
        </>
      }
    >
      <Canvas
        camera={{ position: [104, -90, -28], fov: 55, near: 0.1, far: 3000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <ArcturusScene
            mode={mode}
            tYearsRef={tYearsRef}
            morphRef={morphRef}
            selected={selectedId}
            onSelect={setSelectedId}
            guideNonce={guideNonce}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>
    </ChapterShell>
  )
}
