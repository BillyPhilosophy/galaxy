import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import type { StoryChapter } from '../../../data/story'
import { MASSIVE_BRANCH, SUN_BRANCH } from '../../../data/story'
import { useIsMobile } from '../../../hooks/use-mobile'
import ChapterShell from '../ChapterShell'
import RedGiantScene from './RedGiantScene'
import { FATE_COLORS, GIANT_PLANETS, giantStageOf, lumAt, planetFate, radiusAt, tempAt, RG_HOTSPOTS } from './data'
import { formatLum } from '../main-sequence/data'

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

export default function RedGiantChapter({
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
      const v = progressRef.current + dt / 45
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

  const selectedHotspot = RG_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const stage = giantStageOf(progress)
  const done = progress >= 0.97
  const r = radiusAt(progress)

  const controls = (
    <div className="hud chapter-controls panel">
      <button
        className="ctl-btn"
        onClick={() => setPlaying(!playing)}
        title={playing ? '暂停' : '播放膨胀'}
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
        aria-label="膨胀进度"
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
        <span>
          半径 {r < 10 ? r.toFixed(1) : Math.round(r)} R☉ · {Math.round(tempAt(progress)).toLocaleString()} K
        </span>
        <span>光度 {formatLum(lumAt(progress))}</span>
      </div>
    </div>
  )

  return (
    <ChapterShell
      ch={ch}
      prev={prev ? { title: prev.title, to: `/story/${prev.id}` } : null}
      next={next ? { title: next.title, to: `/story/${next.id}` } : null}
      controls={controls}
      selectedHotspot={selectedHotspot}
      onCloseHotspot={() => setSelectedId(null)}
      overlay={
        <>
          <div className="hud giant-planets panel">
            {GIANT_PLANETS.map((pl) => {
              const fate = planetFate(progress, pl)
              return (
                <div key={pl.id} className="giant-planet-row">
                  <span className="giant-planet-dot" style={{ background: pl.color }} />
                  <span className="giant-planet-name">{pl.name}</span>
                  <span className="giant-planet-au mono">{pl.orbitAu.toFixed(2)} AU</span>
                  <span className="giant-planet-fate" style={{ color: FATE_COLORS[fate] }}>
                    {fate}
                  </span>
                </div>
              )
            })}
          </div>
          {done && (
            <div className="hud giant-fork panel">
              <div className="giant-fork-title">氢已燃尽 · 它的命运？</div>
              <div className="giant-fork-sub mono">FATE DECIDED BY MASS</div>
              <div className="chapter-fork-options">
                {[...SUN_BRANCH, ...MASSIVE_BRANCH].map((o) => (
                  <Link key={o.id} to={`/story/${o.id}`}>
                    {o.title}
                    <span className="mono">{o.mass}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      }
    >
      <Canvas
        camera={{ position: [0, 22, 44], fov: 50, near: 0.5, far: 5000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <RedGiantScene
            progressRef={progressRef}
            selected={selectedId}
            onSelect={setSelectedId}
            counts={{ loss: isMobile ? 1300 : 2600 }}
          />
        </Suspense>
      </Canvas>
    </ChapterShell>
  )
}
