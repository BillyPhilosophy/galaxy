import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { StarSystemData } from '../../../data/systems'
import { useIsMobile } from '../../../hooks/use-mobile'
import ChapterShell from '../../story/ChapterShell'
import BetelgeuseScene from './BetelgeuseScene'
import type { RefObject } from 'react'
import {
  BETEL_HOTSPOTS,
  BOOM_SECONDS,
  SNEEZE_SECONDS,
  boomDayAt,
  boomStageOf,
  dimmingStageOf,
  dustCoverAt,
  magAt,
  snLunaAt,
  swapEngulfedCount,
  swapNextVictim,
  swapRadiusRsun,
  swapStageOf,
} from './data'
import type { BetelMode } from './data'

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

interface CurveStats {
  flux: number
}

/** 光变曲线面板：大暗化画亮度下跌，引爆画超新星曲线（均为示意） */
function LightCurve({ statsRef, title }: { statsRef: RefObject<CurveStats>; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hist = useRef<number[]>([])

  useEffect(() => {
    hist.current = []
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
      ctx.moveTo(0, H * 0.2)
      ctx.lineTo(W, H * 0.2)
      ctx.stroke()
      ctx.strokeStyle = '#ff8a5c'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      hist.current.forEach((f, i) => {
        const x = (i / 179) * W
        const y = H * 0.2 + (1 - Math.min(1, Math.max(0, f))) * H * 0.68
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }, 120)
    return () => clearInterval(id)
  }, [statsRef])

  return (
    <div className="hud kp-curve panel">
      <div className="kp-curve-title mono">{title}</div>
      <canvas ref={canvasRef} width={260} height={64} />
    </div>
  )
}

export default function BetelgeuseSystem({ system }: { system: StarSystemData }) {
  const [mode, setMode] = useState<BetelMode>('dimming')
  const [sneezeP, setSneezeP] = useState(0)
  const [swapP, setSwapP] = useState(0)
  const [swapPlaying, setSwapPlaying] = useState(false)
  const [boomStarted, setBoomStarted] = useState(false)
  const [boomT, setBoomT] = useState(0)
  const [flashNonce, setFlashNonce] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [magNow, setMagNow] = useState(0.5)
  const isMobile = useIsMobile()

  const sneezeRef = useRef(0)
  const swapRef = useRef(0)
  const boomTRef = useRef(0)
  const clockRef = useRef(0)
  const curveRef = useRef<CurveStats>({ flux: 1 })

  const applySwap = useCallback((v: number) => {
    const c = Math.min(1, Math.max(0, v))
    swapRef.current = c
    setSwapP(c)
  }, [])

  // 星等读数节流刷新（渲染期不读 ref）
  useEffect(() => {
    const id = setInterval(() => {
      setMagNow(magAt(performance.now() / 1000, sneezeRef.current))
    }, 200)
    return () => clearInterval(id)
  }, [])

  // 全局时钟 + 曲线采样
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      clockRef.current += dt
      // 喷嚏进度自动前进
      if (sneezeRef.current > 0 && sneezeRef.current < 1) {
        sneezeRef.current = Math.min(1, sneezeRef.current + dt / SNEEZE_SECONDS)
        if (sneezeRef.current >= 1) sneezeRef.current = 0
        setSneezeP(sneezeRef.current)
      }
      // 超新星进度
      if (boomTRef.current > 0 && boomTRef.current < 1) {
        boomTRef.current = Math.min(1, boomTRef.current + dt / BOOM_SECONDS)
        setBoomT(boomTRef.current)
      }
      // 曲线采样
      curveRef.current.flux =
        mode === 'boom'
          ? snLunaAt(boomDayAt(boomTRef.current)) / 0.6
          : Math.min(1, Math.max(0, (1.8 - magAt(clockRef.current, sneezeRef.current)) / 1.4))
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [mode])

  // 置换播放
  useEffect(() => {
    if (!swapPlaying) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const v = swapRef.current + dt / 20
      applySwap(v)
      if (v >= 1) {
        setSwapPlaying(false)
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [swapPlaying, applySwap])

  const switchMode = (m: BetelMode) => {
    setMode(m)
    setSelectedId(null)
    setSwapPlaying(false)
  }

  const sneeze = () => {
    if (sneezeRef.current > 0) return
    sneezeRef.current = 0.001
  }

  const ignite = () => {
    boomTRef.current = 0.001
    boomTStateSync(0.001)
    setBoomStarted(true)
    setFlashNonce((n) => n + 1)
  }

  const boomTStateSync = (v: number) => setBoomT(v)

  const resetBoom = () => {
    boomTRef.current = 0
    setBoomT(0)
    setBoomStarted(false)
  }

  const selectedHotspot = BETEL_HOTSPOTS.find((h) => h.id === selectedId) ?? null
  const stage =
    mode === 'dimming'
      ? dimmingStageOf(sneezeP)
      : mode === 'swap'
        ? swapStageOf(swapP)
        : boomStageOf(boomT, boomStarted)
  const mag = magNow
  const day = boomDayAt(boomT)
  const swapDone = swapP >= 0.97
  const boomDone = boomStarted && boomT >= 1

  const ch = {
    color: system.color,
    title: system.name,
    titleEn: system.nameEn,
    num: 'BEYOND · 06',
    teaser: `${system.starType} · ${system.distance}`,
    description: system.description,
    facts: system.facts,
  }

  const modeButtons = (
    <div className="tb-modes">
      <button
        className={`ctl-toggle${mode === 'dimming' ? ' on' : ''}`}
        onClick={() => switchMode('dimming')}
      >
        大暗化
      </button>
      <button className={`ctl-toggle${mode === 'swap' ? ' on' : ''}`} onClick={() => switchMode('swap')}>
        假如它是太阳
      </button>
      <button className={`ctl-toggle${mode === 'boom' ? ' on' : ''}`} onClick={() => switchMode('boom')}>
        引爆
      </button>
    </div>
  )

  const controls = (
    <div className="hud chapter-controls panel">
      <div className="chapter-stage">
        <b>{stage.label}</b>
        <span className="mono">{stage.en}</span>
      </div>
      <div className="ctl-sep" />
      {modeButtons}
      <div className="ctl-sep" />
      {mode === 'dimming' && (
        <>
          <button className="ctl-toggle" onClick={sneeze} disabled={sneezeP > 0}>
            打个喷嚏
          </button>
          <div className="ctl-sep" />
          <div className="chapter-readouts mono">
            <span>
              视星等 {mag.toFixed(2)} · 尘埃遮挡 {dustCoverAt(sneezeP)}%
            </span>
            <span>呼吸脉动周期 ≈ 400 天</span>
          </div>
        </>
      )}
      {mode === 'swap' && (
        <>
          <button
            className="ctl-btn"
            onClick={() => setSwapPlaying(!swapPlaying)}
            title={swapPlaying ? '暂停' : '播放膨胀'}
          >
            {swapPlaying ? PauseIcon : PlayIcon}
          </button>
          <input
            className="slider chapter-slider"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={swapP}
            onChange={(e) => {
              setSwapPlaying(false)
              applySwap(Number(e.target.value))
            }}
            aria-label="参宿四半径"
          />
          <button
            className="ctl-btn"
            onClick={() => {
              setSwapPlaying(false)
              applySwap(0)
            }}
            title="重置"
          >
            {ResetIcon}
          </button>
          <div className="ctl-sep" />
          <div className="chapter-readouts mono">
            <span>
              半径 {Math.round(swapRadiusRsun(swapP))} R☉ · 已吞没 {swapEngulfedCount(swapP)}/6 颗
            </span>
            <span>
              {swapNextVictim(swapP)
                ? `下一个：${swapNextVictim(swapP)!.name}（${swapNextVictim(swapP)!.au} AU）`
                : '木星、土星幸存'}
            </span>
          </div>
        </>
      )}
      {mode === 'boom' && (
        <>
          {boomStarted ? (
            <button className="ctl-toggle" onClick={ignite}>
              再炸一次
            </button>
          ) : (
            <button className="ctl-toggle" style={{ color: '#ff7a5c', borderColor: 'rgba(255,122,92,0.5)' }} onClick={ignite}>
              引爆参宿四
            </button>
          )}
          <div className="ctl-sep" />
          <div className="chapter-readouts mono">
            {boomStarted ? (
              <>
                <span>
                  第 {Math.round(day)} 天 · 亮度 ≈ 满月的 {(snLunaAt(day) * 100).toFixed(0)}%
                </span>
                <span>{day < 1 ? '中微子已穿过地球 · 比光早到几小时' : '若在今夜爆炸：连续数周白天可见'}</span>
              </>
            ) : (
              <>
                <span>未来 10 万年内的某一天</span>
                <span>也可能它已经炸了 · 光还在路上</span>
              </>
            )}
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
      prev={{ title: '三体运动', to: '/system/three-body' }}
      controls={controls}
      selectedHotspot={selectedHotspot}
      onCloseHotspot={() => setSelectedId(null)}
      overlay={
        <>
          {mode === 'dimming' && sneezeP === 0 && (
            <div className="hud ns-caption panel">点「打个喷嚏」——看 2020 年大暗化是怎么回事</div>
          )}
          {mode === 'boom' && !boomStarted && (
            <div className="hud ns-caption panel">下方按钮随时能引爆它——真实的它，也同样无人预告</div>
          )}
          {mode === 'swap' && swapDone && (
            <div className="hud wd-ending panel">
              <div className="giant-fork-title">木星和土星成了幸存者</div>
              <p className="wd-ending-text">
                水星、金星、地球、火星都被吞进了它的肚子里。木星和土星只能隔着灼热，远远看着这颗曾经的太阳。
              </p>
            </div>
          )}
          {mode === 'boom' && boomDone && (
            <div className="hud wd-ending panel">
              <div className="giant-fork-title">也可能，它早就炸了</div>
              <p className="wd-ending-text">
                参宿四距我们 600 多光年：就算它此刻爆炸，也要 600 多年后我们才能看见。它留下的中子星会高速旋转，向宇宙打着手电。
              </p>
              <div className="chapter-fork-options" style={{ gridTemplateColumns: '1fr', marginTop: 14 }}>
                <button onClick={resetBoom}>重新来过</button>
              </div>
            </div>
          )}
        </>
      }
    >
      <Canvas
        camera={{ position: [0, 6, 26], fov: 50, near: 0.1, far: 3000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <BetelgeuseScene
            mode={mode}
            sneezeRef={sneezeRef}
            swapRef={swapRef}
            swap={swapP}
            boomTRef={boomTRef}
            selected={selectedId}
            onSelect={setSelectedId}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>
      {(mode === 'dimming' || mode === 'boom') && (
        <LightCurve
          statsRef={curveRef}
          title={mode === 'dimming' ? '亮度曲线 · 示意' : '超新星光变曲线 · 快放（1 秒 ≈ 3 天）'}
        />
      )}
      {flashNonce > 0 && <div key={flashNonce} className="btg-flash" aria-hidden />}
    </ChapterShell>
  )
}
