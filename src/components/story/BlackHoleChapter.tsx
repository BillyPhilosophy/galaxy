import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { StoryChapter } from '../../data/story'
import ChapterShell from './ChapterShell'
import BlackHoleScene from './BlackHoleScene'
import { dilationAt, fallRadiusAt, properRateAt, BH_HOTSPOTS } from './blackHoleData'
import type { BhPhase } from './blackHoleData'

interface Clocks {
  far: number
  tau: number
  r: number
  dil: number
}

const STAGE_META: Record<BhPhase, { label: string; en: string }> = {
  intro: { label: '超新星爆发', en: 'SUPERNOVA' },
  steady: { label: '稳态黑洞', en: 'STEADY BLACK HOLE' },
  falling: { label: '探测器坠落中', en: 'INFALLING' },
  frozen: { label: '冻结于视界', en: 'FROZEN AT HORIZON' },
}

export default function BlackHoleChapter({
  ch,
  prev,
  next,
}: {
  ch: StoryChapter
  prev: StoryChapter | null
  next: StoryChapter | null
}) {
  const [phase, setPhase] = useState<BhPhase>('intro')
  const [quality, setQuality] = useState<'smooth' | 'hd'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'smooth' : 'hd',
  )
  const [jetsOn, setJetsOn] = useState(false)
  const [flash, setFlash] = useState(false)
  const [clocks, setClocks] = useState<Clocks>({ far: 0, tau: 0, r: 20, dil: 1 })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fadeRef = useRef(0)
  const flashDoneRef = useRef(false)
  const onFrozenRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    onFrozenRef.current = () => setPhase('frozen')
  }, [])

  // 开场时间线：2.2s 塌缩闪白 → 3.5s 起透镜淡入 → 6.2s 进入稳态
  useEffect(() => {
    if (phase !== 'intro') return
    const timers = [
      setTimeout(() => setFlash(true), 2200),
      setTimeout(() => setFlash(false), 2700),
      setTimeout(() => setPhase('steady'), 6200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [phase])

  useEffect(() => {
    if (phase === 'intro') return
    fadeRef.current = 1
  }, [phase])

  useEffect(() => {
    if (phase !== 'intro') return
    const start = performance.now()
    let raf = 0
    const step = () => {
      const el = (performance.now() - start) / 1000
      // 3.5s 起透镜淡入，5.5s 全亮
      fadeRef.current = Math.min(1, Math.max(0, (el - 3.5) / 2))
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // 坠落双时钟：远方坐标时正常流逝，固有时按 √(1−rₛ/r) 趋于冻结
  useEffect(() => {
    if (phase !== 'falling' && phase !== 'frozen') return
    let raf = 0
    const start = performance.now()
    let last = start
    let tau = 0
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const el = (now - start) / 1000
      const r = fallRadiusAt(el)
      tau += dt * properRateAt(r)
      setClocks({ far: el, tau, r, dil: dilationAt(r) })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const skipIntro = useCallback(() => {
    fadeRef.current = 1
    setFlash(false)
    setPhase('steady')
  }, [])

  const releaseProbe = () => {
    setClocks({ far: 0, tau: 0, r: 20, dil: 1 })
    setPhase('falling')
  }

  const selectedHotspot = BH_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const stage = STAGE_META[phase]

  const controls = (
    <div className="hud chapter-controls panel">
      <div className="chapter-stage">
        <b>{stage.label}</b>
        <span className="mono">{stage.en}</span>
      </div>
      <div className="ctl-sep" />
      {phase === 'steady' && (
        <button className="ctl-toggle on" onClick={releaseProbe}>
          释放探测器
        </button>
      )}
      {phase === 'frozen' && (
        <button className="ctl-toggle" onClick={() => setPhase('steady')}>
          重置探测器
        </button>
      )}
      <button className={`ctl-toggle${jetsOn ? ' on' : ''}`} onClick={() => setJetsOn(!jetsOn)}>
        喷流
      </button>
      <button
        className={`ctl-toggle${quality === 'hd' ? ' on' : ''}`}
        onClick={() => setQuality(quality === 'hd' ? 'smooth' : 'hd')}
        title="光线步进画质"
      >
        {quality === 'hd' ? '高清' : '流畅'}
      </button>
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        {phase === 'falling' || phase === 'frozen' ? (
          <>
            <span>
              距离 {clocks.r.toFixed(2)} rₛ · 膨胀 ×{clocks.dil < 99 ? clocks.dil.toFixed(2) : '99+'}
            </span>
            <span>
              远方 {clocks.far.toFixed(1)}s · 探测器 {clocks.tau.toFixed(1)}s
            </span>
          </>
        ) : (
          <>
            <span>史瓦西半径 ≈ 30 km（10 M☉）</span>
            <span>视界内逃逸速度 &gt; 光速</span>
          </>
        )}
      </div>
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
            {phase === 'intro' && (
              <button className="hud bh-skip ctl-toggle" onClick={skipIntro}>
                跳过开场 ≫
              </button>
            )}
            {phase === 'frozen' && (
              <div className="hud wd-ending panel">
                <div className="giant-fork-title">它的影像将永远留在视界上</div>
                <p className="wd-ending-text">
                  远方的你永远看不到它抵达——光被无限红移、时钟趋于冻结。
                  <br />
                  但对探测器自己而言，坠落只是一瞬间的事。
                </p>
              </div>
            )}
          </>
        }
      >
        <Canvas
          camera={{ position: [0, 9, 30], fov: 50, near: 0.1, far: 2000 }}
          dpr={1}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <BlackHoleScene
              phase={phase}
              quality={quality}
              jetsOn={jetsOn}
              fadeRef={fadeRef}
              flashDoneRef={flashDoneRef}
              onFrozenRef={onFrozenRef}
              selected={selectedId}
              onSelect={setSelectedId}
            />
          </Suspense>
        </Canvas>
      </ChapterShell>
      <div className={`sn-flash${flash ? ' on' : ''}`} />
    </>
  )
}
