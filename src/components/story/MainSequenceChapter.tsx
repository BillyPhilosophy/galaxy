import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { StoryChapter } from '../../data/story'
import { useIsMobile } from '../../hooks/use-mobile'
import ChapterShell from './ChapterShell'
import MainSequenceScene from './MainSequenceScene'
import { HR_SAMPLES, MS_HOTSPOTS, formatLifetime, formatLum, starFromMass } from './mainSequenceData'
import type { MainSeqStar } from './mainSequenceData'

/** 滑杆 0..1 → 质量 0.2..30 M☉（对数） */
const MASS_MIN = 0.2
const MASS_RATIO = 150
const massFromSlider = (s: number) => MASS_MIN * Math.pow(MASS_RATIO, s)
const SUN_SLIDER = Math.log(1 / MASS_MIN) / Math.log(MASS_RATIO)

const HR_W = 190
const HR_H = 128
const HR_PAD = 12
const LOG_T_MIN = Math.log10(2400)
const LOG_T_MAX = Math.log10(42000)
const LOG_L_MIN = -3
const LOG_L_MAX = 5.2

function hrX(temp: number) {
  // 横轴温度：蓝（热）在左，红（冷）在右
  return HR_PAD + (1 - (Math.log10(temp) - LOG_T_MIN) / (LOG_T_MAX - LOG_T_MIN)) * (HR_W - 2 * HR_PAD)
}
function hrY(lum: number) {
  return HR_PAD + (1 - (Math.log10(lum) - LOG_L_MIN) / (LOG_L_MAX - LOG_L_MIN)) * (HR_H - 2 * HR_PAD)
}

function HRDiagram({ star }: { star: MainSeqStar }) {
  const band = HR_SAMPLES.map((s) => `${hrX(s.temp).toFixed(1)},${hrY(s.luminosity).toFixed(1)}`).join(' ')
  return (
    <div className="hud hr-panel panel">
      <div className="hr-title mono">赫罗图 · HR DIAGRAM</div>
      <svg width={HR_W} height={HR_H} viewBox={`0 0 ${HR_W} ${HR_H}`}>
        <polyline points={band} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
        <circle cx={hrX(star.temp)} cy={hrY(star.luminosity)} r="4.5" fill={star.colorHex}>
          <animate attributeName="r" values="4.5;6;4.5" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="hr-axes mono">
        <span>蓝 · 热</span>
        <span>光度 ↑</span>
        <span>红 · 冷</span>
      </div>
    </div>
  )
}

export default function MainSequenceChapter({
  ch,
  prev,
  next,
}: {
  ch: StoryChapter
  prev: StoryChapter | null
  next: StoryChapter | null
}) {
  const [slider, setSlider] = useState(SUN_SLIDER)
  const [hzOn, setHzOn] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const star = starFromMass(massFromSlider(slider))
  const starRef = useRef(star)
  useEffect(() => {
    starRef.current = star
  }, [star])

  const apply = useCallback((v: number) => setSlider(Math.min(1, Math.max(0, v))), [])
  const selectedHotspot = MS_HOTSPOTS.find((h) => h.id === selectedId) ?? null

  const controls = (
    <div className="hud chapter-controls panel">
      <div className="chapter-stage">
        <b>
          {star.typeLabel}
          {star.isSun && <span className="sun-badge">☀ 你在这里</span>}
        </b>
        <span className="mono">MAIN SEQUENCE</span>
      </div>
      <div className="ctl-sep" />
      <span className="ctl-label">恒星质量</span>
      <input
        className="slider chapter-slider"
        type="range"
        min={0}
        max={1}
        step={0.005}
        value={slider}
        onChange={(e) => apply(Number(e.target.value))}
        aria-label="恒星质量"
      />
      <span className="mono chapter-mass">
        {star.mass < 1 ? star.mass.toFixed(2) : star.mass.toFixed(1)} M☉
      </span>
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        <span>
          {Math.round(star.temp).toLocaleString()} K · {formatLum(star.luminosity)}
        </span>
        <span>寿命 {formatLifetime(star.lifetimeYears)}</span>
      </div>
      <div className="ctl-sep" />
      <div className="chapter-stage chapter-stage--fate">
        <b style={{ color: star.fateColor }}>{star.fate}</b>
        <span className="mono">命运预告 · FATE</span>
      </div>
      <div className="ctl-sep" />
      <button className={`ctl-toggle${hzOn ? ' on' : ''}`} onClick={() => setHzOn(!hzOn)}>
        宜居带
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
      >
        <Canvas
          camera={{ position: [0, 16, 34], fov: 50, near: 0.1, far: 4000 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <MainSequenceScene
              starRef={starRef}
              star={star}
              hzOn={hzOn}
              selected={selectedId}
              onSelect={setSelectedId}
              counts={isMobile ? { wind: 1300, promArcs: 4, promPerArc: 200 } : { wind: 2600, promArcs: 6, promPerArc: 400 }}
            />
          </Suspense>
        </Canvas>
      </ChapterShell>
      <HRDiagram star={star} />
    </>
  )
}
