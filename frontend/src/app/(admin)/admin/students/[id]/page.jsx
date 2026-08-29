'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Mail, Phone, MapPin, Linkedin, Github, Award, Building2, BookOpen, Calendar,
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

const EMPTY_ACADEMIC_FORM = {
  tenthYearOfPassing: '', tenthPercentage: '',
  twelfthYearOfPassing: '', twelfthPercentage: '',
  diplomaYearOfPassing: '', diplomaPercentage: '',
  ugDegree: '', ugDepartment: '', ugYearOfPassing: '', ugScoreType: 'CGPA', ugScore: '', ugBacklogs: '',
  pgDegree: '', pgDepartment: '', pgYearOfPassing: '', pgScoreType: 'CGPA', pgScore: '', pgBacklogs: '',
}

const ACADEMIC_INPUT_CLS = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500'
const ACADEMIC_LABEL_CLS = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1'

// 10th / 12th / Diploma all share the same two fields (Year of Passing + Percentage).
function AcademicLevelFields({ title, optional, values, setValues, yearKey, percentageKey }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
        {title}{optional && <span className="font-normal text-gray-400"> (optional)</span>}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={ACADEMIC_LABEL_CLS}>Year of Passing</label>
          <input type="number" step="1" min="1950" max="2100" value={values[yearKey]}
            onChange={e => setValues(f => ({ ...f, [yearKey]: e.target.value }))}
            className={ACADEMIC_INPUT_CLS} />
        </div>
        <div>
          <label className={ACADEMIC_LABEL_CLS}>Percentage</label>
          <input type="number" step="0.1" min="0" max="100" value={values[percentageKey]}
            onChange={e => setValues(f => ({ ...f, [percentageKey]: e.target.value }))}
            className={ACADEMIC_INPUT_CLS} />
        </div>
      </div>
    </div>
  )
}

// UG and PG share the same five fields (Degree/Course, Department, Year of Passing,
// CGPA/Percentage with a type toggle, and Backlogs).
function DegreeLevelFields({ title, optional, values, setValues, prefix }) {
  const degreeKey = `${prefix}Degree`
  const departmentKey = `${prefix}Department`
  const yearKey = `${prefix}YearOfPassing`
  const scoreTypeKey = `${prefix}ScoreType`
  const scoreKey = `${prefix}Score`
  const backlogsKey = `${prefix}Backlogs`

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
        {title}{optional && <span className="font-normal text-gray-400"> (optional)</span>}
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={ACADEMIC_LABEL_CLS}>Degree / Course</label>
          <input type="text" value={values[degreeKey]}
            onChange={e => setValues(f => ({ ...f, [degreeKey]: e.target.value }))}
            placeholder="e.g. B.Tech"
            className={ACADEMIC_INPUT_CLS} />
        </div>
        <div>
          <label className={ACADEMIC_LABEL_CLS}>Department</label>
          <input type="text" value={values[departmentKey]}
            onChange={e => setValues(f => ({ ...f, [departmentKey]: e.target.value }))}
            placeholder="e.g. Computer Science"
            className={ACADEMIC_INPUT_CLS} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={ACADEMIC_LABEL_CLS}>Year of Passing</label>
          <input type="number" step="1" min="1950" max="2100" value={values[yearKey]}
            onChange={e => setValues(f => ({ ...f, [yearKey]: e.target.value }))}
            className={ACADEMIC_INPUT_CLS} />
        </div>
        <div>
          <label className={ACADEMIC_LABEL_CLS}>Backlogs</label>
          <input type="number" step="1" min="0" value={values[backlogsKey]}
            onChange={e => setValues(f => ({ ...f, [backlogsKey]: e.target.value }))}
            className={ACADEMIC_INPUT_CLS} />
        </div>
      </div>
      <div>
        <label className={ACADEMIC_LABEL_CLS}>CGPA / Percentage</label>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-0.5 flex-shrink-0">
            {['CGPA', 'PERCENTAGE'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setValues(f => ({ ...f, [scoreTypeKey]: type }))}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  values[scoreTypeKey] === type ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {type === 'CGPA' ? 'CGPA' : 'Percentage'}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            max={values[scoreTypeKey] === 'CGPA' ? 10 : 100}
            value={values[scoreKey]}
            onChange={e => setValues(f => ({ ...f, [scoreKey]: e.target.value }))}
            placeholder={values[scoreTypeKey] === 'CGPA' ? 'e.g. 8.5' : 'e.g. 82.5'}
            className={`flex-1 min-w-0 ${ACADEMIC_INPUT_CLS}`}
          />
        </div>
      </div>
    </div>
  )
}

