import { useState } from 'react'
import { useStore } from '../../store'

export default function IntroOverlay() {
  const [hidden, setHidden] = useState(false)
  const start = useStore((s) => s.start)

  const handleStart = () => {
    setHidden(true)
    start()
  }

  return (
    <div className={`intro${hidden ? ' intro--hidden' : ''}`}>
      <div className="intro-ring intro-ring--a" />
      <div className="intro-ring intro-ring--b" />
      <div className="intro-inner">
        <div className="intro-kicker mono">INTERACTIVE WEB EXPERIENCE</div>
        <h1 className="intro-title">太阳系探索</h1>
        <div className="intro-en mono">SOLAR SYSTEM EXPLORER</div>
        <p className="intro-desc">
          拖拽旋转视角，滚动缩放距离，点击任意一颗行星，
          <br />
          开启一段跨越 45 亿公里的星际漫游。
        </p>
        <button className="intro-btn" onClick={handleStart}>
          开始探索
        </button>
        <div className="intro-meta mono">
          <span>8 大行星</span>
          <span>真实轨道周期比例</span>
          <span>程序化生成贴图</span>
        </div>
      </div>
    </div>
  )
}
