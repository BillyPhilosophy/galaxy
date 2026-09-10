import { Link } from 'react-router'

export default function Header() {
  return (
    <header className="hud hud-header">
      <Link to="/" className="hud-back" title="返回首页">
        ← 返回首页
      </Link>
      <div className="hud-title">
        <span className="hud-dot" />
        太阳系探索
      </div>
      <div className="hud-sub mono">SOLAR SYSTEM EXPLORER — 八大行星实时轨道模拟</div>
    </header>
  )
}
