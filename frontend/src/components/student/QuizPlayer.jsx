'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Brain, Lightbulb, Code, MessageSquare, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Loader2, Clock, Target, Zap, Flame, Trophy,
  Bookmark, BookmarkCheck, List, FileText,
} from 'lucide-react'
import quizService from '@/services/quizService'
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

  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#6d28d9' : '#f59e0b'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff20" strokeWidth={12} />
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
        <span className="text-4xl font-extrabold text-white font-display leading-none">{display}%</span>
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
      tone === 'red' ? 'border-red-400/50 bg-red-500/10 animate-timerPulse'
        : tone === 'amber' ? 'border-amber-400/50 bg-amber-500/10'
        : 'border-purple-400/30 bg-purple-500/10'
    }`}>
      <div className="flex items-center gap-1.5">
        <Clock size={14} className={tone === 'red' ? 'text-red-300' : tone === 'amber' ? 'text-amber-300' : 'text-purple-300'} />
        <span className={`font-mono font-bold text-sm ${tone === 'red' ? 'text-red-300' : tone === 'amber' ? 'text-amber-300' : 'text-white'}`}>
          {mm}:{ss}
        </span>
      </div>
      <span className="text-[9px] text-white/40 uppercase tracking-wide">min left</span>
    </div>
  )
}

// ─── Decorative Hero Banner (pure CSS — no image asset needed) ───────────────
function HeroBanner() {
  return (
    <div className="h-28 rounded-2xl overflow-hidden relative bg-gradient-to-b from-indigo-950 via-purple-800 to-orange-300">
      <div
        className="absolute rounded-full"
        style={{
          width: 44, height: 44, right: 18, top: 12,
          background: 'radial-gradient(circle, #fef08a 0%, #fb923c 70%)',
          boxShadow: '0 0 36px 8px rgba(251,191,36,0.45)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-16 bg-purple-950/90"
        style={{ clipPath: 'polygon(0 100%, 0 55%, 14% 80%, 28% 35%, 44% 70%, 58% 25%, 74% 65%, 88% 40%, 100% 72%, 100% 100%)' }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-9 bg-purple-900/70"
        style={{ clipPath: 'polygon(0 100%, 0 65%, 20% 92%, 38% 50%, 58% 85%, 78% 42%, 100% 78%, 100% 100%)' }}
      />
    </div>
  )
}

// ─── Left Info Panel (persists across intro + playing) ───────────────────────
function InfoPanel({ quiz, phase, starting, onStart, answered, totalQ }) {
  const maxXp = (quiz.totalQuestions || 0) * 10 + 50
  return (
    <div className="hidden md:flex md:flex-col w-[320px] shrink-0 border-r border-white/10 overflow-y-auto p-5 space-y-5">
      <HeroBanner />

      <div>
        <p className="text-purple-300 text-xs font-bold uppercase tracking-wider">{TYPE_LABELS[quiz.type] || quiz.type}</p>
        <h2 className="text-white text-lg font-display font-bold mt-0.5">{quiz.title}</h2>
        {quiz.description && <p className="text-white/50 text-sm mt-1.5">{quiz.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: FileText, value: quiz.totalQuestions, label: 'Questions', bg: 'bg-purple-500/20', color: 'text-purple-300' },
          { icon: Clock, value: `${quiz.duration}m`, label: 'Duration', bg: 'bg-blue-500/20', color: 'text-blue-300' },
          { icon: Target, value: `${quiz.passingScore}%`, label: 'To Pass', bg: 'bg-green-500/20', color: 'text-green-300' },
          { icon: Zap, value: `+${maxXp}`, label: 'Max XP', bg: 'bg-amber-500/20', color: 'text-amber-300' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl p-2.5">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={15} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">{s.value}</p>
              <p className="text-white/40 text-[10px] leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">Rules</p>
        <div className="space-y-1.5">
          {[
            'Navigate between questions freely',
            'Answers save automatically as you go',
            'Auto-submits when timer reaches zero',
            `Pass mark: ${quiz.passingScore}%`,
            quiz.maxAttempts > 1 ? `Up to ${quiz.maxAttempts} attempts allowed (${quiz.attemptsUsed || 0} used)` : 'Single attempt only',
          ].map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
              <p className="text-xs text-white/70">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {phase === 'intro' ? (
        <button
          onClick={onStart}
          disabled={starting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-yellow-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {starting ? 'Starting…' : <>Start {quiz.type === 'MCQ' && quiz.maxAttempts === 1 ? 'Challenge' : 'Quiz'} <ChevronRight size={18} /></>}
        </button>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center">
          <p className="text-white font-bold text-sm">{answered} / {totalQ} answered</p>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 transition-all duration-300"
              style={{ width: `${totalQ ? (answered / totalQ) * 100 : 0}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
