'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { format, formatDistanceToNow, differenceInDays, isPast } from 'date-fns'
import {
  Star, CheckCircle, Circle, Briefcase, ExternalLink, Plus,
  ChevronDown, ChevronUp, Target, TrendingUp, FileText, Code2, Brain,
  BookOpen, Link2, Github, Linkedin, MapPin, Phone, Globe,
  BarChart2, ArrowRight, Edit2, X, Save, Download,
  AlertCircle, Building2, Clock, BadgeCheck, Loader2, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { studentApi } from '@/lib/api'
import ResumePreview from '@/components/student/ResumePreview'
import { useConfirmModal } from '@/components/ui/ConfirmModal'
import CustomSelect from '@/components/ui/CustomSelect'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'

// recharts is a heavy dependency - load each chart only when its tab is
// viewed, and only on the client (SSR doesn't need it).
const CHART_SKELETON = <div className="h-[200px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
const MockInterviewTrendChart = dynamic(
  () => import('@/components/student/placement/MockInterviewTrendChart'),
  { ssr: false, loading: () => CHART_SKELETON }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StarRating({ rating, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={13} className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
      ))}
    </div>
  )
}

function ProgressRing({ value, size = 80, strokeWidth = 7, color = '#6d28d9' }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  )
}

const STATUS_STEPS = ['SEEKING', 'INTERVIEWING', 'PLACED']
const STATUS_LABELS = { SEEKING: 'Seeking', INTERVIEWING: 'Interviewing', PLACED: 'Placed', NOT_SEEKING: 'Not Seeking' }
const STATUS_COLORS = {
  SEEKING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  INTERVIEWING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  PLACED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  NOT_SEEKING: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}
// A drive is open for applications until its apply deadline - there is no manual status.
function isOpenDrive(d) {
  return !!d?.applyDeadline && !isPast(new Date(d.applyDeadline))
}
// Students never apply directly - this is the admin-mediated pipeline their
// expressed interest moves through (see DriveApplicationStatus on the backend).
const APPLICATION_STATUS_LABELS = {
  INTERESTED: 'Interested',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  RESUME_SHARED: 'Resume Shared',
  SELECTED: 'Selected',
  OFFERED: 'Offered',
  ACCEPTED: 'Offered Accepted',
  NOT_SELECTED: 'Not Selected',
  REJECTED: 'Not Selected',
  WITHDRAWN: 'Withdrawn',
}
const APPLICATION_STATUS_COLORS = {
  INTERESTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  SHORTLISTED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  RESUME_SHARED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  SELECTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  OFFERED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  NOT_SELECTED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  REJECTED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  WITHDRAWN: 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}
const UPDATE_ICON = { SHORTLIST: '⭐', INTERVIEW: '📅', ACTION: '📋', FEEDBACK: '💬', UPDATE: '📌' }

const RESOURCE_ICONS = {
  Book: BookOpen,
  'Free Resource': Code2,
  Guide: FileText,
  GitHub: BarChart2,
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PlacementPage() {
  const [hub, setHub] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [mocks, setMocks] = useState([])
  const [offers, setOffers] = useState([])
  const [interviews, setInterviews] = useState([])
  const [prepList, setPrepList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Dashboard')

  const TABS = ['Dashboard', 'Resume Builder', 'Company Drives', 'Prep Materials', 'My Offers', 'Interviews', 'Interview Prep']

  useEffect(() => {
    // Independent settles - one not-yet-implemented section (rolled out phase by
    // phase) must not blank the whole page; each tab loads its own data anyway.
    Promise.allSettled([
      studentApi.getPlacementHub(),
      studentApi.getMockAnalytics(),
      studentApi.getMockInterviews(),
    ]).then(([h, a, m]) => {
      if (h.status === 'fulfilled') setHub(h.value.data.data)
      if (a.status === 'fulfilled') setAnalytics(a.value.data.data)
      if (m.status === 'fulfilled') {
        const rawMocks = m.value.data.data || []
        setMocks(rawMocks.map(mk => {
          const c = (mk.candidates || [])[0]
          return {
            ...mk,
            status: c?.status || mk.status,
            rating: c?.rating ?? null,
            feedback: c?.feedback || null,
            strengths: c?.strengths || [],
            improvements: c?.improvements || [],
          }
        }))
      }
    }).finally(() => setLoading(false))
  }, [])

  const refreshHub = () => {
    studentApi.getPlacementHub().then(h => setHub(h.data.data)).catch(() => {})
  }

  useEffect(() => {
    if (tab === 'My Offers') {
      studentApi.getMyOffers().then(r => setOffers(r.data.data || [])).catch(() => {})
    }
    if (tab === 'Interviews') {
      studentApi.getMyInterviews().then(r => setInterviews(r.data.data || [])).catch(() => {})
    }
    if (tab === 'Prep Materials') {
      studentApi.getPreparationMaterials().then(r => setPrepList(r.data.data || [])).catch(() => toast.error('Failed to load preparation materials'))
    }
  }, [tab])

  if (loading) return <LoadingState />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero Header */}
      <HeroHeader hub={hub} refreshHub={refreshHub} />

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-none px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  tab === t
                    ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'Dashboard' && <DashboardTab hub={hub} analytics={analytics} mocks={mocks} />}
        {tab === 'Resume Builder' && <ResumeBuilderTab hub={hub} refreshHub={refreshHub} />}
        {tab === 'Company Drives' && <CompanyDrivesTab />}
        {tab === 'Prep Materials' && <PrepMaterialsTab list={prepList} reload={() => studentApi.getPreparationMaterials().then(r => setPrepList(r.data.data || []))} />}
        {tab === 'My Offers' && <MyOffersTab offers={offers} reload={() => studentApi.getMyOffers().then(r => setOffers(r.data.data || [])).catch(err => toast.error('Failed to load offers'))} setOffers={setOffers} />}
        {tab === 'Interviews' && <InterviewsTab interviews={interviews} reload={() => studentApi.getMyInterviews().then(r => setInterviews(r.data.data || [])).catch(err => toast.error('Failed to load interviews'))} />}
        {tab === 'Interview Prep' && <InterviewPrepTab hub={hub} />}
      </div>
    </div>
  )
}

