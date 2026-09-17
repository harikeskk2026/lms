'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Brain, Lightbulb, Code, MessageSquare, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Loader2, Clock, Target, Zap, Flame, Trophy,
  Bookmark, BookmarkCheck, List, FileText, Info,
} from 'lucide-react'
import { format } from 'date-fns'
import quizService from '@/services/quizService'
import { getApiBaseUrl } from '@/lib/api'
import tokenStorage from '@/utilities/tokenStorage'
import toast from 'react-hot-toast'

// ─── Type Icons ───────────────────────────────────────────────────────────────
const TYPE_ICONS = {
  MCQ:            Brain,
  APTITUDE:       Lightbulb,
  CODING:         Code,
  INTERVIEW_PREP: MessageSquare,
}
const TYPE_COLORS = {
  MCQ:            'from-purple-600 to-violet-700',
  APTITUDE:       'from-blue-600 to-cyan-600',
  CODING:         'from-green-600 to-emerald-600',
  INTERVIEW_PREP: 'from-yellow-500 to-amber-500',
}
const TYPE_LABELS = {
  MCQ:            'MCQ',
  APTITUDE:       'Aptitude',
  CODING:         'Coding',
  INTERVIEW_PREP: 'Interview Prep',
}
const DIFFICULTY_PILL_STYLES = {
  EASY:   'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HARD:   'bg-red-100 text-red-700',
}
const MULTI_SELECT_TYPES = ['MULTIPLE_CORRECT']

// ─── Celebration Particles ─────────────────────────────────────────────────
const PARTICLE_COLORS = [
  '#6d28d9','#ffd668','#10b981','#3b82f6','#f59e0b',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316',
  '#6d28d9','#ffd668','#10b981','#3b82f6','#f59e0b',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316',
]

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {PARTICLE_COLORS.map((color, i) => (
        <div
          key={i}
          className={`absolute bottom-0 w-3 h-3 rounded-sm animate-float-${i + 1}`}
          style={{
            backgroundColor: color,
            left: `${5 + (i * 4.5) % 90}%`,
            borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
          }}
        />
      ))}
    </div>
  )
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ pct, size = 160 }) {
  const [display, setDisplay] = useState(0)
  const r = (size - 20) / 2
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)

  useEffect(() => {
    let start = 0
    const step = pct / 60
    const iv = setInterval(() => {
      start = Math.min(start + step, pct)
      setDisplay(Math.round(start))
      setOffset(circ - (start / 100) * circ)
      if (start >= pct) clearInterval(iv)
    }, 20)
    return () => clearInterval(iv)
  }, [pct, circ])

  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#7c3aed' : '#f59e0b'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ede9fe" strokeWidth={12} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={12}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-gray-800 font-display leading-none">{display}%</span>
      </div>
    </div>
  )
}

// ─── Timer Badge ────────────────────────────────────────────────────────────
function TimerBadge({ timeLeft }) {
  const isDanger = timeLeft < 30
  const isWarning = timeLeft < 120
  const mm = String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, '0')
  const ss = String(Math.max(0, timeLeft) % 60).padStart(2, '0')
  const tone = isDanger ? 'red' : isWarning ? 'amber' : 'purple'

  return (
    <div className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-2xl border ${
      tone === 'red' ? 'border-red-300 bg-red-50 animate-timerPulse'
        : tone === 'amber' ? 'border-amber-300 bg-amber-50'
        : 'border-purple-200 bg-purple-50'
    }`}>
      <div className="flex items-center gap-1.5">
        <Clock size={14} className={tone === 'red' ? 'text-red-500' : tone === 'amber' ? 'text-amber-500' : 'text-purple-500'} />
        <span className={`font-mono font-bold text-sm ${tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-gray-800'}`}>
          {mm}:{ss}
        </span>
      </div>
      <span className="text-[9px] text-gray-400 uppercase tracking-wide">min left</span>
    </div>
  )
}

