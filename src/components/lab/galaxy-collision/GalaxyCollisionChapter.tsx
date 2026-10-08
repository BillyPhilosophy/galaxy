import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import ChapterShell from '../../story/ChapterShell'
import GalaxyCollisionScene from './GalaxyCollisionScene'
import type { CollisionViewMode } from './GalaxyCollisionScene'
import LabBench from './LabBench'
import type { BenchState } from './LabBench'
import PredictionMachine from './PredictionMachine'
import StarLab from './StarLab'
import GuideG from './GuideG'
import BadgeTray from './BadgeTray'
import Certificate from './Certificate'
import { BADGE_DEFS, COLLISION_SHELL, guideLineFor, OUTCOME_META, stageAt } from './data'
import type { OutcomeId } from './data'

const PlayIcon = (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
    <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
  </svg>
)
const PauseIcon = (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
    <rect x="2" y="1.5" width="2.6" height="9" fill="currentColor" />
    <rect x="7.4" y="1.5" width="2.6" height="9" fill="currentColor" />
  </svg>
)
const ResetIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 2.6-6.4" />
    <path d="M3 4v5h5" />
  </svg>
)

const QUIZ_OPTIONS = [
  { id: 'explode', label: '会！到处都是大爆炸' },
  { id: 'bump', label: '会，像弹珠一样乱撞' },
  { id: 'space', label: '不会，大多数会穿过去' },
] as const

