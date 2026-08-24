'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Brain, Lightbulb, Code, MessageSquare, ChevronLeft, ChevronRight,
  Clock, CheckCircle, AlertCircle, Trophy, X, Loader2, BarChart3
} from 'lucide-react'
import { studentApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

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
    // Count up animation
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

// ─── Timer Ring ───────────────────────────────────────────────────────────────
function TimerRing({ timeLeft, totalTime }) {
  const size = 64
  const r = 26
  const circ = 2 * Math.PI * r
  const pct = totalTime > 0 ? timeLeft / totalTime : 0
  const offset = circ - pct * circ
  const isWarning = timeLeft < 120
  const isDanger = timeLeft < 30
  const color = isDanger ? '#f59e0b' : isWarning ? '#ffd668' : '#a78bfa'

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')

  return (
    <div className={`relative flex items-center justify-center ${isDanger ? 'animate-timerPulse' : ''}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff20" strokeWidth={5} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-bold font-mono ${isDanger ? 'text-amber-300' : isWarning ? 'text-yellow-200' : 'text-white'}`}>
          {mm}:{ss}
        </span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QuizPlayer({ quiz, onClose, onComplete }) {
  const router = useRouter()
  const [phase, setPhase] = useState('intro')   // intro | playing | submitting | results
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(quiz.duration * 60)
  const totalTime = quiz.duration * 60
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const startedAt = useRef(Date.now())
  const [animDir, setAnimDir] = useState('right')
  const [reviewOpen, setReviewOpen] = useState({})

  const questions = quiz.questions || []
  const totalQ = questions.length
  const answered = Object.values(answers).filter(v => v !== undefined && v !== null).length

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
  }, [phase])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    setPhase('submitting')
    const timeTaken = Math.round((Date.now() - startedAt.current) / 1000)
    try {
      const res = await studentApi.submitQuiz(quiz.id, { answers, timeTaken })
      setResult(res.data.data)
      setPhase('results')
      onComplete?.()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to submit quiz')
      setPhase('playing')
    } finally {
      setSubmitting(false)
    }
  }, [answers, quiz.id, submitting, onComplete])

  const selectAnswer = (qIdx, optIdx) => {
    const q = questions[qIdx]
    setAnswers(prev => ({ ...prev, [`q${q.order}`]: optIdx }))
  }

  const goToQuestion = (idx) => {
    setAnimDir(idx > current ? 'right' : 'left')
    setCurrent(idx)
  }

  // ── PHASE: INTRO ─────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    const TypeIcon = TYPE_ICONS[quiz.quizType] || Brain
    const gradClass = TYPE_COLORS[quiz.quizType] || 'from-purple-600 to-violet-700'
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950/97 to-violet-950/97 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="max-w-xl w-full my-6 animate-fadeInUp">
          {/* Header */}
          <div className="flex justify-end mb-2">
            <button onClick={onClose} className="text-white/50 hover:text-white/80 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Icon */}
          <div className="flex flex-col items-center mb-6">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${gradClass} flex items-center justify-center mb-4 shadow-2xl shadow-purple-900/50`}
              style={{ animation: 'pulse 2s ease-in-out infinite' }}>
              <TypeIcon size={36} className="text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${gradClass} text-white uppercase tracking-wider`}>
                {TYPE_LABELS[quiz.quizType] || quiz.quizType}
              </span>
              {quiz.category && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
                  {quiz.category}
                </span>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <h1 className="font-display text-3xl font-bold text-white text-center mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-purple-200 text-center text-sm mb-8 max-w-md mx-auto">{quiz.description}</p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Questions', value: totalQ },
              { label: 'Duration', value: `${quiz.duration}m` },
              { label: 'To Pass', value: `${Math.round((quiz.passMark / quiz.totalMarks) * 100)}%` }
            ].map(s => (
              <div key={s.label} className="bg-white/10 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-3xl font-extrabold text-white font-display">{s.value}</p>
                <p className="text-xs text-purple-300 font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-2">
            <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3">Rules</p>
            {[
              'Navigate between questions freely',
              'Auto-submits when timer reaches zero',
              'Results shown immediately after submission',
              `Pass mark: ${quiz.passMark}/${quiz.totalMarks} (${Math.round((quiz.passMark / quiz.totalMarks) * 100)}%)`
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                <p className="text-sm text-white/70">{rule}</p>
              </div>
            ))}
          </div>

          {/* Start Button */}
          <button
            onClick={() => { startedAt.current = Date.now(); setPhase('playing') }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-yellow-500/30"
          >
            Start Quiz →
          </button>
        </div>
      </div>
    )
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
    const correct  = result.breakdown?.filter(b => b.isCorrect).length || 0
    const wrong    = totalQ - correct
    const timeTaken = Math.round((Date.now() - startedAt.current) / 1000)
    const mins = Math.floor(timeTaken / 60)
    const secs = timeTaken % 60

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950 to-violet-950 z-50 overflow-y-auto">
        <Confetti />
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fadeInUp">
          {/* Score Ring */}
          <div className="flex flex-col items-center mb-6">
            <ScoreRing pct={result.percentage} size={160} />
            <p className="text-white/60 text-sm mt-3">{result.score} / {result.totalMarks} marks</p>
            <div className="mt-3">
              {result.passed ? (
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

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: 'Correct', value: `✓ ${correct}`, color: 'text-green-400' },
              { label: 'Wrong', value: `✗ ${wrong}`, color: 'text-yellow-400' },
              { label: 'Time', value: `${mins}m ${secs}s`, color: 'text-blue-400' },
              { label: 'Questions', value: totalQ, color: 'text-purple-300' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-white/40 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Topic Breakdown */}
          {result.topicBreakdown && Object.keys(result.topicBreakdown).length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3">Topic Breakdown</p>
              <div className="space-y-2.5">
                {Object.entries(result.topicBreakdown).map(([topic, data]) => (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/80 font-medium">{topic}</span>
                      <span className="text-xs text-white/50">{data.correct}/{data.total}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${data.pct >= 80 ? 'bg-green-400' : data.pct >= 60 ? 'bg-purple-400' : 'bg-yellow-400'}`}
                        style={{ width: `${data.pct}%` }}
                      />
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
              {result.breakdown?.map((b, i) => (
                <div key={i} className={`rounded-xl border overflow-hidden ${b.isCorrect ? 'border-green-500/20' : 'border-yellow-500/20'}`}>
                  {/* Row Header */}
                  <button
                    onClick={() => setReviewOpen(prev => ({ ...prev, [i]: !prev[i] }))}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 ${b.isCorrect ? 'bg-green-900/20' : 'bg-yellow-900/20'}`}
                  >
                    {b.isCorrect
                      ? <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                      : <AlertCircle size={16} className="text-yellow-400 flex-shrink-0" />
                    }
                    <span className="text-sm text-white/80 flex-1 text-left line-clamp-1">
                      Q{i + 1}. {b.text}
                    </span>
                    <span className={`text-xs font-bold ${b.isCorrect ? 'text-green-400' : 'text-yellow-400'}`}>
                      {b.isCorrect ? 'Correct' : 'Wrong'}
                    </span>
                    <ChevronRight size={14} className={`text-white/40 transition-transform ${reviewOpen[i] ? 'rotate-90' : ''}`} />
                  </button>
                  {/* Expanded */}
                  {reviewOpen[i] && (
                    <div className="px-4 py-3 space-y-2 border-t border-white/5">
                      {b.correctText && (
                        <div className="bg-green-900/20 border border-green-500/20 rounded-lg px-3 py-2">
                          <p className="text-xs text-green-400 font-semibold mb-0.5">Correct Answer</p>
                          <p className="text-sm text-white/80">{b.correctText}</p>
                        </div>
                      )}
                      {!b.isCorrect && b.selectedText && (
                        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg px-3 py-2">
                          <p className="text-xs text-yellow-400 font-semibold mb-0.5">Your Answer</p>
                          <p className="text-sm text-white/80">{b.selectedText}</p>
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

          {/* Bottom Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/20 text-white/70 font-semibold text-sm hover:bg-white/5 transition-colors"
            >
              ← Back to Quizzes
            </button>
            <button
              onClick={() => { onClose(); router.push(`/student/quizzes/leaderboard/${quiz.id}`) }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Trophy size={16} /> View Leaderboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PHASE: PLAYING ────────────────────────────────────────────────────────────
  const q    = questions[current]
  const qKey = q ? `q${q.order}` : null
  const sel  = qKey !== null ? answers[qKey] : undefined

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-950 to-violet-950 z-50 flex flex-col">
      {/* TOP BAR */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-sm font-semibold truncate">{quiz.title}</p>
          <p className="text-white/40 text-xs">Question {current + 1} of {totalQ}</p>
        </div>
        <TimerRing timeLeft={timeLeft} totalTime={totalTime} />
      </div>

      {/* PROGRESS BAR */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 transition-all duration-300"
          style={{ width: `${((current + 1) / totalQ) * 100}%` }}
        />
      </div>

      {/* QUESTION AREA */}
      <div className="flex-1 overflow-y-auto">
        <div key={`${current}-${animDir}`} className="animate-quizSlideInRight px-4 py-5 max-w-2xl mx-auto">
          {/* Question number + topic */}
          <div className="flex items-start gap-3 mb-5">
            <span className="w-9 h-9 rounded-xl bg-purple-800/60 border border-purple-600/30 text-purple-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {current + 1}
            </span>
            <div className="flex-1">
              {q?.topic && (
                <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider mb-1">{q.topic}</p>
              )}
              <p className="text-white font-medium text-base leading-relaxed">{q?.text}</p>
            </div>
          </div>

          {/* Code Snippet */}
          {q?.codeSnippet && (
            <pre className="bg-gray-900/80 text-green-400 rounded-xl p-4 text-sm mb-5 font-mono overflow-x-auto border border-green-900/30 leading-relaxed">
              {q.codeSnippet}
            </pre>
          )}

          {/* Options */}
          <div className="space-y-3 pb-4">
            {q?.options?.map((opt, i) => {
              const isSelected = sel === i
              return (
                <button
                  key={i}
                  onClick={() => selectAnswer(current, i)}
                  className={`
                    w-full text-left rounded-2xl p-4 transition-all duration-200 border-2
                    flex items-center gap-4 group
                    ${isSelected
                      ? 'border-yellow-400 bg-yellow-400/15 shadow-lg shadow-yellow-400/10 scale-[1.01]'
                      : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10 hover:scale-[1.005]'
                    }
                  `}
                >
                  <span className={`
                    w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all
                    ${isSelected ? 'bg-yellow-400 text-gray-900' : 'bg-white/10 text-white/60 group-hover:bg-white/20'}
                  `}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className={`font-medium text-sm leading-snug ${isSelected ? 'text-white' : 'text-white/75'}`}>
                    {opt.text}
                  </span>
                  {isSelected && <span className="ml-auto text-yellow-400 text-xl flex-shrink-0">●</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div className="border-t border-white/10 px-4 py-3 bg-purple-950/80">
        {/* Question dot nav */}
        <div className="flex justify-center flex-wrap gap-1.5 mb-3 max-w-sm mx-auto">
          {questions.map((_, i) => {
            const qk = `q${questions[i]?.order}`
            const done = answers[qk] !== undefined && answers[qk] !== null
            return (
              <button
                key={i}
                onClick={() => goToQuestion(i)}
                className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${
                  i === current
                    ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-purple-950 bg-purple-700 text-white'
                    : done
                    ? 'bg-green-500/40 text-green-200 border border-green-500/30'
                    : 'bg-white/10 text-white/40'
                }`}
              >{i + 1}</button>
            )
          })}
        </div>
        {/* Nav Buttons */}
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
    </div>
  )
}
