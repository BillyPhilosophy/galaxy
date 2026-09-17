import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router'
import type { StarSystemData } from '../../../data/systems'
import { useIsMobile } from '../../../hooks/use-mobile'
import ChapterShell from '../../story/ChapterShell'
import KeplerScene from './KeplerScene'
import type { FlightEvent, FlightStats, TransitStats } from './KeplerScene'
import {
  FLIGHT_HOTSPOTS,
  KM_PER_UNIT,
  TRANSIT_DEPTH_REAL,
  TRANSIT_DIP_DISPLAY,
  TRANSIT_HOTSPOTS,
  flightStageOf,
  transitStageOf,
} from './data'
import type { KeplerMode } from './data'

const ALL_HOTSPOTS = [...TRANSIT_HOTSPOTS, ...FLIGHT_HOTSPOTS]

/** 凌日光变曲线：滚动折线，凌日时可见下凹（纵轴放大约 1200 倍） */
function LightCurve({ statsRef }: { statsRef: RefObject<TransitStats> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hist = useRef<number[]>([])

  useEffect(() => {
    const id = setInterval(() => {
      const c = canvasRef.current
      if (!c) return
      hist.current.push(statsRef.current.flux)
      if (hist.current.length > 180) hist.current.shift()
      const ctx = c.getContext('2d')
      if (!ctx) return
      const W = c.width
      const H = c.height
      ctx.clearRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, H * 0.32)
      ctx.lineTo(W, H * 0.32)
      ctx.stroke()
      ctx.strokeStyle = '#ffd76e'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      hist.current.forEach((f, i) => {
        const x = (i / 179) * W
        const y = H * 0.32 + ((1 - f) / TRANSIT_DIP_DISPLAY) * H * 0.6
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }, 120)
    return () => clearInterval(id)
  }, [statsRef])

  return (
    <div className="hud kp-curve panel">
      <div className="kp-curve-title mono">光变曲线 · 纵轴已放大约 1200 倍</div>
      <canvas ref={canvasRef} width={260} height={64} />
    </div>
  )
}

export default function KeplerSystem({ system }: { system: StarSystemData }) {
  const [mode, setMode] = useState<KeplerMode>('transit')
  const [inclDeg, setInclDeg] = useState(6)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [autoPilot, setAutoPilot] = useState(false)
  const [apNonce, setApNonce] = useState(0)
  const [landed, setLanded] = useState(false)
  const [crashed, setCrashed] = useState(false)
  const [flight, setFlight] = useState<FlightStats>({ alt: 0, speed: 0, beaconDist: 0, landed: false })
  const [transitNow, setTransitNow] = useState(false)
  const isMobile = useIsMobile()
  const transitStats = useRef<TransitStats>({ flux: 1, transit: false })
  const flightStats = useRef<FlightStats>({ alt: 0, speed: 0, beaconDist: 0, landed: false })

  // 读数节流刷新（5 次/秒）
  useEffect(() => {
    const id = setInterval(() => {
      setFlight({ ...flightStats.current })
      setTransitNow(transitStats.current.transit)
    }, 200)
    return () => clearInterval(id)
  }, [])

  // 撞击提示自动消失
  useEffect(() => {
    if (!crashed) return
    const id = setTimeout(() => setCrashed(false), 2500)
    return () => clearTimeout(id)
  }, [crashed])

  const onEvent = useCallback((ev: FlightEvent) => {
    if (ev === 'success') setLanded(true)
    else setCrashed(true)
  }, [])

  const switchMode = (m: KeplerMode) => {
    setMode(m)
    setSelectedId(null)
    setLanded(false)
    setCrashed(false)
    if (m === 'land' && isMobile) setAutoPilot(true)
  }

  const selectedHotspot = ALL_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const tStage = transitStageOf(inclDeg, transitNow)
  const fStage = flightStageOf(flight.alt / KM_PER_UNIT, flight.landed)

  const ch = {
    color: system.color,
    title: system.name,
    titleEn: system.nameEn,
    num: 'BEYOND · 04',
    teaser: `${system.starType} · ${system.distance}`,
    description: system.description,
    facts: system.facts,
  }

  const modeButtons = (
    <div className="tb-modes">
      <button className={`ctl-toggle${mode === 'transit' ? ' on' : ''}`} onClick={() => switchMode('transit')}>
        挡光法
      </button>
      <button className={`ctl-toggle${mode === 'land' ? ' on' : ''}`} onClick={() => switchMode('land')}>
        着陆 452b
      </button>
    </div>
  )

  const controls = (
    <div className="hud chapter-controls panel">
      <div className="chapter-stage">
        <b>{mode === 'transit' ? tStage.label : fStage.label}</b>
        <span className="mono">{mode === 'transit' ? tStage.en : fStage.en}</span>
      </div>
      <div className="ctl-sep" />
      {modeButtons}
      <div className="ctl-sep" />
      {mode === 'transit' ? (
        <>
          <div className="chapter-stage">
            <b style={{ fontSize: 12 }}>轨道倾角 {inclDeg.toFixed(1)}°</b>
            <span className="mono">{Math.abs(inclDeg) < 1.5 ? '已对齐' : '未对齐'}</span>
          </div>
          <input
            className="slider chapter-slider"
            type="range"
            min={-8}
            max={8}
            step={0.1}
            value={inclDeg}
            onChange={(e) => setInclDeg(Number(e.target.value))}
            aria-label="轨道倾角"
          />
          <div className="ctl-sep" />
          <div className="chapter-readouts mono">
            <span>周期 385 天 · 比地球年多 20 天</span>
            <span>挡光深度 {TRANSIT_DEPTH_REAL} · 比蚊子飞过车头灯还微弱</span>
          </div>
        </>
      ) : (
        <>
          <button
            className={`ctl-toggle${autoPilot ? ' on' : ''}`}
            onClick={() => {
              if (!autoPilot) setApNonce((n) => n + 1)
              setAutoPilot(!autoPilot)
            }}
            title="沿进近航线自动降落"
          >
            自动着陆
          </button>
          <div className="ctl-sep" />
          <div className="chapter-readouts mono">
            <span>
              高度 {Math.round(flight.alt).toLocaleString()} km · 速度 {Math.round(flight.speed)} m/s · 距信标{' '}
              {Math.round(flight.beaconDist).toLocaleString()} km
            </span>
            <span>重力 ≈2g · 你的体重在这里翻倍</span>
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
      prev={{ title: '北河三', to: '/system/pollux' }}
      next={{ title: '比邻星', to: '/system/proxima-centauri' }}
      controls={controls}
      selectedHotspot={selectedHotspot}
      onCloseHotspot={() => setSelectedId(null)}
      overlay={
        <>
          {mode === 'transit' && Math.abs(inclDeg) >= 1.5 && !transitNow && (
            <div className="hud ns-caption panel">轨道没对齐，行星不挡光——拖动「轨道倾角」让它侧对我们</div>
          )}
          {mode === 'land' && !landed && !crashed && (
            <div className="hud ns-caption panel">
              {isMobile
                ? '自动着陆中 · 拖动环视四周'
                : 'WASD 飞行 · 拖拽转向 · Shift 加力 · 低速触地 · 找到橙色信标'}
            </div>
          )}
          {crashed && mode === 'land' && (
            <div className="hud ns-caption panel" style={{ color: '#ff7a5c' }}>
              速度太快，被弹起来了！把速度降下来再触地
            </div>
          )}
          {mode === 'land' && landed && (
            <div className="hud wd-ending panel">
              <div className="giant-fork-title">你好，地球的大表哥</div>
              <p className="wd-ending-text">
                头顶的恒星和太阳几乎一样大，一年只多 20 天——但 2 倍重力让你寸步难行。金色天空只是猜想：没人真正见过它的地表。
              </p>
              <div className="chapter-fork-options" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
                <button onClick={() => setLanded(false)}>继续飞行</button>
                <button onClick={() => switchMode('transit')}>回看凌日</button>
              </div>
              <Link to="/system/proxima-centauri" className="nebula-next wd-next-link">
                下一站 · 比邻星 →
              </Link>
            </div>
          )}
        </>
      }
    >
      <Canvas
        camera={{ position: [0, 3.5, 36], fov: 50, near: 0.1, far: 3000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <KeplerScene
            key={apNonce}
            mode={mode}
            inclDeg={inclDeg}
            transitStats={transitStats}
            flightStats={flightStats}
            onEvent={onEvent}
            autoPilot={autoPilot}
            selected={selectedId}
            onSelect={setSelectedId}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>
      {mode === 'transit' && <LightCurve statsRef={transitStats} />}
      {mode === 'land' && <div className="kp-cockpit" aria-hidden />}
    </ChapterShell>
  )
}
