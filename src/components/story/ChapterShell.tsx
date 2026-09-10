import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

interface ChapterHotspot {
  id: string
  label: string
  title: string
  desc: string
  facts: { label: string; value: string }[]
}

export interface ShellChapter {
  color: string
  title: string
  titleEn: string
  num: string
  teaser: string
  description: string
  facts: { label: string; value: string }[]
}

export interface ShellNav {
  title: string
  to: string
}

interface ChapterShellProps {
  ch: ShellChapter
  prev?: ShellNav | null
  next?: ShellNav | null
  /** 返回链接，默认时间轴 */
  backTo?: string
  backLabel?: string
  /** 全屏 Canvas 场景 */
  children: ReactNode
  /** 底部控制条 */
  controls?: ReactNode
  /** 额外浮层（如"下一章"脉冲按钮） */
  overlay?: ReactNode
  /** 当前选中的场景部件；非空时浮窗切换为部件解说 */
  selectedHotspot?: ChapterHotspot | null
  onCloseHotspot?: () => void
}

/** 沉浸章节通用外壳：全屏场景 + 左上标题 + 可收起的信息浮窗 */
export default function ChapterShell({
  ch,
  prev,
  next,
  backTo = '/story',
  backLabel = '← 时间轴',
  children,
  controls,
  overlay,
  selectedHotspot,
  onCloseHotspot,
}: ChapterShellProps) {
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 768)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(backTo)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, backTo])

  const showingHotspot = !!selectedHotspot
  const open = panelOpen || showingHotspot

  return (
    <div className="chapter-page">
      {children}
      <div className="hud chapter-top">
        <Link to={backTo} className="scale-back">
          {backLabel}
        </Link>
        <div className="scale-title">
          {ch.title}
          <small className="mono">
            {ch.num} · {ch.titleEn}
          </small>
        </div>
      </div>
      {!open && (
        <button className="hud chapter-info-toggle ctl-toggle" onClick={() => setPanelOpen(true)}>
          了解本章
        </button>
      )}
      <aside className={`hud hud-info panel${open ? ' open' : ''}`}>
        <button
          className="info-close"
          onClick={() => (showingHotspot ? onCloseHotspot?.() : setPanelOpen(false))}
          title="收起"
        >
          ×
        </button>
        {showingHotspot && selectedHotspot ? (
          <>
            <div
              className="info-accent"
              style={{ background: ch.color, boxShadow: `0 0 12px ${ch.color}` }}
            />
            <div className="info-name">{selectedHotspot.title}</div>
            <div className="info-en mono">场景部件 · {selectedHotspot.label}</div>
            <p className="info-desc">{selectedHotspot.desc}</p>
            <div className="info-facts">
              {selectedHotspot.facts.map((f) => (
                <div className="fact" key={f.label}>
                  <span className="fact-label">{f.label}</span>
                  <span className="fact-value">{f.value}</span>
                </div>
              ))}
            </div>
            <button className="info-back" onClick={onCloseHotspot}>
              ← 本章总述
            </button>
          </>
        ) : (
          <>
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
                <Link className="chapter-nav-btn" to={prev.to}>
                  ← {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link className="chapter-nav-btn" to={next.to}>
                  {next.title} →
                </Link>
              ) : (
                <span />
              )}
            </div>
          </>
        )}
      </aside>
      {controls}
      {overlay}
      <div className="hud hud-hint">拖拽旋转 · 滚轮缩放</div>
    </div>
  )
}
