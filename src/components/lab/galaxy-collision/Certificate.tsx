import { useState } from 'react'
import { OUTCOME_META, outcomeStats } from './data'
import type { CollisionStats, OutcomeId } from './data'

const NAME_SUGGESTIONS = ['Milkomeda', 'Milkdromeda', '星河一号', '双旋巨人']

interface CertificateProps {
  outcome: OutcomeId
  clusterName: string
  savedName: string
  onSaveName(name: string): void
  onClose(): void
}

/** 命名仪式 + 未来星系发现证书 */
export default function Certificate({ outcome, clusterName, savedName, onSaveName, onClose }: CertificateProps) {
  const meta = OUTCOME_META[outcome]
  const [stats] = useState<CollisionStats>(() => outcomeStats(outcome))
  const [name, setName] = useState(savedName)
  const [sealed, setSealed] = useState(!!savedName || !meta.merge)
  const today = new Date().toLocaleDateString('zh-CN')

  const finalName = meta.merge ? name.trim() : ''

  return (
    <div className="hud collision-quiz collision-cert panel" role="dialog" aria-modal="true" aria-label="未来星系发现证书">
      <button className="collision-quiz-close" onClick={onClose} aria-label="关闭证书">
        ×
      </button>
      <div className="collision-kicker mono">未来宇宙推演证书 · CERTIFICATE</div>

      {meta.merge && !sealed && (
        <div className="cert-naming">
          <div className="collision-quiz-title">新星系诞生了，给它起个名字吧！</div>
          <div className="cert-chips">
            {NAME_SUGGESTIONS.map((s) => (
              <button key={s} className="ctl-toggle collision-touch" onClick={() => setName(s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="starlab-name-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 12))}
              placeholder="或者写下你自己的名字"
              aria-label="新星系的名字"
            />
            <button
              onClick={() => {
                const final = name.trim() || 'Milkomeda'
                setName(final)
                setSealed(true)
                onSaveName(final)
              }}
            >
              盖戳定名 →
            </button>
          </div>
        </div>
      )}

      {sealed && (
        <div className="cert-card">
          <div className="cert-seal" aria-hidden>
            未来
          </div>
          <div className="cert-title">{meta.merge ? finalName || 'Milkomeda' : '仍是两座星系'}</div>
          <div className="cert-sub mono">{meta.merge ? 'A GALAXY I SIMULATED' : 'A FUTURE THAT DID NOT MERGE'}</div>
          <div className="cert-rows">
            <div className="cert-row">
              <span>轨道类型</span>
              <b>{meta.label}</b>
            </div>
            <div className="cert-row">
              <span>是否合并</span>
              <b>{meta.merge ? '是' : '否'}</b>
            </div>
            <div className="cert-row">
              <span>新生星团</span>
              <b>约 {stats.clusters.toLocaleString()} 个{clusterName ? `（含「${clusterName}」）` : ''}</b>
            </div>
            <div className="cert-row">
              <span>被甩向深空的恒星</span>
              <b>约 {stats.ejectedPct}%</b>
            </div>
            <div className="cert-row">
              <span>推演时长</span>
              <b>数十亿年</b>
            </div>
            <div className="cert-row">
              <span>小小宇宙预报员</span>
              <b>{today} 签发</b>
            </div>
          </div>
          <div className="cert-note">真正的答案要等几十亿年——而你已经可以模拟它。</div>
          <button className="cert-close-btn" onClick={onClose}>
            收下证书，再看看星系
          </button>
        </div>
      )}
    </div>
  )
}
