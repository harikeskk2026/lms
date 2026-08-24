'use client'
import { useState, useEffect } from 'react'
import { Download, BarChart2, FileText, Users } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'

const TABS = ['Attendance', 'Performance', 'Placement', 'Export']

function downloadCSV(data, filename) {
  if (!data.length) return toast.error('No data to export')
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [tab, setTab] = useState('Attendance')
  const [batches, setBatches] = useState([])
  const [batchFilter, setBatchFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [attReport, setAttReport] = useState([])
  const [perfReport, setPerfReport] = useState([])
  const [placementReport, setPlacementReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    adminApi.getBatches().then(r => setBatches(r.data.data || [])).catch(() => {})
    adminApi.getPlacement().then(r => setPlacementReport(r.data.data)).catch(() => {})
  }, [])

  const loadAttendance = async () => {
    setLoading(true)
    try {
      const r = await adminApi.getAttendanceReport({ batchId: batchFilter, startDate, endDate })
      setAttReport(r.data.data || [])
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const loadPerformance = async () => {
    setLoading(true)
    try {
      const r = await adminApi.getPerformanceReport({ batchId: batchFilter })
      setPerfReport(r.data.data || [])
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const attAvg = attReport.length ? Math.round(attReport.reduce((a, r) => a + r.percentage, 0) / attReport.length) : 0

  const placementChartData = placementReport ? [
    { name: 'Seeking', count: placementReport.statusCounts?.SEEKING || 0, fill: '#3b82f6' },
    { name: 'Interviewing', count: placementReport.statusCounts?.INTERVIEWING || 0, fill: '#f59e0b' },
    { name: 'Placed', count: placementReport.statusCounts?.PLACED || 0, fill: '#22c55e' },
    { name: 'Not Seeking', count: placementReport.statusCounts?.NOT_SEEKING || 0, fill: '#9ca3af' },
  ] : []

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Reports & Analytics</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/80 dark:bg-gray-900/70 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Attendance Report */}
      {tab === 'Attendance' && (
        <div className="space-y-4">
          <div className="glass-card p-5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Batch</label>
              <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <button onClick={loadAttendance} disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
            {attReport.length > 0 && (
              <button onClick={() => downloadCSV(attReport, 'attendance-report.csv')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">
                <Download size={14} /> Export CSV
              </button>
            )}
          </div>
          {attReport.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50/50 border-b border-purple-100">
                      {['Student', 'Enrollment', 'Present', 'Absent', 'Late', 'Total', 'Percentage'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attReport.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/20">
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{r.name}</td>
                        <td className="px-4 py-3"><span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{r.enrollmentNo}</span></td>
                        <td className="px-4 py-3 text-green-600 font-semibold">{r.present}</td>
                        <td className="px-4 py-3 text-red-500 font-semibold">{r.absent}</td>
                        <td className="px-4 py-3 text-yellow-600 font-semibold">{r.late}</td>
                        <td className="px-4 py-3 text-gray-600">{r.total}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.percentage >= 85 ? 'bg-green-100 text-green-700' : r.percentage >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                            {r.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-purple-50/30 border-t-2 border-purple-200">
                      <td className="px-4 py-3 font-bold text-gray-700" colSpan={6}>Class Average</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${attAvg >= 85 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{attAvg}%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Report */}
      {tab === 'Performance' && (
        <div className="space-y-4">
          <div className="glass-card p-5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Batch</label>
              <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button onClick={loadPerformance} disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
            {perfReport.length > 0 && (
              <button onClick={() => downloadCSV(perfReport, 'performance-report.csv')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">
                <Download size={14} /> Export CSV
              </button>
            )}
          </div>
          {perfReport.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50/50 border-b border-purple-100">
                      {['Student', 'Attendance%', 'Avg Quiz', 'Assignments', 'Avg Grade', 'Mocks', 'Avg Rating'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perfReport.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/20">
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{r.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.attendancePct >= 85 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {r.attendancePct}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.avgQuizScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {r.avgQuizScore}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.assignmentsSubmitted}</td>
                        <td className="px-4 py-3 text-gray-600">{r.avgGrade > 0 ? `${r.avgGrade}%` : '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.mockInterviewCount}</td>
                        <td className="px-4 py-3">
                          {r.avgMockRating > 0 ? (
                            <span className="text-yellow-500">{'★'.repeat(r.avgMockRating)}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Placement Report */}
      {tab === 'Placement' && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Placement Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={placementChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {placementChartData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Summary</h3>
              <div className="space-y-3">
                {placementChartData.map(d => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                    <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">{d.name}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-white">{d.count}</span>
                  </div>
                ))}
                {placementReport && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm font-semibold text-green-600">
                      Conversion rate: {placementReport.conversionRate || 0}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Tab */}
      {tab === 'Export' && (
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { label: 'Student List', desc: 'All students with profiles, batch, placement status', icon: Users, type: 'students', file: 'students.csv' },
            { label: 'Attendance Report', desc: 'Per-student attendance breakdown', icon: BarChart2, type: 'attendance', file: 'attendance.csv' },
            { label: 'Performance Report', desc: 'Quiz scores, attendance, assignment grades', icon: FileText, type: 'performance', file: 'performance.csv' },
          ].map(({ label, desc, icon: Icon, type, file }) => (
            <div key={type} className="glass-card p-6 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Icon size={22} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-800 dark:text-white">{label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              {type === 'attendance' && (
                <div className="space-y-2">
                  <input type="date" placeholder="Start date" onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                  <input type="date" placeholder="End date" onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              )}
              <button
                onClick={async () => {
                  try {
                    const r = await adminApi.exportCSV({ type, batchId: batchFilter, startDate, endDate })
                    downloadCSV(r.data.data || [], file)
                  } catch { toast.error('Export failed') }
                }}
                className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold hover:from-purple-700 transition-all">
                <Download size={15} /> Download CSV
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
