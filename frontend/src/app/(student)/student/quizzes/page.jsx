'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Brain, Lightbulb, Code, MessageSquare, Clock, BarChart3,
  BookOpen, Search, Bookmark, BookmarkCheck, Eye, EyeOff,
  TrendingUp, CheckCircle, Trophy, Flame, Target,
  Zap, Crown, Award, Lock, Gem, Footprints, Gauge
} from 'lucide-react'
import { format } from 'date-fns'
import { studentApi } from '@/lib/api'
import quizService from '@/services/quizService'
import QuizPlayer from '@/components/student/QuizPlayer'
import SkeletonCard from '@/components/student/SkeletonCard'
import toast from 'react-hot-toast'

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

// ─── Quiz Card ────────────────────────────────────────────────────────────────
function QuizCard({ quiz, onStart }) {
  const typeStyle = TYPE_STYLES[quiz.type] || TYPE_STYLES.MCQ
  const TypeIcon = TYPE_ICONS[quiz.type] || Brain
  const attempted = quiz.attemptsUsed > 0
  const attemptsExhausted = quiz.attemptsUsed >= quiz.maxAttempts
  const attemptPct = Math.round((quiz.attemptsUsed / quiz.maxAttempts) * 100) || 0

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Type & Difficulty Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
            <TypeIcon size={12} /> {typeStyle.label}
          </span>
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${DIFF_STYLES[quiz.difficulty]}`}>
            {quiz.difficulty}
          </span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-2xl ${typeStyle.bg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
            <TypeIcon size={22} className={typeStyle.text} />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-gray-900 dark:text-white text-base leading-snug line-clamp-2">
              {quiz.title}
            </h3>
            {quiz.category && (
              <span className="inline-block text-[10px] font-bold text-gray-400 mt-0.5">
                {quiz.category}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {quiz.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
            {quiz.description}
          </p>
        )}

        {/* Metadata Chips */}
        <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 pt-2 border-t border-gray-50 dark:border-gray-800/80">
          <span className="flex items-center gap-1.5">
            <BookOpen size={13} className="text-purple-500" /> {quiz.totalQuestions} Questions
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-blue-500" /> {quiz.duration} Mins
          </span>
          <span className="flex items-center gap-1.5">
            <Target size={13} className="text-emerald-500" /> {quiz.passingScore}% Pass
          </span>
        </div>
      </div>

      {/* Attempt Progress & Action Button */}
      <div className="space-y-3 pt-2">
        {attempted && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
              <span>Attempts Used</span>
              <span>{quiz.attemptsUsed} / {quiz.maxAttempts}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${attemptsExhausted ? 'bg-rose-500' : 'bg-purple-600'}`}
                style={{ width: `${Math.min(100, attemptPct)}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => onStart(quiz)}
          disabled={attemptsExhausted}
          className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
            attemptsExhausted
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
              : attempted
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/20'
          }`}
        >
          {attemptsExhausted ? (
            'Max Attempts Reached'
          ) : attempted ? (
            <>Retake Quiz →</>
          ) : (
            <>Start Quiz →</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
const LEVEL_BAR_STYLES = {
  STRONG: 'bg-emerald-500',
  GOOD: 'bg-indigo-500',
  AVERAGE: 'bg-amber-500',
  WEAK: 'bg-rose-500',
}

const LEVEL_BADGE_STYLES = {
  STRONG: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200',
  GOOD: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200',
  AVERAGE: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200',
  WEAK: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200',
}

const SKILL_LEVEL_STYLES = {
  BEGINNER: { bg: 'from-gray-700 to-gray-900', badge: 'bg-gray-700 text-gray-200' },
  INTERMEDIATE: { bg: 'from-blue-800 to-indigo-950', badge: 'bg-blue-500/30 text-blue-200' },
  ADVANCED: { bg: 'from-purple-900 via-indigo-900 to-violet-950', badge: 'bg-purple-500/40 text-purple-200' },
  EXPERT: { bg: 'from-amber-700 via-orange-800 to-amber-950', badge: 'bg-amber-500/40 text-amber-200' },
}

function SkillLevelCard() {
  const [assessment, setAssessment] = useState(null)

  useEffect(() => {
    quizService.getSkillAssessment().then(r => setAssessment(r.data)).catch(() => {})
  }, [])

  if (!assessment) return null
  const style = SKILL_LEVEL_STYLES[assessment.level] || SKILL_LEVEL_STYLES.BEGINNER

  return (
    <div className={`bg-gradient-to-r ${style.bg} text-white rounded-3xl p-7 shadow-xl relative overflow-hidden flex items-center justify-between gap-6 flex-wrap`}>
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shadow-inner shrink-0">
          <span className="text-2xl font-extrabold text-amber-300 font-display">{Math.round(assessment.overallSkill)}%</span>
          <span className="text-[10px] uppercase font-bold text-white/60">Skill</span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-extrabold text-xl text-white">Skill Assessment</h3>
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border border-white/20 uppercase tracking-wider ${style.badge}`}>
              {assessment.level}
            </span>
          </div>
          <p className="text-xs text-white/70 mt-1 max-w-sm">Calculated from accuracy, streak, and performance across all completed quizzes.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs shrink-0 flex-wrap">
        {assessment.strongTopics?.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 px-4">
            <p className="text-[10px] uppercase font-bold text-emerald-300 mb-1">Strongest Topic</p>
            <p className="font-bold text-white text-sm">{assessment.strongTopics[0]}</p>
          </div>
        )}
        {assessment.weakTopics?.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 px-4">
            <p className="text-[10px] uppercase font-bold text-rose-300 mb-1">Needs Focus</p>
            <p className="font-bold text-white text-sm">{assessment.weakTopics[0]}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsTab({ onStartQuiz }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [practicing, setPracticing] = useState(false)

  useEffect(() => {
    quizService.getQuizAnalytics()
      .then(r => setAnalytics(r.data))
      .catch(err => toast.error(err.message || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  const handlePractice = async () => {
    setPracticing(true)
    try {
      const res = await quizService.createPracticeQuiz()
      toast.success('Practice quiz ready!')
      onStartQuiz(res.data)
    } catch (err) {
      toast.error(err.message || 'Failed to create practice quiz')
    } finally {
      setPracticing(false)
    }
  }

  if (loading) return (
    <div className="space-y-4">{[0, 1, 2].map(i => <SkeletonCard key={i} lines={3} />)}</div>
  )

  if (!analytics || analytics.quizzesCompleted === 0) return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center shadow-sm">
      <BarChart3 size={48} className="mx-auto text-purple-400/40 mb-4 animate-bounce" />
      <h4 className="font-bold text-gray-800 dark:text-white text-base">No Analytics Available</h4>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Complete your first quiz to generate detailed accuracy reports, skill ratings, and topic performance analysis!</p>
    </div>
  )

  const { overallSkill, accuracy, quizzesCompleted, currentStreak, topicPerformance = [], strengths = [], weakAreas = [], improvementHistory = [], recentAttempts = [] } = analytics

  return (
    <div className="space-y-6">
      {/* Skill Level Hero Card */}
      <SkillLevelCard />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Target, label: 'Overall Skill', val: `${Math.round(overallSkill)}%`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
          { icon: TrendingUp, label: 'Accuracy Rate', val: `${Math.round(accuracy)}%`, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { icon: CheckCircle, label: 'Quizzes Completed', val: quizzesCompleted, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { icon: Flame, label: 'Current Streak', val: `${currentStreak} Days 🔥`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/20' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-3 transition-transform duration-200 hover:-translate-y-1">
            <div className={`w-10 h-10 rounded-2xl ${k.bg} flex items-center justify-center`}>
              <k.icon size={20} className={k.color} />
            </div>
            <div>
              <p className={`text-2xl font-extrabold ${k.color} font-display tracking-tight`}>{k.val}</p>
              <p className="text-xs text-gray-500 font-bold mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Weak Areas Banner CTA */}
      {weakAreas.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50/80 via-orange-50/50 to-amber-50/50 dark:from-rose-900/20 dark:via-orange-900/10 dark:to-amber-900/10 border border-rose-200/80 dark:border-rose-800/40 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <Target size={18} className="text-rose-500" /> Areas Needing Focus
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Target these topics with tailored practice quizzes to boost your overall accuracy</p>
            </div>
            <button
              onClick={handlePractice}
              disabled={practicing}
              className="text-xs font-bold px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-md shadow-rose-500/20 disabled:opacity-60 transition-all flex items-center gap-2"
            >
              {practicing ? (
                <>Building quiz...</>
              ) : (
                <>Practice Weak Areas →</>
              )}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {weakAreas.map(w => (
              <span key={w.topicId} className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-white dark:bg-gray-800 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs">
                {w.topicName} — <span className="font-extrabold">{Math.round(w.accuracy)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Topic Performance Breakdown */}
      {topicPerformance.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-display font-extrabold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-purple-600" /> Topic Performance Breakdown
          </h3>
          <div className="space-y-4">
            {topicPerformance.map(t => (
              <div key={t.topicId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">{t.topicName}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${LEVEL_BADGE_STYLES[t.level] || LEVEL_BADGE_STYLES.AVERAGE}`}>
                      {t.level}
                    </span>
                  </div>
                  <span className="font-extrabold text-gray-700 dark:text-gray-300">
                    {t.correctCount}/{t.questionsAttempted} ({Math.round(t.accuracy)}%)
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${LEVEL_BAR_STYLES[t.level] || 'bg-purple-500'}`}
                    style={{ width: `${Math.max(5, Math.min(100, t.accuracy))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Improvement Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {strengths.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-emerald-500" /> Top Strengths
            </h3>
            <div className="flex flex-wrap gap-2">
              {strengths.map(s => (
                <span key={s.topicId} className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {s.topicName} — <span className="font-extrabold">{Math.round(s.accuracy)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {improvementHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-600" /> Score Retake Improvement
            </h3>
            <div className="space-y-2.5">
              {improvementHistory.map(i => (
                <div key={i.quizId} className="flex items-center justify-between text-xs sm:text-sm p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                  <span className="font-bold text-gray-900 dark:text-white break-words">{i.quizTitle}</span>
                  <span className={`font-extrabold ${i.improvementPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {i.firstScorePct}% → {i.currentScorePct}% ({i.improvementPct >= 0 ? '+' : ''}{i.improvementPct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {recentAttempts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={18} className="text-blue-500" /> Recent Quiz Attempts
          </h3>
          <div className="space-y-2.5">
            {recentAttempts.map(a => (
              <div key={a.id} className="flex items-center justify-between text-xs sm:text-sm p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                <span className="font-bold text-gray-900 dark:text-white break-words">{a.quizTitle}</span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400">{a.score}/{a.totalScore} ({Math.round(a.accuracy)}%)</span>
              </div>
            ))}
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

      <p className="text-xs text-gray-400">{total} questions found</p>

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

              <p className="font-medium text-gray-800 dark:text-gray-100 text-sm leading-snug">{q.question}</p>

              {q.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {q.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-500">
                      {t}
                    </span>
                  ))}
                </div>
              )}

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

// ─── Daily Challenge Card ─────────────────────────────────────────────────────
function DailyChallengeCard({ onStart }) {
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    quizService.getDailyChallenge()
      .then(r => setChallenge(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !challenge) return null

  // Daily challenge is just a regular auto-generated quiz under the hood — reuse
  // QuizPlayer's normal start flow instead of a separate one-off code path.
  const handleStart = () => onStart({
    id: challenge.quizId,
    title: challenge.title,
    description: 'Daily challenge — one attempt, XP and streak on the line.',
    type: 'MCQ',
    difficulty: 'MEDIUM',
    duration: challenge.duration,
    passingScore: challenge.passingScore,
    maxAttempts: 1,
    totalQuestions: challenge.totalQuestions,
    attemptsUsed: challenge.attempted ? 1 : 0,
  })

  return (
    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-violet-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex items-center justify-between gap-6 flex-wrap mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
          <Zap size={24} className="fill-amber-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400/30 text-amber-200 border border-amber-400/40 uppercase tracking-wider">
              Daily Challenge
            </span>
            <span className="text-xs text-purple-200 font-semibold">+50 Bonus XP</span>
          </div>
          <h3 className="font-display font-extrabold text-lg text-white mt-1">{challenge.title || 'Daily Speed Quiz'}</h3>
          <p className="text-xs text-purple-200 mt-0.5">{challenge.totalQuestions || 5} Questions · {challenge.duration || 10} Mins</p>
        </div>
      </div>

      {challenge.attempted ? (
        <div className="text-center shrink-0 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
          <p className="text-xl font-extrabold font-display text-amber-300">{challenge.rank ? `#${challenge.rank}` : 'Completed'}</p>
          <p className="text-[10px] text-purple-200 font-semibold uppercase tracking-wider">Today's Rank</p>
        </div>
      ) : (
        <button
          onClick={handleStart}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-gray-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          Start Challenge ⚡
        </button>
      )}
    </div>
  )
}

// ─── Leaderboard Tab ──────────────────────────────────────────────────────────
// ─── Leaderboard Tab ──────────────────────────────────────────────────────────
const LEADERBOARD_TYPES = [
  { id: 'GLOBAL', label: 'Global' },
  { id: 'WEEKLY', label: 'Weekly' },
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'MOST_IMPROVED', label: 'Most Improved' },
]

function LeaderboardTab() {
  const [type, setType] = useState('GLOBAL')
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    quizService.getLeaderboard(type)
      .then(r => setBoard(r.data))
      .catch(err => toast.error(err.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [type])

  const valueLabel = type === 'MOST_IMPROVED' ? 'pts improved' : 'XP'
  const entries = board?.entries || []
  const currentUser = board?.currentUserEntry

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const podiumOrder = [1, 0, 2] // 2nd (left), 1st (center), 3rd (right)

  return (
    <div className="space-y-6">
      {/* Header & Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        <div>
          <h3 className="font-display font-extrabold text-xl text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Trophy size={24} className="text-amber-500 fill-amber-400" /> Quiz Leaderboard
          </h3>
          <p className="text-xs text-gray-500 mt-1 font-medium">See how you rank against top performers across all quizzes</p>
        </div>

        <div className="flex gap-1.5 p-1.5 bg-gray-100/90 dark:bg-gray-800/90 rounded-full">
          {LEADERBOARD_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                type === t.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-gray-600 dark:text-gray-300 hover:text-purple-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <SkeletonCard key={i} lines={2} />)}</div>
      ) : !entries || entries.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center shadow-sm">
          <Trophy size={48} className="mx-auto text-amber-400/40 mb-4 animate-bounce" />
          <h4 className="font-bold text-gray-800 dark:text-white text-base">No Rankings Yet</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Be the first student to complete a quiz and claim the #1 spot on the leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current User Rank Highlight Card */}
          {currentUser && (
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-violet-900 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-extrabold text-lg text-amber-300 shadow-inner">
                  #{currentUser.rank}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base text-white">{currentUser.studentName || 'Your Rank'}</p>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/40 text-purple-200 border border-purple-400/30">YOU</span>
                  </div>
                  <p className="text-xs text-purple-200 mt-0.5">Keep completing quizzes to climb higher!</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-purple-300 uppercase font-bold tracking-wider">Total Score</p>
                  <p className="text-xl font-extrabold text-amber-300">{currentUser.value} {valueLabel}</p>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 Podium Cards */}
          {top3.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-6 text-center">Top Champions</h4>
              <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-2">
                {podiumOrder.filter(idx => top3[idx]).map(idx => {
                  const entry = top3[idx]
                  const isFirst = idx === 0
                  const isSecond = idx === 1

                  const podiumHeight = isFirst ? 'h-36' : isSecond ? 'h-28' : 'h-22'
                  const crownBg = isFirst
                    ? 'bg-gradient-to-br from-amber-300 to-yellow-500 border-amber-200 shadow-amber-500/30'
                    : isSecond
                    ? 'bg-gradient-to-br from-slate-200 to-gray-400 border-slate-200 shadow-slate-400/20'
                    : 'bg-gradient-to-br from-amber-600 to-orange-700 border-amber-500 shadow-orange-600/20'

                  const medalSymbol = isFirst ? '🥇' : isSecond ? '🥈' : '🥉'

                  return (
                    <div key={entry.studentId || idx} className={`flex flex-col items-center flex-1 max-w-[140px] ${isFirst ? 'order-2' : isSecond ? 'order-1' : 'order-3'}`}>
                      <div className="relative mb-2 flex flex-col items-center">
                        <span className="text-2xl mb-1 drop-shadow-sm">{medalSymbol}</span>
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 p-0.5 ${isFirst ? 'ring-4 ring-amber-400 shadow-xl' : 'ring-2 ring-gray-300'}`}>
                          <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-white font-extrabold text-sm sm:text-base">
                            {entry.studentName?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??'}
                          </div>
                        </div>
                      </div>

                      <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm break-words text-center">
                        {entry.studentName}
                      </p>

                      <p className="font-extrabold text-purple-600 dark:text-purple-400 text-xs sm:text-sm mt-0.5">
                        {entry.value} {valueLabel}
                      </p>

                      <div className={`w-full mt-3 rounded-t-2xl border flex items-center justify-center ${crownBg} ${podiumHeight} text-white font-extrabold text-base shadow-md`}>
                        #{idx + 1}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full Leaderboard List */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">All Rankings</h4>
              <span className="text-xs font-semibold text-gray-400">{entries.length} Students</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {entries.map((e, index) => (
                <div
                  key={e.studentId || index}
                  className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${
                    e.isCurrentUser ? 'bg-purple-50/70 dark:bg-purple-900/20' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                      e.rank === 1
                        ? 'bg-amber-100 text-amber-700 border border-amber-300'
                        : e.rank === 2
                        ? 'bg-slate-100 text-slate-700 border border-slate-300'
                        : e.rank === 3
                        ? 'bg-amber-100 text-amber-800 border border-amber-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}
                  >
                    {e.rank}
                  </span>

                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                    {e.studentName?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-white break-words">
                        {e.studentName}
                      </p>
                      {e.isCurrentUser && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-purple-700 dark:text-purple-300">
                      {e.value} <span className="text-xs font-semibold text-gray-500">{valueLabel}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Achievements Tab ─────────────────────────────────────────────────────────
const ACHIEVEMENT_STYLES = {
  FIRST_QUIZ: {
    icon: 'footprints',
    name: 'First Steps',
    xpReward: 25,
    from: '#b55fe6',
    to: '#7c3aed',
    rimFrom: '#f3e8ff',
    rimTo: '#c084fc',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  PERFECT_SCORE: {
    icon: 'diamond',
    name: 'Perfectionist',
    xpReward: 50,
    from: '#38bdf8',
    to: '#1d4ed8',
    rimFrom: '#dbeafe',
    rimTo: '#60a5fa',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  SEVEN_DAY_STREAK: {
    icon: 'flame',
    name: 'On Fire',
    xpReward: 75,
    from: '#fb923c',
    to: '#ea580c',
    rimFrom: '#ffedd5',
    rimTo: '#f97316',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
  HUNDRED_QUESTIONS: {
    icon: 'wreath',
    name: 'Century Club',
    xpReward: 100,
    from: '#4ade80',
    to: '#15803d',
    rimFrom: '#dcfce7',
    rimTo: '#22c55e',
    textColor: 'text-green-600 dark:text-green-400',
  },
  SPEED_MASTER: {
    icon: 'speedometer',
    name: 'Speed Master',
    xpReward: 40,
    from: '#f472b6',
    to: '#be185d',
    rimFrom: '#fce7f3',
    rimTo: '#ec4899',
    textColor: 'text-pink-600 dark:text-pink-400',
  },
  MOST_IMPROVED: {
    icon: 'trending',
    name: 'Most Improved',
    xpReward: 50,
    from: '#22d3ee',
    to: '#0891b2',
    rimFrom: '#cffafe',
    rimTo: '#06b6d4',
    textColor: 'text-cyan-600 dark:text-cyan-400',
  },
  QUIZ_MASTER: {
    icon: 'trophy',
    name: 'Quiz Master',
    xpReward: 100,
    from: '#fbbf24',
    to: '#b45309',
    rimFrom: '#fef3c7',
    rimTo: '#f59e0b',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  TOP_TEN: {
    icon: 'crown',
    name: 'Top 10',
    xpReward: 30,
    from: '#facc15',
    to: '#a16207',
    rimFrom: '#fef9c3',
    rimTo: '#eab308',
    textColor: 'text-yellow-600 dark:text-yellow-400',
  },
}

const DEFAULT_ACHIEVEMENTS = [
  { code: 'FIRST_QUIZ', name: 'First Steps', xpReward: 25, unlocked: false },
  { code: 'PERFECT_SCORE', name: 'Perfectionist', xpReward: 50, unlocked: false },
  { code: 'SEVEN_DAY_STREAK', name: 'On Fire', xpReward: 75, unlocked: false },
  { code: 'HUNDRED_QUESTIONS', name: 'Century Club', xpReward: 100, unlocked: false },
  { code: 'SPEED_MASTER', name: 'Speed Master', xpReward: 40, unlocked: false },
  { code: 'MOST_IMPROVED', name: 'Most Improved', xpReward: 50, unlocked: false },
  { code: 'QUIZ_MASTER', name: 'Quiz Master', xpReward: 100, unlocked: false },
  { code: 'TOP_TEN', name: 'Top 10', xpReward: 60, unlocked: false },
]

function SparkleStar({ x, y, size = 4 }) {
  return (
    <path
      d={`M ${x} ${y - size} Q ${x} ${y} ${x + size} ${y} Q ${x} ${y} ${x} ${y + size} Q ${x} ${y} ${x - size} ${y} Q ${x} ${y} ${x} ${y - size} Z`}
      fill="white"
      opacity="0.9"
    />
  )
}

function BadgeIconGraphic({ iconType }) {
  switch (iconType) {
    case 'footprints':
      return <Footprints size={34} className="text-white fill-white/20" />
    case 'diamond':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9">
          <path d="M6 3h12l4 6-10 12L2 9z" fill="white" opacity="0.95" />
          <path d="M6 3l4 6h4l4-6M10 9l2 12 2-12" stroke="rgba(0,0,0,0.15)" strokeWidth="1" fill="none" />
        </svg>
      )
    case 'flame':
      return <Flame size={36} className="text-white fill-white" />
    case 'wreath':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="white">
          <polygon points="12,4 13.5,8 18,8.5 14.5,11.5 15.5,16 12,13.5 8.5,16 9.5,11.5 6,8.5 10.5,8" />
          <path d="M4 17c-1.5-2.5-1.5-6 0-9.5M5.5 8c1.2-1.5 3-2.5 4.5-3M3 13c-1.2-1.2-1.2-3.5 0-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M20 17c1.5-2.5 1.5-6 0-9.5M18.5 8c-1.2-1.5-3-2.5-4.5-3M21 13c1.2-1.2 1.2-3.5 0-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      )
    case 'speedometer':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 14l4-4" />
          <path d="M3.34 18a10 10 0 1 1 17.32 0" />
          <line x1="3" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="21" y2="12" />
          <line x1="6.34" y1="6.34" x2="7.76" y2="7.76" />
          <line x1="17.66" y1="6.34" x2="16.24" y2="7.76" />
        </svg>
      )
    case 'trending':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="white">
          <rect x="3" y="14" width="4" height="7" rx="1" />
          <rect x="9.5" y="10" width="4" height="11" rx="1" />
          <rect x="16" y="6" width="4" height="15" rx="1" />
          <path d="M4 10l5-5 4 2.5 6.5-6.5M19.5 3h4v4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
    case 'trophy':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="white">
          <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" />
          <path d="M6 5H3a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h2M18 5h3a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-2" stroke="white" strokeWidth="1.8" fill="none" />
          <rect x="10" y="16" width="4" height="3" />
          <rect x="7" y="19" width="10" height="2" rx="1" />
          <polygon points="12,5.5 12.6,7 14.2,7.2 13,8.3 13.3,9.8 12,9 10.7,9.8 11,8.3 9.8,7.2 11.4,7" fill="#f59e0b" />
        </svg>
      )
    case 'crown':
    default:
      return <Crown size={34} className="text-white fill-white/20" />
  }
}

function BadgeMedallion({ unlocked, style: colorStyle, size = 96 }) {
  const uid = colorStyle.from.replace('#', '')
  const rimId = `rim-${uid}`
  const faceId = `face-${uid}`
  const glowId = `glow-${uid}`
  const sealSize = 28

  return (
    <div className="relative shrink-0 flex flex-col items-center" style={{ width: size, height: size + 10 }}>
      <svg
        viewBox="0 0 100 106"
        width={size}
        height={size}
        className={`drop-shadow-lg overflow-visible transition-all duration-300 ${
          unlocked ? 'opacity-100 saturate-110' : 'opacity-85 grayscale-[10%]'
        }`}
      >
        <defs>
          <linearGradient id={rimId} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={colorStyle.rimFrom} />
            <stop offset="100%" stopColor={colorStyle.rimTo} />
          </linearGradient>

          <linearGradient id={faceId} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor={colorStyle.from} />
            <stop offset="100%" stopColor={colorStyle.to} />
          </linearGradient>

          <linearGradient id={glowId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.45" />
            <stop offset="100%" stopColor="white" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Outer translucent bevel rim */}
        <polygon
          points="50,4 93,26 93,74 50,96 7,74 7,26"
          fill={`url(#${rimId})`}
          stroke={`url(#${rimId})`}
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* Outer dark stroke shadow */}
        <polygon
          points="50,8 89,28 89,72 50,92 11,72 11,28"
          fill="none"
          stroke="rgba(0, 0, 0, 0.15)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Inner face polygon */}
        <polygon
          points="50,10 87,29 87,71 50,90 13,71 13,29"
          fill={`url(#${faceId})`}
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Upper glass highlight sheen */}
        <polygon
          points="50,11 86,29 80,48 50,56 20,48 14,29"
          fill={`url(#${glowId})`}
        />

        {/* Sparkles */}
        <SparkleStar x={26} y={30} size={3.5} />
        <SparkleStar x={74} y={28} size={4.5} />
        <SparkleStar x={28} y={70} size={3} />
        <SparkleStar x={72} y={68} size={4} />
      </svg>

      {/* Central Icon */}
      <div
        className={`absolute inset-0 flex items-center justify-center pb-2.5 pointer-events-none ${
          !unlocked ? 'opacity-90' : 'opacity-100'
        }`}
        style={{ width: size, height: size }}
      >
        <BadgeIconGraphic iconType={colorStyle.icon} />
      </div>

      {/* Lock seal overlay for locked badges */}
      {!unlocked && (
        <div
          className="absolute rounded-full flex items-center justify-center border-2 border-white shadow-md z-10"
          style={{
            width: sealSize,
            height: sealSize,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            background: `linear-gradient(135deg, ${colorStyle.from}, ${colorStyle.to})`,
          }}
        >
          <Lock size={13} className="text-white fill-white" />
        </div>
      )}
    </div>
  )
}

function BadgeCaseItem({ achievement }) {
  const style = ACHIEVEMENT_STYLES[achievement.code] || ACHIEVEMENT_STYLES.FIRST_QUIZ
  const isUnlocked = achievement.unlocked

  return (
    <div className="flex flex-col items-center shrink-0 w-32 text-center group transition-transform duration-200 hover:-translate-y-1">
      <BadgeMedallion unlocked={isUnlocked} style={style} size={96} />
      <div className="min-w-0 mt-3.5 flex flex-col items-center">
        <p className="text-sm font-bold text-gray-900 dark:text-white break-words tracking-tight">
          {achievement.name}
        </p>
        <p className={`text-xs font-bold mt-1 ${style.textColor}`}>
          +{achievement.xpReward} XP
        </p>
      </div>
    </div>
  )
}

function AchievementsTab() {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('unlocked') // 'unlocked' | 'locked'

  useEffect(() => {
    quizService.getAchievements()
      .then(r => setAchievements(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Merge default list so all 7 reference badges exist
  const achievementMap = (achievements || []).reduce((acc, cur) => {
    acc[cur.code] = cur
    return acc
  }, {})

  const allAchievements = DEFAULT_ACHIEVEMENTS.map(def => {
    const fromApi = achievementMap[def.code]
    return {
      ...def,
      ...(fromApi || {}),
    }
  })

  const unlocked = allAchievements.filter(a => a.unlocked)
  const locked = allAchievements.filter(a => !a.unlocked)
  const list = view === 'unlocked' ? unlocked : locked

  if (loading) return <div className="space-y-3">{[0, 1, 2].map(i => <SkeletonCard key={i} lines={2} />)}</div>

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h3 className="font-display font-extrabold text-xl text-gray-900 dark:text-white tracking-tight">
          Badge Case
        </h3>
        <div className="flex gap-1 p-1 bg-gray-100/90 dark:bg-gray-800/90 rounded-full w-fit">
          {[
            { id: 'unlocked', label: `Unlocked (${unlocked.length})` },
            { id: 'locked', label: `Locked (${locked.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                view === tab.id
                  ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10 font-medium">
          {view === 'unlocked'
            ? 'No badges unlocked yet — take a quiz to earn your first one!'
            : "Nothing locked — you've earned them all! 🎉"}
        </p>
      ) : (
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4 pt-2 px-1 scrollbar-none">
          {list.map(a => <BadgeCaseItem key={a.code} achievement={a} />)}
        </div>
      )}
    </div>
  )
}


// ─── Main Page ────────────────────────────────────────────────────────────────
const FILTER_PILLS = ['All', 'MCQ', 'APTITUDE', 'CODING', 'INTERVIEW_PREP']
const FILTER_LABELS = { All: 'All', MCQ: 'MCQ', APTITUDE: 'Aptitude', CODING: 'Coding', INTERVIEW_PREP: 'Interview Prep' }

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [activeTab, setActiveTab] = useState('quizzes')
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    quizService.listStudentQuizzes()
      .then(r => setQuizzes(r.data || []))
      .catch(err => toast.error(err.message || 'Failed to load quizzes'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = (quizzes || []).filter(q => {
    const matchesFilter = activeFilter === 'All' || q.type === activeFilter
    const matchesSearch = !searchQuery ||
      q.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="page-wrapper space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-gray-900 dark:text-white tracking-tight">Quiz Hub</h1>
          <p className="text-xs font-medium text-gray-500 mt-1">Master topics, attempt challenges & track your skill growth</p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex gap-1.5 p-1.5 bg-gray-100/90 dark:bg-gray-800/90 rounded-full overflow-x-auto scrollbar-hide">
          {[
            { id: 'quizzes', label: 'All Quizzes', icon: Brain },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'achievements', label: 'Achievements', icon: Award },
            { id: 'interview', label: 'Interview Prep', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-gray-600 dark:text-gray-300 hover:text-purple-600'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'quizzes' && (
        <>
          <DailyChallengeCard onStart={setActiveQuiz} />

          {/* Filter Pills & Search Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
            <div className="flex gap-2 flex-wrap">
              {FILTER_PILLS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${
                    activeFilter === f
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-purple-300 shadow-2xs'
                  }`}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[240px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search quizzes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map(q => (
                <QuizCard key={q.id} quiz={q} onStart={setActiveQuiz} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center shadow-sm">
              <Brain size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-3 animate-pulse" />
              <h4 className="font-bold text-gray-800 dark:text-white text-base">No Quizzes Found</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Try adjusting your filter or search query to find available quizzes.</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'analytics' && <AnalyticsTab onStartQuiz={setActiveQuiz} />}
      {activeTab === 'leaderboard' && <LeaderboardTab />}
      {activeTab === 'achievements' && <AchievementsTab />}
      {activeTab === 'interview' && <InterviewPrepTab />}

      {activeQuiz && (
        <QuizPlayer
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onComplete={load}
        />
      )}
    </div>
  )
}
