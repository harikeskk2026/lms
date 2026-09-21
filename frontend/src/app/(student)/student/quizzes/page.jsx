'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Brain, Lightbulb, Code, MessageSquare, Clock,
  BookOpen, Search, Eye,
  Trophy, Target,
  Award, Gem, Gauge
} from 'lucide-react'
import { format } from 'date-fns'
import { studentApi } from '@/lib/api'
import quizService from '@/services/quizService'
import useDebouncedValue from '@/hooks/useDebouncedValue'
import QuizPlayer from '@/components/student/QuizPlayer'
import SkeletonCard from '@/components/student/SkeletonCard'
import AchievementBadges from '@/components/student/AchievementBadges'
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
// ─── Quiz Card ────────────────────────────────────────────────────────────────
function QuizCard({ quiz, onStart, onViewResult }) {
  const typeStyle = TYPE_STYLES[quiz.type] || TYPE_STYLES.MCQ
  const TypeIcon = TYPE_ICONS[quiz.type] || Brain
  const attempted = quiz.attemptsUsed > 0
  const attemptsExhausted = quiz.attemptsUsed >= quiz.maxAttempts
  const attemptPct = Math.round((quiz.attemptsUsed / quiz.maxAttempts) * 100) || 0
  const quizClosed = quiz.effectiveStatus === 'COMPLETED'
  const quizNotOpen = quiz.effectiveStatus === 'SCHEDULED'
  const startDisabled = attemptsExhausted || quizClosed || quizNotOpen

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-4 group">
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl ${typeStyle.bg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
        <TypeIcon size={22} className={typeStyle.text} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display font-extrabold text-gray-900 dark:text-white text-base leading-snug">
            {quiz.title}
          </h3>
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${DIFF_STYLES[quiz.difficulty]}`}>
            {quiz.difficulty}
          </span>
          {quiz.category && (
            <span className="text-[10px] font-bold text-gray-400">{quiz.category}</span>
          )}
        </div>

        {quiz.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 leading-relaxed">
            {quiz.description}
          </p>
        )}

        {/* Metadata Chips */}
        <div className="flex items-center gap-4 flex-wrap text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2.5">
          <span className="flex items-center gap-1.5">
            <BookOpen size={13} className="text-purple-500" /> {quiz.totalQuestions} Questions
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-blue-500" /> {quiz.duration} Mins
          </span>
          <span className="flex items-center gap-1.5">
            <Target size={13} className="text-emerald-500" /> {quiz.passingScore}% Pass
          </span>
          {attempted && (
            <span className="flex items-center gap-1.5">
              Attempts: {quiz.attemptsUsed} / {quiz.maxAttempts}
            </span>
          )}
        </div>

        {/* Attempt Progress */}
        {attempted && (
          <div className="h-1.5 max-w-[220px] bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2.5">
            <div
              className={`h-full rounded-full ${attemptsExhausted ? 'bg-rose-500' : 'bg-purple-600'}`}
              style={{ width: `${Math.min(100, attemptPct)}%` }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        {attempted && (
          <button
            onClick={() => onViewResult(quiz)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all whitespace-nowrap"
          >
            View Result
          </button>
        )}

        <button
          onClick={() => onStart(quiz)}
          disabled={startDisabled}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            startDisabled
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
              : attempted
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/20'
          }`}
        >
          {quizClosed ? (
            'Quiz Closed'
          ) : quizNotOpen ? (
            'Not Open Yet'
          ) : attemptsExhausted ? (
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [viewResultAttemptId, setViewResultAttemptId] = useState(null)
  const [activeTab, setActiveTab] = useState('quizzes')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebouncedValue(searchQuery, 400)

  const load = useCallback(() => {
    setLoading(true)
    studentApi.getQuizzes(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {})
      .then(r => setQuizzes(r.data.data || []))
      .catch(err => toast.error(err.message || 'Failed to load quizzes'))
      .finally(() => setLoading(false))
  }, [debouncedSearch])

  useEffect(() => { load() }, [load])

  // Finds this quiz's most recent submitted attempt and reopens QuizPlayer
  // straight on the results phase - reuses the same result-visibility gating
  // (resultsPending/resultVisibility) the submit-time results screen already has.
  const handleViewResult = async (quiz) => {
    try {
      const res = await quizService.listMyAttempts()
      const latest = (res.data || [])
        .filter(a => a.quizId === quiz.id && a.status === 'SUBMITTED')
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0]
      if (!latest) {
        toast.error('No submitted attempt found for this quiz')
        return
      }
      setViewResultAttemptId(latest.id)
      setActiveQuiz(quiz)
    } catch (err) {
      toast.error(err.message || 'Failed to load result')
    }
  }

  const closeQuizPlayer = () => {
    setActiveQuiz(null)
    setViewResultAttemptId(null)
  }

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
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'achievements', label: 'Achievements', icon: Award },
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
          {/* Search Bar */}
          <div className="flex items-center justify-end flex-wrap gap-4 mb-2">
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
            <div className="space-y-4">
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}
            </div>
          ) : (quizzes || []).length > 0 ? (
            <div className="space-y-4">
              {(quizzes || []).map(q => (
                <QuizCard key={q.id} quiz={q} onStart={setActiveQuiz} onViewResult={handleViewResult} />
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

      {activeTab === 'leaderboard' && <LeaderboardTab />}
      {activeTab === 'achievements' && <AchievementBadges />}

      {activeQuiz && (
        <QuizPlayer
          quiz={activeQuiz}
          viewResultAttemptId={viewResultAttemptId}
          onClose={closeQuizPlayer}
          onComplete={load}
        />
      )}
    </div>
  )
}