function storageRead(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function storageWrite(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 无痕模式下静默失败 */
  }
}
function readBadges(): Set<string> {
  try {
    const raw = JSON.parse(storageRead('gc-badges') ?? '[]')
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

/** 支持 ?t=0~1&view=cosmic|future&o=merge|loop|headon|miss&sun=1 直接定位，便于分享与调试 */
function initialProgress() {
  const raw = Number(new URLSearchParams(window.location.search).get('t'))
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0
}
function initialView(): CollisionViewMode {
  const params = new URLSearchParams(window.location.search)
  if (params.get('sun') === '1') return 'cosmic'
  const v = params.get('view')
  return v === 'cosmic' || v === 'future' ? v : 'sky'
}
function initialOutcome(): OutcomeId {
  const o = new URLSearchParams(window.location.search).get('o')
  return o === 'loop' || o === 'headon' || o === 'miss' ? o : 'merge'
}

export default function GalaxyCollisionChapter() {
  const [progress, setProgress] = useState(initialProgress)
  const [playing, setPlaying] = useState(false)
  const [viewMode, setViewMode] = useState<CollisionViewMode>(initialView)
  const [outcome, setOutcome] = useState<OutcomeId>(initialOutcome)
  const [bench, setBench] = useState<BenchState>({ speed: 0.3, dir: 0.6, neighbor: 0.5 })
  const [benchOpen, setBenchOpen] = useState(false)
  const [machineOpen, setMachineOpen] = useState(false)
  const [starLabOpen, setStarLabOpen] = useState(false)
  const [certOpen, setCertOpen] = useState(false)
  const [badgePanelOpen, setBadgePanelOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [focusSun, setFocusSun] = useState(() => new URLSearchParams(window.location.search).get('sun') === '1')
  const [badges, setBadges] = useState<Set<string>>(readBadges)
  const [galaxyName, setGalaxyName] = useState(() => storageRead('gc-name') ?? '')
  const [clusterName, setClusterName] = useState(() => storageRead('gc-cluster') ?? '')
  const [guideMuted, setGuideMuted] = useState(() => storageRead('gc-guide-muted') === '1')
  const [eventLine, setEventLine] = useState<string | null>(null)
  const [isCompact, setIsCompact] = useState(() => window.matchMedia('(max-width: 860px)').matches)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const quizSeen = useRef(false)
  const progressRef = useRef(progress)
  const outcomeRef = useRef(outcome)
  const badgesRef = useRef(badges)
  const eventTimer = useRef(0)

  const flashEvent = useCallback((line: string) => {
    setEventLine(line)
    window.clearTimeout(eventTimer.current)
    eventTimer.current = window.setTimeout(() => setEventLine(null), 4200)
  }, [])

  const earn = useCallback(
    (id: string) => {
      if (badgesRef.current.has(id)) return
      const next = new Set(badgesRef.current).add(id)
      badgesRef.current = next
      setBadges(next)
      storageWrite('gc-badges', JSON.stringify([...next]))
      const def = BADGE_DEFS.find((b) => b.id === id)
      if (next.size >= BADGE_DEFS.length) {
        flashEvent('四枚徽章集齐！隐藏镜头「未来夜空」解锁了！')
      } else {
        flashEvent(`获得徽章：${def?.name ?? ''}！`)
      }
    },
    [flashEvent],
  )

  const apply = useCallback(
    (value: number) => {
      const next = Math.min(1, Math.max(0, value))
      progressRef.current = next
      setProgress(next)
      const o = outcomeRef.current
      if (next >= 0.97) {
        if (o === 'miss') earn('miss')
        else if (o === 'loop') earn('loop')
      }
      if (next >= 0.6 && o !== 'miss') earn('tidal')
    },
    [earn],
  )

  const applyOutcome = useCallback(
    (id: OutcomeId) => {
      outcomeRef.current = id
      setOutcome(id)
      setFocusSun(false)
      setViewMode((v) => (v === 'future' ? v : 'cosmic'))
      flashEvent(`新的未来已装入：${OUTCOME_META[id].label}`)
    },
    [flashEvent],
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)')
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setIsCompact(media.matches)
    const updateMotion = () => setReducedMotion(motionMedia.matches)
    media.addEventListener('change', update)
    motionMedia.addEventListener('change', updateMotion)
    return () => {
      media.removeEventListener('change', update)
      motionMedia.removeEventListener('change', updateMotion)
    }
  }, [])

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false)
    }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden)
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const previous = progressRef.current
      const next = previous + dt / 72

      if (!quizSeen.current && previous < 0.3 && next >= 0.3) {
        apply(0.3)
        quizSeen.current = true
        setPlaying(false)
        setQuizOpen(true)
        return
      }
      if (viewMode === 'sky' && next >= 0.24) setViewMode('cosmic')
      apply(next)
      if (next >= 1) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, viewMode, apply])

  const stage = stageAt(progress, outcome)
  const futureUnlocked = badges.size >= BADGE_DEFS.length
  const future = viewMode === 'future'
  const guideLine = eventLine ?? (future ? '这片铺满新星星的夜空，是用四枚徽章换来的哦。' : guideLineFor(outcome, stage.id))

  const enterView = (mode: CollisionViewMode) => {
    setFocusSun(false)
    if (mode !== 'cosmic') setPlaying(false)
    setViewMode(mode)
  }

  const controls = (
    <div className="hud chapter-controls collision-controls panel">
      <button className="ctl-btn collision-touch" onClick={() => setPlaying(!playing)} title={playing ? '暂停未来' : '播放未来'}>
        {playing ? PauseIcon : PlayIcon}
      </button>
      <input
        className="slider chapter-slider collision-slider"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        onChange={(event) => {
          setPlaying(false)
          apply(Number(event.target.value))
        }}
        aria-label="星系相遇时间"
      />
      <button
        className="ctl-btn collision-touch"
        onClick={() => {
          setPlaying(false)
          setViewMode('sky')
          setFocusSun(false)
          setAnswer(null)
          setQuizOpen(false)
          quizSeen.current = false
          apply(0)
        }}
        title="回到今天"
      >
        {ResetIcon}
      </button>
      <div className="ctl-sep" />
      <div className="collision-view-switch" role="group" aria-label="观察视角">
        <button className={`ctl-toggle collision-touch${viewMode === 'sky' ? ' on' : ''}`} onClick={() => enterView('sky')}>
          地球天空
        </button>
        <button className={`ctl-toggle collision-touch${viewMode === 'cosmic' ? ' on' : ''}`} onClick={() => enterView('cosmic')}>
          宇宙全景
        </button>
        {futureUnlocked && (
          <button className={`ctl-toggle collision-touch collision-future-btn${future ? ' on' : ''}`} onClick={() => enterView('future')}>
            未来夜空
          </button>
        )}
      </div>
      <div className="ctl-sep collision-wide" />
      <div className="chapter-stage collision-wide">
        <b>{future ? '隐藏镜头 · 未来夜空' : stage.label}</b>
        <span className="mono">{future ? 'FUTURE NIGHT SKY' : stage.en}</span>
      </div>
      <div className="chapter-readouts mono collision-wide">
        <span>{future ? '集齐徽章解锁' : `${stage.time} · 模型推演`}</span>
        <span>{OUTCOME_META[outcome].label}</span>
      </div>
    </div>
  )

  const quiz = quizOpen && (
    <div className="hud collision-quiz panel" role="dialog" aria-modal="true" aria-labelledby="collision-quiz-title">
      <button className="collision-quiz-close" onClick={() => setQuizOpen(false)} aria-label="关闭问答">
        ×
      </button>
      <div className="collision-guide" aria-hidden>
        G
      </div>
      <div className="collision-kicker mono">小G的宇宙猜想</div>
      <div className="collision-quiz-title" id="collision-quiz-title">
        两个星系相遇，恒星会像碰碰车一样大量相撞吗？
      </div>
      <div className="collision-answers">
        {QUIZ_OPTIONS.map((option) => (
          <button
            key={option.id}
            className={`collision-answer${answer === option.id ? ' selected' : ''}`}
            onClick={() => setAnswer(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {answer && (
        <div className={`collision-result${answer === 'space' ? ' correct' : ''}`}>
          <b>{answer === 'space' ? '答对啦！' : '这个想法很自然，不过答案更神奇！'}</b>
          <span>星系里绝大部分都是空旷空间，恒星几乎都会彼此穿过；气体云却会挤压并点亮新恒星。</span>
          <button
            onClick={() => {
              setQuizOpen(false)
              setViewMode('cosmic')
              setPlaying(!reducedMotion)
            }}
          >
            继续引力之舞 →
          </button>
        </div>
      )}
    </div>
  )

  return (
    <ChapterShell
      ch={COLLISION_SHELL}
      backTo="/lab"
      backLabel="← 返回实验室"
      controls={controls}
      hint={viewMode === 'cosmic' ? undefined : '拖动时间轴 · 推进几十亿年'}
      overlay={
        <>
          <div className="hud collision-caption" aria-live="polite">
            <span className="collision-caption-time mono">{future ? '隐藏镜头 · HIDDEN VIEW' : stage.time}</span>
            <strong>{future ? '从未来的太阳系看，新星系铺满整个夜空' : stage.caption}</strong>
            <span>{future ? '集齐四枚徽章解锁的彩蛋——当然，这只是其中一种可能的未来。' : stage.detail}</span>
          </div>
          <div className="hud collision-actions">
            <button className="ctl-toggle collision-touch" onClick={() => setQuizOpen(true)}>
              猜猜会怎样？
            </button>
            <button
              className={`ctl-toggle collision-touch${benchOpen ? ' on' : ''}`}
              onClick={() => setBenchOpen(!benchOpen)}
            >
              实验台
            </button>
            <button
              className="ctl-toggle collision-touch"
              onClick={() => {
                setPlaying(false)
                setMachineOpen(true)
              }}
            >
              发射100个未来
            </button>
            <button
              className="ctl-toggle collision-touch"
              onClick={() => {
                setPlaying(false)
                setStarLabOpen(true)
              }}
            >
              点亮恒星
            </button>
            <button
              className={`ctl-toggle collision-touch${focusSun ? ' on' : ''}`}
              onClick={() => {
                setViewMode('cosmic')
                setFocusSun(!focusSun)
              }}
            >
              {focusSun ? '太阳命运仍不确定' : '寻找太阳'}
            </button>
          </div>
          {!quizOpen && (
            <GuideG
              line={guideLine}
              muted={guideMuted}
              onToggle={() => {
                const next = !guideMuted
                setGuideMuted(next)
                storageWrite('gc-guide-muted', next ? '1' : '0')
              }}
            />
          )}
          <BadgeTray
            earned={badges}
            open={badgePanelOpen}
            unlockedAll={futureUnlocked}
            onToggle={() => setBadgePanelOpen(!badgePanelOpen)}
          />
          {progress >= 0.98 && !certOpen && (
            <button
              className="hud collision-cert-cta"
              onClick={() => {
                setPlaying(false)
                setCertOpen(true)
              }}
            >
              领取我的未来证书 →
            </button>
          )}
          {quiz}
          {benchOpen && (
            <LabBench
              value={bench}
              applied={outcome}
              onChange={setBench}
              onApply={applyOutcome}
              onClose={() => setBenchOpen(false)}
            />
          )}
          {machineOpen && <PredictionMachine onClose={() => setMachineOpen(false)} />}
          {starLabOpen && (
            <StarLab
              onClose={() => setStarLabOpen(false)}
              onIgnite={(name) => {
                setClusterName(name)
                storageWrite('gc-cluster', name)
                earn('stars')
                setStarLabOpen(false)
                setViewMode('cosmic')
                apply(0.8)
                setPlaying(!reducedMotion)
              }}
            />
          )}
          {certOpen && (
            <Certificate
              outcome={outcome}
              clusterName={clusterName}
              savedName={galaxyName}
              onSaveName={(name) => {
                setGalaxyName(name)
                storageWrite('gc-name', name)
                flashEvent(`「${name}」写进了未来星图！`)
              }}
              onClose={() => setCertOpen(false)}
            />
          )}
          {future && <div className="collision-future-glow" aria-hidden />}
          {reducedMotion && <div className="hud collision-motion-note mono">已遵循系统设置：减少动态效果</div>}
        </>
      }
    >
      <Canvas
        camera={{ position: [0, 4, 18], fov: 52, near: 0.1, far: 1200 }}
        dpr={isCompact ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !isCompact, alpha: false, powerPreference: 'high-performance' }}
        fallback={<div className="collision-webgl-fallback">当前设备无法显示 3D 场景</div>}
      >
        <GalaxyCollisionScene
          progressRef={progressRef}
          viewMode={viewMode}
          count={isCompact ? 28000 : 80000}
          focusSun={focusSun}
          reducedMotion={reducedMotion}
          outcome={outcome}
        />
      </Canvas>
    </ChapterShell>
  )
}
