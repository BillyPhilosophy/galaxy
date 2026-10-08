import { useMemo, useRef } from 'react'
import { OUTCOME_META } from './data'
import type { OutcomeId } from './data'

export interface BenchState {
  speed: number
  dir: number
  neighbor: number
}

/** 三个控制杆 → 结局：偏得快会错过，正中会相撞，慢下来会被引力捕获 */
function outcomeFromBench({ speed, dir, neighbor }: BenchState): OutcomeId {
  const offCenter = Math.abs(dir)
  const fast = speed > 0.66
  const slow = speed < 0.38
  const strongPull = neighbor > 0.62
  const weakPull = neighbor < 0.3
  if (offCenter < 0.3) return fast && weakPull ? 'miss' : 'headon'
  if (fast && !strongPull) return 'miss'
  if (slow || strongPull) return 'merge'
  return 'loop'
}

const TRACK_PATHS: Record<OutcomeId, { mw: string; and: string }> = {
  merge: {
    mw: 'M10,52 C60,20 150,18 150,52 C150,84 92,86 98,58 C100,50 106,52 110,55',
    and: 'M210,58 C160,90 70,92 70,58 C70,26 128,24 122,52 C120,60 114,58 110,55',
  },
  loop: {
    mw: 'M10,55 C50,15 130,15 150,45 C168,73 130,95 95,80 C68,68 80,45 110,55',
    and: 'M210,55 C170,95 90,95 70,65 C52,37 90,15 125,30 C152,42 140,65 110,55',
  },
  headon: {
    mw: 'M10,55 L94,55',
    and: 'M210,55 L126,55',
  },
  miss: {
    mw: 'M10,40 C90,46 130,56 210,78',
    and: 'M210,30 C130,40 96,44 10,72',
  },
}

function TrackPreview({ outcome }: { outcome: OutcomeId }) {
  const paths = TRACK_PATHS[outcome]
  return (
    <svg className="bench-track" viewBox="0 0 220 110" role="img" aria-label="未来轨迹预览">
      <path d={paths.mw} className="bench-track-mw" />
      <path d={paths.and} className="bench-track-and" />
      {outcome === 'headon' && (
        <g className="bench-track-burst">
          <circle cx="110" cy="55" r="10" />
          <path d="M110,36 L110,26 M110,74 L110,84 M91,55 L81,55 M129,55 L139,55 M97,42 L90,35 M123,68 L130,75 M123,42 L130,35 M97,68 L90,75" />
        </g>
      )}
      {outcome === 'miss' && <circle cx="110" cy="52" r="4" className="bench-track-dot" />}
      <circle cx="10" cy="52" r="3" className="bench-track-mw-fill" />
      <circle cx="210" cy="58" r="3" className="bench-track-and-fill" />
    </svg>
  )
}

interface LabBenchProps {
  value: BenchState
  applied: OutcomeId
  onChange(value: BenchState): void
  onApply(outcome: OutcomeId): void
  onClose(): void
}

export default function LabBench({ value, applied, onChange, onApply, onClose }: LabBenchProps) {
  const preview = useMemo(() => outcomeFromBench(value), [value])
  const meta = OUTCOME_META[preview]
  const dirty = preview !== applied
  const lastApply = useRef(0)

  const commit = () => {
    // 拖完松手才重建粒子，避免拖动中反复组装缓冲
    if (Date.now() - lastApply.current < 250) return
    lastApply.current = Date.now()
    onApply(preview)
  }

  const dirWord = Math.abs(value.dir) < 0.3 ? '正面' : value.dir < 0 ? '左偏' : '右偏'
  const speedWord = value.speed < 0.38 ? '慢' : value.speed > 0.66 ? '快' : '适中'
  const neighborWord = value.neighbor < 0.3 ? '弱' : value.neighbor > 0.62 ? '强' : '一般'

  return (
    <div className="hud collision-bench panel" role="dialog" aria-label="未来实验台">
      <button className="collision-quiz-close" onClick={onClose} aria-label="关闭实验台">
        ×
      </button>
      <div className="collision-kicker mono">未来实验台 · DESIGN A FUTURE</div>
      <div className="bench-levers">
        <label className="bench-lever">
          <span className="bench-lever-name">
            飞得多快 <b>{speedWord}</b>
          </span>
          <input
            className="slider bench-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={value.speed}
            onChange={(e) => onChange({ ...value, speed: Number(e.target.value) })}
            onPointerUp={commit}
            onKeyUp={commit}
            aria-label="相遇速度"
          />
          <span className="bench-lever-ends mono">
            <i>乌龟</i>
            <i>飞船</i>
          </span>
        </label>
        <label className="bench-lever">
          <span className="bench-lever-name">
            朝哪个方向 <b>{dirWord}</b>
          </span>
          <input
            className="slider bench-range"
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={value.dir}
            onChange={(e) => onChange({ ...value, dir: Number(e.target.value) })}
            onPointerUp={commit}
            onKeyUp={commit}
            aria-label="相遇方向"
          />
          <span className="bench-lever-ends mono">
            <i>左偏</i>
            <i>正面</i>
            <i>右偏</i>
          </span>
        </label>
        <label className="bench-lever">
          <span className="bench-lever-name">
            邻居星系的拉力 <b>{neighborWord}</b>
          </span>
          <input
            className="slider bench-range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={value.neighbor}
            onChange={(e) => onChange({ ...value, neighbor: Number(e.target.value) })}
            onPointerUp={commit}
            onKeyUp={commit}
            aria-label="邻居星系的拉力"
          />
          <span className="bench-lever-ends mono">
            <i>弱磁铁</i>
            <i>强磁铁</i>
          </span>
        </label>
      </div>
      <div className="bench-preview">
        <TrackPreview outcome={preview} />
        <div className="bench-outcome">
          <b>{meta.label}</b>
          <span className="mono">{meta.en}</span>
          <p>{meta.desc}</p>
        </div>
      </div>
      <button className="bench-apply" onClick={() => onApply(preview)} disabled={!dirty}>
        {dirty ? '把这个未来装进宇宙 →' : '正在推演这个未来'}
      </button>
      <div className="bench-note mono">观测有误差，所以未来不止一个</div>
    </div>
  )
}
