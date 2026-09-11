import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { StarSystemData } from '../../../data/systems'
import ChapterShell from '../../story/ChapterShell'
import ThreeBodyScene from './ThreeBodyScene'
import type { SimStats } from './ThreeBodyScene'
import { CUSTOM_DEFAULT, MODE_META } from './data'
import type { TBody, ThreeBodyMode } from './data'

const MODES: ThreeBodyMode[] = ['figure8', 'lagrange', 'chaos', 'butterfly', 'custom']

const cloneBody = (b: TBody): TBody => ({ p: [...b.p], v: [...b.v], m: b.m })

export default function ThreeBodySystem({ system }: { system: StarSystemData }) {
  const [mode, setMode] = useState<ThreeBodyMode>('figure8')
  const [runId, setRunId] = useState(0)
  const [editing, setEditing] = useState(false)
  const [stats, setStats] = useState<SimStats>({ t: 0, minSep: 99, drift: 0, div: 0 })
  const [ejectToast, setEjectToast] = useState(false)

  const customRef = useRef<TBody[]>(CUSTOM_DEFAULT.map(cloneBody))
  const statsRef = useRef<SimStats>({ t: 0, minSep: 99, drift: 0, div: 0 })
  const onEjectRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    onEjectRef.current = () => setEjectToast(true)
  }, [])

  // 读数节流刷新（5 次/秒）
  useEffect(() => {
    const id = setInterval(() => setStats({ ...statsRef.current }), 200)
    return () => clearInterval(id)
  }, [])

  const switchMode = (m: ThreeBodyMode) => {
    setMode(m)
    setEjectToast(false)
    setEditing(m === 'custom')
    setRunId((r) => r + 1)
  }

  const meta = MODE_META[mode]
  const eraStable = meta.era === '恒纪元'

  const ch = {
    color: system.color,
    title: system.name,
    titleEn: system.nameEn,
    num: 'BEYOND · 实验',
    teaser: `${system.starType} · ${system.distance}`,
    description: system.description,
    facts: system.facts,
  }

  const controls = (
    <div className="hud chapter-controls panel">
      <div className="chapter-stage">
        <b>
          {meta.label}
          <span className="era-chip" style={{ color: eraStable ? '#4ddb8a' : '#ff7a5c' }}>
            {editing ? '摆放中' : meta.era}
          </span>
        </b>
        <span className="mono">{meta.en}</span>
      </div>
      <div className="ctl-sep" />
      <div className="tb-modes">
        {MODES.map((m) => (
          <button
            key={m}
            className={`ctl-toggle${mode === m ? ' on' : ''}`}
            onClick={() => switchMode(m)}
          >
            {MODE_META[m].short}
          </button>
        ))}
      </div>
      <div className="ctl-sep" />
      {mode === 'custom' ? (
        <button
          className="ctl-toggle on"
          onClick={() => {
            setEjectToast(false)
            if (editing) setRunId((r) => r + 1)
            setEditing(!editing)
          }}
        >
          {editing ? '开始演化 ▶' : '重新摆放'}
        </button>
      ) : (
        <button
          className="ctl-toggle"
          onClick={() => {
            setEjectToast(false)
            setRunId((r) => r + 1)
          }}
        >
          {mode === 'chaos' ? '再来一局' : '重新开始'}
        </button>
      )}
      <div className="ctl-sep" />
      <div className="chapter-readouts mono">
        <span>
          t = {stats.t.toFixed(1)} · 最小间距 {stats.minSep > 90 ? '—' : stats.minSep.toFixed(2)}
        </span>
        <span>
          {mode === 'butterfly'
            ? `轨迹偏差 ${stats.div < 0.01 ? stats.div.toExponential(1) : stats.div.toFixed(2)}`
            : `能量漂移 ${(stats.drift * 100).toFixed(2)}%`}
        </span>
      </div>
    </div>
  )

  return (
    <ChapterShell
      ch={ch}
      backTo="/"
      backLabel="← 返回首页"
      prev={{ title: '比邻星', to: '/system/proxima-centauri' }}
      controls={controls}
      overlay={
        <>
          {editing && (
            <div className="hud ns-caption panel">拖拽星体设置位置 · 拖拽箭头尖端设置速度</div>
          )}
          {ejectToast && (
            <div className="hud wd-ending panel">
              <div className="giant-fork-title">一颗恒星被抛出了系统</div>
              <p className="wd-ending-text">
                三体问题没有通解——这场无法预测的乱舞，正是乱纪元的物理本质。
              </p>
              <div className="chapter-fork-options" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
                <button
                  onClick={() => {
                    setEjectToast(false)
                    setRunId((r) => r + 1)
                  }}
                >
                  再来一局
                </button>
                <button onClick={() => setEjectToast(false)}>继续观看</button>
              </div>
            </div>
          )}
        </>
      }
    >
      <Canvas
        camera={{ position: [0, 7, 12], fov: 50, near: 0.1, far: 2000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <ThreeBodyScene
            mode={mode}
            runId={runId}
            editing={editing}
            customRef={customRef}
            statsRef={statsRef}
            onEjectRef={onEjectRef}
          />
        </Suspense>
      </Canvas>
    </ChapterShell>
  )
}
