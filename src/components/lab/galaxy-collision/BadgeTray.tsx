import { BADGE_DEFS } from './data'

interface BadgeTrayProps {
  earned: ReadonlySet<string>
  open: boolean
  unlockedAll: boolean
  onToggle(): void
}

/** 结局徽章收集：集齐四枚解锁隐藏的“未来夜空”视角 */
export default function BadgeTray({ earned, open, unlockedAll, onToggle }: BadgeTrayProps) {
  return (
    <>
      <button
        className={`hud collision-badges panel${open ? ' on' : ''}`}
        onClick={onToggle}
        aria-label="徽章收集"
        title="徽章收集"
      >
        {BADGE_DEFS.map((b) => (
          <span key={b.id} className={`collision-badge-dot${earned.has(b.id) ? ' earned' : ''}`}>
            {earned.has(b.id) ? b.mark : '?'}
          </span>
        ))}
      </button>
      {open && (
        <div className="hud collision-badge-panel panel">
          <div className="collision-kicker mono">结局徽章 · BADGES</div>
          {BADGE_DEFS.map((b) => (
            <div key={b.id} className={`collision-badge-row${earned.has(b.id) ? ' earned' : ''}`}>
              <span className="collision-badge-mark">{earned.has(b.id) ? b.mark : '？'}</span>
              <div>
                <b>{b.name}</b>
                <span className="mono">{b.en}</span>
                <p>{b.desc}</p>
              </div>
            </div>
          ))}
          <div className="collision-badge-hint">
            {unlockedAll ? '已解锁隐藏镜头：未来夜空（视角切换里）' : '集齐四枚徽章，解锁一个隐藏的夜空镜头'}
          </div>
        </div>
      )}
    </>
  )
}
