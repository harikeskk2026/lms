'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import {
  Brain, Lightbulb, Code, MessageSquare, Clock, CheckCircle,
  BarChart3, TrendingUp, Trophy, BookOpen, Star, Tag, ChevronRight,
  Search, Filter, Bookmark, BookmarkCheck, Eye, EyeOff, ChevronDown
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, BarChart
} from 'recharts'
import { studentApi } from '@/lib/api'
import { useQuizzes } from '@/hooks/useStudentDashboard'
import QuizPlayer from '@/components/student/QuizPlayer'
import SkeletonCard from '@/components/student/SkeletonCard'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_ICONS = {
  MCQ:            Brain,
  APTITUDE:       Lightbulb,
  CODING:         Code,
  INTERVIEW_PREP: MessageSquare,
}
const TYPE_STYLES = {
  MCQ:            { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'MCQ' },
  APTITUDE:       { bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-700 dark:text-blue-300',     label: 'Aptitude' },
  CODING:         { bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-700 dark:text-green-300',   label: 'Coding' },
  INTERVIEW_PREP: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-600', label: 'Interview' },
}
const DIFF_STYLES = {
  EASY:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HARD:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}
const CATEGORY_COLORS = {
  Python: 'bg-blue-100 text-blue-700',
  DSA:    'bg-purple-100 text-purple-700',
  HR:     'bg-green-100 text-green-700',
  Java:   'bg-orange-100 text-orange-700',
  System: 'bg-gray-100 text-gray-700',
}
const CAT_FILTER_COLOR = (c) => CATEGORY_COLORS[c] || 'bg-gray-100 text-gray-600'

// ─── ScoreBar ─────────────────────────────────────────────────────────────────
function ScoreBar({ pct }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-purple-500' : 'bg-yellow-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-9 text-right ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-purple-600' : 'text-yellow-600'}`}>
        {pct}%
      </span>
    </div>
  )
}

// ─── Quiz Card ────────────────────────────────────────────────────────────────
function QuizCard({ quiz, onStart }) {
  const typeStyle = TYPE_STYLES[quiz.quizType] || TYPE_STYLES.MCQ
  const TypeIcon = TYPE_ICONS[quiz.quizType] || Brain
  const a = quiz.attempt

  return (
    <div className="glass-card p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      {/* Badge row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
          <TypeIcon size={11} /> {typeStyle.label}
        </span>
        {quiz.category && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_FILTER_COLOR(quiz.category)}`}>
            {quiz.category}
          </span>
        )}
        {quiz.isFeatured && (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
            <Star size={10} className="fill-yellow-500" /> Featured
          </span>
        )}
      </div>

      {/* Icon + Title */}
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl ${typeStyle.bg} flex items-center justify-center flex-shrink-0`}>
          <TypeIcon size={20} className={typeStyle.text} />
        </div>
        <h3 className="font-display font-bold text-gray-800 dark:text-white text-base leading-tight line-clamp-2">{quiz.title}</h3>
      </div>

      {quiz.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{quiz.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center flex-wrap gap-3 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1"><BookOpen size={11} /> {quiz.questionCount} questions</span>
        <span className="flex items-center gap-1"><Clock size={11} /> {quiz.duration} min</span>
        <span>Pass: {quiz.passMark}/{quiz.totalMarks}</span>
      </div>

      {/* Tags */}
      {quiz.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {quiz.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
              # {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* Bottom row */}
      {!a ? (
        <>
          {quiz.dueDate && (
            <div className="mb-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                new Date(quiz.dueDate) < new Date()
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
              }`}>
                {new Date(quiz.dueDate) < new Date()
                  ? `Overdue by ${Math.abs(Math.round((new Date() - new Date(quiz.dueDate)) / 86400000))}d`
                  : `Due ${format(new Date(quiz.dueDate), 'MMM d')}`
                }
              </span>
            </div>
          )}
          <button
            onClick={() => onStart(quiz)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Start Quiz →
          </button>
        </>
      ) : (
        <>
          <div className="mb-2">
            <ScoreBar pct={a.pct} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{a.score}/{a.totalMarks} marks</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {a.passed ? 'Passed ✓' : 'Retry'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Featured Card ────────────────────────────────────────────────────────────
function FeaturedCard({ quiz, onStart }) {
  return (
    <div className="glass-card overflow-hidden mb-6">
      <div className="flex flex-col md:flex-row">
        {/* Left gradient */}
        <div className="md:w-2/5 bg-gradient-to-br from-purple-600 to-violet-700 p-6 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}>
            <Brain size={32} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Featured</p>
            <p className="text-sm font-bold text-yellow-300 mt-1">LIMITED TIME</p>
          </div>
        </div>
        {/* Right content */}
        <div className="md:w-3/5 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              {TYPE_STYLES[quiz.quizType]?.label || 'MCQ'}
            </span>
            {quiz.category && (
              <span className="text-xs font-semibold text-gray-500">{quiz.category}</span>
            )}
          </div>
          <h2 className="font-display font-bold text-gray-800 dark:text-white text-xl mb-2">{quiz.title}</h2>
          {quiz.description && (
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{quiz.description}</p>
          )}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: 'Questions', val: quiz.questionCount },
              { label: 'Duration', val: `${quiz.duration}m` },
              { label: 'Pass Mark', val: `${quiz.passMark}/${quiz.totalMarks}` },
            ].map(s => (
              <div key={s.label} className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-2 text-center">
                <p className="text-base font-bold text-purple-700 dark:text-purple-300">{s.val}</p>
                <p className="text-[10px] text-gray-400 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => onStart(quiz)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-yellow-400/20"
          >
            Start Now →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.getQuizAnalytics()
      .then(r => setAnalytics(r.data.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4">{[0,1,2].map(i => <SkeletonCard key={i} lines={3} />)}</div>
  )
  if (!analytics?.totalAttempts) return (
    <div className="glass-card p-12 text-center">
      <BarChart3 size={32} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-500">Take some quizzes to see your analytics</p>
    </div>
  )

  const { totalAttempts, avgScore, passRate, bestScore, avgTime, trend, topicBreakdown, byType } = analytics

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-100 dark:border-purple-900/30 p-3 text-xs">
        <p className="font-semibold text-gray-800 dark:text-white mb-1">{payload[0]?.payload?.quiz || label}</p>
        <p className="text-purple-600 font-bold">{payload[0]?.value}%</p>
        {payload[0]?.payload?.date && (
          <p className="text-gray-400 mt-0.5">{format(new Date(payload[0].payload.date), 'MMM d, yyyy')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Brain, label: 'Quizzes Taken', val: totalAttempts, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
          { icon: TrendingUp, label: 'Avg Score', val: `${avgScore}%`, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { icon: CheckCircle, label: 'Pass Rate', val: `${passRate}%`, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
          { icon: Trophy, label: 'Best Score', val: `${bestScore}%`, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20' },
        ].map(k => (
          <div key={k.label} className="glass-card p-4 flex flex-col gap-2">
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center`}>
              <k.icon size={18} className={k.color} />
            </div>
            <p className={`text-2xl font-extrabold ${k.color} font-display`}>{k.val}</p>
            <p className="text-xs text-gray-400 font-semibold">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Score Trend */}
      {trend?.length > 1 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-500" /> Score Trend
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={trend} margin={{ left: -20, right: 10, top: 5 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6d28d9" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <XAxis dataKey="quiz" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={60} stroke="#ffd668" strokeDasharray="4 4" strokeWidth={1.5} />
              <Bar dataKey="score" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Line dataKey="score" stroke="#a78bfa" strokeWidth={2} dot={false} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 text-center mt-1">Dashed line = 60% pass reference</p>
        </div>
      )}

      {/* Topic Breakdown */}
      {topicBreakdown?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-purple-500" /> Topic Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(200, topicBreakdown.length * 44)}>
            <BarChart data={topicBreakdown} layout="vertical" margin={{ left: 10, right: 40 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
              <YAxis type="category" dataKey="topic" tick={{ fontSize: 11, fill: '#6b7280' }} width={100} tickLine={false} />
              <Tooltip
                formatter={(v, _, props) => [`${v}% (${props.payload.correct}/${props.payload.total})`, 'Score']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e9d5ff', fontSize: 11 }}
              />
              <Bar
                dataKey="pct"
                radius={[0, 6, 6, 0]}
                maxBarSize={28}
                label={{ position: 'right', fontSize: 10, fill: '#9ca3af', formatter: (v) => `${v}%` }}
                fill="#6d28d9"
                // Color per bar via cell would need Cell — keep simple with conditional via Cell
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By Quiz Type */}
      {byType && Object.keys(byType).length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Performance by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(byType).map(([type, data]) => {
              const style = TYPE_STYLES[type] || TYPE_STYLES.MCQ
              const Icon = TYPE_ICONS[type] || Brain
              return (
                <div key={type} className={`rounded-2xl p-4 ${style.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={style.text} />
                    <span className={`text-xs font-bold ${style.text}`}>{style.label}</span>
                  </div>
                  <p className={`text-2xl font-extrabold ${style.text} font-display`}>{data.avg}%</p>
                  <p className="text-xs text-gray-400 mt-1">{data.count} attempt{data.count !== 1 ? 's' : ''}</p>
                  <div className="mt-2 h-1.5 bg-white/30 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${data.avg >= 80 ? 'bg-green-400' : data.avg >= 60 ? 'bg-purple-400' : 'bg-yellow-400'}`}
                      style={{ width: `${data.avg}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Interview Prep Tab ───────────────────────────────────────────────────────
function InterviewPrepTab() {
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [activeDiff, setActiveDiff] = useState('')
  const [expandedAnswers, setExpandedAnswers] = useState({})
  const [bookmarks, setBookmarks] = useState(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('iq_bookmarks') || '{}') } catch { return {} }
  })
  const [reviewed, setReviewed] = useState(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('iq_reviewed') || '{}') } catch { return {} }
  })
  const searchTimer = useRef(null)

  const load = useCallback(async (p = 1, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true)
    try {
      const r = await studentApi.getInterviewPrep({
        category: activeCategory || undefined,
        difficulty: activeDiff || undefined,
        search: search || undefined,
        page: p, limit: 20
      })
      const data = r.data.data
      if (append) setQuestions(prev => [...prev, ...data.questions])
      else setQuestions(data.questions)
      setTotal(data.total)
      if (data.categories?.length) setCategories(data.categories)
    } catch {
      toast.error('Failed to load interview questions')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeCategory, activeDiff, search])

  useEffect(() => { setPage(1); load(1) }, [activeCategory, activeDiff, search])

  // Debounced search
  const handleSearchInput = (v) => {
    setSearchInput(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(v), 400)
  }

  const toggleAnswer = (id) => setExpandedAnswers(prev => ({ ...prev, [id]: !prev[id] }))

  const toggleBookmark = (id) => {
    setBookmarks(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('iq_bookmarks', JSON.stringify(next))
      return next
    })
  }

  const toggleReviewed = (id) => {
    setReviewed(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('iq_reviewed', JSON.stringify(next))
      return next
    })
  }

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(next, true)
  }

  const diffColor = { EASY: 'bg-green-100 text-green-700', MEDIUM: 'bg-blue-100 text-blue-700', HARD: 'bg-amber-100 text-amber-700' }

  return (
    <div className="space-y-5">
      {/* Search + Filters */}
      <div className="glass-card p-4">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Search questions…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
          />
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            <button
              onClick={() => setActiveCategory('')}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${!activeCategory ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
            >All</button>
            {categories.map(c => (
              <button
                key={c.name}
                onClick={() => setActiveCategory(c.name === activeCategory ? '' : c.name)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${activeCategory === c.name ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
              >
                {c.name} <span className="opacity-60">({c.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Difficulty pills */}
        <div className="flex gap-2">
          {['', 'EASY', 'MEDIUM', 'HARD'].map(d => (
            <button
              key={d || 'all'}
              onClick={() => setActiveDiff(d)}
              className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${activeDiff === d ? 'bg-purple-600 text-white' : d === 'EASY' ? 'bg-green-100 text-green-700 hover:bg-green-200' : d === 'MEDIUM' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : d === 'HARD' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {d || 'All Levels'}
            </button>
          ))}
        </div>
      </div>

      {/* Total count */}
      <p className="text-xs text-gray-400">{total} questions found</p>

      {/* Questions */}
      {loading ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <SkeletonCard key={i} lines={3} />)}</div>
      ) : questions.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <MessageSquare size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-sm">No questions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {questions.map(q => (
            <div key={q.id} className="glass-card p-4 flex flex-col gap-2">
              {/* Header row */}
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_FILTER_COLOR(q.category)}`}>
                    {q.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffColor[q.difficulty] || diffColor.MEDIUM}`}>
                    {q.difficulty}
                  </span>
                </div>
                <button
                  onClick={() => toggleBookmark(q.id)}
                  className={`text-gray-400 hover:text-purple-500 transition-colors ${bookmarks[q.id] ? 'text-purple-500' : ''}`}
                >
                  {bookmarks[q.id] ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                </button>
              </div>

              {/* Question */}
              <p className="font-medium text-gray-800 dark:text-gray-100 text-sm leading-snug">{q.question}</p>

              {/* Tags */}
              {q.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {q.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-500">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Show/hide answer */}
              <div className="mt-1">
                <button
                  onClick={() => toggleAnswer(q.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
                >
                  {expandedAnswers[q.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                  {expandedAnswers[q.id] ? 'Hide Answer' : 'Show Answer'}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${expandedAnswers[q.id] ? 'max-h-96 mt-2' : 'max-h-0'}`}>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {q.answer}
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!reviewed[q.id]}
                      onChange={() => toggleReviewed(q.id)}
                      className="w-3.5 h-3.5 rounded accent-purple-600"
                    />
                    <span className="text-xs text-gray-500">Mark as Reviewed</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {questions.length < total && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : `Load More (${total - questions.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const FILTER_PILLS = ['All', 'MCQ', 'Aptitude', 'Interview Prep', 'DSA', 'Python', 'Featured']

export default function QuizzesPage() {
  const router = useRouter()
  const { data: quizzes, loading, error, refetch } = useQuizzes()
  const [activeQuiz, setActiveQuiz]   = useState(null)
  const [quizData, setQuizData]       = useState(null)
  const [activeTab, setActiveTab]     = useState('quizzes')
  const [activeFilter, setActiveFilter] = useState('All')

  const startQuiz = async (quiz) => {
    try {
      const r = await studentApi.getQuiz(quiz.id)
      setQuizData(r.data.data)
      setActiveQuiz(quiz)
    } catch {
      toast.error('Failed to load quiz')
    }
  }

  const filtered = (quizzes || []).filter(q => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Featured') return q.isFeatured
    if (activeFilter === 'MCQ') return q.quizType === 'MCQ'
    if (activeFilter === 'Aptitude') return q.quizType === 'APTITUDE'
    if (activeFilter === 'Interview Prep') return q.quizType === 'INTERVIEW_PREP'
    // Category-based
    return q.category?.toLowerCase() === activeFilter.toLowerCase()
  })

  const featured = filtered.find(q => q.isFeatured && !q.attempt)
  const rest = filtered.filter(q => !q.isFeatured || q.attempt)

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800 dark:text-white">Quiz Hub</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your performance & level up</p>
        </div>
        <button
          onClick={() => setActiveTab('analytics')}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors"
        >
          <BarChart3 size={16} /> Analytics
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-6">
        {[
          { id: 'quizzes', label: 'All Quizzes', icon: Brain },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'interview', label: 'Interview Prep', icon: MessageSquare },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: All Quizzes */}
      {activeTab === 'quizzes' && (
        <>
          {/* Filter Pills */}
          <div className="flex gap-2 flex-wrap mb-5">
            {FILTER_PILLS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                  activeFilter === f
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">{[0,1,2].map(i => <SkeletonCard key={i} lines={3} />)}</div>
          ) : (
            <>
              {/* Featured Quiz */}
              {featured && <FeaturedCard quiz={featured} onStart={startQuiz} />}

              {/* Quiz Grid */}
              {rest.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rest.map(q => (
                    <QuizCard key={q.id} quiz={q} onStart={startQuiz} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Brain size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No quizzes found for this filter</p>
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      {/* Tab: Analytics */}
      {activeTab === 'analytics' && <AnalyticsTab />}

      {/* Tab: Interview Prep */}
      {activeTab === 'interview' && <InterviewPrepTab />}

      {/* Quiz Player */}
      {activeQuiz && quizData && (
        <QuizPlayer
          quiz={quizData}
          onClose={() => { setActiveQuiz(null); setQuizData(null) }}
          onComplete={refetch}
        />
      )}
    </div>
  )
}
