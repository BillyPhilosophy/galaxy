import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import type { StoryChapter } from '../../data/story'
import { useIsMobile } from '../../hooks/use-mobile'
import ChapterShell from './ChapterShell'
import WhiteDwarfScene from './WhiteDwarfScene'
import {
  formatWDLum,
  formatYears,
  SN_BLAST_SECONDS,
  SN_FEED_SECONDS,
  wdLumAt,
  wdStageOf,
  wdTempAt,
  yearsAt,
  WD_HOTSPOTS,
} from './whiteDwarfData'
import type { SnMode } from './whiteDwarfData'

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

export default function WhiteDwarfChapter({
  ch,
  prev,
  next,
}: {
  ch: StoryChapter
  prev: StoryChapter | null
  next: StoryChapter | null
}) {
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [snMode, setSnMode] = useState<SnMode>('cool')
  const [feedProgress, setFeedProgress] = useState(0)
  const [flash, setFlash] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const timeRef = useRef(0)
  const snModeRef = useRef<SnMode>('cool')
  const isMobile = useIsMobile()

  const apply = useCallback((v: number) => {
    const c = Math.min(1, Math.max(0, v))
    timeRef.current = c
    setT(c)
  }, [])

  const setMode = useCallback((m: SnMode) => {
    snModeRef.current = m
    setSnMode(m)
  }, [])

  // 冷却时间自动播放：50 秒跨越 10⁴ → 10¹⁵ 年
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const v = timeRef.current + dt / 50
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

  // Ia 超新星彩蛋状态机：吸积 6s → 闪白 → 爆发 8s → 尾声
  useEffect(() => {
    if (snMode === 'feed') {
      const start = performance.now()
      let raf = 0
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / (SN_FEED_SECONDS * 1000))
        setFeedProgress(p)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      const timer = setTimeout(() => {
        setFlash(true)
        setMode('blast')
        setTimeout(() => setFlash(false), 500)
      }, SN_FEED_SECONDS * 1000)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(timer)
      }
    }
    if (snMode === 'blast') {
      const timer = setTimeout(() => setMode('aftermath'), SN_BLAST_SECONDS * 1000)
      return () => clearTimeout(timer)
    }
  }, [snMode, setMode])

  const selectedHotspot = WD_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const stage = wdStageOf(t)
  const cool = snMode === 'cool'
  const endOfTime = t >= 0.99 && cool

  const controls = (
    <div className="hud chapter-controls panel">
      <button
        className="ctl-btn"
        onClick={() => cool && setPlaying(!playing)}
        title={playing ? '暂停' : '播放时间'}
        disabled={!cool}
      >
        {playing ? PauseIcon : PlayIcon}
      </button>
      <input
        className="slider chapter-slider"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={t}
        onChange={(e) => {
          setPlaying(false)
          apply(Number(e.target.value))
        }}
        aria-label="宇宙时间"
        disabled={!cool}
      />
      <button
        className="ctl-btn"
        onClick={() => {
          setPlaying(false)
          apply(0)
        }}
        title="回到现在"
        disabled={!cool}
      >
        {ResetIcon}
      </button>
      <div className="ctl-sep" />
      <div className="chapter-stage">
        <b>{cool ? stage.label : snMode === 'feed' ? '喂食白矮星' : snMode === 'blast' ? 'Ia 型超新星' : '烟花散尽'}</b>
        <span className="mono">
          {cool ? stage.en : snMode === 'feed' ? 'ACCRETING' : snMode === 'blast' ? 'TYPE Ia SUPERNOVA' : 'AFTERMATH'}
        </span>
      </div>
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        {snMode === 'feed' ? (
          <>
            <span>质量 {(0.6 + 0.84 * feedProgress).toFixed(2)} / 1.44 M☉</span>
            <span>逼近钱德拉塞卡极限…</span>
          </>
        ) : snMode === 'cool' ? (
          <>
            <span>
              宇宙时钟 {formatYears(yearsAt(t))} · {Math.round(wdTempAt(t)).toLocaleString()} K
            </span>
            <span>光度 {formatWDLum(wdLumAt(t))}</span>
          </>
        ) : (
          <>
            <span>光度 ≈ 50 亿 L☉</span>
            <span>标准烛光 · 可测宇宙学距离</span>
          </>
        )}
      </div>
      <div className="ctl-sep" />
      <button
        className="ctl-toggle"
        onClick={() => cool && setMode('feed')}
        disabled={!cool}
        title="Ia 型超新星彩蛋"
      >
        如果有伴星…
      </button>
    </div>
  )

  return (
    <>
      <ChapterShell
        ch={ch}
        prev={prev ? { title: prev.title, to: `/story/${prev.id}` } : null}
        next={next ? { title: next.title, to: `/story/${next.id}` } : null}
        controls={controls}
        selectedHotspot={selectedHotspot}
        onCloseHotspot={() => setSelectedId(null)}
        overlay={
          <>
            {endOfTime && (
              <div className="hud wd-ending panel">
                <div className="giant-fork-title">黑矮星 · 只存在于理论</div>
                <p className="wd-ending-text">
                  宇宙的年龄只有 138 亿年，而冷却成黑矮星需要千万亿年——
                  <br />
                  今天的天空中，还没有任何一颗黑矮星。
                </p>
                {next && (
                  <Link to={`/story/${next.id}`} className="nebula-next wd-next-link">
                    尾声 · {next.title} →
                  </Link>
                )}
              </div>
            )}
            {snMode === 'aftermath' && (
              <div className="hud wd-ending panel">
                <div className="giant-fork-title">这不是我们太阳的结局</div>
                <p className="wd-ending-text">
                  没有伴星喂食，太阳会安静地冷却成黑矮星。
                  <br />
                  而 Ia 超新星是宇宙的"标准烛光"——天文学家靠它测出了宇宙在加速膨胀。
                </p>
                <button className="nebula-next wd-next-link" onClick={() => setMode('cool')}>
                  ← 回到白矮星
                </button>
              </div>
            )}
          </>
        }
      >
        <Canvas
          camera={{ position: [0, 12, 34], fov: 50, near: 0.1, far: 2000 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <WhiteDwarfScene
              timeRef={timeRef}
              snModeRef={snModeRef}
              snMode={snMode}
              selected={selectedId}
              onSelect={setSelectedId}
              counts={
                isMobile
                  ? { nebula: 5000, stream: 700, blast: 3000 }
                  : { nebula: 10000, stream: 1400, blast: 6000 }
              }
            />
          </Suspense>
        </Canvas>
      </ChapterShell>
      <div className={`sn-flash${flash ? ' on' : ''}`} />
    </>
  )
}