// ─── Hero Header ──────────────────────────────────────────────────────────────
function HeroHeader({ hub, refreshHub }) {
  const [statusDropdown, setStatusDropdown] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const handleStatusChange = async (status) => {
    setStatusDropdown(false)
    setUpdatingStatus(true)
    try {
      await studentApi.updatePlacementProfile({ placementStatus: status })
      refreshHub()
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const readiness = hub?.readinessScore || 0
  const currentStatus = hub?.profile?.placementStatus || hub?.status || 'SEEKING'
  const stepIdx = STATUS_STEPS.indexOf(currentStatus)

  return (
    <div className="bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          {/* Left */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-purple-300 text-sm font-medium">Career Launch Centre</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Placement Hub
            </h1>
            <p className="text-purple-200 text-sm">
              {[hub?.batchName, hub?.courseName].filter(Boolean).join(' · ') || 'Placement Hub'}
            </p>

            {/* Status timeline */}
            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                      ${i <= stepIdx ? 'bg-purple-500 border-purple-400 text-white' : 'bg-white/10 border-white/20 text-white/40'}`}>
                      {i < stepIdx ? '✓' : i + 1}
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`w-8 h-0.5 mx-0.5 ${i < stepIdx ? 'bg-purple-400' : 'bg-white/20'}`} />
                    )}
                  </div>
                ))}
              </div>
              <span className="text-purple-200 text-xs ml-2">{STATUS_LABELS[currentStatus]}</span>
            </div>

            {/* Status update */}
            <div className="mt-3 relative inline-block">
              <button
                onClick={() => setStatusDropdown(!statusDropdown)}
                disabled={updatingStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-medium transition-all"
              >
                {updatingStatus ? <Loader2 size={12} className="animate-spin" /> : null}
                Update Status
                <ChevronDown size={12} />
              </button>
              {statusDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-36 overflow-hidden">
                  {['SEEKING', 'INTERVIEWING', 'PLACED', 'NOT_SEEKING'].map(s => (
                    <button key={s} onClick={() => handleStatusChange(s)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium">
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Readiness Ring */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {/* Quick links */}
            <div className="flex flex-col gap-2 text-xs">
              {hub?.profile?.linkedinUrl ? (
                <a href={hub.profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-300 hover:text-blue-200">
                  <Linkedin size={12} /> LinkedIn
                </a>
              ) : (
                <span className="flex items-center gap-1.5 text-white/40"><Linkedin size={12} /> No LinkedIn</span>
              )}
              {hub?.profile?.githubUrl ? (
                <a href={hub.profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/60 hover:text-white/90">
                  <Github size={12} /> GitHub
                </a>
              ) : (
                <span className="flex items-center gap-1.5 text-white/40"><Github size={12} /> No GitHub</span>
              )}
            </div>

            {/* Ring */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <ProgressRing value={readiness} size={90} strokeWidth={8} color={readiness >= 70 ? '#10b981' : '#6d28d9'} />
                <div className="absolute text-center">
                  <div className="text-lg font-bold">{readiness}%</div>
                </div>
              </div>
              <p className="text-xs text-purple-200 mt-1">
                {readiness >= 80 ? 'Ready!' : readiness >= 50 ? 'Good progress' : 'Improve profile'}
              </p>
              <p className="text-[10px] text-purple-300">Readiness Score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function DashboardTab({ hub, analytics, mocks }) {
  const completed = (mocks || []).filter(m => m.status === 'COMPLETED')
  const scheduled = (mocks || []).filter(m => m.status === 'SCHEDULED' || m.status === 'RESCHEDULED')
  const nextMock = scheduled.length ? scheduled.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] : null

  const trends = completed
    .slice()
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .map(m => ({ label: format(new Date(m.scheduledAt), 'dd MMM'), rating: m.rating || 0 }))

  const updates = [
    ...(hub?.profile?.resumeUrl ? [{ type: 'ACTION', title: 'Resume uploaded', body: 'Your resume is visible to placement coordinators.', createdAt: new Date().toISOString() }] : []),
    ...completed.slice(0, 4).map(m => ({
      type: 'FEEDBACK',
      title: `Mock ${m.rating ? 'rated ' + m.rating + '/5' : 'completed'} · ${m.interviewerName || 'Interviewer'}`,
      body: m.feedback || 'No feedback recorded.',
      createdAt: m.scheduledAt,
    })),
  ]

  const [checklist, setChecklist] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('mock_checklist') || '{}') }
      catch { return {} }
    }
    return {}
  })

  const toggleCheck = (key) => {
    const next = { ...checklist, [key]: !checklist[key] }
    setChecklist(next)
    if (typeof window !== 'undefined') localStorage.setItem('mock_checklist', JSON.stringify(next))
  }

  const checklistItems = ['Review key OOP concepts', 'Practice 2 DSA problems', 'Prepare STAR stories', 'Test meeting link']

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Brain} label="Mock Interviews" value={`${completed.length}/${analytics?.totalMocks || 0}`}
          sub={<StarRating rating={Math.round(analytics?.averageRating || 0)} />} color="purple" />
        <KpiCard icon={Briefcase} label="Drive Applications" value={hub?.appliedDrives || 0}
          sub={<span className="text-gray-500 text-xs">{hub?.totalDrives || 0} drives on campus</span>} color="blue" />
        <KpiCard icon={FileText} label="Resume"
          value={hub?.profile?.resumeUrl ? 'Completed' : 'Incomplete'}
          sub={<span className={hub?.profile?.resumeUrl ? 'text-emerald-600' : 'text-yellow-600'}>
            {hub?.profile?.resumeUrl ? '✓ Ready' : '⚠ Needs work'}
          </span>} color="emerald" />
        <KpiCard icon={Target} label="Placement Status"
          value={<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[hub?.profile?.placementStatus || 'SEEKING']}`}>
            {STATUS_LABELS[hub?.profile?.placementStatus || 'SEEKING']}
          </span>}
          sub="" color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 space-y-4">
          {trends.length > 0 ? (
            <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-600" />
                Mock Interview Performance
              </h3>
              <MockInterviewTrendChart trend={trends} />
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-5 flex flex-col items-center justify-center h-48 text-gray-400">
              <Brain size={32} className="mb-2 text-purple-200" />
              <p className="text-sm">Complete your first mock interview to see performance trends</p>
            </div>
          )}

          {/* Recent feedback */}
          {completed.length > 0 && (
            <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-5">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-3">Recent Mock Feedback</h4>
              <div className="space-y-3">
                {completed.slice(0, 3).map(m => (
                  <div key={m.id} className="flex items-start gap-3">
                    <div className="flex-none w-14">
                      <StarRating rating={m.rating || 0} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-white">{m.interviewerName || 'Mock Interview'}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{m.feedback || 'No feedback recorded.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Next mock interview */}
          {nextMock && (
            <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border-l-4 border-emerald-500 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl shadow-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">UPCOMING MOCK</span>
              </div>
              <p className="font-semibold text-gray-800 dark:text-white text-sm">
                {nextMock.interviewerName ? `with ${nextMock.interviewerName}` : 'Mock Interview'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {format(new Date(nextMock.scheduledAt), 'EEE, MMM d · h:mm a')}
                {nextMock.mode ? ` · ${nextMock.mode === 'ONLINE' ? 'Online' : 'Offline'}` : ''}
                {nextMock.durationMinutes ? ` · ${nextMock.durationMinutes}m` : ''}
              </p>
              {nextMock.mode === 'OFFLINE' && nextMock.location ? (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><MapPin size={11} /> {nextMock.location}</p>
              ) : null}
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                {formatDistanceToNow(new Date(nextMock.scheduledAt), { addSuffix: true })}
              </p>

              {/* Prep checklist */}
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Prep Checklist</p>
                {checklistItems.map((item, i) => (
                  <button key={i} onClick={() => toggleCheck(item)}
                    className="w-full flex items-center gap-2 text-left">
                    {checklist[item]
                      ? <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                      : <Circle size={13} className="text-gray-300 shrink-0" />}
                    <span className={`text-[11px] ${checklist[item] ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{item}</span>
                  </button>
                ))}
              </div>

              {nextMock.meetLink && (() => {
                const isPastScheduledTime = new Date(nextMock.scheduledAt).getTime() <= Date.now()
                return isPastScheduledTime ? (
                  <a href={nextMock.meetLink} target="_blank" rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors">
                    Join Meeting <ExternalLink size={11} />
                  </a>
                ) : (
                  <div className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed">
                    Join Meeting <Lock size={11} />
                  </div>
                )
              })()}
            </div>
          )}

          {/* Recent Updates */}
          <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-3 text-sm">Recent Updates</h3>
            {updates.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No updates yet</p>
            ) : (
              <div className="space-y-3">
                {updates.slice(0, 4).map((u, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {UPDATE_ICON[u.type] || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-white break-words">{u.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{u.body}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    purple: 'from-purple-500/10 to-violet-500/10 border-purple-100 dark:border-purple-900/30',
    blue:   'from-blue-500/10 to-indigo-500/10 border-blue-100 dark:border-blue-900/30',
    emerald:'from-emerald-500/10 to-teal-500/10 border-emerald-100 dark:border-emerald-900/30',
    violet: 'from-violet-500/10 to-purple-500/10 border-violet-100 dark:border-violet-900/30',
  }
  const iconColors = {
    purple: 'text-purple-600', blue: 'text-blue-600', emerald: 'text-emerald-600', violet: 'text-violet-600'
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} bg-white dark:bg-gray-900/70 backdrop-blur-xl border rounded-2xl shadow-xl p-4`}>
      <div className="flex items-start justify-between mb-2">
        <Icon size={18} className={iconColors[color]} />
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">{value}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</div>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  )
}

// ─── RESUME BUILDER TAB ───────────────────────────────────────────────────────
function ResumeBuilderTab({ hub, refreshHub }) {
  const [resumeData, setResumeData] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [openSection, setOpenSection] = useState('personal')
  const debounceTimer = useRef(null)

  useEffect(() => {
    Promise.all([studentApi.getResume()]).then(([r]) => {
      setResumeData(r.data.data)
    }).catch(() => toast.error('Failed to load resume')).finally(() => setLoading(false))
  }, [])

  const autoSave = useCallback((data) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await studentApi.saveResume(data)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to save')
      } finally {
        setSaving(false)
      }
    }, 1500)
  }, [])

  const updateField = (field, value) => {
    const next = { ...resumeData, [field]: value }
    setResumeData(next)
    autoSave(next)
  }

  const updateArrayItem = (section, index, field, value) => {
    const arr = [...(resumeData[section] || [])]
    arr[index] = { ...arr[index], [field]: value }
    updateField(section, arr)
  }

  const addItem = (section, template) => {
    const arr = [...(resumeData[section] || []), template]
    updateField(section, arr)
  }

  const removeItem = (section, index) => {
    const arr = (resumeData[section] || []).filter((_, i) => i !== index)
    updateField(section, arr)
  }

  const handlePrint = () => {
    const el = document.getElementById('resume-print-area')
    if (!el) return
    const w = window.open('', '', 'width=800,height=900')
    w.document.write(`<html><head><title>Resume</title><style>
      body { margin: 0; font-family: sans-serif; font-size: 11px; }
      h1 { font-size: 18px; font-weight: bold; margin: 0; }
      h2 { font-size: 10px; font-weight: bold; color: #7c3aed; border-left: 2px solid #7c3aed; padding-left: 6px; text-transform: uppercase; letter-spacing: 0.1em; margin: 8px 0 4px; }
      .header { border-bottom: 2px solid #7c3aed; padding-bottom: 8px; margin-bottom: 8px; }
      .contact { display: flex; flex-wrap: wrap; gap: 8px; font-size: 10px; color: #555; margin-top: 4px; }
      .chip { background: #f3e8ff; color: #7c3aed; padding: 1px 6px; border-radius: 999px; font-size: 9px; }
      .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .gray { color: #888; font-size: 10px; }
    </style></head><body>${el.innerHTML}</body></html>`)
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  if (loading || !resumeData) return <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-purple-600" /></div>

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: '👤' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'experience', label: 'Work Experience', icon: '💼' },
    { id: 'projects', label: 'Projects', icon: '🚀' },
    { id: 'certifications', label: 'Certifications', icon: '🏆' },
    { id: 'languages', label: 'Languages', icon: '🌐' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Form */}
      <div className="lg:col-span-3 space-y-3">
        {/* Save indicator */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Resume Builder</h2>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Saving...</span>}
            {saved && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle size={11} /> Saved</span>}
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors">
              <Download size={13} /> Download PDF
            </button>
          </div>
        </div>

        {sections.map(sec => (
          <div key={sec.id} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white text-sm">
                <span>{sec.icon}</span> {sec.label}
              </span>
              {openSection === sec.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {openSection === sec.id && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800">
                {sec.id === 'personal' && (
                  <div className="space-y-3">
                    <FormInput label="Professional Headline" placeholder="Enter professional headline" value={resumeData.headline || ''} onChange={v => updateField('headline', v)} />
                    <FormTextarea label="Professional Summary" placeholder="Enter professional summary" value={resumeData.summary || ''} onChange={v => updateField('summary', v)} rows={3} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormInput label="Phone" placeholder="Enter 10-digit phone number" value={resumeData.phone || ''} onChange={v => updateField('phone', v.replace(/\D/g, '').slice(0, 10))} />
                      <FormInput label="Location" placeholder="Enter location (City, State)" value={resumeData.location || ''} onChange={v => updateField('location', v)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormInput label="LinkedIn URL" placeholder="Enter LinkedIn profile URL" value={resumeData.linkedinUrl || ''} onChange={v => updateField('linkedinUrl', v)} />
                      <FormInput label="GitHub URL" placeholder="Enter GitHub profile URL" value={resumeData.githubUrl || ''} onChange={v => updateField('githubUrl', v)} />
                    </div>
                    <FormInput label="Portfolio URL" placeholder="Enter portfolio website URL" value={resumeData.portfolioUrl || ''} onChange={v => updateField('portfolioUrl', v)} />
                  </div>
                )}

                {sec.id === 'education' && (
                  <ArraySection items={resumeData.education || []}
                    onAdd={() => addItem('education', { degree: '', institution: '', year: '', grade: '' })}
                    onRemove={(i) => removeItem('education', i)}
                    renderItem={(edu, i) => (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <FormInput label="Degree/Course" placeholder="Enter degree or course name" value={edu.degree || ''} onChange={v => updateArrayItem('education', i, 'degree', v)} />
                        <FormInput label="Institution" placeholder="Enter institution name" value={edu.institution || ''} onChange={v => updateArrayItem('education', i, 'institution', v)} />
                        <FormInput label="Year" placeholder="Enter years of study" value={edu.year || ''} onChange={v => updateArrayItem('education', i, 'year', v)} />
                        <FormInput label="Grade/%" placeholder="Enter grade or percentage" value={edu.grade || ''} onChange={v => updateArrayItem('education', i, 'grade', v)} />
                      </div>
                    )}
                  />
                )}

                {sec.id === 'experience' && (
                  <ArraySection items={resumeData.experience || []}
                    onAdd={() => addItem('experience', { role: '', company: '', duration: '', description: '' })}
                    onRemove={(i) => removeItem('experience', i)}
                    renderItem={(exp, i) => (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <FormInput label="Role" placeholder="Enter job role" value={exp.role || ''} onChange={v => updateArrayItem('experience', i, 'role', v)} />
                          <FormInput label="Company" placeholder="Enter company name" value={exp.company || ''} onChange={v => updateArrayItem('experience', i, 'company', v)} />
                        </div>
                        <FormInput label="Duration" placeholder="Enter duration" value={exp.duration || ''} onChange={v => updateArrayItem('experience', i, 'duration', v)} />
                        <FormTextarea label="Description" placeholder="Enter responsibilities and achievements" value={exp.description || ''} onChange={v => updateArrayItem('experience', i, 'description', v)} rows={2} />
                      </div>
                    )}
                  />
                )}

                {sec.id === 'projects' && (
                  <ArraySection items={resumeData.projects || []}
                    onAdd={() => addItem('projects', { name: '', tech: '', description: '', github: '', live: '' })}
                    onRemove={(i) => removeItem('projects', i)}
                    renderItem={(proj, i) => (
                      <div className="space-y-2">
                        <FormInput label="Project Name" placeholder="Enter project name" value={proj.name || ''} onChange={v => updateArrayItem('projects', i, 'name', v)} />
                        <FormInput label="Tech Stack (comma separated)" placeholder="Enter tech stack (comma-separated)" value={proj.tech || ''} onChange={v => updateArrayItem('projects', i, 'tech', v)} />
                        <FormTextarea label="Description" placeholder="Enter project description" value={proj.description || ''} onChange={v => updateArrayItem('projects', i, 'description', v)} rows={2} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <FormInput label="GitHub Link" placeholder="Enter GitHub repository link" value={proj.github || ''} onChange={v => updateArrayItem('projects', i, 'github', v)} />
                          <FormInput label="Live Link" placeholder="Enter live project URL" value={proj.live || ''} onChange={v => updateArrayItem('projects', i, 'live', v)} />
                        </div>
                      </div>
                    )}
                  />
                )}

                {sec.id === 'certifications' && (
                  <ArraySection items={resumeData.certifications || []}
                    onAdd={() => addItem('certifications', { name: '', issuer: '', date: '', url: '' })}
                    onRemove={(i) => removeItem('certifications', i)}
                    renderItem={(cert, i) => (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <FormInput label="Certificate Name" placeholder="Enter certificate name" value={cert.name || ''} onChange={v => updateArrayItem('certifications', i, 'name', v)} />
                        <FormInput label="Issuer" placeholder="Enter issuing organization" value={cert.issuer || ''} onChange={v => updateArrayItem('certifications', i, 'issuer', v)} />
                        <FormInput label="Date" placeholder="Enter issue date" value={cert.date || ''} onChange={v => updateArrayItem('certifications', i, 'date', v)} />
                        <FormInput label="Credential URL" placeholder="Enter credential verification URL" value={cert.url || ''} onChange={v => updateArrayItem('certifications', i, 'url', v)} />
                      </div>
                    )}
                  />
                )}

                {sec.id === 'languages' && (
                  <ArraySection items={resumeData.languages || []}
                    onAdd={() => addItem('languages', { name: '', level: 'Conversational' })}
                    onRemove={(i) => removeItem('languages', i)}
                    renderItem={(lang, i) => (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <FormInput label="Language" placeholder="Enter language" value={lang.name || ''} onChange={v => updateArrayItem('languages', i, 'name', v)} />
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Proficiency</label>
                          <CustomSelect
                            compact
                            value={lang.level || 'Conversational'}
                            onChange={v => updateArrayItem('languages', i, 'level', v)}
                            options={['Native', 'Fluent', 'Conversational', 'Basic'].map(l => ({ value: l, label: l }))}
                          />
                        </div>
                      </div>
                    )}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right: Preview */}
      <div className="lg:col-span-2">
        <div className="sticky top-20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Live Preview</h3>
            <span className="text-[10px] text-gray-400">Scroll to see full resume</span>
          </div>
          <div id="resume-print-area" className="max-h-[70vh] overflow-y-auto rounded-xl shadow-lg">
            <ResumePreview resumeData={resumeData} studentName={resumeData?.headline ? undefined : undefined} />
          </div>
        </div>
      </div>
    </div>
  )
}

function FormInput({ label, placeholder, value, onChange }) {
  return (
    <div>
      {label && <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" />
    </div>
  )
}

function FormTextarea({ label, placeholder, value, onChange, rows = 3 }) {
  return (
    <div>
      {label && <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none" />
    </div>
  )
}

function ArraySection({ items, onAdd, onRemove, renderItem }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="relative bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <button onClick={() => onRemove(i)}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors">
            <X size={10} />
          </button>
          {renderItem(item, i)}
        </div>
      ))}
      <button onClick={onAdd}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
        <Plus size={13} /> Add Item
      </button>
    </div>
  )
}

// ─── COMPANY DRIVES TAB ───────────────────────────────────────────────────────
function CompanyDrivesTab() {
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [drivePage, setDrivePage] = useState(1)
  const [drivePageSize, setDrivePageSize] = useState(6)
  const [expanded, setExpanded] = useState(null)
  const [applying, setApplying] = useState(null)
  const [withdrawing, setWithdrawing] = useState(null)
  const [ask, confirmModal] = useConfirmModal()

  useEffect(() => {
    studentApi.getDrives().then(r => setDrives(r.data.data || [])).catch(() => toast.error('Failed to load drives')).finally(() => setLoading(false))
  }, [])

  const filtered = drives.filter(d => {
    const matchFilter = filter === 'All' || (filter === 'Interested' ? !!d.applicationStatus : filter === 'Open' ? isOpenDrive(d) : !isOpenDrive(d))
    const matchSearch = !search || d.companyName.toLowerCase().includes(search.toLowerCase()) || d.role.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const handleExpressInterest = async (drive) => {
    setApplying(drive.id)
    try {
      await studentApi.expressInterest(drive.id)
      setDrives(prev => prev.map(d => d.id === drive.id ? { ...d, applicationStatus: 'INTERESTED' } : d))
      toast.success(`Interest recorded for ${drive.companyName}!`)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to record interest')
    } finally {
      setApplying(null)
    }
  }

  const handleWithdraw = async (drive) => {
    const ok = await ask({ title: 'Withdraw Application?', message: `Withdraw your application for ${drive.companyName}? This can't be undone.`, confirmLabel: 'Withdraw' })
    if (!ok) return
    setWithdrawing(drive.id)
    try {
      await studentApi.withdrawInterest(drive.id)
      setDrives(prev => prev.map(d => d.id === drive.id ? { ...d, applicationStatus: 'WITHDRAWN' } : d))
      toast.success('Application withdrawn')
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to withdraw application')
    } finally {
      setWithdrawing(null)
    }
  }

  function DeadlineChip({ deadline }) {
    const days = differenceInDays(new Date(deadline), new Date())
    if (isPast(new Date(deadline))) return <span className="text-[10px] bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">Deadline passed</span>
    if (days === 0) return <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-bold animate-pulse">Today!</span>
    if (days === 1) return <span className="text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full font-bold">1 day left</span>
    if (days <= 3) return <span className="text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">{days} days left</span>
    return <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">{days} days left</span>
  }

  function CompanyInitials({ name }) {
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    const colors = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500']
    const color = colors[name.charCodeAt(0) % colors.length]
    return (
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
        {initials}
      </div>
    )
  }

  const anyProfileIncomplete = drives.some(d => d.profileIncomplete)

  const clampPage = (d, p, s) => Math.min(p, Math.max(1, Math.ceil(d.length / s)))
  const drivePageEff = clampPage(filtered, drivePage, drivePageSize)

  return (
    <div className="space-y-5">
      {/* Profile-completion nudge — eligibility can't be fully checked without it */}
      {anyProfileIncomplete && (
        <Link href="/student/profile"
          className="flex items-center gap-3 p-4 rounded-2xl border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Complete your academic profile to see accurate eligibility</p>
            <p className="text-xs text-gray-500 mt-0.5">Some drives can't confirm your eligibility until your CGPA/percentage and backlog details are on file.</p>
          </div>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">Go to My Profile →</span>
        </Link>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or role..."
          className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
        <div className="flex gap-2">
          {['All', 'Open', 'Closed', 'Interested'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f ? 'bg-purple-600 text-white shadow' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Drives grid */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Briefcase size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm font-medium">No drives available</p>
          <p className="text-xs mt-1">Check back later for new opportunities</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.slice((drivePageEff - 1) * drivePageSize, drivePageEff * drivePageSize).map(drive => (
            <div key={drive.id} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden">
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <CompanyInitials name={drive.companyName} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{drive.companyName}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{drive.role}</p>
                      </div>
<span className={`flex-none text-[10px] px-2 py-0.5 rounded-full font-semibold ${isOpenDrive(drive) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {isOpenDrive(drive) ? 'Open' : 'Closed'}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-0.5"><MapPin size={9} /> {drive.location}</span>
                      <span className="flex items-center gap-0.5">💰 {drive.packageOffered}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                        drive.driveType === 'CAMPUS' ? 'bg-purple-50 text-purple-600' :
                        drive.driveType === 'VIRTUAL' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>{drive.driveType}</span>
                    </div>
                  </div>
                </div>

                {/* Skills chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {drive.skills.slice(0, 4).map((s, i) => (
                    <span key={i} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-medium">{s}</span>
                  ))}
                  {drive.skills.length > 4 && <span className="text-[10px] text-gray-400">+{drive.skills.length - 4}</span>}
                </div>

                {/* Dates & actions */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <DeadlineChip deadline={drive.applyDeadline} />
                    <span className="text-[10px] text-gray-400">Drive: {format(new Date(drive.driveDate), 'MMM d')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {drive.applicationStatus ? (
                      <>
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${APPLICATION_STATUS_COLORS[drive.applicationStatus] || ''}`}>
                          <CheckCircle size={10} /> {APPLICATION_STATUS_LABELS[drive.applicationStatus] || drive.applicationStatus}
                        </span>
                        {['INTERESTED', 'UNDER_REVIEW', 'SHORTLISTED', 'RESUME_SHARED'].includes(drive.applicationStatus) && (
                          <button onClick={() => handleWithdraw(drive)} disabled={withdrawing === drive.id}
                            className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-xl text-[10px] font-medium hover:border-red-300 hover:text-red-500 transition-colors">
                            {withdrawing === drive.id ? <Loader2 size={10} className="animate-spin" /> : 'Withdraw'}
                          </button>
                        )}
                      </>
                    ) : drive.profileIncomplete ? (
                      <Link href="/student/profile" title={(drive.ineligibilityReasons || []).join('; ')}
                        className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-xl text-[10px] font-bold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                        <AlertCircle size={10} /> Complete Profile
                      </Link>
                    ) : !drive.isEligible ? (
                      <span title={(drive.ineligibilityReasons || []).join('; ')}
                        className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-xl text-[10px] font-bold cursor-help">
                        <AlertCircle size={10} /> Not Eligible
                      </span>
                    ) : (
                      <button onClick={() => handleExpressInterest(drive)} disabled={applying === drive.id || !isOpenDrive(drive)}
                        className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold transition-colors">
                        {applying === drive.id ? <Loader2 size={10} className="animate-spin" /> : null}
                        I'm Interested →
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expandable detail */}
              <button onClick={() => setExpanded(expanded === drive.id ? null : drive.id)}
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span>{expanded === drive.id ? 'Hide details' : 'Show details'}</span>
                {expanded === drive.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {expanded === drive.id && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
                  <p className="text-xs text-gray-600 dark:text-gray-400">{drive.description}</p>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Requirements</p>
                    <div className="flex flex-wrap gap-1.5">
                      {drive.requirements.map((r, i) => (
                        <span key={i} className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  {drive.applyLink && (
                    <a href={drive.applyLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium">
                      <ExternalLink size={11} /> Company reference link
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Pagination
        data={filtered}
        page={drivePage}
        pageSize={drivePageSize}
        onPageChange={setDrivePage}
        onPageSizeChange={v => { setDrivePageSize(v); setDrivePage(1) }}
        label="drives"
      />
      {confirmModal}
    </div>
  )
}

// ─── MY OFFERS TAB ────────────────────────────────────────────────────────────
const OFFER_STATUS_STYLES = {
  OFFERED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  REJECTED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  WITHDRAWN: 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

function MyOffersTab({ offers, reload, setOffers }) {
  const [acting, setActing] = useState(null)
  const [offerSearch, setOfferSearch] = useState('')
  const [offerPage, setOfferPage] = useState(1)
  const [offerPageSize, setOfferPageSize] = useState(5)
  const [ask, confirmModal] = useConfirmModal()

  const respond = async (offer, action) => {
    const isAccept = action === 'accept'
    const ok = await ask({
      title: `${isAccept ? 'Accept' : 'Reject'} Offer?`,
      message: `Are you sure you want to ${isAccept ? 'accept' : 'reject'} the offer from ${offer.companyName} (${offer.role})?`,
      confirmLabel: isAccept ? 'Accept' : 'Reject',
      tone: isAccept ? 'success' : 'danger',
    })
    if (!ok) return
    setActing(offer.id)
    try {
      await (action === 'accept' ? studentApi.acceptOffer(offer.id) : studentApi.rejectOffer(offer.id))
      toast.success(action === 'accept' ? 'Offer accepted — congratulations!' : 'Offer declined')
      reload()
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${action} offer`)
    } finally {
      setActing(null)
    }
  }

  if (offers.length === 0) {
    return (
      <div className="glass-card p-10 text-center space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">No offers yet</p>
        <p className="text-xs text-gray-400">Offers appear here once a company selects you after your interviews.</p>
      </div>
    )
  }

  const filtered = offers.filter(o =>
    !offerSearch || `${o.companyName} ${o.role}`.toLowerCase().includes(offerSearch.toLowerCase())
  )

  const clampPage = (d, p, s) => Math.min(p, Math.max(1, Math.ceil(d.length / s)))
  const offerPageEff = clampPage(filtered, offerPage, offerPageSize)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SearchInput
          value={offerSearch}
          onChange={v => { setOfferSearch(v); setOfferPage(1) }}
          placeholder="Search company or role..."
          className="w-full sm:max-w-xs"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">{offers.length} offer{offers.length !== 1 ? 's' : ''}</span>
      </div>
      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center text-gray-400">No offers match your search.</div>
      ) : (
        filtered.slice((offerPageEff - 1) * offerPageSize, offerPageEff * offerPageSize).map(o => (
        <div key={o.id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{o.offerNumber}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${OFFER_STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-500'}`}>{o.status}</span>
            </div>
            <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{o.companyName}</p>
            <p className="text-sm text-gray-500">{o.role} {o.ctc ? `· ${o.ctc}` : ''}</p>
            <div className="mt-2 flex gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
              <span>Offered: {o.offerDate ? format(new Date(o.offerDate), 'dd MMM yyyy') : '—'}</span>
              {o.joiningDate && <span>Joining: {format(new Date(o.joiningDate), 'dd MMM yyyy')}</span>}
              {o.offerExpiry && <span>Expires: {format(new Date(o.offerExpiry), 'dd MMM yyyy')}</span>}
            </div>
            {o.offerLetterUrl && (
              <a href={o.offerLetterUrl} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600 hover:underline font-semibold">
                <ExternalLink size={12} /> Offer Letter
              </a>
            )}
          </div>
          {o.status === 'OFFERED' && (
            <div className="flex gap-2 flex-none">
              <button onClick={() => respond(o, 'reject')} disabled={acting === o.id}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50">
                Decline
              </button>
              <button onClick={() => respond(o, 'accept')} disabled={acting === o.id}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold disabled:opacity-50">
                {acting === o.id ? 'Processing...' : 'Accept Offer'}
              </button>
            </div>
          )}
        </div>
        ))
      )}
      <Pagination
        data={filtered}
        page={offerPage}
        pageSize={offerPageSize}
        onPageChange={setOfferPage}
        onPageSizeChange={v => { setOfferPageSize(v); setOfferPage(1) }}
        label="offers"
      />
      {confirmModal}
    </div>
  )
}

// ─── INTERVIEWS TAB ───────────────────────────────────────────────────────────
function InterviewsTab({ interviews, reload }) {
  const [intSearch, setIntSearch] = useState('')
  const [intPage, setIntPage] = useState(1)
  const [intPageSize, setIntPageSize] = useState(6)

  if (interviews.length === 0) {
    return (
      <div className="glass-card p-10 text-center space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">No interviews scheduled</p>
        <p className="text-xs text-gray-400">Once your placement coordinator shortlists you, interview slots appear here with joining links.</p>
      </div>
    )
  }

  const filtered = interviews.filter(iv =>
    !intSearch || `${iv.roundName} ${iv.companyName || ''} ${iv.driveRole || ''}`.toLowerCase().includes(intSearch.toLowerCase())
  )

  const clampPage = (d, p, s) => Math.min(p, Math.max(1, Math.ceil(d.length / s)))
  const intPageEff = clampPage(filtered, intPage, intPageSize)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SearchInput
          value={intSearch}
          onChange={v => { setIntSearch(v); setIntPage(1) }}
          placeholder="Search round or company..."
          className="w-full sm:max-w-xs"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">{interviews.length} interview{interviews.length !== 1 ? 's' : ''}</span>
      </div>
      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center text-gray-400">No interviews match your search.</div>
      ) : (
        <div className="space-y-3">
          {filtered.slice((intPageEff - 1) * intPageSize, intPageEff * intPageSize).map(iv => (
            <div key={iv.id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    iv.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    iv.status === 'CANCELLED' || iv.status === 'ABSENT' ? 'bg-red-100 text-red-500' :
                    'bg-blue-100 text-blue-700'
                  }`}>{iv.status}</span>
                  {iv.result && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      iv.result === 'PASS' ? 'bg-emerald-100 text-emerald-700' : iv.result === 'FAIL' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'
                    }`}>{iv.result}</span>
                  )}
                </div>
                <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{iv.roundName}</p>
                <div className="mt-1 flex gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Building2 size={12} /> {iv.companyName || 'Placement Drive'}{iv.driveRole ? ` · ${iv.driveRole}` : ''}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {iv.scheduledAt ? format(new Date(iv.scheduledAt), 'dd MMM yyyy, h:mm a') : '—'}</span>
                  <span>{iv.online ? 'Online' : 'Offline'}{iv.location ? ` · ${iv.location}` : ''}</span>
                </div>
              </div>
              {(iv.status === 'SCHEDULED' || iv.status === 'RESCHEDULED') && iv.meetingLink && (
                <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer"
                  className="flex-none flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-xs font-bold">
                  <ExternalLink size={12} /> Join Interview
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      <Pagination
        data={filtered}
        page={intPage}
        pageSize={intPageSize}
        onPageChange={setIntPage}
        onPageSizeChange={v => { setIntPageSize(v); setIntPage(1) }}
        label="interviews"
      />
    </div>
  )
}

// ─── INTERVIEW PREP TAB ───────────────────────────────────────────────────────
// ─── PREP MATERIALS TAB ───────────────────────────────────────────────────────
function PrepMaterialsTab({ list, reload }) {
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [openQ, setOpenQ] = useState(null)
  const [prepSearch, setPrepSearch] = useState('')
  const [prepPage, setPrepPage] = useState(1)
  const [prepPageSize, setPrepPageSize] = useState(6)

  const openDetail = async (id) => {
    setLoadingDetail(true)
    try {
      const res = await studentApi.getPreparationMaterial(id)
      setDetail(res.data.data)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load material')
    } finally { setLoadingDetail(false) }
  }

  const download = async (id, docId, fileName) => {
    setDownloading(docId)
    try {
      const res = await studentApi.downloadPrepDocument(id, docId)
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || `document-${docId}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Download failed')
    } finally { setDownloading(null) }
  }

  if (detail) {
    return (
      <div className="space-y-5">
        <button onClick={() => setDetail(null)} className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:underline">
          <ArrowRight size={12} className="rotate-180" /> Back to materials
        </button>

        <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{detail.title}</h2>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 uppercase">{detail.interviewType || 'Interview'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{detail.course ? detail.course.title : 'General'}</span>
                {detail.publishedByName ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{detail.publishedByName}</span> : null}
              </div>
            </div>
          </div>
          {detail.instructions ? <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{detail.instructions}</p> : null}

          {/* Documents */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Documents ({detail.documents?.length || 0})</h3>
            {detail.documents?.length === 0 ? (
              <p className="text-xs text-gray-400">No documents attached to this material.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {detail.documents.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={15} className="text-purple-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 break-words">{d.fileName}</p>
                        <p className="text-[10px] text-gray-400">{Math.round(d.fileSize / 1024)} KB</p>
                      </div>
                    </div>
                    <button onClick={() => download(detail.id, d.id, d.fileName)} disabled={downloading === d.id}
                      className="flex-none flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
                      {downloading === d.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Questions */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Practice Questions ({detail.questions?.length || 0})</h3>
            {detail.questions?.length === 0 ? (
              <p className="text-xs text-gray-400">No practice questions yet.</p>
            ) : (
              <div className="space-y-2">
                {detail.questions.map(q => (
                  <div key={q.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                    <button onClick={() => setOpenQ(openQ === q.id ? null : q.id)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-purple-50/40 dark:hover:bg-purple-900/10 transition-colors">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{q.questionText}</span>
                      {openQ === q.id ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
                    </button>
                    {openQ === q.id && q.answerText && (
                      <div className="px-4 pb-3 -mt-1">
                        <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap"><span className="font-bold text-emerald-600 dark:text-emerald-400">Answer: </span>{q.answerText}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const filteredPrep = list.filter(p =>
    !prepSearch || `${p.title} ${p.interviewType || ''} ${p.course?.title || ''}`.toLowerCase().includes(prepSearch.toLowerCase())
  )

  const clampPage = (d, p, s) => Math.min(p, Math.max(1, Math.ceil(d.length / s)))
  const prepPageEff = clampPage(filteredPrep, prepPage, prepPageSize)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SearchInput
          value={prepSearch}
          onChange={v => { setPrepSearch(v); setPrepPage(1) }}
          placeholder="Search materials..."
          className="w-full sm:max-w-xs"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">{list.length} material{list.length !== 1 ? 's' : ''}</span>
      </div>
      {loadingDetail ? (
        <div className="py-16 text-center text-gray-400">Loading...</div>
      ) : filteredPrep.length === 0 ? (
        <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-12 text-center text-gray-400">
          <BookOpen size={32} className="mx-auto mb-3 text-purple-200" />
          {list.length === 0
            ? <p className="text-sm">No preparation materials available for you yet.</p>
            : <p className="text-sm">No materials match your search.</p>}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPrep.slice((prepPageEff - 1) * prepPageSize, prepPageEff * prepPageSize).map(p => (
            <div key={p.id} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-5 space-y-3 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">{p.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{p.interviewType || 'Interview'} {p.course ? <span>• {p.course.title}</span> : <span className="text-purple-500 font-medium">• General</span>}</p>
                </div>
                <BookOpen size={18} className="text-purple-300 shrink-0" />
              </div>
              {p.instructions ? <p className="text-xs text-gray-500 line-clamp-2">{p.instructions}</p> : null}
              <div className="flex gap-2 text-[11px] text-gray-500">
                <span>{p.documentCount || 0} docs</span>
                <span>•</span>
                <span>{p.questionsCount || 0} questions</span>
              </div>
              <button onClick={() => openDetail(p.id)} className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors">
                Open Material <ArrowRight size={12} />
              </button>
            </div>
          ))}
          </div>
          <Pagination
            data={filteredPrep}
            page={prepPage}
            pageSize={prepPageSize}
            onPageChange={setPrepPage}
            onPageSizeChange={v => { setPrepPageSize(v); setPrepPage(1) }}
            label="materials"
          />
        </>
      )}
    </div>
  )
}

function InterviewPrepTab({ hub }) {
  const [subTab, setSubTab] = useState('Interview Questions')
  const [questions, setQuestions] = useState([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [aptTips, setAptTips] = useState([])
  const [aptLoading, setAptLoading] = useState(false)
  const [resList, setResList] = useState([])
  const [resLoading, setResLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const [qSearch, setQSearch] = useState('')
  const [qPage, setQPage] = useState(1)
  const [qPageSize, setQPageSize] = useState(8)
  const [aptSearch, setAptSearch] = useState('')
  const [aptPage, setAptPage] = useState(1)
  const [aptPageSize, setAptPageSize] = useState(6)
  const [resSearch, setResSearch] = useState('')
  const [resPage, setResPage] = useState(1)
  const [resPageSize, setResPageSize] = useState(6)

  const SUB_TABS = ['Interview Questions', 'Aptitude Tips', 'Resources']

  const filteredQuestions = questions.filter(q =>
    !qSearch || `${q.question} ${q.answer}`.toLowerCase().includes(qSearch.toLowerCase())
  )
  const filteredAptTips = aptTips.filter(t =>
    !aptSearch || `${t.topic} ${t.formula} ${t.example}`.toLowerCase().includes(aptSearch.toLowerCase())
  )
  const filteredResList = resList.filter(r =>
    !resSearch || `${r.title} ${r.description} ${r.tag}`.toLowerCase().includes(resSearch.toLowerCase())
  )

  const clampPage = (d, p, s) => Math.min(p, Math.max(1, Math.ceil(d.length / s)))
  const qPageEff = clampPage(filteredQuestions, qPage, qPageSize)
  const aptPageEff = clampPage(filteredAptTips, aptPage, aptPageSize)
  const resPageEff = clampPage(filteredResList, resPage, resPageSize)

  useEffect(() => {
    if (subTab === 'Interview Questions' && questions.length === 0) {
      setQuestionsLoading(true)
      studentApi.getInterviewPrep({ limit: 50 })
        .then(r => setQuestions(r.data.data?.questions || []))
        .catch(() => toast.error('Failed to load questions'))
        .finally(() => setQuestionsLoading(false))
    }
    if (subTab === 'Aptitude Tips' && aptTips.length === 0) {
      setAptLoading(true)
      studentApi.getAptitudeTips()
        .then(r => setAptTips(r.data.data || []))
        .catch(() => toast.error('Failed to load aptitude tips'))
        .finally(() => setAptLoading(false))
    }
    if (subTab === 'Resources' && resList.length === 0) {
      setResLoading(true)
      studentApi.getInterviewResources()
        .then(r => setResList(r.data.data || []))
        .catch(() => toast.error('Failed to load resources'))
        .finally(() => setResLoading(false))
    }
  }, [subTab])

  const DIFF_COLORS = {
    EASY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    HARD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <div className="space-y-5">
      {/* Sub tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {SUB_TABS.map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              subTab === t ? 'bg-purple-600 text-white shadow' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

{/* Interview Questions */}
      {subTab === 'Interview Questions' && (
        <div className="space-y-3">
          <SearchInput
            value={qSearch}
            onChange={v => { setQSearch(v); setQPage(1) }}
            placeholder="Search questions..."
            className="w-full sm:max-w-xs"
          />
          {questionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Brain size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
              <p className="text-sm">{questions.length === 0 ? 'No interview questions available yet' : 'No questions match your search'}</p>
            </div>
          ) : (
            <>
              {filteredQuestions.slice((qPageEff - 1) * qPageSize, qPageEff * qPageSize).map((q, i) => (
                <div key={q.id} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                  <button onClick={() => setExpanded(expanded === `q-${qPageEff}-${i}` ? null : `q-${qPageEff}-${i}`)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {(qPageEff - 1) * qPageSize + i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white">{q.question}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</span>
                      {expanded === `q-${qPageEff}-${i}` ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                  </button>
                  {expanded === `q-${qPageEff}-${i}` && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800">
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 mt-3">
                        <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-1.5">Answer</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{q.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <Pagination
                data={filteredQuestions}
                page={qPage}
                pageSize={qPageSize}
                onPageChange={setQPage}
                onPageSizeChange={v => { setQPageSize(v); setQPage(1) }}
                label="questions"
              />
            </>
          )}
        </div>
      )}

      {/* Aptitude Tips */}
      {subTab === 'Aptitude Tips' && (
        <div className="space-y-4">
          <SearchInput
            value={aptSearch}
            onChange={v => { setAptSearch(v); setAptPage(1) }}
            placeholder="Search topic, formula or example..."
            className="w-full sm:max-w-xs"
          />
          {aptLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredAptTips.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Brain size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
              <p className="text-sm">{aptTips.length === 0 ? 'No aptitude tips available yet' : 'No tips match your search'}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAptTips.slice((aptPageEff - 1) * aptPageSize, aptPageEff * aptPageSize).map((tip, i) => (
                  <div key={tip.id} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold">{(aptPageEff - 1) * aptPageSize + i + 1}</div>
                      <h3 className="font-bold text-gray-800 dark:text-white text-sm">{tip.topic}</h3>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-2.5 mb-2">
                      <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-0.5">Formula</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">{tip.formula}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-2.5">
                      <p className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 mb-0.5">Example</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">{tip.example}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                data={filteredAptTips}
                page={aptPage}
                pageSize={aptPageSize}
                onPageChange={setAptPage}
                onPageSizeChange={v => { setAptPageSize(v); setAptPage(1) }}
                label="tips"
              />
            </>
          )}
        </div>
      )}

      {/* Resources */}
      {subTab === 'Resources' && (
        <div className="space-y-4">
          <SearchInput
            value={resSearch}
            onChange={v => { setResSearch(v); setResPage(1) }}
            placeholder="Search resources..."
            className="w-full sm:max-w-xs"
          />
          {resLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredResList.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
              <p className="text-sm">{resList.length === 0 ? 'No resources available yet' : 'No resources match your search'}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredResList.slice((resPageEff - 1) * resPageSize, resPageEff * resPageSize).map(res => {
                  const ResIcon = RESOURCE_ICONS[res.tag] || BookOpen
                  return (
                    <div key={res.id} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-4 flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                        <ResIcon size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{res.title}</h3>
                          <span className="flex-none text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">{res.tag}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{res.description}</p>
                        <a href={res.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700">
                          Open Resource <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Pagination
                data={filteredResList}
                page={resPage}
                pageSize={resPageSize}
                onPageChange={setResPage}
                onPageSizeChange={v => { setResPageSize(v); setResPage(1) }}
                label="resources"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-purple-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading your career hub...</p>
      </div>
    </div>
  )
}