// ─── Decorative Hero Banner (pure CSS — no image asset needed) ───────────────
function HeroBanner() {
  return (
    <div className="h-28 rounded-2xl overflow-hidden relative bg-gradient-to-b from-violet-200 via-purple-300 to-orange-200">
      <div
        className="absolute rounded-full"
        style={{
          width: 44, height: 44, right: 18, top: 12,
          background: 'radial-gradient(circle, #fef08a 0%, #fb923c 70%)',
          boxShadow: '0 0 36px 8px rgba(251,191,36,0.45)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-16 bg-purple-900/80"
        style={{ clipPath: 'polygon(0 100%, 0 55%, 14% 80%, 28% 35%, 44% 70%, 58% 25%, 74% 65%, 88% 40%, 100% 72%, 100% 100%)' }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-9 bg-purple-800/60"
        style={{ clipPath: 'polygon(0 100%, 0 65%, 20% 92%, 38% 50%, 58% 85%, 78% 42%, 100% 78%, 100% 100%)' }}
      />
    </div>
  )
}

// ─── Quiz Details (intro only) — two-column layout: quiz info + Start
// Challenge on the left, Rules and Quiz Information as separate cards on the
// right ────────────────────────────────────────────────────────────────────
const EFFECTIVE_STATUS_LABELS = { LIVE: 'Live', SCHEDULED: 'Scheduled', COMPLETED: 'Closed', ARCHIVED: 'Archived' }
const EFFECTIVE_STATUS_PILL_STYLES = {
  LIVE:      'bg-green-100 text-green-700',
  SCHEDULED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-gray-200 text-gray-600',
  ARCHIVED:  'bg-gray-200 text-gray-600',
}

function InfoPanel({ quiz, starting, onStart }) {
  // 10 XP for completing + up to 20 performance XP at 90-100% (see GamificationServiceImpl.xpFor)
  const maxXp = 30
  const attemptsExhausted = quiz.attemptsUsed >= quiz.maxAttempts
  const quizClosed = quiz.effectiveStatus === 'COMPLETED'
  const quizNotOpen = quiz.effectiveStatus === 'SCHEDULED'
  const startBlocked = attemptsExhausted || quizClosed || quizNotOpen
  const rules = [
    'Navigate between questions freely',
    'Answers save automatically as you go',
    'Auto-submits when timer reaches zero',
    `Pass mark: ${quiz.passingScore}%`,
    quiz.maxAttempts > 1 ? `Up to ${quiz.maxAttempts} attempts allowed (${quiz.attemptsUsed || 0} used)` : 'Single attempt only',
    quiz.resultVisibility === 'MANUAL'
      ? 'Result will be released by your instructor after review'
      : quiz.resultVisibility === 'AFTER_CLOSE'
        ? 'Result will be available once the quiz closes'
        : 'Result shown immediately after submitting',
  ]
  const statTiles = [
    { icon: FileText, value: quiz.totalQuestions, label: 'Questions', bg: 'bg-purple-100', color: 'text-purple-600' },
    { icon: Clock, value: `${quiz.duration}m`, label: 'Duration', bg: 'bg-blue-100', color: 'text-blue-600' },
    { icon: Target, value: `${quiz.passingScore}%`, label: 'Pass Mark', bg: 'bg-green-100', color: 'text-green-600' },
    { icon: Zap, value: `+${maxXp}`, label: 'Max XP', bg: 'bg-amber-100', color: 'text-amber-600' },
  ]
  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : null

  return (
    <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
      {/* LEFT: quiz details + Start Challenge */}
      <div className="bg-white/80 border border-purple-100 rounded-3xl shadow-xl shadow-purple-500/10 p-5 sm:p-6 space-y-5">
        <HeroBanner />

        <div>
          <p className="text-purple-600 text-xs font-bold uppercase tracking-wider">{TYPE_LABELS[quiz.type] || quiz.type}</p>
          <h2 className="text-gray-800 text-lg font-display font-bold mt-0.5">{quiz.title}</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {statTiles.map(s => (
            <div key={s.label} className="flex items-center gap-2.5 bg-white border border-purple-100 rounded-xl p-2.5 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon size={15} className={s.color} />
              </div>
              <div className="min-w-0">
                <p className="text-gray-800 font-bold text-sm leading-tight break-words">{s.value}</p>
                <p className="text-gray-400 text-[10px] leading-tight">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {quiz.description && (
          <div>
            <p className="text-sm font-bold text-gray-800 mb-1">About This Quiz</p>
            <p className="text-gray-500 text-sm leading-relaxed">{quiz.description}</p>
          </div>
        )}

        {(quiz.createdAt || quiz.updatedAt) && (
          <div className="flex items-center gap-8 pt-3 border-t border-purple-50">
            {quiz.createdAt && (
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Created On</p>
                <p className="text-xs text-gray-600 font-semibold mt-0.5">{formatDate(quiz.createdAt)}</p>
              </div>
            )}
            {quiz.updatedAt && (
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Last Updated</p>
                <p className="text-xs text-gray-600 font-semibold mt-0.5">{formatDate(quiz.updatedAt)}</p>
              </div>
            )}
          </div>
        )}

        {startBlocked ? (
          <button
            disabled
            className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed flex items-center justify-center gap-2"
          >
            {quizClosed ? 'Quiz Closed' : quizNotOpen ? 'Not Open Yet' : 'Max Attempts Reached'}
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={starting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold hover:from-purple-700 hover:to-violet-700 active:scale-[0.98] transition-all shadow-xl shadow-purple-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {starting ? 'Starting…' : <>Start {quiz.type === 'MCQ' && quiz.maxAttempts === 1 ? 'Challenge' : 'Quiz'} <ChevronRight size={18} /></>}
          </button>
        )}
      </div>

      {/* RIGHT: Rules + Quiz Information cards */}
      <div className="space-y-5">
        <div className="bg-white/80 border border-purple-100 rounded-3xl shadow-sm p-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <FileText size={15} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Rules</p>
              <p className="text-[11px] text-gray-400">Please read the following rules before starting the quiz.</p>
            </div>
          </div>
          <div className="space-y-1.5 pl-1">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                <p className="text-xs text-gray-500">{rule}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/80 border border-purple-100 rounded-3xl shadow-sm p-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Info size={15} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Quiz Information</p>
              <p className="text-[11px] text-gray-400">Key details about this quiz.</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            {[
              ['Quiz Type', TYPE_LABELS[quiz.type] || quiz.type],
              ['Total Questions', quiz.totalQuestions],
              ['Duration', `${quiz.duration} minutes`],
              ['Pass Mark', `${quiz.passingScore}%`],
              ['Maximum XP', `+${maxXp}`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-gray-400 shrink-0">{label}</span>
                <span className="text-gray-700 font-semibold text-right">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400 shrink-0">Status</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${EFFECTIVE_STATUS_PILL_STYLES[quiz.effectiveStatus] || EFFECTIVE_STATUS_PILL_STYLES.LIVE}`}>
                {EFFECTIVE_STATUS_LABELS[quiz.effectiveStatus] || 'Live'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Right Quiz Stats Sidebar (playing only) ───────────────────────────────
function QuizStatsSidebar({ answered, totalQ, xp }) {
  const pct = totalQ ? Math.round((answered / totalQ) * 100) : 0
  return (
    <div className="hidden lg:flex lg:flex-col w-[260px] shrink-0 border-l border-purple-100 bg-white/60 overflow-y-auto p-5 space-y-3">
      <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Quiz Stats</p>

      <div className="bg-white border border-purple-100 rounded-2xl p-4 text-center shadow-sm">
        <Trophy size={18} className="text-amber-500 mx-auto mb-1.5" />
        <p className="text-lg font-extrabold text-gray-800 font-display">{xp ?? '—'}</p>
        <p className="text-[10px] text-gray-400 uppercase font-semibold mt-0.5">XP Earned</p>
      </div>

      <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-600">Progress</span>
          <span className="text-xs font-bold text-purple-600">{pct}%</span>
        </div>
        <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">{answered} of {totalQ} answered</p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
// `quiz` is the summary object from GET /student/quizzes (no questions embedded -
// questions are only ever revealed once `start()` is called, so no answer key can
// leak before the attempt begins).
export default function QuizPlayer({ quiz, onClose, onComplete, viewResultAttemptId }) {
  const [phase, setPhase] = useState(viewResultAttemptId ? 'loadingResult' : 'intro')   // loadingResult | intro | starting | playing | submitting | results
  const [attempt, setAttempt] = useState(null)  // StartAttemptResponse
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})    // { [questionId]: number[] }
  const [markedForReview, setMarkedForReview] = useState(() => new Set())
  const [timeLeft, setTimeLeft] = useState(quiz.duration * 60)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [gameStats, setGameStats] = useState(null)
  const questionStartedAt = useRef(Date.now())
  const [animDir, setAnimDir] = useState('right')
  const [reviewOpen, setReviewOpen] = useState({})
  const [interviewResult, setInterviewResult] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const questions = attempt?.questions || []
  const totalQ = questions.length
  const totalTime = (attempt?.duration ?? quiz.duration) * 60
  const answered = Object.values(answers).filter(v => v?.length > 0).length

  useEffect(() => {
    quizService.getQuizAnalytics().then(r => setGameStats(r.data)).catch(() => {})
  }, [])

  // "View Result" entry point (from an already-submitted quiz's card) - skips
  // start/playing entirely and jumps straight to the results phase, reusing the
  // exact same resultsPending gating the just-submitted screen already has.
  useEffect(() => {
    if (!viewResultAttemptId) return
    quizService.getAttempt(viewResultAttemptId)
      .then(r => { setResult(r.data); setPhase('results') })
      .catch(err => {
        toast.error(err.message || 'Failed to load result')
        onClose?.()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewResultAttemptId])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); handleSubmit(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const startQuiz = async () => {
    setStarting(true)
    try {
      const res = await quizService.startQuiz(quiz.id)
      const data = res.data
      setAttempt(data)
      const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000))
      const remainingSec = data.duration * 60 - elapsedSec
      if (remainingSec <= 0) {
        toast.error('Quiz attempt time expired.')
        onComplete?.()
        return
      }
      setTimeLeft(remainingSec)
      questionStartedAt.current = Date.now()
      setPhase('playing')
    } catch (err) {
      toast.error(err.message || 'Failed to start quiz')
    } finally {
      setStarting(false)
    }
  }

  // The attempt is consumed the moment it's started and can never be resumed -
  // so leaving mid-quiz (for any reason) must close it out as abandoned rather
  // than just walking away and leaving it silently IN_PROGRESS forever.
  const exitQuiz = () => {
    if (attempt && phase === 'playing') {
      setShowExitConfirm(true)
      return
    }
    onClose?.()
  }

  const confirmExit = () => {
    setShowExitConfirm(false)
    quizService.abandonAttempt(attempt.attemptId).catch(() => {})
    // Refreshes the quiz list's attemptsUsed/max-attempts-reached state right
    // away, so re-opening this same quiz can't land back on a stale intro
    // screen that still thinks a fresh attempt is available.
    onComplete?.()
    onClose?.()
  }

  // Covers the case the explicit exit button can't: closing the tab/browser
  // outright. A normal axios call can be torn down mid-flight when the page
  // unloads, so this uses a raw keepalive fetch instead, which is specifically
  // designed to survive that.
  useEffect(() => {
    if (phase !== 'playing' || !attempt) return
    const handleUnload = () => {
      try {
        const token = tokenStorage.getToken()
        fetch(`${getApiBaseUrl()}/student/quiz-attempts/${attempt.attemptId}/abandon`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          keepalive: true,
        })
      } catch { /* best effort */ }
    }
    window.addEventListener('pagehide', handleUnload)
    return () => window.removeEventListener('pagehide', handleUnload)
  }, [phase, attempt])

  const handleSubmit = useCallback(async () => {
    if (submitting || !attempt) return
    setSubmitting(true)
    setPhase('submitting')
    try {
      const res = await quizService.submitAttempt(attempt.attemptId)
      setResult(res.data)
      setPhase('results')
      onComplete?.()
      if (quiz.type === 'INTERVIEW_PREP') {
        quizService.getInterviewSimulation(attempt.attemptId).then(r => setInterviewResult(r.data)).catch(() => {})
      }
    } catch (e) {
      toast.error(e.message || 'Failed to submit quiz')
      setPhase('playing')
    } finally {
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, submitting, onComplete])

  const saveAnswer = (questionId, selectedOptionIds) => {
    const timeTaken = Math.round((Date.now() - questionStartedAt.current) / 1000)
    quizService.saveAnswer(attempt.attemptId, { questionId, selectedOptionIds, timeTaken }).catch(() => {})
  }

  const selectAnswer = (question, optionId) => {
    const isMulti = MULTI_SELECT_TYPES.includes(question.questionType)
    setAnswers(prev => {
      const current = prev[question.id] || []
      let next
      if (isMulti) {
        next = current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId]
      } else {
        next = [optionId]
      }
      saveAnswer(question.id, next)
      return { ...prev, [question.id]: next }
    })
  }

  // FREE_TEXT questions (Short Answer/Coding/SQL) — debounced so a code editor's
  // per-keystroke onChange doesn't fire a network request on every character.
  const textSaveTimers = useRef({})

  const saveTextAnswer = (questionId, text) => {
    const timeTaken = Math.round((Date.now() - questionStartedAt.current) / 1000)
    quizService.saveAnswer(attempt.attemptId, { questionId, answerText: text, timeTaken }).catch(() => {})
  }

  const selectTextAnswer = (question, text) => {
    setAnswers(prev => ({ ...prev, [question.id]: text }))
    clearTimeout(textSaveTimers.current[question.id])
    textSaveTimers.current[question.id] = setTimeout(() => saveTextAnswer(question.id, text), 600)
  }

  const goToQuestion = (idx) => {
    setAnimDir(idx > current ? 'right' : 'left')
    setCurrent(idx)
    questionStartedAt.current = Date.now()
  }

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview(prev => {
      const next = new Set(prev)
      next.has(questionId) ? next.delete(questionId) : next.add(questionId)
      return next
    })
  }

  // ── PHASE: LOADING RESULT (viewResultAttemptId entry point) ─────────────────
  if (phase === 'loadingResult') return createPortal(
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 z-50 flex flex-col items-center justify-center gap-4">
      <Loader2 size={40} className="text-purple-500 animate-spin" />
      <p className="text-gray-500 font-medium">Loading your result…</p>
    </div>,
    document.body
  )

  // ── PHASE: SUBMITTING ─────────────────────────────────────────────────────────
  // Rendered via a portal straight onto <body> — not just fixed/z-50 — so this
  // full-screen takeover can never be partially covered by the dashboard's own
  // header/sidebar, regardless of any stacking-context quirk in that ancestor tree.
  if (phase === 'submitting') return createPortal(
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 z-50 flex flex-col items-center justify-center gap-4">
      <Loader2 size={40} className="text-purple-500 animate-spin" />
      <p className="text-gray-500 font-medium">Evaluating your answers…</p>
    </div>,
    document.body
  )

  // ── PHASE: RESULTS ────────────────────────────────────────────────────────────
  // When the quiz's result-visibility rule hasn't released this attempt yet, the
  // backend nulls out every scoring field on `result` (see QuizResultResponse) -
  // so this branch must render before anything below touches result.score/etc.
  if (phase === 'results' && result?.resultsPending) {
    const isManual = quiz.resultVisibility === 'MANUAL'
    return createPortal(
      <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 z-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-purple-100 rounded-3xl shadow-xl p-8 text-center space-y-4 animate-fadeInUp">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center">
            <Clock size={28} />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-xl text-gray-900">Quiz Submitted!</h3>
            <p className="text-sm text-gray-500 mt-2">
              {isManual
                ? 'Result not released yet. Your instructor will release it soon.'
                : 'Your result will be available once the quiz closes.'}
            </p>
            {!isManual && quiz.scheduledEnd && (
              <p className="text-xs text-gray-400 mt-2">
                Quiz closes on {format(new Date(quiz.scheduledEnd), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold hover:from-purple-700 hover:to-violet-700 active:scale-[0.98] transition-all"
          >
            Back to Quizzes
          </button>
        </div>
      </div>,
      document.body
    )
  }

  if (phase === 'results' && result) {
    const scorePct = result.totalScore > 0 ? Math.round((result.score / result.totalScore) * 100) : 0
    const passed = scorePct >= quiz.passingScore
    const mins = Math.floor((result.timeTaken || 0) / 60)
    const secs = (result.timeTaken || 0) % 60

    return createPortal(
      <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 z-50 overflow-y-auto">
        <Confetti />
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 animate-fadeInUp">
          <div className="flex flex-col items-center mb-6">
            <ScoreRing pct={scorePct} size={160} />
            <p className="text-gray-500 text-sm mt-3">{result.score} / {result.totalScore} points · {Math.round(result.accuracy)}% accuracy</p>
            <div className="mt-3">
              {passed ? (
                <span className="px-6 py-2 rounded-full bg-green-100 border border-green-300 text-green-700 font-bold text-sm">
                  PASSED ✓
                </span>
              ) : (
                <span className="px-6 py-2 rounded-full bg-amber-100 border border-amber-300 text-amber-700 font-bold text-sm">
                  NEEDS IMPROVEMENT
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {[
              { label: 'Correct', value: `✓ ${result.correctCount}`, color: 'text-green-600' },
              { label: 'Wrong', value: `✗ ${result.wrongCount}`, color: 'text-amber-600' },
              { label: 'Skipped', value: result.skippedCount, color: 'text-gray-500' },
              { label: 'Time', value: `${mins}m ${secs}s`, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-purple-100 rounded-xl p-3 text-center shadow-sm">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Interview Simulation metrics — only for INTERVIEW_PREP quizzes */}
          {interviewResult && (
            <div className="bg-white border border-purple-100 rounded-2xl p-4 mb-6 shadow-sm">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">Interview Readiness</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-extrabold text-gray-800 font-display">{Math.round(interviewResult.interviewReadiness)}%</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  {interviewResult.readinessLevel.replace('_', ' ')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Technical Knowledge', value: interviewResult.technicalKnowledge },
                  { label: 'Problem Solving', value: interviewResult.problemSolving },
                  { label: 'Accuracy', value: interviewResult.accuracy },
                  { label: 'Speed', value: interviewResult.speedScore },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{m.label}</span>
                      <span className="text-xs text-gray-700 font-semibold">{Math.round(m.value)}%</span>
                    </div>
                    <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer Review */}
          <div className="bg-white border border-purple-100 rounded-2xl p-4 mb-6 shadow-sm">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">Answer Review</p>
            <div className="space-y-2">
              {result.review?.map((b, i) => {
                const ungraded = b.correct === null || b.correct === undefined
                // Defensive: only ever true for a historical FREE_TEXT SQL row
                // created while Coding/SQL free-text authoring briefly existed.
                const isCodeAnswer = b.questionType === 'SQL'
                return (
                  <div key={b.questionId} className={`rounded-xl border overflow-hidden ${
                    ungraded ? 'border-gray-200' : b.correct ? 'border-green-200' : 'border-amber-200'
                  }`}>
                    <button
                      onClick={() => setReviewOpen(prev => ({ ...prev, [i]: !prev[i] }))}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
                        ungraded ? 'bg-gray-50' : b.correct ? 'bg-green-50' : 'bg-amber-50'
                      }`}
                    >
                      {ungraded
                        ? <FileText size={16} className="text-gray-400 flex-shrink-0" />
                        : b.correct
                          ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                          : <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                      }
                      <span className="text-sm text-gray-700 flex-1 text-left line-clamp-1">
                        Q{i + 1}. {b.questionText}
                      </span>
                      <span className={`text-xs font-bold ${ungraded ? 'text-gray-400' : b.correct ? 'text-green-600' : 'text-amber-600'}`}>
                        {ungraded ? 'Not graded' : b.correct ? 'Correct' : 'Wrong'}
                      </span>
                      <ChevronRight size={14} className={`text-gray-400 transition-transform ${reviewOpen[i] ? 'rotate-90' : ''}`} />
                    </button>
                    {reviewOpen[i] && (
                      <div className="px-4 py-3 space-y-2 border-t border-gray-100">
                        {b.correctAnswers?.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <p className="text-xs text-green-600 font-semibold mb-0.5">Correct Answer</p>
                            <p className="text-sm text-gray-700">{b.correctAnswers.join(', ')}</p>
                          </div>
                        )}
                        {(ungraded || !b.correct) && b.yourAnswers?.length > 0 && (
                          <div className={`rounded-lg px-3 py-2 border ${ungraded ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
                            <p className={`text-xs font-semibold mb-0.5 ${ungraded ? 'text-gray-500' : 'text-amber-600'}`}>
                              {ungraded ? 'Your Submission (not auto-graded)' : 'Your Answer'}
                            </p>
                            {isCodeAnswer ? (
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{b.yourAnswers.join('\n')}</pre>
                            ) : (
                              <p className="text-sm text-gray-700">{b.yourAnswers.join(', ')}</p>
                            )}
                          </div>
                        )}
                        {b.explanation && (
                          <p className="text-xs text-gray-400 italic">{b.explanation}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-purple-200 text-gray-600 font-semibold text-sm hover:bg-purple-50 transition-colors"
          >
            ← Back to Quizzes
          </button>
        </div>
      </div>,
      document.body
    )
  }

  // ── PHASE: INTRO / PLAYING ──────────────────────────────────────────────────
  const q = questions[current]
  const isFreeText = q?.answerMode === 'FREE_TEXT'
  const sel = q ? (answers[q.id] ?? (isFreeText ? '' : [])) : []
  const isMulti = q && MULTI_SELECT_TYPES.includes(q.questionType)
  const progressPct = totalQ ? Math.round(((current + 1) / totalQ) * 100) : 0

  return createPortal(
    <>
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 z-50 flex flex-col">
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-purple-100 bg-white/70 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={exitQuiz} className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 hover:bg-purple-100 transition-colors shrink-0">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            {phase === 'intro' ? (
              <>
                <p className="text-gray-400 text-[11px] font-semibold">
                  Quizzes <span className="mx-1">›</span> <span className="text-gray-600">{quiz.title}</span>
                </p>
                <p className="text-gray-900 font-display font-extrabold text-lg break-words mt-0.5">{quiz.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  View quiz details, rules and questions. Click Start {quiz.type === 'MCQ' && quiz.maxAttempts === 1 ? 'Challenge' : 'Quiz'} to begin.
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-800 font-bold text-sm break-words">{quiz.title}</p>
                {phase === 'playing' && <p className="text-gray-400 text-xs">Question {current + 1} of {totalQ} · {progressPct}% Complete</p>}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {gameStats && (
            <>
              <div className="hidden sm:flex items-center gap-1.5">
                <Flame size={16} className="text-orange-500" />
                <span className="text-gray-800 font-bold text-sm">{gameStats.currentStreak}</span>
                <span className="text-gray-400 text-xs">Day Streak</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <Trophy size={16} className="text-amber-500" />
                <span className="text-gray-800 font-bold text-sm">{gameStats.totalXp}</span>
                <span className="text-gray-400 text-xs">XP Earned</span>
              </div>
            </>
          )}
          {phase === 'playing' && <TimerBadge timeLeft={timeLeft} />}
        </div>
      </div>

      {/* PROGRESS BAR */}
      {phase === 'playing' && (
        <div className="h-1.5 bg-purple-100 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {phase === 'intro' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <InfoPanel quiz={quiz} starting={starting} onStart={startQuiz} />
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div key={`${current}-${animDir}`} className="animate-quizSlideInRight px-3 py-3 sm:px-6 sm:py-5 max-w-2xl mx-auto">
                  <div className="bg-white border border-purple-100 rounded-3xl shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold">
                        <List size={14} />
                        <span>Question {current + 1} of {totalQ}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {q?.difficulty && (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${DIFFICULTY_PILL_STYLES[q.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                            {q.difficulty}
                          </span>
                        )}
                        <button onClick={() => toggleMarkForReview(q.id)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                            markedForReview.has(q.id)
                              ? 'bg-amber-100 border-amber-300 text-amber-600'
                              : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'
                          }`}
                          title="Mark for review">
                          {markedForReview.has(q.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-4">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wider">
                        {q?.questionType?.replace('_', ' ')}
                      </span>
                      {q?.topicName && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wider">
                          {q.topicName}
                        </span>
                      )}
                      {isMulti && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                          Select all that apply
                        </span>
                      )}
                    </div>

                    <h3 className="text-gray-800 font-bold text-lg leading-relaxed mb-5">{q?.questionText}</h3>

                    {q?.codeSnippet && (
                      <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-sm mb-5 font-mono overflow-x-auto border border-gray-800 leading-relaxed">
                        {q.codeSnippet}
                      </pre>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                      {isFreeText && q?.questionType === 'SHORT_ANSWER' && (
                        <input
                          type="text"
                          value={typeof sel === 'string' ? sel : ''}
                          onChange={(e) => selectTextAnswer(q, e.target.value)}
                          placeholder="Type your answer..."
                          className="sm:col-span-2 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-800 placeholder-gray-400 outline-none focus:border-purple-400 focus:bg-white transition-colors"
                        />
                      )}
                      {!isFreeText && q?.options?.map((opt, i) => {
                        const isSelected = sel.includes(opt.id)
                        return (
                          <button
                            key={opt.id}
                            onClick={() => selectAnswer(q, opt.id)}
                            className={`
                              w-full text-left rounded-2xl p-3 sm:p-4 transition-all duration-200 border-2
                              flex items-center gap-3 sm:gap-4 group
                              ${isSelected
                                ? 'border-purple-500 bg-purple-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/40'
                              }
                            `}
                          >
                             <span className={`
                              w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all
                              ${isSelected ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-400 group-hover:bg-purple-100'}
                            `}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className={`font-medium text-sm leading-snug ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                              {opt.optionText}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM NAV */}
              <div className="border-t border-purple-100 px-3 py-3 sm:px-6 sm:py-3.5 bg-white/70 backdrop-blur-sm shrink-0">
                <div className="flex justify-center flex-wrap gap-1.5 mb-3">
                  {questions.map((question, i) => {
                    const done = (answers[question.id] || []).length > 0
                    const marked = markedForReview.has(question.id)
                    return (
                      <button
                        key={question.id}
                        onClick={() => goToQuestion(i)}
                        className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[10px] sm:text-xs font-bold transition-all border ${
                          i === current
                            ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-white bg-purple-600 border-purple-500 text-white'
                            : done
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}
                      >
                        {i + 1}
                        {marked && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => goToQuestion(Math.max(0, current - 1))}
                    disabled={current === 0}
                    className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs sm:text-sm font-semibold hover:border-purple-300 hover:text-gray-700 transition-all disabled:opacity-30"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <div className="flex-1" />
                  {current < totalQ - 1 ? (
                    <button
                      onClick={() => goToQuestion(current + 1)}
                      className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 text-xs sm:text-sm font-semibold hover:bg-purple-200 transition-all"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold text-xs sm:text-sm hover:from-purple-700 hover:to-violet-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-purple-400/20"
                    >
                      Submit ({answered}/{totalQ} answered)
                    </button>
                  )}
                </div>
              </div>
            </div>

            <QuizStatsSidebar answered={answered} totalQ={totalQ} xp={gameStats?.totalXp} />
          </>
        )}
      </div>
    </div>
    {showExitConfirm && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center border border-purple-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display font-bold text-lg text-gray-900">Exit this quiz?</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Exiting now will end this attempt and count it as used — you will not be able to resume it.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowExitConfirm(false)}
              className="w-1/2 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmExit}
              className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold text-xs shadow-md shadow-red-500/20 transition-all"
            >
              Exit Quiz
            </button>
          </div>
        </div>
      </div>
    )}
    </>,
    document.body
  )
}
