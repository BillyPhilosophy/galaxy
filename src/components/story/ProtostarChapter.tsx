import { Suspense, useCallback, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { StoryChapter } from '../../data/story'
import { useIsMobile } from '../../hooks/use-mobile'
import ChapterShell from './ChapterShell'
import ProtostarScene from './ProtostarScene'
import { PROTO_HOTSPOTS } from './protostarHotspots'

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** 吸积率格式化：1.0 × 10⁻⁷ M☉/年 */
function formatRate(m: number): string {
  const exp = Math.floor(Math.log10(m))
  const mant = m / Math.pow(10, exp)
  const sup = String(Math.abs(exp))
    .split('')
    .map((c) => SUPERSCRIPT[Number(c)])
    .join('')
  return `${mant.toFixed(1)}×10⁻${sup} M☉/年`
}

function formatLum(l: number): string {
  if (l < 1) return `${l.toFixed(2)} L☉`
  if (l < 10) return `${l.toFixed(1)} L☉`
  return `${Math.round(l)} L☉`
}

export default function ProtostarChapter({
  ch,
  prev,
  next,
}: {
  ch: StoryChapter
  prev: StoryChapter | null
  next: StoryChapter | null
}) {
  const [accretion, setAccretion] = useState(0.35)
  const accretionRef = useRef(0.35)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const apply = useCallback((v: number) => {
    const c = Math.min(1, Math.max(0, v))
    accretionRef.current = c
    setAccretion(c)
  }, [])

  const selectedHotspot = PROTO_HOTSPOTS.find((h) => h.id === selectedId) ?? null

  // 物理量：吸积率 10⁻⁷~10⁻⁵ M☉/年；光度按 L=GMṀ/R（M≈0.5M☉，R≈3R☉）估算
  const rate = 1e-7 * Math.pow(100, accretion)
  const luminosity = 5.2 * (rate / 1e-6)
  const jetSpeed = Math.round(120 + accretion * 160)
  const burst = accretion >= 0.7

  const controls = (
    <div className="hud chapter-controls panel">
      <div className={`chapter-stage${burst ? ' chapter-stage--burst' : ''}`}>
        <b>{burst ? '剧烈吸积' : '稳态吸积'}</b>
        <span className="mono">{burst ? 'FU ORI OUTBURST' : 'STEADY ACCRETION'}</span>
      </div>
      <div className="ctl-sep" />
      <span className="ctl-label">吸积速率</span>
      <input
        className="slider chapter-slider"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={accretion}
        onChange={(e) => apply(Number(e.target.value))}
        aria-label="吸积速率"
      />
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        <span>吸积率 {formatRate(rate)}</span>
        <span>
          光度 {formatLum(luminosity)} · 喷流 {jetSpeed} km/s
        </span>
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
    >
      <Canvas
        camera={{ position: [0, 64, 175], fov: 50, near: 0.1, far: 2000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <ProtostarScene
            accretionRef={accretionRef}
            selected={selectedId}
            onSelect={setSelectedId}
            counts={
              isMobile
                ? { disk: 12000, jets: 3000, envelope: 2000 }
                : { disk: 28000, jets: 6000, envelope: 4000 }
            }
          />
        </Suspense>
      </Canvas>
    </ChapterShell>
  )
}
