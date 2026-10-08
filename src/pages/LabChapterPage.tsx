import { Suspense } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { findLabChapter } from '../components/lab/data'
import { LAB_CHAPTER_REGISTRY } from '../components/lab/registry'

/** 实验室独立子路由：已完成实验进入沉浸场景，其余保留占位页 */
export default function LabChapterPage() {
  const { id } = useParams()
  const chapter = findLabChapter(id)
  if (!chapter) return <Navigate to="/lab" replace />
  const Impl = LAB_CHAPTER_REGISTRY[chapter.id]
  if (Impl) {
    return (
      <Suspense
        fallback={
          <div className="collision-loading">
            <div className="collision-loading-orbits" aria-hidden />
            <b>正在准备未来宇宙</b>
            <span className="mono">PREPARING THE GALACTIC ENCOUNTER</span>
          </div>
        }
      >
        <Impl />
      </Suspense>
    )
  }

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
