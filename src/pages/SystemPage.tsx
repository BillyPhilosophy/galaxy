import { Link, Navigate, useParams } from 'react-router'
import { findSystem } from '../data/systems'
import { SYSTEM_REGISTRY } from '../components/beyond/registry'

export default function SystemPage() {
  const { id } = useParams()
  const system = findSystem(id)
  if (!system) return <Navigate to="/" replace />

  const Impl = SYSTEM_REGISTRY[system.id]
  if (Impl) return <Impl system={system} />

  return (
    <div className="system-page">
      <div className="system-card panel">
        <div
          className="system-accent"
          style={{ background: system.color, boxShadow: `0 0 14px ${system.color}` }}
        />
        <h1 className="info-name">{system.name}</h1>
        <div className="info-en mono">{system.nameEn}</div>
        <p className="info-desc">{system.description}</p>
        <div className="info-facts">
          {system.facts.map((f) => (
            <div className="fact" key={f.label}>
              <span className="fact-label">{f.label}</span>
              <span className="fact-value">{f.value}</span>
            </div>
          ))}
        </div>
        <div className="system-wip mono">3D 场景建设中 · SIGNAL DECODING</div>
        <Link to="/" className="info-back system-back">
          返回太阳系
        </Link>
      </div>
    </div>
  )
}
