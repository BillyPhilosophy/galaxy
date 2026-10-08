interface GuideGProps {
  line: string
  muted: boolean
  onToggle(): void
}

/** 引导星小G：每幕一两句短提示，可静音 */
export default function GuideG({ line, muted, onToggle }: GuideGProps) {
  if (muted) {
    return (
      <button className="hud collision-g-orb" onClick={onToggle} aria-label="叫醒小G" title="叫醒小G">
        G
      </button>
    )
  }
  return (
    <div className="hud collision-g">
      <div className="collision-guide small" aria-hidden>
        G
      </div>
      <p key={line} className="collision-g-line">
        {line}
      </p>
      <button className="collision-g-mute" onClick={onToggle} aria-label="让小G安静">
        ×
      </button>
    </div>
  )
}
