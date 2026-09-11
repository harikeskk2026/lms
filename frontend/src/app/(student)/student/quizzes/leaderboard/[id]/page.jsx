'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Trophy, Clock, CheckCircle, AlertCircle, Brain } from 'lucide-react'
import { format } from 'date-fns'
import { studentApi } from '@/lib/api'
import SkeletonCard from '@/components/student/SkeletonCard'
import toast from 'react-hot-toast'

function InitialsAvatar({ name, size = 10, gradient = 'from-purple-500 to-violet-500' }) {
  const initials = name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??'
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials}
    </div>
  )
}

const GRADIENTS = [
  'from-purple-500 to-violet-600',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-yellow-400 to-orange-400',
  'from-pink-500 to-rose-500',
]

function formatTime(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default function LeaderboardPage() {
  const params   = useParams()
  const router   = useRouter()
  const quizId   = params.id
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizTitle, setQuizTitle] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [lbRes, quizRes] = await Promise.all([
          studentApi.getQuizLeaderboard(quizId),
          studentApi.getQuiz(quizId),
        ])
        setData(lbRes.data.data)
        setQuizTitle(quizRes.data.data?.title || 'Quiz')
      } catch {
        toast.error('Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [quizId])

  if (loading) return (
    <div className="page-wrapper">
      <div className="space-y-4">{[0,1,2,3].map(i => <SkeletonCard key={i} lines={2} />)}</div>
    </div>
  )

  const { leaderboard = [], currentUserEntry } = data || {}
  const top3 = leaderboard.slice(0, 3)
  const rest  = leaderboard.slice(3)

  const MEDALS = ['🥇', '🥈', '🥉']
  const PODIUM_HEIGHTS = ['h-24', 'h-16', 'h-12']
  const PODIUM_ORDER   = [1, 0, 2] // 2nd, 1st, 3rd

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors shadow-sm"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" /> Leaderboard
          </h1>
          <p className="text-sm text-gray-500 break-words">{quizTitle}</p>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Trophy size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No attempts yet — be the first!</p>
        </div>
      ) : (
        <>
          {/* TOP 3 PODIUM */}
          {top3.length >= 1 && (
            <div className="glass-card p-6 mb-6">
              <h2 className="font-display font-bold text-gray-800 dark:text-white text-center mb-6">Top Performers</h2>
              <div className="flex items-end justify-center gap-4">
                {PODIUM_ORDER.filter(idx => top3[idx]).map(idx => {
                  const entry = top3[idx]
                  const isFirst = idx === 0
                  const gradients = ['from-yellow-400 to-amber-400', 'from-gray-300 to-slate-400', 'from-orange-400 to-amber-600']
                  const bgColors  = ['bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/30',
                                     'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
                                     'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/30']
                  return (
                    <div key={idx} className={`flex flex-col items-center ${isFirst ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                      <span className="text-2xl mb-1">{MEDALS[idx]}</span>
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${GRADIENTS[idx]} flex items-center justify-center text-white font-bold text-base mb-2 ${isFirst ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}`}>
                        {entry.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <p className={`font-semibold text-gray-800 dark:text-white text-center text-xs mb-1 ${isFirst ? 'text-sm' : ''}`}>
                        {entry.name?.split(' ')[0]}
                        {entry.isCurrentUser && <span className="ml-1 text-[10px] text-purple-500">(You)</span>}
                      </p>
                      <p className={`font-extrabold ${isFirst ? 'text-xl' : 'text-base'} text-purple-600 dark:text-purple-400`}>
                        {entry.pct}%
                      </p>
                      {/* Podium bar */}
                      <div className={`w-20 mt-2 rounded-t-lg border ${bgColors[idx]} flex items-end justify-center ${PODIUM_HEIGHTS[idx]}`}>
                        <span className="text-xs font-bold text-gray-400 pb-2">#{idx + 1}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* FULL TABLE */}
          {rest.length > 0 && (
            <div className="glass-card overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-purple-100 dark:border-purple-900/30">
                <h3 className="font-display font-bold text-gray-800 dark:text-white text-sm">Full Rankings</h3>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="divide-y divide-gray-50 dark:divide-gray-800 min-w-[500px]">
                {rest.map((entry, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 ${entry.isCurrentUser ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'} transition-colors`}>
                    <span className="w-8 text-center text-sm font-bold text-gray-400">#{entry.rank}</span>
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                      {entry.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white break-words">
                        {entry.name}
                        {entry.isCurrentUser && <span className="ml-2 text-xs text-purple-500 font-bold">(You)</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${entry.pct >= 80 ? 'bg-green-400' : entry.pct >= 60 ? 'bg-purple-400' : 'bg-yellow-400'}`}
                            style={{ width: `${entry.pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{entry.score}/{entry.totalMarks}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-extrabold text-purple-600 dark:text-purple-400">{entry.pct}%</p>
                      <p className="text-[10px] text-gray-400">{formatTime(entry.timeTaken)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${entry.passed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {entry.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}

          {/* Current user not in top 20 */}
          {currentUserEntry && (
            <div className="glass-card border-2 border-purple-300 dark:border-purple-700 p-4">
              <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">Your Position</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-display">
                    #{currentUserEntry.rank}
                  </p>
                  <p className="text-sm text-gray-500">out of {leaderboard.length}+ students</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-gray-800 dark:text-white">{currentUserEntry.pct}%</p>
                  <p className="text-xs text-gray-400">{currentUserEntry.score}/{currentUserEntry.totalMarks} · {formatTime(currentUserEntry.timeTaken)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