export default function StudentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [academicForm, setAcademicForm] = useState(EMPTY_ACADEMIC_FORM)
  const [loadingAcademics, setLoadingAcademics] = useState(true)
  const [savingAcademics, setSavingAcademics] = useState(false)

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
      .then(r => {
        const d = r.data
        setAcademicForm({
          tenthYearOfPassing: d.tenthYearOfPassing ?? '',
          tenthPercentage: d.tenthPercentage ?? '',
          twelfthYearOfPassing: d.twelfthYearOfPassing ?? '',
          twelfthPercentage: d.twelfthPercentage ?? '',
          diplomaYearOfPassing: d.diplomaYearOfPassing ?? '',
          diplomaPercentage: d.diplomaPercentage ?? '',
          ugDegree: d.ugDegree ?? '',
          ugDepartment: d.ugDepartment ?? '',
          ugYearOfPassing: d.ugYearOfPassing ?? '',
          ugScoreType: d.ugScoreType ?? 'CGPA',
          ugScore: d.ugScore ?? '',
          ugBacklogs: d.ugBacklogs ?? '',
          pgDegree: d.pgDegree ?? '',
          pgDepartment: d.pgDepartment ?? '',
          pgYearOfPassing: d.pgYearOfPassing ?? '',
          pgScoreType: d.pgScoreType ?? 'CGPA',
          pgScore: d.pgScore ?? '',
          pgBacklogs: d.pgBacklogs ?? '',
        })
      })
      .catch(err => toast.error(err.message || 'Failed to load academic details'))
      .finally(() => setLoadingAcademics(false))
  }

  useEffect(() => { load(); loadAcademics() }, [id])

  const buildUpdatePayload = (overrides) => ({
    name: student.name,
    phone: student.phone,
    address: student.address,
    qualification: student.qualification,
    linkedinUrl: student.linkedinUrl,
    githubUrl: student.githubUrl,
    placementStatus: student.placementStatus,
    batchId: student.batch?.id || null,
    collegeId: student.college?.id || null,
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

  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

  const handleAcademicsSave = async (e) => {
    e.preventDefault()
    setSavingAcademics(true)
    try {
      await academicDetailsService.update(id, {
        tenthYearOfPassing: num(academicForm.tenthYearOfPassing),
        tenthPercentage: num(academicForm.tenthPercentage),
        twelfthYearOfPassing: num(academicForm.twelfthYearOfPassing),
        twelfthPercentage: num(academicForm.twelfthPercentage),
        diplomaYearOfPassing: num(academicForm.diplomaYearOfPassing),
        diplomaPercentage: num(academicForm.diplomaPercentage),
        ugDegree: academicForm.ugDegree || null,
        ugDepartment: academicForm.ugDepartment || null,
        ugYearOfPassing: num(academicForm.ugYearOfPassing),
        ugScoreType: academicForm.ugScoreType,
        ugScore: num(academicForm.ugScore),
        ugBacklogs: num(academicForm.ugBacklogs),
        pgDegree: academicForm.pgDegree || null,
        pgDepartment: academicForm.pgDepartment || null,
        pgYearOfPassing: num(academicForm.pgYearOfPassing),
        pgScoreType: academicForm.pgScoreType,
        pgScore: num(academicForm.pgScore),
        pgBacklogs: num(academicForm.pgBacklogs),
      })
      toast.success('Academic details updated')
      loadAcademics()
    } catch (err) { toast.error(err.message || 'Failed to update') }
    finally { setSavingAcademics(false) }
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
            <h3 className="font-display font-bold text-gray-800 dark:text-white mb-1">Academic Details</h3>
            <p className="text-xs text-gray-400 mb-4">Used to automatically check eligibility for placement opportunities.</p>
            {loadingAcademics ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
            ) : (
              <form onSubmit={handleAcademicsSave} className="space-y-5">
                <AcademicLevelFields
                  title="10th / SSLC"
                  values={academicForm}
                  setValues={setAcademicForm}
                  yearKey="tenthYearOfPassing"
                  percentageKey="tenthPercentage"
                />
                <AcademicLevelFields
                  title="12th / HSC"
                  values={academicForm}
                  setValues={setAcademicForm}
                  yearKey="twelfthYearOfPassing"
                  percentageKey="twelfthPercentage"
                />
                <AcademicLevelFields
                  title="Diploma"
                  optional
                  values={academicForm}
                  setValues={setAcademicForm}
                  yearKey="diplomaYearOfPassing"
                  percentageKey="diplomaPercentage"
                />
                <DegreeLevelFields
                  title="UG / Degree"
                  values={academicForm}
                  setValues={setAcademicForm}
                  prefix="ug"
                />
                <DegreeLevelFields
                  title="PG / Master's"
                  optional
                  values={academicForm}
                  setValues={setAcademicForm}
                  prefix="pg"
                />
                <button type="submit" disabled={savingAcademics}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
                  {savingAcademics ? 'Saving...' : 'Save Academic Details'}
                </button>
              </form>
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
