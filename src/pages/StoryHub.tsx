import { Link } from 'react-router'
import { EPILOGUE, MAIN_CHAPTERS, MASSIVE_BRANCH, SUN_BRANCH } from '../data/story'
import type { StoryChapter } from '../data/story'

function TimelineNode({ ch, branch }: { ch: StoryChapter; branch?: boolean }) {
  return (
    <Link to={`/story/${ch.id}`} className={`story-node${branch ? ' story-node--branch' : ''}`}>
      <span
        className="story-node-dot"
        style={{ background: ch.color, boxShadow: `0 0 10px 2px ${ch.color}66` }}
      />
      <span className="story-node-num mono">{ch.num}</span>
      <span className="story-node-body">
        <span className="story-node-title">
          {ch.title}
          <span className="story-node-en mono">{ch.titleEn}</span>
        </span>
        <span className="story-node-teaser">{ch.teaser}</span>
      </span>
      <span className="story-node-arrow">→</span>
    </Link>
  )
}

export default function StoryHub() {
  return (
    <div className="story-page">
      <Link to="/" className="story-home">
        ← 返回首页
      </Link>
      <header className="story-head">
        <div className="intro-kicker mono">COSMIC NARRATIVE</div>
        <h1 className="story-title">宇宙叙事</h1>
        <div className="intro-en mono">THE LIFE OF STARS</div>
        <p className="story-desc">
          从一团冰冷的尘埃，到连光也无法逃脱的深渊——
          <br />
          恒星的命运，在出生的那一刻就已被质量写定。
        </p>
      </header>
      <div className="story-timeline">
        {MAIN_CHAPTERS.map((ch) => (
          <TimelineNode key={ch.id} ch={ch} />
        ))}
        <Link to="/story/scale" className="story-node story-node--scale">
          <span className="story-node-dot story-node-dot--scale" />
          <span className="story-node-num mono">◇</span>
          <span className="story-node-body">
            <span className="story-node-title">
              插曲 · 尺度阶梯
              <span className="story-node-en mono">LADDER OF SCALE</span>
              <span className="story-badge mono">可交互</span>
            </span>
            <span className="story-node-teaser">
              从地球出发，一路缩放到 50 亿倍太阳体积——数字会失去感觉，画面不会。
            </span>
          </span>
          <span className="story-node-arrow">→</span>
        </Link>
        <div className="story-fork">
          <div className="story-fork-label mono">命运分岔 · 质量决定结局</div>
          <div className="story-branches">
            <div className="story-branch">
              <div className="story-branch-label mono">支线 A · 类日恒星（≤ 8 M☉）</div>
              {SUN_BRANCH.map((ch) => (
                <TimelineNode key={ch.id} ch={ch} branch />
              ))}
            </div>
            <div className="story-branch">
              <div className="story-branch-label mono">支线 B · 大质量恒星（≥ 8 M☉）</div>
              {MASSIVE_BRANCH.map((ch) => (
                <TimelineNode key={ch.id} ch={ch} branch />
              ))}
            </div>
          </div>
        </div>
        <TimelineNode ch={EPILOGUE} />
      </div>
    </div>
  )
}
