'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Mail, Phone, MapPin, Linkedin, Github, Award, Building2, BookOpen, Calendar, GraduationCap,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import studentService from '@/services/studentService'
import academicDetailsService from '@/services/academicDetailsService'

const PLACEMENT_COLORS = {
  SEEKING: 'bg-blue-100 text-blue-700',
  INTERVIEWING: 'bg-yellow-100 text-yellow-700',
  PLACED: 'bg-green-100 text-green-700',
  NOT_SEEKING: 'bg-gray-100 text-gray-600',
}

// Read-only — the student fills all of this in themselves via My Profile
// (Academic Details); admin can view it here to check placement eligibility
// at a glance, but can no longer edit it from this page.
function AcademicLevelDisplay({ title, optional, yearOfPassing, percentage }) {
  const hasData = yearOfPassing != null || percentage != null
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
        {title}{optional && <span className="font-normal text-gray-400"> (optional)</span>}
      </p>
      {hasData ? (
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {percentage != null ? `${percentage}%` : '—'}
          <span className="text-gray-400"> · Passed {yearOfPassing ?? '—'}</span>
        </p>
      ) : (
        <p className="text-sm text-gray-400">Not provided</p>
      )}
    </div>
  )
}

function DegreeLevelDisplay({ title, optional, degree, department, yearOfPassing, scoreType, score, backlogs }) {
  const hasData = degree || department || yearOfPassing != null || score != null
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
        {title}{optional && <span className="font-normal text-gray-400"> (optional)</span>}
      </p>
      {hasData ? (
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
          <p>{degree || '—'}{department ? ` · ${department}` : ''}</p>
          <p className="text-gray-400">
            {score != null ? `${score}${scoreType === 'CGPA' ? ' CGPA' : '%'}` : 'Score not provided'}
            {yearOfPassing ? ` · Passed ${yearOfPassing}` : ''}
            {backlogs != null ? ` · ${backlogs} backlog${backlogs === 1 ? '' : 's'}` : ''}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Not provided</p>
      )}
    </div>
  )
}

