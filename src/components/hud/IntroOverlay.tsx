import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../../store'
import { STAR_SYSTEMS } from '../../data/systems'

export default function IntroOverlay() {
  const [hidden, setHidden] = useState(false)
  const [view, setView] = useState<'home' | 'beyond'>('home')
  const start = useStore((s) => s.start)

  const handleStart = () => {
    setHidden(true)
    start()
  }

  useEffect(() => {
    if (view !== 'beyond') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setView('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  return (
    <div className={`intro${hidden ? ' intro--hidden' : ''}`}>
      <div className="intro-ring intro-ring--a" />
      <div className="intro-ring intro-ring--b" />
      {view === 'home' ? (
        <div className="intro-inner">
          <div className="intro-kicker mono">INTERACTIVE WEB EXPERIENCE</div>
          <h1 className="intro-title">太阳系探索</h1>
          <div className="intro-en mono">SOLAR SYSTEM EXPLORER</div>
          <p className="intro-desc">
            拖拽旋转视角，滚动缩放距离，点击任意一颗行星，
            <br />
            开启一段跨越 45 亿公里的星际漫游。
          </p>
          <div className="intro-actions">
            <button className="intro-btn" onClick={handleStart}>
              开始探索
            </button>
            <button className="intro-btn intro-btn--ghost" onClick={() => setView('beyond')}>
              太阳之外
            </button>
            <Link to="/story" className="intro-btn intro-btn--ghost">
              宇宙叙事
            </Link>
          </div>
          <div className="intro-meta mono">
            <span>8 大行星</span>
            <span>真实轨道周期比例</span>
            <span>程序化生成贴图</span>
          </div>
        </div>
      ) : (
        <div className="intro-beyond panel">
          <button className="beyond-back" onClick={() => setView('home')}>
            ← 返回
          </button>
          <h2 className="beyond-title">太阳之外</h2>
          <div className="beyond-sub mono">BEYOND THE SUN</div>
          <div className="beyond-list">
            {STAR_SYSTEMS.map((s) => (
              <Link key={s.id} to={`/system/${s.id}`} className="beyond-item">
                <span
                  className="beyond-dot"
                  style={{ background: s.color, boxShadow: `0 0 8px 2px ${s.color}55` }}
                />
                <span className="beyond-names">
                  <span className="beyond-zh">{s.name}</span>
                  <span className="beyond-en mono">{s.nameEn}</span>
                </span>
                <span className="beyond-meta">
                  {s.starType} · {s.distance}
                </span>
                <span className="beyond-arrow">→</span>
              </Link>
            ))}
            <div className="beyond-item beyond-item--disabled" aria-disabled="true">
              <span className="beyond-dot beyond-dot--dim" />
              <span className="beyond-names">
                <span className="beyond-zh">？？？</span>
                <span className="beyond-en mono">UNKNOWN SIGNAL</span>
              </span>
              <span className="beyond-meta">
                深空信号解析中
                <span className="beyond-decoding">
                  <i>.</i>
                  <i>.</i>
                  <i>.</i>
                </span>
              </span>
            </div>
          </div>
          <div className="beyond-hint mono">按 ESC 返回</div>
        </div>
      )}
    </div>
  )
}
