import { useStore } from '../../store'

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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 2.6-6.4" />
    <path d="M3 4v5h5" />
  </svg>
)

export default function ControlBar() {
  const paused = useStore((s) => s.paused)
  const speed = useStore((s) => s.speed)
  const showOrbits = useStore((s) => s.showOrbits)
  const showLabels = useStore((s) => s.showLabels)
  const setPaused = useStore((s) => s.setPaused)
  const setSpeed = useStore((s) => s.setSpeed)
  const toggleOrbits = useStore((s) => s.toggleOrbits)
  const toggleLabels = useStore((s) => s.toggleLabels)
  const resetView = useStore((s) => s.resetView)

  return (
    <div className="hud hud-controls panel">
      <button className="ctl-btn" onClick={() => setPaused(!paused)} title={paused ? '继续' : '暂停'}>
        {paused ? PlayIcon : PauseIcon}
      </button>
      <div className="ctl-speed">
        <span className="ctl-label">速度</span>
        <input
          className="slider"
          type="range"
          min={0.5}
          max={10}
          step={0.5}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
        <span className="mono ctl-speed-val">{speed.toFixed(1)}×</span>
      </div>
      <div className="ctl-sep" />
      <button className={`ctl-toggle${showOrbits ? ' on' : ''}`} onClick={toggleOrbits}>
        轨道
      </button>
      <button className={`ctl-toggle${showLabels ? ' on' : ''}`} onClick={toggleLabels}>
        标签
      </button>
      <div className="ctl-sep" />
      <button className="ctl-btn" onClick={resetView} title="重置视角">
        {ResetIcon}
      </button>
    </div>
  )
}
