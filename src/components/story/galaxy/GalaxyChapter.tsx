import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import type { StoryChapter } from '../../../data/story'
import { useIsMobile } from '../../../hooks/use-mobile'
import ChapterShell from '../ChapterShell'
import GalaxyScene from './GalaxyScene'
import { formatView, zoomDistAt, GALAXY_HOTSPOTS } from './data'

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

export default function GalaxyChapter({
  ch,
  prev,
  next,
}: {
  ch: StoryChapter
  prev: StoryChapter | null
  next: StoryChapter | null
}) {
  const [zoom, setZoom] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const zoomRef = useRef(0)
  const isMobile = useIsMobile()

  const apply = useCallback((v: number) => {
    const c = Math.min(1, Math.max(0, v))
    zoomRef.current = c
    setZoom(c)
  }, [])

  // 自动拉远：25 秒从太阳系飞到全银河
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const v = zoomRef.current + dt / 25
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

  const selectedHotspot = GALAXY_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const done = zoom >= 0.98

  const controls = (
    <div className="hud chapter-controls panel">
      <button
        className="ctl-btn"
        onClick={() => setPlaying(!playing)}
        title={playing ? '暂停' : '自动拉远'}
      >
        {playing ? PauseIcon : PlayIcon}
      </button>
      <input
        className="slider chapter-slider"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={zoom}
        onChange={(e) => {
          setPlaying(false)
          apply(Number(e.target.value))
        }}
        aria-label="视野尺度"
      />
      <button
        className="ctl-btn"
        onClick={() => {
          setPlaying(false)
          apply(0)
        }}
        title="回到太阳系"
      >
        {ResetIcon}
      </button>
      <div className="ctl-sep" />
      <div className="chapter-stage">
        <b>银河系 · 尾声</b>
        <span className="mono">THE MILKY WAY</span>
      </div>
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        <span>视野 ≈ {formatView(zoomDistAt(zoom))}</span>
        <span>恒星 约 2,000 亿颗 · 直径 约 10 万光年</span>
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
        done && (
          <div className="hud wd-ending panel">
            <div className="giant-fork-title">我们的太阳，不过是这条星河里的一粒微光</div>
            <p className="wd-ending-text">
              银河系里有上千亿颗恒星，每一颗都在重复这样的循环——
              <br />
              诞生于星云，归于星海。
            </p>
            <Link to="/" className="nebula-next wd-next-link">
              回到太阳系 →
            </Link>
          </div>
        )
      }
    >
      <Canvas
        camera={{ position: [46, 2, 31], fov: 50, near: 0.1, far: 3000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <GalaxyScene
            zoomRef={zoomRef}
            selected={selectedId}
            onSelect={setSelectedId}
            count={isMobile ? 32000 : 100000}
          />
        </Suspense>
      </Canvas>
    </ChapterShell>
  )
}
