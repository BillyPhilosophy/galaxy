import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import type { StarSystemData } from '../../../data/systems'
import { useIsMobile } from '../../../hooks/use-mobile'
import ChapterShell from '../../story/ChapterShell'
import ProximaScene from './ProximaScene'
import type { ProximaStats } from './ProximaScene'
import {
  PROXIMA_HOTSPOTS,
  proximaStageOf,
  tempDayC,
  tempNightC,
  tempTermC,
} from './data'

const FlareIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0l2.4 8.2L22 6l-6 6 6 6-7.6-2.2L12 24l-2.4-8.2L2 18l6-6-6-6 7.6 2.2z" />
  </svg>
)

export default function ProximaSystem({ system }: { system: StarSystemData }) {
  const [atmos, setAtmos] = useState(0)
  const [life, setLife] = useState(100)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flareFlash, setFlareFlash] = useState(false)
  const atmosRef = useRef(0)
  const flareRef = useRef(0)
  const statsRef = useRef<ProximaStats>({ flare: 0 })
  const isMobile = useIsMobile()

  const applyAtmos = useCallback((v: number) => {
    const c = Math.min(1, Math.max(0, v))
    atmosRef.current = c
    setAtmos(c)
  }, [])

  // 生命指数：耀斑掉血、平静恢复；5 次/秒
  useEffect(() => {
    const id = setInterval(() => {
      const f = statsRef.current.flare
      setLife((l) => {
        const next = f > 0.1 ? l - f * 9 * 0.2 : l + 1.2 * 0.2
        return Math.min(100, Math.max(0, Math.round(next * 10) / 10))
      })
    }, 200)
    return () => clearInterval(id)
  }, [])

  // 自动小耀斑：红矮星日常发脾气
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.3) {
        flareRef.current = Math.max(flareRef.current, 0.35 + Math.random() * 0.3)
      }
    }, 9000)
    return () => clearInterval(id)
  }, [])

  // 大耀斑提示自动消失
  useEffect(() => {
    if (!flareFlash) return
    const id = setTimeout(() => setFlareFlash(false), 2500)
    return () => clearTimeout(id)
  }, [flareFlash])

  const erupt = () => {
    flareRef.current = 1
    setFlareFlash(true)
  }

  const selectedHotspot = PROXIMA_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const stage = proximaStageOf(atmos)
  const done = atmos >= 0.95

  const ch = {
    color: system.color,
    title: system.name,
    titleEn: system.nameEn,
    num: 'BEYOND · 05',
    teaser: `${system.starType} · ${system.distance}`,
    description: system.description,
    facts: system.facts,
  }

  const controls = (
    <div className="hud chapter-controls panel">
      <div className="chapter-stage">
        <b>{stage.label}</b>
        <span className="mono">{stage.en}</span>
      </div>
      <div className="ctl-sep" />
      <div className="chapter-stage">
        <b style={{ fontSize: 12 }}>大气厚度</b>
        <span className="mono">{atmos < 0.15 ? '几乎没有' : atmos < 0.55 ? '稀薄' : atmos < 0.95 ? '浓厚' : '拉满'}</span>
      </div>
      <input
        className="slider chapter-slider"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={atmos}
        onChange={(e) => applyAtmos(Number(e.target.value))}
        aria-label="大气厚度"
      />
      <button className="ctl-toggle" onClick={erupt} title="触发一次大耀斑">
        {FlareIcon} 耀斑！
      </button>
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        <span>
          昼面 {tempDayC(atmos)}°C · 晨昏带 {tempTermC(atmos)}°C · 夜面 {tempNightC(atmos)}°C
        </span>
        <span>
          晨昏带生命指数
          <span className="px-life">
            <i style={{ width: `${life}%` }} />
          </span>
          {Math.round(life)}%
        </span>
      </div>
    </div>
  )

  return (
    <ChapterShell
      ch={ch}
      backTo="/"
      backLabel="← 返回首页"
      prev={{ title: '开普勒-452', to: '/system/kepler-452' }}
      next={{ title: '三体运动', to: '/system/three-body' }}
      controls={controls}
      selectedHotspot={selectedHotspot}
      onCloseHotspot={() => setSelectedId(null)}
      overlay={
        <>
          {flareFlash && (
            <div className="hud ns-caption panel" style={{ color: '#ff7a5c' }}>
              耀斑！紫外线正在轰炸行星——晨昏带生命遭殃了
            </div>
          )}
          {!done && !flareFlash && atmos < 0.1 && (
            <div className="hud ns-caption panel">
              拖动环绕：找到永远朝向恒星的那一面 · 试着调厚大气救活晨昏带
            </div>
          )}
          {done && (
            <div className="hud wd-ending panel">
              <div className="giant-fork-title">宇宙最后一盏灯</div>
              <p className="wd-ending-text">
                厚大气让夜面回暖，晨昏带有了真正的机会。而这颗小红星自己毫不着急——它会安静燃烧上万亿年，当太阳早已熄灭，比邻星还在发光。
              </p>
              <Link to="/system/three-body" className="nebula-next wd-next-link">
                下一站 · 三体运动 →
              </Link>
            </div>
          )}
        </>
      }
    >
      <Canvas
        camera={{ position: [0, 5, 20], fov: 50, near: 0.1, far: 2000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <ProximaScene
            atmosRef={atmosRef}
            flareRef={flareRef}
            statsRef={statsRef}
            selected={selectedId}
            onSelect={setSelectedId}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>
    </ChapterShell>
  )
}