export default function StudentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [academicDetails, setAcademicDetails] = useState(null)
  const [loadingAcademics, setLoadingAcademics] = useState(true)

  const load = () => {
    setLoading(true)
    studentService.get(id)
      .then(r => setStudent(r.data))
      .catch(err => toast.error(err.message || 'Failed to load student'))
      .finally(() => setLoading(false))
  }

  const loadAcademics = () => {
    setLoadingAcademics(true)
    academicDetailsService.get(id)
      .then(r => setAcademicDetails(r.data))
      .catch(err => toast.error(err.message || 'Failed to load academic details'))
      .finally(() => setLoadingAcademics(false))
  }

  useEffect(() => { load(); loadAcademics() }, [id])

  // Admin no longer manages address/qualification/linkedinUrl/githubUrl/college
  // here - those are self-managed by the student via My Profile - so this
  // payload only ever touches what's still admin-owned (name, phone,
  // placement status, batch, course).
  const buildUpdatePayload = (overrides) => ({
    name: student.name,
    phone: student.phone,
    placementStatus: student.placementStatus,
    batchId: student.batch?.id || null,
    courseId: student.course?.id || null,
    ...overrides,
  })

  const handlePlacementUpdate = async (status) => {
    try {
      await studentService.update(id, buildUpdatePayload({ placementStatus: status }))
      toast.success('Placement status updated')
      load()
    } catch (err) { toast.error(err.message || 'Failed to update') }
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="glass-card p-6 animate-pulse h-24" />)}
    </div>
  )

  if (!student) return <div className="text-center py-20 text-gray-400">Student not found</div>

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0 mt-1">
          <ArrowLeft size={16} />
        </button>
        <div className="glass-card p-5 flex-1 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xl font-display">
              {student.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">{student.name}</h1>
              <p className="text-sm text-gray-500">{student.enrollmentNo || '—'} · {student.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${student.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {student.active ? 'Active' : 'Inactive'}
                </span>
                {student.placementStatus && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PLACEMENT_COLORS[student.placementStatus]}`}>
                    {student.placementStatus.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-display font-bold text-gray-800 dark:text-white">Personal Info</h3>
          <p className="text-xs text-gray-400 -mt-3">As entered by the student in their own My Profile.</p>
          {[
            { icon: User,    label: 'Name',          value: student.name },
            { icon: Mail,    label: 'Email',         value: student.email },
            { icon: Phone,   label: 'Phone',         value: student.phone || '—' },
            { icon: MapPin,  label: 'Address',       value: student.address || '—' },
            { icon: Award,   label: 'Qualification', value: student.qualification || '—' },
            { icon: Linkedin,label: 'LinkedIn',      value: student.linkedinUrl || '—', href: student.linkedinUrl },
            { icon: Github,  label: 'GitHub',        value: student.githubUrl || '—', href: student.githubUrl },
          ].map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Icon size={13} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                {href ? (
                  <a
                    href={/^https?:\/\//i.test(href) ? href : `https://${href}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline break-all"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300 break-all">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-display font-bold text-gray-800 dark:text-white">Academic Info</h3>
            {[
              { icon: Building2, label: 'College',    value: student.college?.name || '—' },
              { icon: BookOpen,  label: 'Course',      value: student.course?.title || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
              <GraduationCap size={16} className="text-purple-600" /> Academic Details
            </h3>
            <p className="text-xs text-gray-400 mb-4">As entered by the student in My Profile. Used to automatically check eligibility for placement opportunities.</p>
            {loadingAcademics ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
            ) : (
              <div className="space-y-4">
                <AcademicLevelDisplay
                  title="10th / SSLC"
                  yearOfPassing={academicDetails?.tenthYearOfPassing}
                  percentage={academicDetails?.tenthPercentage}
                />
                <AcademicLevelDisplay
                  title="12th / HSC"
                  yearOfPassing={academicDetails?.twelfthYearOfPassing}
                  percentage={academicDetails?.twelfthPercentage}
                />
                <AcademicLevelDisplay
                  title="Diploma"
                  optional
                  yearOfPassing={academicDetails?.diplomaYearOfPassing}
                  percentage={academicDetails?.diplomaPercentage}
                />
                <DegreeLevelDisplay
                  title="UG / Degree"
                  degree={academicDetails?.ugDegree}
                  department={academicDetails?.ugDepartment}
                  yearOfPassing={academicDetails?.ugYearOfPassing}
                  scoreType={academicDetails?.ugScoreType}
                  score={academicDetails?.ugScore}
                  backlogs={academicDetails?.ugBacklogs}
                />
                <DegreeLevelDisplay
                  title="PG / Master's"
                  optional
                  degree={academicDetails?.pgDegree}
                  department={academicDetails?.pgDepartment}
                  yearOfPassing={academicDetails?.pgYearOfPassing}
                  scoreType={academicDetails?.pgScoreType}
                  score={academicDetails?.pgScore}
                  backlogs={academicDetails?.pgBacklogs}
                />
              </div>
            )}
          </div>
          <div className="glass-card p-5">
            <h3 className="font-display font-bold text-gray-800 dark:text-white mb-3">Current Batch</h3>
            {student.batch ? (
              <div className="space-y-2">
                <p className="font-semibold text-gray-800 dark:text-white">{student.batch.name}</p>
                <p className="text-sm text-gray-500">{student.batch.course?.title}</p>
                <p className="text-xs text-gray-400">{student.batch.timing} · {student.batch.mode}</p>
                {student.batch.startDate && (
                  <p className="text-xs text-gray-400">
                    {format(new Date(student.batch.startDate), 'dd MMM yyyy')} – {student.batch.endDate ? format(new Date(student.batch.endDate), 'dd MMM yyyy') : '—'}
                  </p>
                )}
              </div>
            ) : <p className="text-sm text-gray-400">Not enrolled in any batch</p>}
          </div>
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-gray-800 dark:text-white mb-4">Placement Status</h3>
            <div className="flex flex-wrap gap-2">
              {['SEEKING', 'INTERVIEWING', 'PLACED', 'NOT_SEEKING'].map(s => (
                <button key={s} onClick={() => handlePlacementUpdate(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${student.placementStatus === s ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50'}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
