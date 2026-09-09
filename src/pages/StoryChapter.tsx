import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { chapterNeighbor, findChapter, MASSIVE_BRANCH, SUN_BRANCH } from '../data/story'
import NebulaChapter from '../components/story/NebulaChapter'
import ProtostarChapter from '../components/story/ProtostarChapter'
import MainSequenceChapter from '../components/story/MainSequenceChapter'

export default function StoryChapter() {
  const { id } = useParams()
  const navigate = useNavigate()
  const ch = findChapter(id)
  const { prev, next } = chapterNeighbor(ch?.id ?? '')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/story')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  if (!ch) return <Navigate to="/story" replace />
  if (ch.id === 'nebula') return <NebulaChapter ch={ch} prev={prev} next={next} />
  if (ch.id === 'protostar') return <ProtostarChapter ch={ch} prev={prev} next={next} />
  if (ch.id === 'main-sequence') return <MainSequenceChapter ch={ch} prev={prev} next={next} />

  return (
    <div className="system-page">
      <div className="system-card panel story-card">
        <div
          className="system-accent"
          style={{ background: ch.color, boxShadow: `0 0 14px ${ch.color}` }}
        />
        <h1 className="info-name">{ch.title}</h1>
        <div className="info-en mono">
          {ch.num} · {ch.titleEn}
        </div>
        {ch.branch && <div className="chapter-branch mono">支线 · {ch.mass}</div>}
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
        <div className="system-wip mono">3D 场景建设中 · COMING SOON</div>
        {ch.fork && (
          <div className="chapter-fork">
            <div className="chapter-fork-label mono">选择它的命运</div>
            <div className="chapter-fork-options">
              {[...SUN_BRANCH, ...MASSIVE_BRANCH].map((o) => (
                <Link key={o.id} to={`/story/${o.id}`}>
                  {o.title}
                  <span className="mono">{o.mass}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="chapter-nav">
          {prev ? (
            <Link className="chapter-nav-btn" to={`/story/${prev.id}`}>
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          <Link className="chapter-nav-btn chapter-nav-btn--home" to="/story">
            时间轴
          </Link>
          {next ? (
            <Link className="chapter-nav-btn" to={`/story/${next.id}`}>
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  )
}
