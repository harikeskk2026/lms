'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Trophy, FileDown } from 'lucide-react'
import { format } from 'date-fns'
import { adminApi } from '@/lib/api'
import toast from 'react-hot-toast'

function formatTime(seconds) {
  if (!seconds) return '—'
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

const GRADIENTS = [
  'from-purple-500 to-violet-600',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-yellow-400 to-orange-400',
  'from-pink-500 to-rose-500',
]

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??'
}

function exportCSV(leaderboard, quizTitle) {
  const headers = ['Rank', 'Name', 'Score', 'Total', 'Percentage', 'Time', 'Passed', 'Submitted At']
  const rows = leaderboard.map(e => [
    e.rank, e.name, e.score, e.totalMarks, `${e.pct}%`,
    formatTime(e.timeTaken), e.passed ? 'Yes' : 'No',
    e.submittedAt ? format(new Date(e.submittedAt), 'yyyy-MM-dd HH:mm') : ''
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${quizTitle}-leaderboard.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminLeaderboardPage() {
  const params  = useParams()
  const router  = useRouter()
  const quizId  = params.id
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizTitle, setQuizTitle] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const lbRes = await adminApi.getQuizLeaderboard(quizId)
        setData(lbRes.data.data)
        // Try to find quiz title from leaderboard quiz info
        const quizRes = await adminApi.getQuizResults(quizId)
        setQuizTitle(`Quiz #${quizId}`)
      } catch {
        toast.error('Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [quizId])

  if (loading) return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="space-y-3">{[0,1,2,3,4].map(i => (
        <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      ))}</div>
    </div>
  )

  const { leaderboard = [] } = data || {}
  const top3 = leaderboard.slice(0, 3)
  const rest  = leaderboard.slice(3)
  const MEDALS = ['🥇', '🥈', '🥉']
  const PODIUM_ORDER = [1, 0, 2]

  return (
    <div className="max-w-5xl mx-auto space-y-5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors shadow-sm">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="font-display font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy size={20} className="text-yellow-500" /> Leaderboard — {quizTitle}
            </h1>
            <p className="text-sm text-gray-500">{leaderboard.length} students attempted</p>
          </div>
        </div>
        {leaderboard.length > 0 && (
          <button
            onClick={() => exportCSV(leaderboard, quizTitle)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FileDown size={14} /> Export CSV
          </button>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
          <Trophy size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No attempts yet for this quiz</p>
        </div>
      ) : (
        <>
          {/* TOP 3 PODIUM */}
          {top3.length >= 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h2 className="font-display font-bold text-gray-800 dark:text-white text-center mb-6">Top 3</h2>
              <div className="flex items-end justify-center gap-6">
                {PODIUM_ORDER.filter(idx => top3[idx]).map(idx => {
                  const entry = top3[idx]
                  const isFirst = idx === 0
                  const podBg = [
                    'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200',
                    'bg-gray-50 dark:bg-gray-700/50 border-gray-200',
                    'bg-orange-50 dark:bg-orange-900/20 border-orange-200'
                  ]
                  const podH = ['h-20', 'h-12', 'h-10']
                  return (
                    <div key={idx} className={`flex flex-col items-center ${isFirst ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                      <span className="text-3xl mb-1">{MEDALS[idx]}</span>
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${GRADIENTS[idx]} flex items-center justify-center text-white font-bold text-sm mb-2 ${isFirst ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}>
                        {initials(entry.name)}
                      </div>
                      <p className={`font-semibold text-gray-800 dark:text-white text-center text-xs mb-1`}>
                        {entry.name}
                      </p>
                      <p className={`font-extrabold ${isFirst ? 'text-xl' : 'text-base'} text-purple-600 dark:text-purple-400`}>
                        {entry.pct}%
                      </p>
                      <p className="text-[10px] text-gray-400">{entry.score}/{entry.totalMarks}</p>
                      <div className={`w-24 mt-2 rounded-t-lg border ${podBg[idx]} flex items-end justify-center ${podH[idx]}`}>
                        <span className="text-xs font-bold text-gray-400 pb-1.5">#{idx + 1}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-800 dark:text-white text-sm">All Rankings</h3>
              <span className="text-xs text-gray-400">{leaderboard.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    {['Rank', 'Student', 'Score', 'Percentage', 'Time', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-500 text-sm">
                          {i < 3 ? MEDALS[i] : `#${entry.rank}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                            {initials(entry.name)}
                          </div>
                          <span className="font-semibold text-gray-800 dark:text-white text-sm">{entry.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${entry.pct >= 80 ? 'bg-green-400' : entry.pct >= 60 ? 'bg-purple-400' : 'bg-yellow-400'}`}
                              style={{ width: `${entry.pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">{entry.score}/{entry.totalMarks}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-extrabold text-sm ${entry.pct >= 80 ? 'text-green-600' : entry.pct >= 60 ? 'text-purple-600' : 'text-yellow-600'}`}>
                          {entry.pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatTime(entry.timeTaken)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${entry.passed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {entry.passed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {entry.submittedAt ? format(new Date(entry.submittedAt), 'dd MMM, HH:mm') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
