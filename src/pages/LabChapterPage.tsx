import { Link, Navigate, useParams } from 'react-router'
import { findLabChapter } from '../components/lab/data'

/** 实验室栏目占位页：场景建设ing */
export default function LabChapterPage() {
  const { id } = useParams()
  const chapter = findLabChapter(id)
  if (!chapter) return <Navigate to="/lab" replace />

  return (
    <div className="system-page">
      <div className="system-card panel">
        <div
          className="system-accent"
          style={{ background: '#b8a8ff', boxShadow: '0 0 14px #b8a8ff' }}
        />
        <h1 className="info-name">{chapter.name}</h1>
        <div className="info-en mono">{chapter.nameEn}</div>
        <p className="info-desc">{chapter.teaser}</p>
        <div className="system-wip mono">3D 场景建设中 · UNDER CONSTRUCTION</div>
        <Link to="/lab" className="info-back system-back">
          ← 返回实验室
        </Link>
      </div>
    </div>
  )
}
