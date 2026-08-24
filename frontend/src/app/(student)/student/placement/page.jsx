'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { format, formatDistanceToNow, differenceInDays, isPast } from 'date-fns'
import {
  Star, Calendar, CheckCircle, Circle, Briefcase, ExternalLink, Plus, Trash2,
  ChevronDown, ChevronUp, Target, TrendingUp, FileText, Code2, Brain,
  BookOpen, Link2, Github, Linkedin, MapPin, Phone, Globe, Award,
  BarChart2, Users, Zap, ArrowRight, Edit2, X, Save, Download,
  AlertCircle, Building2, Clock, BadgeCheck, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { studentApi } from '@/lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import ResumePreview from '@/components/student/ResumePreview'
import SkillCard from '@/components/student/SkillCard'

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
const DRIVE_STATUS_COLORS = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  UPCOMING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CLOSED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}
const CATEGORY_COLORS = {
  'Programming': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Framework':   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Tool':        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Database':    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Soft Skill':  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
}
const SKILL_SUGGESTIONS = ['Python', 'Django', 'Flask', 'React', 'Next.js', 'Node.js', 'Express', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Git', 'Docker', 'Linux', 'AWS', 'REST APIs', 'GraphQL', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'Problem Solving', 'Communication', 'Teamwork', 'Leadership', 'Time Management']
const PROFICIENCY_LABELS = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert']
const UPDATE_ICON = { SHORTLIST: '⭐', INTERVIEW: '📅', ACTION: '📋', FEEDBACK: '💬', UPDATE: '📌' }

const HR_QUESTIONS = [
  { q: 'Tell me about yourself.', cat: 'Introduction', diff: 'EASY', ans: 'Use the 3-part framework:\n\n1. Present: "I am [name], a [role/background]..."\n2. Past: "I have [X years/months] of experience in [skills]..."\n3. Future: "I am looking to [goal] at a company like yours."\n\nKeep it under 2 minutes. Start with your professional identity, not personal details.', tips: 'Practice out loud 5 times. Keep it under 90 seconds. Tailor to the company.' },
  { q: 'Why do you want to work at our company?', cat: 'Company-specific', diff: 'MEDIUM', ans: 'Research the company first. Mention:\n\n1. Specific products/services you admire\n2. Company values that align with yours\n3. Growth opportunities in the role\n\n"I admire how [Company] is solving [problem]. Your engineering culture of [X] resonates with me, and I believe I can contribute to [specific team/goal]."', tips: 'Never say "for the salary" or "it looks prestigious". Be specific — mention real projects or news.' },
  { q: 'What are your strengths and weaknesses?', cat: 'Behavioural', diff: 'MEDIUM', ans: 'Strength: Pick one that\'s genuinely relevant to the role. Give a specific example.\n\nWeakness: Pick a real weakness you\'re actively improving. Frame it constructively:\n"I used to struggle with [X], but I\'ve been working on it by [action], and I\'ve seen improvement in [result]."', tips: 'Avoid clichés like "I work too hard." Be honest but strategic.' },
  { q: 'Where do you see yourself in 5 years?', cat: 'Behavioural', diff: 'MEDIUM', ans: 'Show ambition but align with the company:\n\n"In 5 years, I see myself as a [senior role] with expertise in [domain]. I want to grow with a company where I can take on increasing responsibility. This role at [Company] feels like the perfect starting point."', tips: 'Do NOT say "running my own startup" in most interviews. Show loyalty and growth intent.' },
  { q: 'Describe a challenging situation and how you handled it.', cat: 'Situational', diff: 'HARD', ans: 'Use the STAR method:\n\nSituation: "In my [project/internship]..."\nTask: "I was responsible for..."\nAction: "I decided to... because..."\nResult: "As a result, we achieved..."\n\nPick a story where YOU took initiative. Quantify results if possible.', tips: 'Have 3-4 STAR stories ready covering: leadership, teamwork, failure, and problem-solving.' },
  { q: 'Why should we hire you?', cat: 'Introduction', diff: 'HARD', ans: 'This is your elevator pitch. Structure:\n\n1. Your top 2-3 relevant skills/achievements\n2. How you solve their specific problem\n3. Your unique differentiator\n\n"You should hire me because I bring [skill 1], [skill 2], and a proven track record of [achievement]. I\'m confident I can [specific contribution] for your team."', tips: 'Tie your answer directly to the job description. Be confident, not arrogant.' },
]

const APT_TIPS = [
  { topic: 'Time & Work', formula: 'Combined Rate = 1/A + 1/B; Time = 1/Rate', example: 'A does work in 10 days, B in 15 days. Together: 1/10 + 1/15 = 1/6. Time = 6 days' },
  { topic: 'Percentages', formula: 'x% of y = (x × y) / 100; % change = (Diff/Original) × 100', example: '40% of 300 = (40 × 300)/100 = 120. Profit: Buy at 100, sell at 120 → 20% profit' },
  { topic: 'Ratio & Proportion', formula: 'a:b = c:d → ad = bc (Cross multiply)', example: 'Boys:Girls = 3:2, total 30. Girls = (2/5) × 30 = 12' },
  { topic: 'Number Series', formula: 'Check differences, ratios, alternating patterns, and squares/cubes', example: 'Fibonacci: 1,1,2,3,5,8,13... | Squares: 1,4,9,16,25...' },
  { topic: 'Averages', formula: 'Avg = Sum/Count; New avg = (Old sum ± change) / new count', example: '5 numbers avg 20 (sum=100). Remove one with value 28. New avg = 72/4 = 18' },
  { topic: 'Speed, Distance, Time', formula: 'Distance = Speed × Time; Relative speed: same dir = |S1-S2|, opposite = S1+S2', example: 'Train 100m at 54 km/h crosses pole: t = 100/(54×5/18) = 100/15 ≈ 6.67s' },
]

const RESOURCES = [
  { title: 'Cracking the Coding Interview', desc: '189 programming questions & solutions by Gayle Laakmann McDowell. The gold standard for technical interview prep.', icon: BookOpen, link: '#', tag: 'Book' },
  { title: 'NeetCode DSA Roadmap', desc: 'Structured DSA practice with 150+ curated LeetCode problems organized by topic. Best for systematic prep.', icon: Code2, link: 'https://neetcode.io/roadmap', tag: 'Free Resource' },
  { title: 'Python Interview Handbook', desc: 'Comprehensive guide covering Python-specific interview questions from basics to advanced OOP and frameworks.', icon: FileText, link: '#', tag: 'Guide' },
  { title: 'System Design Primer', desc: 'Learn how to design large-scale systems. Essential for senior-level interviews at product companies.', icon: BarChart2, link: 'https://github.com/donnemartin/system-design-primer', tag: 'GitHub' },
  { title: 'HR Interview Framework', desc: 'Master the STAR method, common HR questions, salary negotiation, and how to make a strong impression.', icon: Users, link: '#', tag: 'Guide' },
]

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PlacementPage() {
  const [hub, setHub] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Dashboard')

  const TABS = ['Dashboard', 'Resume Builder', 'Skills', 'Company Drives', 'Interview Prep']

  useEffect(() => {
    Promise.all([
      studentApi.getPlacementHub(),
      studentApi.getMockAnalytics(),
    ]).then(([h, a]) => {
      setHub(h.data.data)
      setAnalytics(a.data.data)
    }).catch(() => toast.error('Failed to load placement data'))
      .finally(() => setLoading(false))
  }, [])

  const refreshHub = () => {
    studentApi.getPlacementHub().then(h => setHub(h.data.data)).catch(() => {})
  }

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
        {tab === 'Dashboard' && <DashboardTab hub={hub} analytics={analytics} />}
        {tab === 'Resume Builder' && <ResumeBuilderTab hub={hub} refreshHub={refreshHub} />}
        {tab === 'Skills' && <SkillsTab />}
        {tab === 'Company Drives' && <CompanyDrivesTab />}
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

  const readiness = hub?.readiness || 0
  const currentStatus = hub?.status || 'SEEKING'
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
            <p className="text-purple-200 text-sm">Python Batch 12 · Placement Season 2024</p>

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
          <div className="flex items-center gap-6">
            {/* Quick links */}
            <div className="flex flex-col gap-2 text-xs">
              {hub?.linkedinUrl ? (
                <a href={hub.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-300 hover:text-blue-200">
                  <Linkedin size={12} /> LinkedIn
                </a>
              ) : (
                <span className="flex items-center gap-1.5 text-white/40"><Linkedin size={12} /> No LinkedIn</span>
              )}
              {hub?.githubUrl ? (
                <a href={hub.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/60 hover:text-white/90">
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
function DashboardTab({ hub, analytics }) {
  const stats = hub?.stats || {}
  const updates = hub?.placementUpdates || []
  const nextMock = hub?.mockInterviews?.find(m => m.status === 'SCHEDULED')
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

  const checklistItems = ['Review Python OOP concepts', 'Practice 2 DSA problems', 'Prepare STAR stories', 'Test meeting link']

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Brain} label="Mock Interviews" value={`${stats.completedMocks || 0}/${stats.totalMocks || 0}`}
          sub={<StarRating rating={Math.round(stats.avgRating || 0)} />} color="purple" />
        <KpiCard icon={Briefcase} label="Applications" value={stats.totalApplications || 0}
          sub={<span className="text-emerald-600 font-semibold text-xs">{stats.shortlisted || 0} shortlisted</span>} color="blue" />
        <KpiCard icon={FileText} label="Resume"
          value={hub?.resumeData?.summary ? 'Completed' : 'Incomplete'}
          sub={<span className={hub?.resumeData?.summary ? 'text-emerald-600' : 'text-yellow-600'}>
            {hub?.resumeData?.summary ? '✓ Ready' : '⚠ Needs work'}
          </span>} color="emerald" />
        <KpiCard icon={Target} label="Placement Status"
          value={<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[hub?.status || 'SEEKING']}`}>
            {STATUS_LABELS[hub?.status || 'SEEKING']}
          </span>}
          sub="" color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 space-y-4">
          {analytics?.trend?.length > 0 ? (
            <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-600" />
                Mock Interview Performance
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analytics.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v}/5`, 'Rating']} />
                  <Line type="monotone" dataKey="rating" stroke="#6d28d9" strokeWidth={2.5} dot={{ r: 4, fill: '#6d28d9' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-5 flex flex-col items-center justify-center h-48 text-gray-400">
              <Brain size={32} className="mb-2 text-purple-200" />
              <p className="text-sm">Complete your first mock interview to see performance trends</p>
            </div>
          )}

          {/* Strengths & Improvements */}
          {(analytics?.topStrengths?.length > 0 || analytics?.topImprovements?.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-emerald-100 dark:border-emerald-900/30 rounded-2xl shadow-xl p-4">
                <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2.5 flex items-center gap-1">
                  <CheckCircle size={12} /> Top Strengths
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {analytics.topStrengths.map((s, i) => (
                    <span key={i} className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                      {s.text}
                      {s.count > 1 && <span className="bg-emerald-200 dark:bg-emerald-800 px-1 rounded-full">×{s.count}</span>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-yellow-100 dark:border-yellow-900/30 rounded-2xl shadow-xl p-4">
                <h4 className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2.5 flex items-center gap-1">
                  <Zap size={12} /> Areas to Improve
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {analytics.topImprovements.map((s, i) => (
                    <span key={i} className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                      {s.text}
                      {s.count > 1 && <span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded-full">×{s.count}</span>}
                    </span>
                  ))}
                </div>
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
              </p>
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

              {nextMock.meetLink && (
                <a href={nextMock.meetLink} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors">
                  Join Meeting <ExternalLink size={11} />
                </a>
              )}
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
                      <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{u.title}</p>
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
      } catch {
        toast.error('Failed to save')
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
        <div className="flex items-center justify-between">
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
                    <FormInput label="Professional Headline" placeholder="Full Stack Python Developer" value={resumeData.headline || ''} onChange={v => updateField('headline', v)} />
                    <FormTextarea label="Professional Summary" placeholder="Passionate developer with experience in..." value={resumeData.summary || ''} onChange={v => updateField('summary', v)} rows={3} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput label="Phone" placeholder="9876543210" value={resumeData.phone || ''} onChange={v => updateField('phone', v)} />
                      <FormInput label="Location" placeholder="Chennai, Tamil Nadu" value={resumeData.location || ''} onChange={v => updateField('location', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput label="LinkedIn URL" placeholder="linkedin.com/in/yourname" value={resumeData.linkedinUrl || ''} onChange={v => updateField('linkedinUrl', v)} />
                      <FormInput label="GitHub URL" placeholder="github.com/yourname" value={resumeData.githubUrl || ''} onChange={v => updateField('githubUrl', v)} />
                    </div>
                    <FormInput label="Portfolio URL" placeholder="yourportfolio.com" value={resumeData.portfolioUrl || ''} onChange={v => updateField('portfolioUrl', v)} />
                  </div>
                )}

                {sec.id === 'education' && (
                  <ArraySection items={resumeData.education || []}
                    onAdd={() => addItem('education', { degree: '', institution: '', year: '', grade: '' })}
                    onRemove={(i) => removeItem('education', i)}
                    renderItem={(edu, i) => (
                      <div className="grid grid-cols-2 gap-2">
                        <FormInput label="Degree/Course" placeholder="B.Tech CSE" value={edu.degree || ''} onChange={v => updateArrayItem('education', i, 'degree', v)} />
                        <FormInput label="Institution" placeholder="Anna University" value={edu.institution || ''} onChange={v => updateArrayItem('education', i, 'institution', v)} />
                        <FormInput label="Year" placeholder="2020-2024" value={edu.year || ''} onChange={v => updateArrayItem('education', i, 'year', v)} />
                        <FormInput label="Grade/%" placeholder="78%" value={edu.grade || ''} onChange={v => updateArrayItem('education', i, 'grade', v)} />
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
                        <div className="grid grid-cols-2 gap-2">
                          <FormInput label="Role" placeholder="Junior Developer" value={exp.role || ''} onChange={v => updateArrayItem('experience', i, 'role', v)} />
                          <FormInput label="Company" placeholder="TCS" value={exp.company || ''} onChange={v => updateArrayItem('experience', i, 'company', v)} />
                        </div>
                        <FormInput label="Duration" placeholder="Jun 2023 - Dec 2023" value={exp.duration || ''} onChange={v => updateArrayItem('experience', i, 'duration', v)} />
                        <FormTextarea label="Description" placeholder="Key responsibilities and achievements..." value={exp.description || ''} onChange={v => updateArrayItem('experience', i, 'description', v)} rows={2} />
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
                        <FormInput label="Project Name" placeholder="E-Commerce Platform" value={proj.name || ''} onChange={v => updateArrayItem('projects', i, 'name', v)} />
                        <FormInput label="Tech Stack (comma separated)" placeholder="Python, Django, PostgreSQL" value={proj.tech || ''} onChange={v => updateArrayItem('projects', i, 'tech', v)} />
                        <FormTextarea label="Description" placeholder="Brief description of what this project does..." value={proj.description || ''} onChange={v => updateArrayItem('projects', i, 'description', v)} rows={2} />
                        <div className="grid grid-cols-2 gap-2">
                          <FormInput label="GitHub Link" placeholder="github.com/..." value={proj.github || ''} onChange={v => updateArrayItem('projects', i, 'github', v)} />
                          <FormInput label="Live Link" placeholder="yourapp.com" value={proj.live || ''} onChange={v => updateArrayItem('projects', i, 'live', v)} />
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
                      <div className="grid grid-cols-2 gap-2">
                        <FormInput label="Certificate Name" placeholder="AWS Cloud Practitioner" value={cert.name || ''} onChange={v => updateArrayItem('certifications', i, 'name', v)} />
                        <FormInput label="Issuer" placeholder="Amazon Web Services" value={cert.issuer || ''} onChange={v => updateArrayItem('certifications', i, 'issuer', v)} />
                        <FormInput label="Date" placeholder="Jan 2024" value={cert.date || ''} onChange={v => updateArrayItem('certifications', i, 'date', v)} />
                        <FormInput label="Credential URL" placeholder="credly.com/badges/..." value={cert.url || ''} onChange={v => updateArrayItem('certifications', i, 'url', v)} />
                      </div>
                    )}
                  />
                )}

                {sec.id === 'languages' && (
                  <ArraySection items={resumeData.languages || []}
                    onAdd={() => addItem('languages', { name: '', level: 'Conversational' })}
                    onRemove={(i) => removeItem('languages', i)}
                    renderItem={(lang, i) => (
                      <div className="grid grid-cols-2 gap-2">
                        <FormInput label="Language" placeholder="English" value={lang.name || ''} onChange={v => updateArrayItem('languages', i, 'name', v)} />
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Proficiency</label>
                          <select value={lang.level || 'Conversational'}
                            onChange={e => updateArrayItem('languages', i, 'level', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                            {['Native', 'Fluent', 'Conversational', 'Basic'].map(l => <option key={l}>{l}</option>)}
                          </select>
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

// ─── SKILLS TAB ───────────────────────────────────────────────────────────────
function SkillsTab() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('All')
  const [form, setForm] = useState({ name: '', category: 'Programming', proficiency: 3, yearsExp: '' })
  const [adding, setAdding] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [editSkill, setEditSkill] = useState(null)

  const CATS = ['All', 'Programming', 'Framework', 'Tool', 'Database', 'Soft Skill']

  useEffect(() => {
    studentApi.getSkills().then(r => setSkills(r.data.data || [])).catch(() => toast.error('Failed to load skills')).finally(() => setLoading(false))
  }, [])

  const filtered = catFilter === 'All' ? skills : skills.filter(s => s.category === catFilter)

  const radarData = CATS.slice(1).map(cat => {
    const catSkills = skills.filter(s => s.category === cat)
    const avg = catSkills.length ? catSkills.reduce((s, sk) => s + sk.proficiency, 0) / catSkills.length : 0
    return { category: cat.replace(' Skill', ''), avg: Math.round(avg * 10) / 10 }
  }).filter(d => d.avg > 0)

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error('Skill name required')
    setAdding(true)
    const optimistic = { id: Date.now(), ...form, isVerified: false, createdAt: new Date().toISOString() }
    setSkills(prev => [optimistic, ...prev])
    try {
      const res = await studentApi.addSkill({ ...form, proficiency: Number(form.proficiency), yearsExp: form.yearsExp ? Number(form.yearsExp) : null })
      setSkills(prev => [res.data.data, ...prev.filter(s => s.id !== optimistic.id)])
      setForm({ name: '', category: 'Programming', proficiency: 3, yearsExp: '' })
      toast.success('Skill added!')
    } catch (e) {
      setSkills(prev => prev.filter(s => s.id !== optimistic.id))
      toast.error(e?.response?.data?.message || 'Failed to add skill')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id) => {
    const prev = skills
    setSkills(s => s.filter(sk => sk.id !== id))
    try {
      await studentApi.deleteSkill(id)
      toast.success('Skill removed')
    } catch {
      setSkills(prev)
      toast.error('Failed to remove skill')
    }
  }

  const handleEdit = async (skill) => {
    if (!editSkill) return setEditSkill(skill)
    try {
      const res = await studentApi.updateSkill(editSkill.id, { proficiency: editSkill.proficiency, yearsExp: editSkill.yearsExp })
      setSkills(s => s.map(sk => sk.id === editSkill.id ? res.data.data : sk))
      setEditSkill(null)
      toast.success('Skill updated')
    } catch {
      toast.error('Failed to update skill')
    }
  }

  const suggestions = SKILL_SUGGESTIONS.filter(s =>
    s.toLowerCase().includes(form.name.toLowerCase()) && !skills.find(sk => sk.name.toLowerCase() === s.toLowerCase())
  ).slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Add skill form */}
      <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-5">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-sm">
          <Plus size={15} className="text-purple-600" /> Add New Skill
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="relative">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Skill Name</label>
            <input
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setShowSuggestions(true) }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="e.g. Python"
              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                {suggestions.map(s => (
                  <button key={s} onMouseDown={() => setForm(f => ({ ...f, name: s }))}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500">
              {CATS.slice(1).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              Proficiency — {PROFICIENCY_LABELS[form.proficiency]}
            </label>
            <input type="range" min={1} max={5} value={form.proficiency}
              onChange={e => setForm(f => ({ ...f, proficiency: Number(e.target.value) }))}
              className="w-full accent-purple-600" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Years Exp</label>
              <input type="number" step="0.5" min="0" max="20" value={form.yearsExp}
                onChange={e => setForm(f => ({ ...f, yearsExp: e.target.value }))}
                placeholder="Optional"
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            <button onClick={handleAdd} disabled={adding || !form.name.trim()}
              className="mt-4 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors">
              {adding ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* Radar chart */}
      {radarData.length >= 2 && (
        <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-xl p-5">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-sm flex items-center gap-2">
            <BarChart2 size={15} className="text-purple-600" /> Skill Profile
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
              <Radar dataKey="avg" stroke="#6d28d9" fill="#6d28d9" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATS.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              catFilter === c ? 'bg-purple-600 text-white shadow' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
            }`}>
            {c}
            {c !== 'All' && <span className="ml-1 opacity-60">({skills.filter(s => s.category === c).length})</span>}
          </button>
        ))}
      </div>

      {/* Skills grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Code2 size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm font-medium">No skills yet</p>
          <p className="text-xs mt-1">Add your first skill using the form above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(skill => (
            <SkillCard key={skill.id} skill={skill}
              onEdit={() => setEditSkill(editSkill?.id === skill.id ? null : skill)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editSkill && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Edit — {editSkill.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Proficiency — {PROFICIENCY_LABELS[editSkill.proficiency]}</label>
                <input type="range" min={1} max={5} value={editSkill.proficiency}
                  onChange={e => setEditSkill(s => ({ ...s, proficiency: Number(e.target.value) }))}
                  className="w-full accent-purple-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Years Experience</label>
                <input type="number" step="0.5" value={editSkill.yearsExp || ''}
                  onChange={e => setEditSkill(s => ({ ...s, yearsExp: e.target.value }))}
                  className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditSkill(null)} className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={handleEdit} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COMPANY DRIVES TAB ───────────────────────────────────────────────────────
function CompanyDrivesTab() {
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [applying, setApplying] = useState(null)

  useEffect(() => {
    studentApi.getDrives().then(r => setDrives(r.data.data || [])).catch(() => toast.error('Failed to load drives')).finally(() => setLoading(false))
  }, [])

  const filtered = drives.filter(d => {
    const matchFilter = filter === 'All' || (filter === 'Applied' ? d.hasApplied : d.status === filter.toUpperCase())
    const matchSearch = !search || d.companyName.toLowerCase().includes(search.toLowerCase()) || d.role.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const handleApply = async (drive) => {
    setApplying(drive.id)
    try {
      await studentApi.applyDrive(drive.id)
      setDrives(prev => prev.map(d => d.id === drive.id ? { ...d, hasApplied: true, applicationStatus: 'APPLIED' } : d))
      toast.success(`Applied to ${drive.companyName}!`)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to apply')
    } finally {
      setApplying(null)
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

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or role..."
          className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
        <div className="flex gap-2">
          {['All', 'Active', 'Upcoming', 'Applied'].map(f => (
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
          {filtered.map(drive => (
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
                      <span className={`flex-none text-[10px] px-2 py-0.5 rounded-full font-semibold ${DRIVE_STATUS_COLORS[drive.status] || ''}`}>
                        {drive.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-0.5"><MapPin size={9} /> {drive.location}</span>
                      <span className="flex items-center gap-0.5">💰 {drive.package}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                        drive.driveType === 'CAMPUS' ? 'bg-purple-50 text-purple-600' :
                        drive.driveType === 'ONLINE' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
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
                    <span className="text-[10px] text-gray-400">{drive._count?.applications || 0} applied</span>
                    {drive.hasApplied ? (
                      <span className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                        <CheckCircle size={10} /> Applied
                      </span>
                    ) : (
                      <button onClick={() => handleApply(drive)} disabled={applying === drive.id || drive.status === 'CLOSED'}
                        className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold transition-colors">
                        {applying === drive.id ? <Loader2 size={10} className="animate-spin" /> : null}
                        Apply Now →
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
                      <ExternalLink size={11} /> Apply via external link
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── INTERVIEW PREP TAB ───────────────────────────────────────────────────────
function InterviewPrepTab({ hub }) {
  const [subTab, setSubTab] = useState('HR Questions')
  const [catFilter, setCatFilter] = useState('All')
  const [techQuestions, setTechQuestions] = useState([])
  const [techLoading, setTechLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const SUB_TABS = ['HR Questions', 'Technical', 'Aptitude Tips', 'Resources']
  const HR_CATS = ['All', 'Introduction', 'Behavioural', 'Situational', 'Company-specific']

  useEffect(() => {
    if (subTab === 'Technical' && techQuestions.length === 0) {
      setTechLoading(true)
      studentApi.getInterviewPrep({ limit: 50 })
        .then(r => setTechQuestions(r.data.data?.questions || []))
        .catch(() => toast.error('Failed to load questions'))
        .finally(() => setTechLoading(false))
    }
  }, [subTab])

  const filteredHR = catFilter === 'All' ? HR_QUESTIONS : HR_QUESTIONS.filter(q => q.cat === catFilter)

  const DIFF_COLORS = {
    EASY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    HARD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <div className="space-y-5">
      {/* Sub tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SUB_TABS.map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              subTab === t ? 'bg-purple-600 text-white shadow' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* HR Questions */}
      {subTab === 'HR Questions' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {HR_CATS.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`flex-none px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  catFilter === c ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}>
                {c}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {filteredHR.map((q, i) => (
              <div key={i} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(expanded === `hr-${i}` ? null : `hr-${i}`)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-white">{q.q}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.diff]}`}>{q.diff}</span>
                    {expanded === `hr-${i}` ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </div>
                </button>
                {expanded === `hr-${i}` && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 mt-3">
                      <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-1.5">Model Answer Framework</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{q.ans}</p>
                    </div>
                    {q.tips && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 mt-2">
                        <p className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 mb-1">💡 Pro Tips</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{q.tips}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Questions */}
      {subTab === 'Technical' && (
        <div className="space-y-3">
          {techLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
            </div>
          ) : techQuestions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Brain size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
              <p className="text-sm">No technical questions available yet</p>
            </div>
          ) : (
            techQuestions.map((q, i) => (
              <div key={q.id} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(expanded === `tech-${i}` ? null : `tech-${i}`)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{q.question}</p>
                      <span className="text-[10px] text-gray-400">{q.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</span>
                    {expanded === `tech-${i}` ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </div>
                </button>
                {expanded === `tech-${i}` && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-800">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mt-3">
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Answer</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{q.answer}</p>
                    </div>
                    {q.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {q.tags.map((tag, ti) => (
                          <span key={ti} className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full text-[10px]">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Aptitude Tips */}
      {subTab === 'Aptitude Tips' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {APT_TIPS.map((tip, i) => (
            <div key={i} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold">{i + 1}</div>
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
      )}

      {/* Resources */}
      {subTab === 'Resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RESOURCES.map((res, i) => (
            <div key={i} className="bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-4 flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                <res.icon size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{res.title}</h3>
                  <span className="flex-none text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">{res.tag}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{res.desc}</p>
                <a href={res.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700">
                  Open Resource <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))}
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
