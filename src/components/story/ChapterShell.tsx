import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import type { StoryChapter } from '../../data/story'

interface ChapterShellProps {
  ch: StoryChapter
  prev: StoryChapter | null
  next: StoryChapter | null
  /** 全屏 Canvas 场景 */
  children: ReactNode
  /** 底部控制条 */
  controls?: ReactNode
  /** 额外浮层（如"下一章"脉冲按钮） */
  overlay?: ReactNode
}

/** 沉浸章节通用外壳：全屏场景 + 左上标题 + 可收起的信息浮窗 */
export default function ChapterShell({ ch, prev, next, children, controls, overlay }: ChapterShellProps) {
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 768)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/story')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="chapter-page">
      {children}
      <div className="hud chapter-top">
        <Link to="/story" className="scale-back">
          ← 时间轴
        </Link>
        <div className="scale-title">
          {ch.title}
          <small className="mono">
            {ch.num} · {ch.titleEn}
          </small>
        </div>
      </div>
      {!panelOpen && (
        <button className="hud chapter-info-toggle ctl-toggle" onClick={() => setPanelOpen(true)}>
          了解本章
        </button>
      )}
      <aside className={`hud hud-info panel${panelOpen ? ' open' : ''}`}>
        <button className="info-close" onClick={() => setPanelOpen(false)} title="收起">
          ×
        </button>
        <div
          className="info-accent"
          style={{ background: ch.color, boxShadow: `0 0 12px ${ch.color}` }}
        />
        <div className="info-name">{ch.title}</div>
        <div className="info-en mono">
          {ch.num} · {ch.titleEn}
        </div>
        <div className="info-tag">{ch.teaser}</div>
        <p className="info-desc">{ch.description}</p>
        <div className="info-facts">
          {ch.facts.map((f) => (
            <div className="fact" key={f.label}>
              <span className="fact-label">{f.label}</span>
              <span className="fact-value">{f.value}</span>
            </div>
          ))}
        </div>
        <div className="chapter-nav">
          {prev ? (
            <Link className="chapter-nav-btn" to={`/story/${prev.id}`}>
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="chapter-nav-btn" to={`/story/${next.id}`}>
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </aside>
      {controls}
      {overlay}
      <div className="hud hud-hint">拖拽旋转 · 滚轮缩放</div>
    </div>
  )
}
