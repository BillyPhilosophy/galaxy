import { ALL_BODIES } from '../../data/planets'
import { useStore } from '../../store'

export default function PlanetNav() {
  const selectedId = useStore((s) => s.selectedId)
  const select = useStore((s) => s.select)
  return (
    <nav className="hud hud-nav panel">
      {ALL_BODIES.map((b) => (
        <button
          key={b.id}
          className={`nav-item${selectedId === b.id ? ' active' : ''}`}
          onClick={() => select(selectedId === b.id ? null : b.id)}
        >
          <span className="nav-dot" style={{ background: b.color, boxShadow: `0 0 8px ${b.color}` }} />
          <span className="nav-name">{b.name}</span>
          <span className="nav-en mono">{b.nameEn}</span>
        </button>
      ))}
    </nav>
  )
}
