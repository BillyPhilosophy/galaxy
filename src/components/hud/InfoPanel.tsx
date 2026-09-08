import { ALL_BODIES } from '../../data/planets'
import { useStore } from '../../store'

export default function InfoPanel() {
  const selectedId = useStore((s) => s.selectedId)
  const select = useStore((s) => s.select)
  const body = ALL_BODIES.find((b) => b.id === selectedId) ?? null

  return (
    <aside className={`hud hud-info panel${body ? ' open' : ''}`}>
      {body && (
        <div className="info-inner" key={body.id}>
          <button className="info-close" onClick={() => select(null)} aria-label="关闭">
            ×
          </button>
          <div className="info-accent" style={{ background: `linear-gradient(90deg, ${body.color}, transparent)` }} />
          <div className="info-name">{body.name}</div>
          <div className="info-en mono">{body.nameEn}</div>
          <div className="info-tag">{body.tagline}</div>
          <p className="info-desc">{body.description}</p>
          <div className="info-facts">
            {body.facts.map((f) => (
              <div className="fact" key={f.label}>
                <span className="fact-label">{f.label}</span>
                <span className="fact-value mono">{f.value}</span>
              </div>
            ))}
          </div>
          <button className="info-back" onClick={() => select(null)}>
            返回全景
          </button>
        </div>
      )}
    </aside>
  )
}
