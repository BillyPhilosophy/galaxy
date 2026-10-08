import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import ChapterShell from '../../story/ChapterShell'
import GalaxyCollisionScene from './GalaxyCollisionScene'
import type { CollisionViewMode } from './GalaxyCollisionScene'
import { COLLISION_SHELL, stageAt } from './data'

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

/** 支持 ?t=0~1&view=cosmic 直接定位到某一幕，便于分享与调试 */
function initialProgress() {
  const raw = Number(new URLSearchParams(window.location.search).get('t'))
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0
}

export default function GalaxyCollisionChapter() {
  const [progress, setProgress] = useState(initialProgress)
  const [playing, setPlaying] = useState(false)
  const [viewMode, setViewMode] = useState<CollisionViewMode>(() =>
    new URLSearchParams(window.location.search).get('view') === 'cosmic' ? 'cosmic' : 'sky',
  )
  const [quizOpen, setQuizOpen] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [focusSun, setFocusSun] = useState(false)
  const [isCompact, setIsCompact] = useState(() => window.matchMedia('(max-width: 860px)').matches)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const quizSeen = useRef(false)
  const progressRef = useRef(progress)

  const apply = useCallback((value: number) => {
    const next = Math.min(1, Math.max(0, value))
    progressRef.current = next
    setProgress(next)
  }, [])

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

  const stage = stageAt(progress)
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
        <button
          className={`ctl-toggle collision-touch${viewMode === 'sky' ? ' on' : ''}`}
          onClick={() => {
            setViewMode('sky')
            setFocusSun(false)
          }}
        >
          地球天空
        </button>
        <button
          className={`ctl-toggle collision-touch${viewMode === 'cosmic' ? ' on' : ''}`}
          onClick={() => setViewMode('cosmic')}
        >
          宇宙全景
        </button>
      </div>
      <div className="ctl-sep collision-wide" />
      <div className="chapter-stage collision-wide">
        <b>{stage.label}</b>
        <span className="mono">{stage.en}</span>
      </div>
      <div className="chapter-readouts mono collision-wide">
        <span>{stage.time} · 模型推演</span>
        <span>合并并非确定发生</span>
      </div>
    </div>
  )

  const quiz = quizOpen && (
    <div className="hud collision-quiz panel" role="dialog" aria-modal="true" aria-labelledby="collision-quiz-title">
      <button className="collision-quiz-close" onClick={() => setQuizOpen(false)} aria-label="关闭问答">×</button>
      <div className="collision-guide" aria-hidden>G</div>
      <div className="collision-kicker mono">小G的宇宙猜想</div>
      <div className="collision-quiz-title" id="collision-quiz-title">两个星系相遇，恒星会像碰碰车一样大量相撞吗？</div>
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
      hint={viewMode === 'sky' ? '拖动时间轴 · 推进几十亿年' : undefined}
      overlay={
        <>
          <div className="hud collision-caption" aria-live="polite">
            <span className="collision-caption-time mono">{stage.time}</span>
            <strong>{stage.caption}</strong>
            <span>{stage.detail}</span>
          </div>
          <div className="hud collision-actions">
            <button className="ctl-toggle collision-touch" onClick={() => setQuizOpen(true)}>猜猜会怎样？</button>
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
          {quiz}
          {reducedMotion && (
            <div className="hud collision-motion-note mono">已遵循系统设置：减少动态效果</div>
          )}
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
        />
      </Canvas>
    </ChapterShell>
  )
}