// `quiz` is the summary object from GET /student/quizzes (no questions embedded -
// questions are only ever revealed once `start()` is called, so no answer key can
// leak before the attempt begins).
export default function QuizPlayer({ quiz, onClose, onComplete }) {
  const [phase, setPhase] = useState('intro')   // intro | starting | playing | submitting | results
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

  const questions = attempt?.questions || []
  const totalQ = questions.length
  const totalTime = (attempt?.duration ?? quiz.duration) * 60
  const answered = Object.values(answers).filter(v => v?.length > 0).length

  useEffect(() => {
    quizService.getQuizAnalytics().then(r => setGameStats(r.data)).catch(() => {})
  }, [])

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
      setTimeLeft(Math.max(0, data.duration * 60 - elapsedSec))
      questionStartedAt.current = Date.now()
      setPhase('playing')
    } catch (err) {
      toast.error(err.message || 'Failed to start quiz')
    } finally {
      setStarting(false)
    }
  }

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

  // ── PHASE: SUBMITTING ─────────────────────────────────────────────────────────
  if (phase === 'submitting') return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-950 to-violet-950 z-50 flex flex-col items-center justify-center gap-4">
      <Loader2 size={40} className="text-purple-400 animate-spin" />
      <p className="text-white/70 font-medium">Evaluating your answers…</p>
    </div>
  )

  // ── PHASE: RESULTS ────────────────────────────────────────────────────────────
  if (phase === 'results' && result) {
    const scorePct = result.totalScore > 0 ? Math.round((result.score / result.totalScore) * 100) : 0
    const passed = scorePct >= quiz.passingScore
    const mins = Math.floor((result.timeTaken || 0) / 60)
    const secs = (result.timeTaken || 0) % 60

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950 to-violet-950 z-50 overflow-y-auto">
        <Confetti />
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fadeInUp">
          <div className="flex flex-col items-center mb-6">
            <ScoreRing pct={scorePct} size={160} />
            <p className="text-white/60 text-sm mt-3">{result.score} / {result.totalScore} points · {Math.round(result.accuracy)}% accuracy</p>
            <div className="mt-3">
              {passed ? (
                <span className="px-6 py-2 rounded-full bg-green-500/20 border border-green-400/40 text-green-300 font-bold text-sm">
                  PASSED ✓
                </span>
              ) : (
                <span className="px-6 py-2 rounded-full bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 font-bold text-sm">
                  NEEDS IMPROVEMENT
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: 'Correct', value: `✓ ${result.correctCount}`, color: 'text-green-400' },
              { label: 'Wrong', value: `✗ ${result.wrongCount}`, color: 'text-yellow-400' },
              { label: 'Skipped', value: result.skippedCount, color: 'text-white/60' },
              { label: 'Time', value: `${mins}m ${secs}s`, color: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-white/40 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Interview Simulation metrics — only for INTERVIEW_PREP quizzes */}
          {interviewResult && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3">Interview Readiness</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-extrabold text-white font-display">{Math.round(interviewResult.interviewReadiness)}%</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  {interviewResult.readinessLevel.replace('_', ' ')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Technical Knowledge', value: interviewResult.technicalKnowledge },
                  { label: 'Problem Solving', value: interviewResult.problemSolving },
                  { label: 'Accuracy', value: interviewResult.accuracy },
                  { label: 'Speed', value: interviewResult.speedScore },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/60">{m.label}</span>
                      <span className="text-xs text-white/80 font-semibold">{Math.round(m.value)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-400" style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer Review */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3">Answer Review</p>
            <div className="space-y-2">
              {result.review?.map((b, i) => (
                <div key={b.questionId} className={`rounded-xl border overflow-hidden ${b.correct ? 'border-green-500/20' : 'border-yellow-500/20'}`}>
                  <button
                    onClick={() => setReviewOpen(prev => ({ ...prev, [i]: !prev[i] }))}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 ${b.correct ? 'bg-green-900/20' : 'bg-yellow-900/20'}`}
                  >
                    {b.correct
                      ? <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                      : <AlertCircle size={16} className="text-yellow-400 flex-shrink-0" />
                    }
                    <span className="text-sm text-white/80 flex-1 text-left line-clamp-1">
                      Q{i + 1}. {b.questionText}
                    </span>
                    <span className={`text-xs font-bold ${b.correct ? 'text-green-400' : 'text-yellow-400'}`}>
                      {b.correct ? 'Correct' : 'Wrong'}
                    </span>
                    <ChevronRight size={14} className={`text-white/40 transition-transform ${reviewOpen[i] ? 'rotate-90' : ''}`} />
                  </button>
                  {reviewOpen[i] && (
                    <div className="px-4 py-3 space-y-2 border-t border-white/5">
                      {b.correctAnswers?.length > 0 && (
                        <div className="bg-green-900/20 border border-green-500/20 rounded-lg px-3 py-2">
                          <p className="text-xs text-green-400 font-semibold mb-0.5">Correct Answer</p>
                          <p className="text-sm text-white/80">{b.correctAnswers.join(', ')}</p>
                        </div>
                      )}
                      {!b.correct && b.yourAnswers?.length > 0 && (
                        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg px-3 py-2">
                          <p className="text-xs text-yellow-400 font-semibold mb-0.5">Your Answer</p>
                          <p className="text-sm text-white/80">{b.yourAnswers.join(', ')}</p>
                        </div>
                      )}
                      {b.explanation && (
                        <p className="text-xs text-white/50 italic">{b.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-white/20 text-white/70 font-semibold text-sm hover:bg-white/5 transition-colors"
          >
            ← Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  // ── PHASE: INTRO / PLAYING (persistent two-panel layout) ──────────────────────
  const q = questions[current]
  const sel = q ? (answers[q.id] || []) : []
  const isMulti = q && MULTI_SELECT_TYPES.includes(q.questionType)

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-950 to-violet-950 z-50 flex flex-col">
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors shrink-0">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{quiz.title}</p>
            {phase === 'playing' && <p className="text-white/40 text-xs">Question {current + 1} of {totalQ}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {gameStats && (
            <>
              <div className="hidden sm:flex items-center gap-1.5">
                <Flame size={16} className="text-orange-400" />
                <span className="text-white font-bold text-sm">{gameStats.currentStreak}</span>
                <span className="text-white/40 text-xs">Day Streak</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <Trophy size={16} className="text-yellow-400" />
                <span className="text-white font-bold text-sm">{gameStats.totalXp}</span>
                <span className="text-white/40 text-xs">XP Earned</span>
              </div>
            </>
          )}
          {phase === 'playing' && <TimerBadge timeLeft={timeLeft} />}
        </div>
      </div>

      {/* PROGRESS BAR */}
      {phase === 'playing' && (
        <div className="h-1 bg-white/10 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 transition-all duration-300"
            style={{ width: `${((current + 1) / totalQ) * 100}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <InfoPanel quiz={quiz} phase={phase} starting={starting} onStart={startQuiz} answered={answered} totalQ={totalQ} />

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {phase === 'intro' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center md:hidden">
              {/* Mobile fallback where the info panel is hidden */}
              <p className="text-white/60 text-sm max-w-xs">{quiz.description}</p>
              <button
                onClick={startQuiz}
                disabled={starting}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 font-bold disabled:opacity-60"
              >
                {starting ? 'Starting…' : 'Start Quiz →'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <div key={`${current}-${animDir}`} className="animate-quizSlideInRight px-6 py-5 max-w-2xl mx-auto">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 text-white/50 text-xs font-semibold">
                      <List size={14} />
                      <span>Question {current + 1} of {totalQ}</span>
                    </div>
                    <button onClick={() => toggleMarkForReview(q.id)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                        markedForReview.has(q.id)
                          ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                          : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                      }`}
                      title="Mark for review">
                      {markedForReview.has(q.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/30 text-purple-200 uppercase tracking-wider">
                      {q?.questionType?.replace('_', ' ')}
                    </span>
                    {q?.topicName && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/60 uppercase tracking-wider">
                        {q.topicName}
                      </span>
                    )}
                    {isMulti && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/30 text-indigo-200">
                        Select all that apply
                      </span>
                    )}
                  </div>

                  <h3 className="text-white font-bold text-lg leading-relaxed mb-5">{q?.questionText}</h3>

                  {q?.codeSnippet && (
                    <pre className="bg-gray-900/80 text-green-400 rounded-xl p-4 text-sm mb-5 font-mono overflow-x-auto border border-green-900/30 leading-relaxed">
                      {q.codeSnippet}
                    </pre>
                  )}

                  <div className="space-y-3 pb-4">
                    {q?.options?.map((opt, i) => {
                      const isSelected = sel.includes(opt.id)
                      return (
                        <button
                          key={opt.id}
                          onClick={() => selectAnswer(q, opt.id)}
                          className={`
                            w-full text-left rounded-2xl p-4 transition-all duration-200 border-2
                            flex items-center gap-4 group
                            ${isSelected
                              ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                            }
                          `}
                        >
                          <span className={`
                            w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all
                            ${isSelected ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60 group-hover:bg-white/20'}
                          `}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className={`font-medium text-sm leading-snug ${isSelected ? 'text-white' : 'text-white/75'}`}>
                            {opt.optionText}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* BOTTOM NAV */}
              <div className="border-t border-white/10 px-6 py-3.5 bg-purple-950/60 shrink-0">
                <div className="flex justify-center flex-wrap gap-1.5 mb-3">
                  {questions.map((question, i) => {
                    const done = (answers[question.id] || []).length > 0
                    const marked = markedForReview.has(question.id)
                    return (
                      <button
                        key={question.id}
                        onClick={() => goToQuestion(i)}
                        className={`relative w-8 h-8 rounded-full text-xs font-bold transition-all border ${
                          i === current
                            ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-purple-950 bg-purple-700 border-purple-500 text-white'
                            : done
                            ? 'bg-green-500/20 text-green-300 border-green-500/40'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}
                      >
                        {i + 1}
                        {marked && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-purple-950" />}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => goToQuestion(Math.max(0, current - 1))}
                    disabled={current === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/15 text-white/60 text-sm font-semibold hover:border-white/30 hover:text-white/80 transition-all disabled:opacity-30"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <div className="flex-1" />
                  {current < totalQ - 1 ? (
                    <button
                      onClick={() => goToQuestion(current + 1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700/60 border border-purple-500/30 text-white text-sm font-semibold hover:bg-purple-700/80 transition-all"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-yellow-400/20"
                    >
                      Submit ({answered}/{totalQ} answered)
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
