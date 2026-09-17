import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link, useNavigate } from 'react-router'
import { useIsMobile } from '../hooks/use-mobile'
import LabScene from '../components/lab/LabScene'
import type { EncounterInfo } from '../components/lab/LabScene'
import { LAB_CHAPTERS } from '../components/lab/data'

export default function LabPage() {
  const [encounter, setEncounter] = useState<EncounterInfo | null>(null)
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="lab-page">
      <Canvas
        camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 1600 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <LabScene onEncounter={setEncounter} isMobile={isMobile} />
        </Suspense>
      </Canvas>
      <div className="hud chapter-top">
        <Link to="/" className="scale-back">
          ← 返回首页
        </Link>
        <div className="scale-title">
          宇宙实验室
          <small className="mono">COSMIC LAB · 自动巡航中</small>
        </div>
      </div>
      <div className={`hud lab-nameplate panel${encounter ? ' on' : ''}`}>
        <div className="lab-nameplate-name">{encounter?.name}</div>
        <div className="lab-nameplate-en mono">{encounter?.en}</div>
        <div className="lab-nameplate-fact">{encounter?.fact}</div>
      </div>
      <div className="hud lab-cards">
        {LAB_CHAPTERS.map((c) => (
          <Link key={c.id} to={`/lab/${c.id}`} className="lab-card panel">
            <span className="lab-card-tag mono">建设中</span>
            <span className="lab-card-name">{c.name}</span>
            <span className="lab-card-en mono">{c.nameEn}</span>
            <span className="lab-card-teaser">{c.teaser} →</span>
          </Link>
        ))}
        <div className="lab-card lab-card--ghost panel" aria-hidden="true">
          <span className="lab-card-tag mono">策划中</span>
          <span className="lab-card-name">？？？</span>
          <span className="lab-card-en mono">NEXT EXPERIMENT</span>
          <span className="lab-card-teaser">更多宇宙实验在路上</span>
        </div>
      </div>
    </div>
  )
}
