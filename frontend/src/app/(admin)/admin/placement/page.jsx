'use client'
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

import { Plus, ChevronDown, ChevronUp, Star, Trash2, Pencil, Calendar, Building2, MapPin, Users, CheckCircle, X, FileText, Upload } from 'lucide-react'
import { format, differenceInDays, isPast } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import SlidePanel from '@/components/admin/SlidePanel'
import EligibilityCriteriaFields from '@/components/admin/EligibilityCriteriaFields'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { useConfirmModal } from '@/components/ui/ConfirmModal'
import CustomSelect from '@/components/ui/CustomSelect'
import MultiSelect from '@/components/ui/MultiSelect'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'

const EMPTY_DRIVE_FORM = {
  companyName: '', role: '', packageOffered: '', location: '', driveDate: '', applyDeadline: '',
  description: '', requirements: '', skills: '', driveType: 'CAMPUS', applyLink: '',
  minCgpa: null, minPercentage: null, maxBacklogs: null,
  eligibleBatchIds: [], eligibleCourseIds: [],
}

const TABS = ['Students', 'Mock Interviews', 'Interview Questions', 'Aptitude Tips', 'Resources', 'Preparation', 'Company Drives', 'Interviews', 'Offers']
const APPLICATION_OFFERABLE = ['SELECTED', 'OFFERED']
const INTERVIEW_CANDIDATE_STATUSES = ['SHORTLISTED', 'RESUME_SHARED', 'SELECTED']
const PRESENTABLE_INTERVIEW_STATUSES = ['SCHEDULED', 'RESCHEDULED']
const PLACEMENT_COLORS = {
  SEEKING: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
  INTERVIEWING: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40',
  PLACED: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  NOT_SEEKING: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
}
const DIFF_COLORS = {
  EASY: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
  MEDIUM: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40',
  HARD: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40',
}

const INITIAL_MOCK_FORM = {
  mode: 'ONLINE',
  scheduledAt: '',
  durationMinutes: 30,
  interviewerName: '',
  meetLink: '',
  location: '',
  selectionType: 'MANUAL',
  studentIds: [],
  batchIds: [],
  courseIds: [],
  randomCount: '',
  syllabus: '',
  instructions: '',
  preparationMaterialIds: [],
  lockedStudent: null,
}

export default function PlacementPage() {
  const [tab, setTab] = useState('Students')
  const [overview, setOverview] = useState(null)
  const [mocks, setMocks] = useState([])
  const [iqList, setIqList] = useState([])
  const [drives, setDrives] = useState([])
  const [driveApplications, setDriveApplications] = useState({})
  const [viewingApps, setViewingApps] = useState(null)
  const [drivePanel, setDrivePanel] = useState(false)
  const [driveForm, setDriveForm] = useState(EMPTY_DRIVE_FORM)
  const [editingDrive, setEditingDrive] = useState(null)
  const [ask, confirmModal] = useConfirmModal()
  const [loading, setLoading] = useState(true)
  const [iqDiff, setIqDiff] = useState('')
  const [iqCourse, setIqCourse] = useState('')
  const [iqSearch, setIqSearch] = useState('')
  const [expandedAnswers, setExpandedAnswers] = useState({})
  const [mockPanel, setMockPanel] = useState(false)
  const [iqPanel, setIqPanel] = useState(false)
  const [feedbackPanel, setFeedbackPanel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [mockForm, setMockForm] = useState(INITIAL_MOCK_FORM)
  const [iqForm, setIqForm] = useState({ question: '', answer: '', difficulty: 'EASY', courseId: '' })
  const [feedbackForm, setFeedbackForm] = useState({ feedback: '', rating: 5, status: 'COMPLETED', strengths: '', improvements: '' })
  const [editIq, setEditIq] = useState(null)
  const [aptList, setAptList] = useState([])
  const [aptPanel, setAptPanel] = useState(false)
  const [aptForm, setAptForm] = useState({ topic: '', formula: '', example: '' })
  const [editApt, setEditApt] = useState(null)
  const [resList, setResList] = useState([])
  const [resPanel, setResPanel] = useState(false)
  const [resForm, setResForm] = useState({ title: '', description: '', url: '', tag: '' })
  const [editRes, setEditRes] = useState(null)
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [prepMaterials, setPrepMaterials] = useState([])
  const [trainers, setTrainers] = useState([])
  const [prepPanel, setPrepPanel] = useState(false)
  const [prepForm, setPrepForm] = useState({ title: '', interviewType: 'TECHNICAL', instructions: '', courseId: '' })
  const [editPrep, setEditPrep] = useState(null)
  const [prepDetail, setPrepDetail] = useState(null)
  const [prepStatusFilter, setPrepStatusFilter] = useState('ALL')
  const [prepQuestionsText, setPrepQuestionsText] = useState('')
  const [driveErrors, setDriveErrors] = useState({})
  const [driveGeneral, setDriveGeneral] = useState(false)
  const [savingQuestions, setSavingQuestions] = useState(false)

  // Students tab filters/paging
  const [stdSearch, setStdSearch] = useState('')
  const [stdStatusFilter, setStdStatusFilter] = useState('')
  const [stdPage, setStdPage] = useState(1)
  const [stdPageSize, setStdPageSize] = useState(8)

  // Mock interviews tab filters/paging
  const [mockSearch, setMockSearch] = useState('')
  const [mockStatusFilter, setMockStatusFilter] = useState('')
  const [mockPage, setMockPage] = useState(1)
  const [mockPageSize, setMockPageSize] = useState(10)

  // Interview questions paging (difficulty + search already server-driven)
  const [iqPage, setIqPage] = useState(1)
  const [iqPageSize, setIqPageSize] = useState(8)
  const [debouncedIqSearch, setDebouncedIqSearch] = useState('')

  // Aptitude tips tab filter/paging
  const [aptSearch, setAptSearch] = useState('')
  const [aptPage, setAptPage] = useState(1)
  const [aptPageSize, setAptPageSize] = useState(8)

  // Resources tab filter/paging
  const [resSearch, setResSearch] = useState('')
  const [resTagFilter, setResTagFilter] = useState('')
  const [resPage, setResPage] = useState(1)
  const [resPageSize, setResPageSize] = useState(8)

  // Preparation tab search/paging
  const [prepSearch, setPrepSearch] = useState('')
  const [prepPage, setPrepPage] = useState(1)
  const [prepPageSize, setPrepPageSize] = useState(9)

  // Company drives tab filter/paging
  const [driveSearch, setDriveSearch] = useState('')
  const [driveStatusFilter, setDriveStatusFilter] = useState('')
  const [drivePage, setDrivePage] = useState(1)
  const [drivePageSize, setDrivePageSize] = useState(10)

  // Offers tab search/paging
  const [offerSearch, setOfferSearch] = useState('')
  const [offerPage, setOfferPage] = useState(1)
  const [offerPageSize, setOfferPageSize] = useState(10)

  // Placement interviews tab filter/paging
  const [intSearch, setIntSearch] = useState('')
  const [intStatusFilter, setIntStatusFilter] = useState('')
  const [intPage, setIntPage] = useState(1)
  const [intPageSize, setIntPageSize] = useState(10)

  // Offers tab
  const [offers, setOffers] = useState([])
  const [offerDriveId, setOfferDriveId] = useState('')
  const [offerPanel, setOfferPanel] = useState(false)
  const [offerForm, setOfferForm] = useState({ driveId: '', applicationId: '', role: '', ctc: '', joiningDate: '', offerExpiry: '', offerLetterUrl: '' })
  const [issueCandidates, setIssueCandidates] = useState([])

  // Placement interviews tab
  const [intDriveId, setIntDriveId] = useState('')
  const [rounds, setRounds] = useState([])
  const [interviews, setInterviews] = useState([])
  const [intApps, setIntApps] = useState([])
  const [roundPanel, setRoundPanel] = useState(false)
  const [intPanel, setIntPanel] = useState(false)
  const [completePanel, setCompletePanel] = useState(null)
  const [roundForm, setRoundForm] = useState({ name: '', roundType: 'APTITUDE', sequence: 1, description: '', durationMinutes: 60, online: true, locationLink: '', minimumScore: '', maxScore: '' })
  const [intForm, setIntForm] = useState({ roundId: '', studentId: '', scheduledAt: '', meetingLink: '', location: '', online: true, notes: '' })
  const [completeForm, setCompleteForm] = useState({ status: 'COMPLETED', result: 'PASS', score: '', feedback: '' })

  // Each section loads independently - one tab's backend not being ready yet
  // (rolled out phase by phase) must never blank out an already-working tab.
  const loadData = () => {
    setLoading(true)
    Promise.allSettled([
      adminApi.getPlacement().catch(() => adminApi.getStudents()),
      adminApi.getMockInterviews(),
      adminApi.getInterviewQuestions({ difficulty: iqDiff, search: iqSearch, courseId: iqCourse || undefined }),
      adminApi.getDrives(),
      adminApi.getAptitudeTips(),
      adminApi.getInterviewResources(),
    ]).then(([p, m, iq, d, apt, res]) => {
      if (p.status === 'fulfilled') {
        const rawData = p.value.data?.data || p.value.data
        const studentList = rawData?.students || rawData?.items || (Array.isArray(rawData) ? rawData : [])

        const statusCounts = rawData?.statusCounts || {
          SEEKING: studentList.filter(s => (s.placementStatus || 'SEEKING') === 'SEEKING').length,
          INTERVIEWING: studentList.filter(s => s.placementStatus === 'INTERVIEWING').length,
          PLACED: studentList.filter(s => s.placementStatus === 'PLACED').length,
          NOT_SEEKING: studentList.filter(s => s.placementStatus === 'NOT_SEEKING').length,
        }
        const total = studentList.length
        const placed = statusCounts.PLACED || 0
        const conversionRate = rawData?.conversionRate ?? (total > 0 ? Math.round((placed / total) * 100) : 0)

        setOverview({
          statusCounts,
          conversionRate,
          students: studentList.map(s => ({
            id: s.id,
            name: s.name || s.user?.name || `Student #${s.id}`,
            email: s.email || s.user?.email || '',
            phone: s.phone || '',
            placementStatus: s.placementStatus || 'SEEKING',
            mockCount: s.mockCount || 0,
            avgMockRating: s.avgMockRating || 0,
            updatedAt: s.updatedAt || ''
          }))
        })
      }

      if (m.status === 'fulfilled') setMocks(m.value.data.data || [])
      else setMocks([])

      if (iq.status === 'fulfilled') setIqList(Array.isArray(iq.value.data.data) ? iq.value.data.data : iq.value.data.data?.items || [])

      if (d.status === 'fulfilled') setDrives(d.value.data.data || [])

      if (apt.status === 'fulfilled') setAptList(Array.isArray(apt.value.data.data) ? apt.value.data.data : apt.value.data.data?.items || [])

      if (res.status === 'fulfilled') setResList(Array.isArray(res.value.data.data) ? res.value.data.data : res.value.data.data?.items || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    Promise.allSettled([
      adminApi.getBatches().catch(() => null),
      adminApi.getCourses().catch(() => null),
      adminApi.getPreparationMaterials().catch(() => null),
      adminApi.getTrainers({ limit: 200, status: 'active' }).catch(() => null),
    ]).then(([b, c, p, t]) => {
      if (b?.status === 'fulfilled') setBatches(Array.isArray(b.value.data.data) ? b.value.data.data : [])
      if (c?.status === 'fulfilled') setCourses(Array.isArray(c.value.data.data) ? c.value.data.data : [])
      if (p?.status === 'fulfilled') setPrepMaterials(Array.isArray(p.value.data.data) ? p.value.data.data : [])
      if (t?.status === 'fulfilled') {
        const tList = t.value?.data?.data?.trainers || t.value?.data?.data || []
        setTrainers(Array.isArray(tList) ? tList : [])
      }
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedIqSearch(iqSearch), 300)
    return () => clearTimeout(t)
  }, [iqSearch])

  useEffect(() => {
    adminApi.getInterviewQuestions({ difficulty: iqDiff, search: debouncedIqSearch, courseId: iqCourse || undefined })
      .then(res => setIqList(res.data.data?.items || res.data.data || []))
      .catch(() => { })
  }, [iqDiff, debouncedIqSearch, iqCourse])

  const handlePlacementStatus = async (studentId, status) => {
    try {
      await adminApi.updatePlacementStatus(studentId, status)
      toast.success('Status updated')
      loadData()
    } catch { toast.error('Failed') }
  }

  const isPastMockTime = useMemo(() => {
    if (!mockForm.scheduledAt) return false
    const d = new Date(mockForm.scheduledAt)
    return !isNaN(d.getTime()) && d.getTime() < Date.now()
  }, [mockForm.scheduledAt])

  const handleScheduleMock = async (e) => {
    e.preventDefault()
    if (!mockForm.mode) {
      toast.error('Please select a mode')
      return
    }
    if (!mockForm.scheduledAt) {
      toast.error('Please select date and time')
      return
    }
    const scheduledDate = new Date(mockForm.scheduledAt)
    if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now() - 60000) {
      toast.error('Mock interview cannot be scheduled in the past')
      return
    }
    if (mockForm.mode === 'ONLINE' && !mockForm.meetLink?.trim()) {
      toast.error('Meeting link is required for online mock interviews')
      return
    }
    if (mockForm.mode === 'ONLINE' && !/^https?:\/\//i.test(mockForm.meetLink.trim())) {
      toast.error('Meeting link must be a valid URL (http/https)')
      return
    }
    if (mockForm.mode === 'OFFLINE' && !mockForm.location?.trim()) {
      toast.error('Location is required for offline mock interviews')
      return
    }
    const sel = mockForm.selectionType || 'MANUAL'
    if (sel === 'MANUAL' && (!mockForm.studentIds || mockForm.studentIds.length === 0)) {
      toast.error('Select at least one student')
      return
    }
    if (sel === 'BATCH' && (!mockForm.batchIds || mockForm.batchIds.length === 0)) {
      toast.error('Select at least one batch')
      return
    }
    if (sel === 'COURSE' && (!mockForm.courseIds || mockForm.courseIds.length === 0)) {
      toast.error('Select at least one course')
      return
    }
    if (sel === 'RANDOM' && (!mockForm.randomCount || Number(mockForm.randomCount) <= 0)) {
      toast.error('Enter a positive count for random selection')
      return
    }
    setSaving(true)
    try {
      const payload = {
        mode: mockForm.mode,
        scheduledAt: mockForm.scheduledAt,
        durationMinutes: mockForm.durationMinutes ? Number(mockForm.durationMinutes) : null,
        interviewerName: mockForm.interviewerName || null,
        meetLink: mockForm.mode === 'ONLINE' ? mockForm.meetLink.trim() : null,
        location: mockForm.mode === 'OFFLINE' ? mockForm.location.trim() : null,
        selectionType: sel,
        studentIds: sel === 'MANUAL' ? (mockForm.studentIds || []).map(Number) : [],
        batchIds: sel === 'BATCH' ? (mockForm.batchIds || []).map(Number) : [],
        courseIds: sel === 'COURSE' ? (mockForm.courseIds || []).map(Number) : [],
        randomCount: sel === 'RANDOM' ? Number(mockForm.randomCount) : null,
        syllabus: mockForm.syllabus || null,
        instructions: mockForm.instructions || null,
        preparationMaterialIds: (mockForm.preparationMaterialIds || []).map(Number),
      }
      await adminApi.scheduleMockInterview(payload)
      toast.success('Mock interview scheduled')
      setMockPanel(false)
      setMockForm(INITIAL_MOCK_FORM)
      loadData()
    } catch (err) {
      const errors = err?.response?.data?.errors
      const msg = errors?.[0]?.message || err?.response?.data?.message || 'Failed to schedule mock interview'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleFeedback = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.updateMockCandidate(feedbackPanel.mockId, feedbackPanel.candidateId, {
        ...feedbackForm,
        strengths: feedbackForm.strengths.split(',').map(s => s.trim()).filter(Boolean),
        improvements: feedbackForm.improvements.split(',').map(s => s.trim()).filter(Boolean),
      })
      toast.success('Feedback saved')
      setFeedbackPanel(null)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save feedback')
    } finally { setSaving(false) }
  }

  const handleSaveIq = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const data = {
        questionText: iqForm.questionText || iqForm.question,
        answerText: iqForm.answerText || iqForm.answer,
        difficulty: iqForm.difficulty,
        courseId: iqForm.courseId ? Number(iqForm.courseId) : null,
      }
      if (editIq) await adminApi.updateInterviewQuestion(editIq, data)
      else await adminApi.createInterviewQuestion(data)
      toast.success(editIq ? 'Updated' : 'Question added')
      setIqPanel(false)
      setEditIq(null)
      setIqForm({ question: '', answer: '', difficulty: 'EASY', courseId: '' })
      loadData()
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  const handleDeleteIq = async (id) => {
    const ok = await ask({ title: 'Delete Question?', message: 'Are you sure you want to delete this interview question?', confirmLabel: 'Delete' })
    if (!ok) return
    try { await adminApi.deleteInterviewQuestion(id); toast.success('Deleted'); loadData() }
    catch { toast.error('Failed') }
  }

  const handleSaveApt = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editApt) await adminApi.updateAptitudeTip(editApt, aptForm)
      else await adminApi.createAptitudeTip(aptForm)
      toast.success(editApt ? 'Updated' : 'Aptitude tip added')
      setAptPanel(false)
      setEditApt(null)
      setAptForm({ topic: '', formula: '', example: '' })
      loadData()
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  const handleDeleteApt = async (id) => {
    const ok = await ask({ title: 'Delete Aptitude Tip?', message: 'Are you sure you want to delete this aptitude tip?', confirmLabel: 'Delete' })
    if (!ok) return
    try { await adminApi.deleteAptitudeTip(id); toast.success('Deleted'); loadData() }
    catch { toast.error('Failed') }
  }

  const handleSaveRes = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editRes) await adminApi.updateInterviewResource(editRes, resForm)
      else await adminApi.createInterviewResource(resForm)
      toast.success(editRes ? 'Updated' : 'Resource added')
      setResPanel(false)
      setEditRes(null)
      setResForm({ title: '', description: '', url: '', tag: '' })
      loadData()
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  const handleDeleteRes = async (id) => {
    const ok = await ask({ title: 'Delete Resource?', message: 'Are you sure you want to delete this resource?', confirmLabel: 'Delete' })
    if (!ok) return
    try { await adminApi.deleteInterviewResource(id); toast.success('Deleted'); loadData() }
    catch { toast.error('Failed') }
  }

  const handleSavePrep = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editPrep) {
        await adminApi.updatePreparationMaterial(editPrep, {
          title: prepForm.title,
          interviewType: prepForm.interviewType || null,
          instructions: prepForm.instructions || null,
          courseId: prepForm.courseId ? Number(prepForm.courseId) : null,
        })
        toast.success('Material updated')
      } else {
        const res = await adminApi.createPreparationMaterial({
          title: prepForm.title,
          interviewType: prepForm.interviewType || null,
          instructions: prepForm.instructions || null,
          courseId: prepForm.courseId ? Number(prepForm.courseId) : null,
        })
        if (res?.data?.data?.id) handleOpenPrep(res.data.data.id)
      }
      setPrepPanel(false)
      setEditPrep(null)
      setPrepForm({ title: '', interviewType: 'TECHNICAL', instructions: '', courseId: '' })
      loadPrepList()
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || (editPrep ? 'Failed to update' : 'Failed to create'))
    } finally { setSaving(false) }
  }

  const loadPrepList = async () => {
    try {
      const res = await adminApi.getPreparationMaterials()
      setPrepMaterials(Array.isArray(res.data.data) ? res.data.data : [])
    } catch { /* silent */ }
  }

  const handlePublishPrep = async (id) => {
    try { await adminApi.publishPreparationMaterial(id); toast.success('Published'); setPrepDetail(null); loadPrepList(); loadData() }
    catch (err) { toast.error(err?.response?.data?.message || 'Failed') }
  }

  const handleArchivePrep = async (id) => {
    const ok = await ask({ title: 'Archive Material?', message: 'Archive this material? Students will lose access.', confirmLabel: 'Archive', tone: 'warning' })
    if (!ok) return
    try { await adminApi.archivePreparationMaterial(id); toast.success('Archived'); setPrepDetail(null); loadPrepList(); loadData() }
    catch (err) { toast.error(err?.response?.data?.message || 'Failed') }
  }

  const handleDeletePrep = async (id) => {
    const ok = await ask({ title: 'Delete Material?', message: 'Delete this material permanently? This cannot be undone.', confirmLabel: 'Delete' })
    if (!ok) return
    try { await adminApi.deletePreparationMaterial(id); toast.success('Deleted'); setPrepDetail(null); loadPrepList() }
    catch (err) { toast.error(err?.response?.data?.message || 'Failed') }
  }

  const handleOpenPrep = async (id) => {
    setPrepDetail({ id, loading: true })
    try {
      const res = await adminApi.getPreparationMaterial(id)
      const d = res.data.data
      setPrepDetail(d)
      setPrepQuestionsText((d.questions || []).map(q => `${q.questionText || ''} | ${q.answerText || ''}`).join('\n'))
    } catch (err) {
      setPrepDetail(null)
      toast.error(err?.response?.data?.message || 'Failed to load material')
    }
  }

  const handleUploadPrepDoc = async (id, file) => {
    if (!file) return
    try {
      await adminApi.uploadPrepDocument(id, file)
      toast.success('Document uploaded')
      handleOpenPrep(id)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    }
  }

  const handleDeletePrepDoc = async (id, docId) => {
    const ok = await ask({ title: 'Remove Document?', message: 'Remove this document from the material?', confirmLabel: 'Remove' })
    if (!ok) return
    try {
      await adminApi.deletePrepDocument(id, docId)
      toast.success('Document removed')
      handleOpenPrep(id)
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed') }
  }

  const handleSavePrepQuestions = async (id) => {
    setSavingQuestions(true)
    try {
      const questions = prepQuestionsText.split('\n').map(line => {
        const [q, a] = line.split('|').map(s => s.trim())
        return { questionText: q || '', answerText: a || '' }
      }).filter(q => q.questionText)
      await adminApi.setPrepQuestions(id, { questions })
      toast.success('Questions saved')
      handleOpenPrep(id)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save questions')
    } finally { setSavingQuestions(false) }
  }

  const handleCreateDrive = async (e) => {
    e.preventDefault(); setSaving(true); setDriveErrors({})
    const fieldErrors = {}
    const driveDate = driveForm.driveDate ? new Date(driveForm.driveDate + 'T00:00:00') : null
    const deadline = driveForm.applyDeadline ? new Date(driveForm.applyDeadline + 'T00:00:00') : null
    const todayStart = new Date(new Date().toDateString())
    if (driveDate && deadline && deadline >= driveDate) {
      fieldErrors.applyDeadline = 'Apply deadline must be before the drive date'
      fieldErrors.driveDate = 'Apply deadline must be before the drive date'
    }
    if (driveDate && driveDate < todayStart) {
      fieldErrors.driveDate = fieldErrors.driveDate || 'Drive date cannot be in the past'
    }
    if (deadline && deadline < todayStart) {
      fieldErrors.applyDeadline = fieldErrors.applyDeadline || 'Apply deadline cannot be in the past'
    }
    if (!driveGeneral && !driveForm.minCgpa && !driveForm.minPercentage) {
      const msg = 'Enter a minimum CGPA or Percentage'
      fieldErrors.minCgpa = msg
      fieldErrors.minPercentage = msg
    }
    if (Object.keys(fieldErrors).length > 0) {
      setDriveErrors(fieldErrors)
      toast.error(Object.values(fieldErrors)[0])
      setSaving(false)
      return
    }
    try {
      const payload = {
        ...driveForm,
        requirements: driveForm.requirements.split(',').map(s => s.trim()).filter(Boolean),
        skills: driveForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        eligibleBatchIds: driveGeneral ? [] : (driveForm.eligibleBatchIds || []),
        eligibleCourseIds: driveGeneral ? [] : (driveForm.eligibleCourseIds || []),
        minAttendancePct: editingDrive ? editingDrive.minAttendancePct : undefined,
      }
      if (editingDrive) {
        await adminApi.updateDrive(editingDrive.id, payload)
        toast.success('Drive updated')
      } else {
        await adminApi.createDrive(payload)
        toast.success('Drive created')
      }
      setDrivePanel(false)
      setDriveErrors({})
      setDriveGeneral(false)
      setEditingDrive(null)
      setDriveForm(EMPTY_DRIVE_FORM)
      loadData()
    } catch (err) {
      const errors = err?.response?.data?.errors
      if (Array.isArray(errors) && errors.length) {
        const byField = {}
        errors.forEach(er => {
          const f = er?.field
          if (f) byField[f] = er?.message || 'Invalid value'
        })
        setDriveErrors(byField)
        toast.error(errors.find(er => er?.message)?.message || 'Failed to save drive')
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save drive')
      }
    } finally { setSaving(false) }
  }

  const handleEditDrive = (d) => {
    setEditingDrive(d)
    setDriveGeneral(!(d.eligibleBatches?.length || d.eligibleCourses?.length))
    setDriveForm({
      companyName: d.companyName || '',
      role: d.role || '',
      packageOffered: d.packageOffered || '',
      location: d.location || '',
      driveDate: d.driveDate || '',
      applyDeadline: d.applyDeadline || '',
      description: d.description || '',
      requirements: (d.requirements || []).join(', '),
      skills: (d.skills || []).join(', '),
      driveType: d.driveType || 'CAMPUS',
      applyLink: d.applyLink || '',
      minCgpa: d.minCgpa ?? null,
      minPercentage: d.minPercentage ?? null,
      maxBacklogs: d.maxBacklogs ?? null,
      eligibleBatchIds: (d.eligibleBatches || []).map(b => String(b.id)),
      eligibleCourseIds: (d.eligibleCourses || []).map(c => String(c.id)),
    })
    setDriveErrors({})
    setDrivePanel(true)
  }

  const handleDeleteDrive = async (d) => {
    const ok = await ask({ title: 'Delete Drive?', message: `Delete "${d.companyName} — ${d.role}"? All applications and interview data will be removed.`, confirmLabel: 'Delete', tone: 'danger' })
    if (!ok) return
    try {
      await adminApi.deleteDrive(d.id)
      toast.success('Drive deleted')
      loadData()
    } catch { toast.error('Failed to delete drive') }
  }

  const handleViewApps = async (driveId) => {
    setViewingApps(driveId)
    if (!driveApplications[driveId]) {
      try {
        const res = await adminApi.getDriveApplications(driveId)
        setDriveApplications(prev => ({ ...prev, [driveId]: res.data.data || [] }))
      } catch { toast.error('Failed to load applications') }
    }
  }

  const handleUpdateAppStatus = async (driveId, appId, status) => {
    try {
      await adminApi.updateDriveApplication(driveId, appId, { status })
      setDriveApplications(prev => ({
        ...prev,
        [driveId]: (prev[driveId] || []).map(a => a.id === appId ? { ...a, status } : a)
      }))
      toast.success('Status updated')
    } catch { toast.error('Failed') }
  }

  const loadOffers = async (driveId) => {
    try {
      const res = await adminApi.getOffers(driveId)
      setOffers(res.data.data || [])
    } catch { toast.error('Failed to load offers') }
  }

  const loadInterviewsTab = async (driveId) => {
    if (!driveId) { setRounds([]); setInterviews([]); setIntApps([]); return }
    const [r, i, a] = await Promise.allSettled([
      adminApi.getInterviewRounds(driveId),
      adminApi.getInterviews(driveId),
      adminApi.getDriveApplications(driveId),
    ])
    setRounds(r.status === 'fulfilled' ? r.value.data.data || [] : [])
    setInterviews(i.status === 'fulfilled' ? i.value.data.data || [] : [])
    setIntApps(a.status === 'fulfilled' ? a.value.data.data || [] : [])
    if (r.status === 'rejected' || i.status === 'rejected') {
      toast.error('Failed to load interview data for this drive')
    }
  }

  useEffect(() => {
    if (tab === 'Offers') loadOffers(offerDriveId)
    if (tab === 'Interviews') loadInterviewsTab(intDriveId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const handleOpenOfferPanel = async (driveId) => {
    setOfferPanel(true)
    setOfferForm({ driveId: String(driveId), applicationId: '', role: '', ctc: '', joiningDate: '', offerExpiry: '', offerLetterUrl: '' })
    try {
      const res = await adminApi.getDriveApplications(driveId)
      setIssueCandidates((res.data.data || []).filter(a => APPLICATION_OFFERABLE.includes(a.status)))
    } catch { toast.error('Failed to load applications') }
  }

  const handleIssueOffer = async (e) => {
    e.preventDefault(); setSaving(true)
    if (!offerForm.applicationId) {
      toast.error('Select a candidate'); setSaving(false); return
    }
    try {
      await adminApi.issueOffer({
        applicationId: Number(offerForm.applicationId),
        role: offerForm.role,
        ctc: offerForm.ctc || null,
        joiningDate: offerForm.joiningDate || null,
        offerExpiry: offerForm.offerExpiry || null,
        offerLetterUrl: offerForm.offerLetterUrl || null,
      })
      toast.success('Offer issued')
      setOfferPanel(false)
      loadOffers(offerDriveId)
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to issue offer') } finally { setSaving(false) }
  }

  const handleWithdrawOffer = async (id) => {
    const ok = await ask({ title: 'Withdraw Offer?', message: 'Withdraw this offer? The student will be notified.', confirmLabel: 'Withdraw' })
    if (!ok) return
    try { await adminApi.withdrawOffer(id); toast.success('Offer withdrawn'); loadOffers(offerDriveId) }
    catch (err) { toast.error(err?.response?.data?.message || 'Failed to withdraw offer') }
  }

  const handleCreateRound = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createInterviewRound(intDriveId, {
        name: roundForm.name,
        roundType: roundForm.roundType,
        sequence: parseInt(roundForm.sequence, 10),
        description: roundForm.description || null,
        durationMinutes: roundForm.durationMinutes ? parseInt(roundForm.durationMinutes, 10) : null,
        online: roundForm.online,
        locationLink: roundForm.locationLink || null,
        minimumScore: roundForm.minimumScore || null,
        maxScore: roundForm.maxScore || null,
      })
      toast.success('Round created')
      setRoundPanel(false)
      setRoundForm(f => ({ ...f, sequence: rounds.length + 2 }))
      loadInterviewsTab(intDriveId)
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to create round') } finally { setSaving(false) }
  }

  const handleDeleteRound = async (roundId) => {
    const ok = await ask({ title: 'Delete Round?', message: 'Delete this round? Rounds with scheduled interviews cannot be deleted.', confirmLabel: 'Delete' })
    if (!ok) return
    try { await adminApi.deleteInterviewRound(intDriveId, roundId); toast.success('Round deleted'); loadInterviewsTab(intDriveId) }
    catch (err) { toast.error(err?.response?.data?.message || 'Failed to delete round') }
  }

  const handleScheduleInterview = async (e) => {
    e.preventDefault(); setSaving(true)
    if (!intForm.roundId || !intForm.studentId || !intForm.scheduledAt) {
      toast.error('Round, candidate and date/time are required'); setSaving(false); return
    }
    try {
      await adminApi.scheduleInterview(intDriveId, {
        roundId: Number(intForm.roundId),
        studentId: Number(intForm.studentId),
        scheduledAt: intForm.scheduledAt,
        meetingLink: intForm.meetingLink || null,
        location: intForm.location || null,
        online: intForm.online,
        notes: intForm.notes || null,
      })
      toast.success('Interview scheduled')
      setIntPanel(false)
      setIntForm({ roundId: '', studentId: '', scheduledAt: '', meetingLink: '', location: '', online: true, notes: '' })
      loadInterviewsTab(intDriveId)
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to schedule interview') } finally { setSaving(false) }
  }

  const handleCompleteInterview = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.completeInterview(intDriveId, completePanel, {
        status: completeForm.status,
        result: completeForm.status === 'COMPLETED' ? completeForm.result : null,
        score: completeForm.score || null,
        feedback: completeForm.feedback || null,
      })
      toast.success('Interview updated')
      setCompletePanel(null)
      loadInterviewsTab(intDriveId)
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update interview') } finally { setSaving(false) }
  }

  const sc = overview?.statusCounts || {}
  const total = Object.values(sc).reduce((a, b) => a + b, 0)

  // Client-side search + filter derivations for each listing (page-agnostic).
  const allStudents = overview?.students || []
  const filteredStudents = allStudents.filter(s => {
    const matchSearch = !stdSearch || `${s.name} ${s.email}`.toLowerCase().includes(stdSearch.toLowerCase())
    const matchStatus = !stdStatusFilter || s.placementStatus === stdStatusFilter
    return matchSearch && matchStatus
  })

  const filteredMocks = mocks.filter(m => {
    const matchSearch = !mockSearch ||
      `${m.interviewerName || ''} ${(m.candidates || []).map(c => c.student?.user?.name || '').join(' ')}`.toLowerCase().includes(mockSearch.toLowerCase())
    const matchStatus = !mockStatusFilter || m.status === mockStatusFilter
    return matchSearch && matchStatus
  })

  const filteredIq = iqList

  const filteredApt = aptList.filter(tip =>
    !aptSearch || `${tip.topic} ${tip.formula} ${tip.example}`.toLowerCase().includes(aptSearch.toLowerCase())
  )

  const resTags = Array.from(new Set(resList.map(r => r.tag).filter(Boolean)))
  const filteredRes = resList.filter(r => {
    const matchSearch = !resSearch || `${r.title} ${r.description} ${r.tag}`.toLowerCase().includes(resSearch.toLowerCase())
    const matchTag = !resTagFilter || r.tag === resTagFilter
    return matchSearch && matchTag
  })

  const filteredPrep = prepMaterials.filter(p => {
    const matchStatus = prepStatusFilter === 'ALL' || p.status === prepStatusFilter
    const matchSearch = !prepSearch || `${p.title} ${p.interviewType || ''}`.toLowerCase().includes(prepSearch.toLowerCase())
    return matchStatus && matchSearch
  })

  const filteredDrives = drives.filter(d => {
    const matchSearch = !driveSearch || `${d.companyName} ${d.role}`.toLowerCase().includes(driveSearch.toLowerCase())
    const open = !!d.applyDeadline && !isPast(new Date(d.applyDeadline))
    const matchStatus = !driveStatusFilter || (driveStatusFilter === 'OPEN' ? open : driveStatusFilter === 'CLOSED' ? !open : d.driveType === driveStatusFilter)
    return matchSearch && matchStatus
  })

  const filteredOffers = offers.filter(o =>
    !offerSearch || `${o.studentName || ''} ${o.companyName} ${o.role}`.toLowerCase().includes(offerSearch.toLowerCase())
  )

  const filteredInterviews = interviews.filter(iv => {
    const matchSearch = !intSearch || `${iv.studentName || ''} ${iv.roundName}`.toLowerCase().includes(intSearch.toLowerCase())
    const matchStatus = !intStatusFilter || iv.status === intStatusFilter
    return matchSearch && matchStatus
  })

  const resetStdPage = () => setStdPage(1)
  const resetMockPage = () => setMockPage(1)
  const resetAptPage = () => setAptPage(1)
  const resetResPage = () => setResPage(1)
  const resetPrepPage = () => setPrepPage(1)
  const resetDrivePage = () => setDrivePage(1)
  const resetOfferPage = () => setOfferPage(1)
  const resetIntPage = () => setIntPage(1)

  // Clamp to a valid page whenever the underlying dataset shrinks.
  const clampPage = (d, p, s) => Math.min(p, Math.max(1, Math.ceil(d.length / s)))
  const stdPageEff = clampPage(filteredStudents, stdPage, stdPageSize)
  const mockPageEff = clampPage(filteredMocks, mockPage, mockPageSize)
  const iqPageEff = clampPage(filteredIq, iqPage, iqPageSize)
  const aptPageEff = clampPage(filteredApt, aptPage, aptPageSize)
  const resPageEff = clampPage(filteredRes, resPage, resPageSize)
  const prepPageEff = clampPage(filteredPrep, prepPage, prepPageSize)
  const drivePageEff = clampPage(filteredDrives, drivePage, drivePageSize)
  const offerPageEff = clampPage(filteredOffers, offerPage, offerPageSize)
  const intPageEff = clampPage(filteredInterviews, intPage, intPageSize)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Placement Management</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: total, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Seeking', value: sc.SEEKING || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Interviewing', value: sc.INTERVIEWING || 0, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Placed', value: sc.PLACED || 0, color: 'text-green-600', bg: 'bg-green-50 border-2 border-green-200' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`glass-card p-5 ${bg}`}>
            <p className={`text-3xl font-extrabold font-display ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">{label}</p>
            {label !== 'Total Students' && total > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">{Math.round((value / total) * 100)}%</p>
            )}
          </div>
        ))}
      </div>



      {/* Tabs */}
      <div className="flex gap-1 bg-white/80 dark:bg-gray-900/70 border border-purple-100 rounded-2xl p-1 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-none px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {tab === 'Students' && (
        <div className="glass-card overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 pt-4">
            <SearchInput
              value={stdSearch}
              onChange={v => { setStdSearch(v); resetStdPage() }}
              placeholder="Search name or email..."
              className="w-full sm:max-w-xs"
            />
            <div className="w-full sm:w-48">
              <CustomSelect
                value={stdStatusFilter}
                onChange={v => { setStdStatusFilter(v); resetStdPage() }}
                options={[
                  { value: '', label: 'All Statuses' },
                  ...Object.keys(PLACEMENT_COLORS).map(s => ({ value: s, label: s.replace('_', ' ') })),
                ]}
                placeholder="All Statuses"
              />
            </div>
          </div>
          <div className="overflow-x-auto mt-3">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100">
                  {['Student', 'Status', 'Mocks', 'Avg Rating', 'Last Update', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-2"><div className="h-8 bg-gray-100 rounded-lg animate-pulse" /></td></tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No students match your filters</td></tr>
                ) : (
                  filteredStudents.slice((stdPageEff - 1) * stdPageSize, stdPageEff * stdPageSize).map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-purple-50/20">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 dark:text-white">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block w-36">
                          <CustomSelect
                            compact
                            value={s.placementStatus}
                            onChange={v => handlePlacementStatus(s.id, v)}
                            options={Object.keys(PLACEMENT_COLORS).map(k => ({ value: k, label: k.replace('_', ' ') }))}
                          />
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold text-gray-600">{s.mockCount}</span></td>
                      <td className="px-4 py-3">
                        {s.avgMockRating > 0 ? (
                          <span className="text-yellow-500 text-sm">{'★'.repeat(s.avgMockRating)}</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {s.latestUpdate ? s.latestUpdate.title : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => {
                            setMockForm({
                              ...INITIAL_MOCK_FORM,
                              selectionType: 'MANUAL',
                              studentIds: [s.id],
                              lockedStudent: s,
                            })
                            setMockPanel(true)
                          }}
                            className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-purple-100">
                            Schedule Mock
                          </button>
                          <a href={`/admin/students/${s.id}`}
                            className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-gray-100">
                            View Profile
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            data={filteredStudents}
            page={stdPage}
            pageSize={stdPageSize}
            onPageChange={setStdPage}
            onPageSizeChange={v => { setStdPageSize(v); setStdPage(1) }}
            label="students"
          />
        </div>
      )}

      {/* Mock Interviews Tab */}
      {tab === 'Mock Interviews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <SearchInput
                value={mockSearch}
                onChange={v => { setMockSearch(v); resetMockPage() }}
                placeholder="Search interviewer or student..."
                className="w-full sm:w-64"
              />
              <div className="w-full sm:w-44">
                <CustomSelect
                  value={mockStatusFilter}
                  onChange={v => { setMockStatusFilter(v); resetMockPage() }}
                  options={[
                    { value: '', label: 'All Statuses' },
                    ...['SCHEDULED', 'COMPLETED', 'CANCELLED'].map(s => ({ value: s, label: s })),
                  ]}
                  placeholder="All Statuses"
                />
              </div>
            </div>
            <button onClick={() => { setMockForm(INITIAL_MOCK_FORM); setMockPanel(true) }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus size={14} /> Schedule Mock Interview
            </button>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="bg-purple-50/50 border-b border-purple-100">
                    {['Candidates', 'Date/Time', 'Mode', 'Duration', 'Interviewer', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMocks.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No mock interviews match your filters</td></tr>
                  ) : (
                    filteredMocks.slice((mockPageEff - 1) * mockPageSize, mockPageEff * mockPageSize).map(m => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-purple-50/20 align-top">
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            {(m.candidates || []).map(c => (
                              <div key={c.id} className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800 dark:text-white text-xs">{c.student?.user?.name || `Student #${c.student?.id}`}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${c.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : c.status === 'ABSENT' ? 'bg-red-100 text-red-500' : c.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                                  {c.status}
                                </span>
                                {c.rating ? <span className="text-yellow-500 text-sm">{'★'.repeat(c.rating)}</span> : null}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(m.scheduledAt), 'dd MMM yyyy, HH:mm')}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${m.mode === 'ONLINE' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>
                            {m.mode}
                          </span>
                          {m.mode === 'ONLINE' && m.meetLink ? (
                            <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-purple-600 mt-1 hover:underline break-words">Join</a>
                          ) : m.mode === 'OFFLINE' && m.location ? (
                            <span className="block text-[10px] text-gray-500 mt-1">{m.location}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.durationMinutes ? `${m.durationMinutes}m` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.interviewerName || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : m.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {m.status === 'SCHEDULED' && (m.candidates || []).length > 0 ? (
                            <div className="flex flex-col gap-1.5 items-start">
                              {(m.candidates || []).map(c => c.status === 'SCHEDULED' ? (
                                new Date(m.scheduledAt).getTime() > Date.now() ? (
                                  <span key={c.id} className="text-xs text-gray-400 cursor-not-allowed" title="Feedback available after scheduled time">
                                    {c.student?.user?.name || `Student #${c.student?.id}`} — awaiting scheduled time
                                  </span>
                                ) : (
                                  <button key={c.id}
                                    onClick={() => { setFeedbackPanel({ mockId: m.id, candidateId: c.id }); setFeedbackForm({ feedback: c.feedback || '', rating: c.rating || 5, status: 'COMPLETED', strengths: (c.strengths || []).join(', '), improvements: (c.improvements || []).join(', ') }) }}
                                    className="text-xs text-purple-600 font-semibold hover:underline">
                                    Give feedback — {c.student?.user?.name || `Student #${c.student?.id}`}
                                  </button>
                                )
                              ) : null)}
                              <button
                                onClick={async () => {
                                  const ok = await ask({ title: 'Cancel Mock Interview?', message: 'Cancel this mock interview for all candidates?', confirmLabel: 'Cancel' })
                                  if (!ok) return
                                  try { await adminApi.updateMockInterview(m.id, { status: 'CANCELLED' }); toast.success('Mock interview cancelled'); loadData() } catch (err) { toast.error(err?.response?.data?.message || 'Failed') }
                                }}
                                className="text-xs text-red-500 font-semibold hover:underline">
                                Cancel
                              </button>
                            </div>
                          ) : <span className="text-xs text-gray-400">{m.status === 'COMPLETED' ? 'Done' : '—'}</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              data={filteredMocks}
              page={mockPage}
              pageSize={mockPageSize}
              onPageChange={setMockPage}
              onPageSizeChange={v => { setMockPageSize(v); setMockPage(1) }}
              label="mock interviews"
            />
          </div>
        </div>
      )}

      {/* Interview Questions Tab */}
      {tab === 'Interview Questions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-col sm:flex-row flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              <SearchInput
                value={iqSearch}
                onChange={v => { setIqSearch(v); setIqPage(1) }}
                placeholder="Search questions..."
                className="w-full sm:w-64"
              />
              <div className="w-full sm:w-44">
                <CustomSelect
                  value={iqDiff}
                  onChange={v => { setIqDiff(v); setIqPage(1) }}
                  options={[
                    { value: '', label: 'All Difficulty' },
                    ...['EASY', 'MEDIUM', 'HARD'].map(d => ({ value: d, label: d })),
                  ]}
                  placeholder="All Difficulty"
                />
              </div>
              <div className="w-full sm:w-48">
                <CustomSelect
                  value={iqCourse}
                  onChange={v => { setIqCourse(v); setIqPage(1) }}
                  options={[
                    { value: '', label: 'All Courses' },
                    ...courses.map(c => ({ value: String(c.id), label: c.title })),
                  ]}
                  placeholder="All Courses"
                />
              </div>
            </div>
            <button onClick={() => { setIqPanel(true); setEditIq(null); setIqForm({ question: '', answer: '', difficulty: 'EASY', courseId: '' }) }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-3 py-2 text-xs font-semibold">
              <Plus size={12} /> Add Question
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {filteredIq.length === 0 ? (
              <div className="col-span-2 glass-card p-10 text-center text-gray-400">No questions found</div>
            ) : (
              filteredIq.slice((iqPageEff - 1) * iqPageSize, iqPageEff * iqPageSize).map(q => (
                <div key={q.id} className="glass-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</span>
                      {q.courseName && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">{q.courseName}</span>}
                      {q.active === false && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditIq(q.id); setIqForm({ question: q.question, answer: q.answer, difficulty: q.difficulty, courseId: q.courseId ? String(q.courseId) : '' }); setIqPanel(true) }}
                        className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs">✎</button>
                      <button onClick={() => handleDeleteIq(q.id)}
                        className="w-6 h-6 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{q.question}</p>
                  {expandedAnswers[q.id] ? (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{q.answer}</p>
                      <button onClick={() => setExpandedAnswers(prev => ({ ...prev, [q.id]: false }))}
                        className="text-xs text-purple-500 font-semibold mt-1 flex items-center gap-1">
                        <ChevronUp size={11} /> Hide Answer
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setExpandedAnswers(prev => ({ ...prev, [q.id]: true }))}
                      className="text-xs text-purple-500 font-semibold flex items-center gap-1">
                      <ChevronDown size={11} /> Show Answer
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <Pagination
            data={filteredIq}
            page={iqPage}
            pageSize={iqPageSize}
            onPageChange={setIqPage}
            onPageSizeChange={v => { setIqPageSize(v); setIqPage(1) }}
            label="questions"
          />
        </div>
      )}

      {/* Aptitude Tips Tab */}
      {tab === 'Aptitude Tips' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <SearchInput
              value={aptSearch}
              onChange={v => { setAptSearch(v); resetAptPage() }}
              placeholder="Search topic, formula or example..."
              className="w-full sm:max-w-xs"
            />
            <button onClick={() => { setAptPanel(true); setEditApt(null); setAptForm({ topic: '', formula: '', example: '' }) }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-3 py-2 text-xs font-semibold">
              <Plus size={12} /> Add Aptitude Tips
            </button>
          </div>
          {filteredApt.length === 0 ? (
            <div className="glass-card p-10 text-center text-gray-400">No aptitude tips yet. Add one to start helping students revise.</div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredApt.slice((aptPageEff - 1) * aptPageSize, aptPageEff * aptPageSize).map(tip => (
                  <div key={tip.id} className="glass-card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm">{tip.topic}</h3>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditApt(tip.id); setAptForm({ topic: tip.topic, formula: tip.formula, example: tip.example }); setAptPanel(true) }}
                          className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs">✎</button>
                        <button onClick={() => handleDeleteApt(tip.id)}
                          className="w-6 h-6 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-0.5">Formula</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">{tip.formula}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 mb-0.5">Example</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">{tip.example}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                data={filteredApt}
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

      {/* Resources Tab */}
      {tab === 'Resources' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <SearchInput
                value={resSearch}
                onChange={v => { setResSearch(v); resetResPage() }}
                placeholder="Search title or description..."
                className="w-full sm:w-64"
              />
              <div className="w-full sm:w-44">
                <CustomSelect
                  value={resTagFilter}
                  onChange={v => { setResTagFilter(v); resetResPage() }}
                  options={[
                    { value: '', label: 'All Tags' },
                    ...resTags.map(t => ({ value: t, label: t })),
                  ]}
                  placeholder="All Tags"
                />
              </div>
            </div>
            <button onClick={() => { setResPanel(true); setEditRes(null); setResForm({ title: '', description: '', url: '', tag: '', active: true }) }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-3 py-2 text-xs font-semibold">
              <Plus size={12} /> Add Resource
            </button>
          </div>
          {filteredRes.length === 0 ? (
            <div className="glass-card p-10 text-center text-gray-400">No resources match your filters.</div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredRes.slice((resPageEff - 1) * resPageSize, resPageEff * resPageSize).map(res => (
                  <div key={res.id} className="glass-card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm">{res.title}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{res.tag}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditRes(res.id); setResForm({ title: res.title, description: res.description, url: res.url, tag: res.tag }); setResPanel(true) }}
                          className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs">✎</button>
                        <button onClick={() => handleDeleteRes(res.id)}
                          className="w-6 h-6 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{res.description}</p>
                    <a href={res.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700">
                      {res.url} <ChevronUp size={10} className="rotate-45" />
                    </a>
                  </div>
                ))}
              </div>
              <Pagination
                data={filteredRes}
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

      {/* Preparation Tab */}
      {tab === 'Preparation' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <SearchInput
                value={prepSearch}
                onChange={v => { setPrepSearch(v); resetPrepPage() }}
                placeholder="Search title or interview type..."
                className="w-full sm:w-64"
              />
              <div className="w-full sm:w-48">
                <CustomSelect
                  value={prepStatusFilter}
                  onChange={v => { setPrepStatusFilter(v); resetPrepPage() }}
                  options={[
                    { value: 'ALL', label: 'All Materials' },
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'PUBLISHED', label: 'Published' },
                    { value: 'ARCHIVED', label: 'Archived' },
                  ]}
                  placeholder="All Materials"
                />
              </div>
            </div>
            <button onClick={() => { setPrepPanel(true); setEditPrep(null); setPrepForm({ title: '', interviewType: 'TECHNICAL', instructions: '', courseId: '' }) }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus size={14} /> Create Material
            </button>
          </div>
          {prepMaterials.length === 0 ? (
            <div className="glass-card p-10 text-center text-gray-400">
              No preparation materials yet. Create one to start building interview prep content for students.
            </div>
          ) : filteredPrep.length === 0 ? (
            <div className="glass-card p-10 text-center text-gray-400">
              No materials match your filters.
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPrep.slice((prepPageEff - 1) * prepPageSize, prepPageEff * prepPageSize).map(p => (
                  <div key={p.id} className="glass-card p-5 space-y-3 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">{p.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{p.interviewType || 'Interview'} • {p.course ? p.course.title : 'General'}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${p.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : p.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                        {p.status}
                      </span>
                    </div>
                    {p.instructions ? <p className="text-xs text-gray-500 line-clamp-2">{p.instructions}</p> : null}
                    <div className="flex gap-2 text-[11px] text-gray-500 text-xs">
                      <span>{p.documentCount || 0} docs</span>
                      <span>•</span>
                      <span>{p.questionsCount || 0} questions</span>
                      {p.publishedAt ? <><span>•</span><span>Published {format(new Date(p.publishedAt), 'dd MMM yyyy')}</span></> : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1 mt-auto">
                      <button onClick={() => handleOpenPrep(p.id)}
                        className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-purple-100">Manage</button>
                      {p.status === 'DRAFT' && (
                        <button onClick={() => handlePublishPrep(p.id)}
                          className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-green-100">Publish</button>
                      )}
                      {p.status === 'PUBLISHED' && (
                        <button onClick={() => handleArchivePrep(p.id)}
                          className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-gray-100">Archive</button>
                      )}
                      <button onClick={() => { setPrepPanel(true); setEditPrep(p.id); setPrepForm({ title: p.title, interviewType: p.interviewType || 'TECHNICAL', instructions: p.instructions || '', courseId: p.course?.id ? String(p.course.id) : '' }) }}
                        className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-gray-100">Edit</button>
                      <button onClick={() => handleDeletePrep(p.id)}
                        className="text-xs bg-red-50 text-red-500 px-2.5 py-1 rounded-lg font-semibold hover:bg-red-100">Delete</button>
                    </div>
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
      )}

      {/* Company Drives Tab */}
      {tab === 'Company Drives' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <SearchInput
                value={driveSearch}
                onChange={v => { setDriveSearch(v); resetDrivePage() }}
                placeholder="Search company or role..."
                className="w-full sm:w-64"
              />
              <div className="w-full sm:w-44">
                <CustomSelect
                  value={driveStatusFilter}
                  onChange={v => { setDriveStatusFilter(v); resetDrivePage() }}
                  options={[
                    { value: '', label: 'All Drives' },
                    { value: 'OPEN', label: 'Open' },
                    { value: 'CLOSED', label: 'Closed' },
                    ...Array.from(new Set(drives.map(d => d.driveType).filter(Boolean))).map(t => ({ value: t, label: t.replace('_', ' ') })),
                  ]}
                  placeholder="All Drives"
                />
              </div>
            </div>
            <button onClick={() => { setEditingDrive(null); setDriveForm(EMPTY_DRIVE_FORM); setDriveGeneral(false); setDriveErrors({}); setDrivePanel(true) }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus size={14} /> Create Drive
            </button>
          </div>

          {/* Applications modal */}
          <DriveAppsModal
            viewingApps={viewingApps}
            driveApplications={driveApplications}
            onClose={() => setViewingApps(null)}
            handleUpdateAppStatus={handleUpdateAppStatus}
          />

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="bg-purple-50/50 border-b border-purple-100">
                    {['Company', 'Role', 'Package', 'Drive Date', 'Deadline', 'Applied', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDrives.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No drives match your filters</td></tr>
                  ) : filteredDrives.slice((drivePageEff - 1) * drivePageSize, drivePageEff * drivePageSize).map(d => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-purple-50/20">
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{d.companyName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.role}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.packageOffered}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(d.driveDate), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 text-xs">
                        {isPast(new Date(d.applyDeadline)) ? (
                          <span className="text-gray-400">Passed</span>
                        ) : (
                          <span className={`font-medium ${differenceInDays(new Date(d.applyDeadline), new Date()) <= 2 ? 'text-red-500' : 'text-gray-600'}`}>
                            {format(new Date(d.applyDeadline), 'dd MMM')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-600">{d._count?.applications || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => handleViewApps(d.id)}
                            className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-purple-100">
                            Applications
                          </button>
                          <button onClick={() => handleEditDrive(d)}
                            className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-blue-100 inline-flex items-center gap-1">
                            <Pencil size={11} /> Edit
                          </button>
                          <button onClick={() => handleDeleteDrive(d)}
                            className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-red-100 inline-flex items-center gap-1">
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              data={filteredDrives}
              page={drivePage}
              pageSize={drivePageSize}
              onPageChange={setDrivePage}
              onPageSizeChange={v => { setDrivePageSize(v); setDrivePage(1) }}
              label="drives"
            />
          </div>
        </div>
      )}

      {/* Offers Tab */}
      {tab === 'Offers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <SearchInput
                value={offerSearch}
                onChange={v => { setOfferSearch(v); resetOfferPage() }}
                placeholder="Search student, company or role..."
                className="w-full sm:w-64"
              />
              <div className="w-full sm:w-56">
                <CustomSelect
                  value={offerDriveId}
                  onChange={v => { setOfferDriveId(v); resetOfferPage(); loadOffers(v) }}
                  options={[
                    { value: '', label: 'All drives' },
                    ...drives.map(d => ({ value: String(d.id), label: `${d.companyName} — ${d.role}` })),
                  ]}
                  placeholder="All drives"
                  searchable
                />
              </div>
            </div>
            {drives.length > 0 && (
              <button
                onClick={() => {
                  const first = offerDriveId || String(drives[0].id)
                  setOfferDriveId(first)
                  loadOffers(first)
                  handleOpenOfferPanel(first)
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
                <Plus size={14} /> Issue Offer
              </button>
            )}
          </div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="bg-purple-50/50 border-b border-purple-100">
                    {['Student', 'Company', 'Role', 'CTC', 'Offered On', 'Expires', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOffers.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No offers issued. Offer a candidate after they're selected for a drive.</td></tr>
                  ) : filteredOffers.slice((offerPageEff - 1) * offerPageSize, offerPageEff * offerPageSize).map(o => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-purple-50/20">
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{o.studentName || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{o.companyName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{o.role}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">{o.ctc || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{o.offerDate ? format(new Date(o.offerDate), 'dd MMM yyyy') : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{o.offerExpiry ? format(new Date(o.offerExpiry), 'dd MMM yyyy') : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === 'OFFERED' ? 'bg-teal-100 text-teal-700' :
                          o.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                            o.status === 'REJECTED' || o.status === 'WITHDRAWN' || o.status === 'EXPIRED' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {o.status === 'OFFERED' && (
                          <button onClick={() => handleWithdrawOffer(o.id)}
                            className="text-xs bg-red-50 text-red-500 px-2.5 py-1 rounded-lg font-semibold hover:bg-red-100">
                            Withdraw
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              data={filteredOffers}
              page={offerPage}
              pageSize={offerPageSize}
              onPageChange={setOfferPage}
              onPageSizeChange={v => { setOfferPageSize(v); setOfferPage(1) }}
              label="offers"
            />
          </div>
        </div>
      )}

      {/* Placement Interviews Tab */}
      {tab === 'Interviews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-60">
                <CustomSelect
                  value={intDriveId}
                  onChange={v => { setIntDriveId(v); setIntPage(1); loadInterviewsTab(v) }}
                  options={[
                    { value: '', label: 'Select a drive' },
                    ...drives.map(d => ({ value: String(d.id), label: `${d.companyName} — ${d.role}` })),
                  ]}
                  placeholder="Select a drive"
                  searchable
                />
              </div>
              {intDriveId && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                  <SearchInput
                    value={intSearch}
                    onChange={v => { setIntSearch(v); resetIntPage() }}
                    placeholder="Search candidate or round..."
                    className="w-full sm:w-56"
                  />
                  <div className="w-full sm:w-40">
                    <CustomSelect
                      value={intStatusFilter}
                      onChange={v => { setIntStatusFilter(v); resetIntPage() }}
                      options={[
                        { value: '', label: 'All Statuses' },
                        ...[...new Set(interviews.map(i => i.status).filter(Boolean))].map(s => ({ value: s, label: s })),
                      ]}
                      placeholder="All Statuses"
                    />
                  </div>
                </div>
              )}
            </div>
            {intDriveId && (
              <button onClick={() => setRoundPanel(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
                <Plus size={14} /> Add Round
              </button>
            )}
          </div>

          {!intDriveId ? (
            <div className="glass-card p-10 text-center text-gray-400">
              Select a drive to configure its interview rounds and schedule candidates.
            </div>
          ) : (
            <>
              {/* Configured rounds */}
              <div className="glass-card p-5 space-y-3">
                <h3 className="font-bold text-sm text-gray-800 dark:text-white">Interview Rounds</h3>
                {rounds.length === 0 ? (
                  <p className="text-sm text-gray-400">No rounds configured yet. Add rounds to schedule interviews.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {rounds.map(r => (
                      <div key={r.id} className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 px-3 py-1.5 rounded-xl text-xs">
                        <span className="font-bold text-purple-700 dark:text-purple-300">{r.sequence}.</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{r.name}</span>
                        <span className="text-purple-500 text-[10px] font-bold uppercase">{r.roundType}</span>
                        {r.durationMinutes ? <span className="text-gray-400">{r.durationMinutes}m</span> : null}
                        {r.online ? <span className="text-gray-400">online</span> : <span className="text-gray-400">offline</span>}
                        <button onClick={() => handleDeleteRound(r.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Delete round">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scheduled interviews */}
              <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-bold text-sm text-gray-800 dark:text-white">Scheduled Interviews</h3>
                  <button onClick={() => setIntPanel(true)}
                    className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-purple-100">
                    <Calendar size={12} /> Schedule
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead>
                      <tr className="bg-purple-50/50 border-b border-purple-100">
                        {['Candidate', 'Round', 'Date/Time', 'Mode', 'Link', 'Status', 'Result', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInterviews.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No interviews match your filters</td></tr>
                      ) : filteredInterviews.slice((intPageEff - 1) * intPageSize, intPageEff * intPageSize).map(iv => (
                        <tr key={iv.id} className="border-b border-gray-50 hover:bg-purple-50/20">
                          <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{iv.studentName || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{iv.roundName}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{iv.scheduledAt ? format(new Date(iv.scheduledAt), 'dd MMM yyyy, HH:mm') : '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{iv.online ? 'Online' : 'Offline'}</td>
                          <td className="px-4 py-3 text-xs">
                            {iv.meetingLink ? (
                              <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Join</a>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${iv.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : iv.status === 'CANCELLED' || iv.status === 'ABSENT' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-700'}`}>
                              {iv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {iv.result ? (
                              <span className={`font-bold ${iv.result === 'PASS' ? 'text-green-600' : iv.result === 'FAIL' ? 'text-red-500' : 'text-gray-500'}`}>{iv.result}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {PRESENTABLE_INTERVIEW_STATUSES.includes(iv.status) ? (
                              <button onClick={() => { setCompletePanel(iv.id); setCompleteForm({ status: 'COMPLETED', result: 'PASS', score: iv.score || '', feedback: iv.feedback || '' }) }}
                                className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-purple-100">
                                Complete
                              </button>
                            ) : iv.status === 'COMPLETED' && iv.score != null ? (
                              <span className="text-xs text-gray-400">Score {iv.score}</span>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pagination
                data={filteredInterviews}
                page={intPage}
                pageSize={intPageSize}
                onPageChange={setIntPage}
                onPageSizeChange={v => { setIntPageSize(v); setIntPage(1) }}
                label="interviews"
              />
            </>
          )}
        </div>
      )}

      {/* Prep Create/Edit Panel */}
      <SlidePanel open={prepPanel} onClose={() => setPrepPanel(false)} title={editPrep ? 'Edit Material' : 'Create Preparation Material'}>
        <form onSubmit={handleSavePrep} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input value={prepForm.title} onChange={e => setPrepForm(f => ({ ...f, title: e.target.value }))} placeholder="TCS NQT — Aptitude & Coding Prep"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Interview Type</label>
              <CustomSelect
                value={prepForm.interviewType}
                onChange={v => setPrepForm(f => ({ ...f, interviewType: v }))}
                options={['TECHNICAL', 'APTITUDE', 'HR', 'CODING', 'OTHER'].map(t => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Course (blank = General)</label>
              <CustomSelect
                value={prepForm.courseId}
                onChange={v => setPrepForm(f => ({ ...f, courseId: v }))}
                options={[
                  { value: '', label: 'All students (General)' },
                  ...courses.map(c => ({ value: String(c.id), label: c.title })),
                ]}
                searchable
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Instructions</label>
            <textarea value={prepForm.instructions} onChange={e => setPrepForm(f => ({ ...f, instructions: e.target.value }))} rows={3}
              placeholder="How students should use this material, what to focus on..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPrepPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : (editPrep ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Prep Detail Panel */}
      <SlidePanel open={!!prepDetail} onClose={() => setPrepDetail(null)} title={prepDetail?.title || 'Manage Material'}>
        {!prepDetail || prepDetail.loading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${prepDetail.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : prepDetail.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                  {prepDetail.status}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{prepDetail.interviewType || 'Interview'}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{prepDetail.course ? prepDetail.course.title : 'General'}</span>
              </div>
              <button onClick={() => setPrepDetail(null)} className="text-sm text-gray-400 font-semibold">Close</button>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-2">Documents ({prepDetail.documentCount || 0})</h4>
              <div className="space-y-2">
                {(prepDetail.documents || []).map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                    <button onClick={() => window.open(prepDetail.secureDocUrl ? prepDetail.secureDocUrl : d.fileUrl, '_blank')}
                      className="text-xs text-purple-600 font-semibold hover:underline text-left flex items-center gap-1.5">
                      <FileText size={12} /> {d.fileName}
                    </button>
                    <button onClick={() => handleDeletePrepDoc(prepDetail.id, d.id)}
                      className="text-xs text-red-500 hover:underline flex items-center gap-1">
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                ))}
                {prepDetail.documents?.length === 0 && <p className="text-xs text-gray-400">No documents yet.</p>}
              </div>
              <label className={prepDetail.status === 'ARCHIVED' ? 'mt-3 flex gap-2 items-center justify-center border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-400 cursor-not-allowed' : 'mt-3 flex gap-2 items-center justify-center border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 cursor-pointer hover:border-purple-300 hover:bg-purple-50/40 transition-colors'}>
                <Upload size={12} /> {prepDetail.status === 'ARCHIVED' ? 'Archived materials cannot accept uploads' : 'Upload a document (PDF, DOC, DOCX)'}
                <input
                  type="file"
                  className="hidden"
                  disabled={prepDetail.status === 'ARCHIVED'}
                  accept=".pdf,.doc,.docx"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUploadPrepDoc(prepDetail.id, file)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Questions ({prepDetail.questionsCount || 0})</h4>
                <button onClick={() => handleSavePrepQuestions(prepDetail.id)} disabled={savingQuestions || prepDetail.status === 'ARCHIVED'}
                  className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-purple-100 disabled:opacity-50">
                  {savingQuestions ? 'Saving...' : 'Save Questions'}
                </button>
              </div>
              <textarea value={prepQuestionsText} onChange={e => setPrepQuestionsText(e.target.value)} rows={10} disabled={prepDetail.status === 'ARCHIVED'}
                placeholder={'One question per line: Question | Answer\nExample:\nWhat is Big-O notation? | It describes how runtime grows with input size.'}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono disabled:opacity-50" />
              <p className="text-[10px] text-gray-400 mt-1">Format: <code>Question | Answer</code> per line. Lines without a question are ignored.</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {prepDetail.status === 'DRAFT' && (
                <button onClick={() => handlePublishPrep(prepDetail.id)} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold">Publish</button>
              )}
              {prepDetail.status === 'PUBLISHED' && (
                <button onClick={() => handleArchivePrep(prepDetail.id)} className="flex-1 py-2.5 rounded-xl bg-gray-700 text-white text-sm font-semibold">Archive</button>
              )}
              {prepDetail.status === 'ARCHIVED' && (
                <button onClick={() => handlePublishPrep(prepDetail.id)} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold">Republish</button>
              )}
              <button onClick={() => handleDeletePrep(prepDetail.id)} className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-500 text-sm font-semibold hover:bg-red-100">Delete Material</button>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Schedule Mock Panel */}
      <SlidePanel
        open={mockPanel}
        onClose={() => { setMockPanel(false); setMockForm(INITIAL_MOCK_FORM) }}
        title={mockForm.lockedStudent ? `Schedule Mock Interview - ${mockForm.lockedStudent.name}` : "Schedule Mock Interview"}
      >
        <form onSubmit={handleScheduleMock} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Mode *</label>
              <CustomSelect
                value={mockForm.mode}
                onChange={v => setMockForm(f => ({ ...f, mode: v }))}
                options={[{ value: 'ONLINE', label: 'Online' }, { value: 'OFFLINE', label: 'Offline' }]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (min)</label>
              <input type="number" min={1} max={600} value={mockForm.durationMinutes}
                onChange={e => setMockForm(f => ({ ...f, durationMinutes: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Date & Time *</label>
            <DateTimePicker
              required
              disablePast
              minDate={new Date().toISOString().split('T')[0]}
              value={mockForm.scheduledAt}
              onChange={val => setMockForm(f => ({ ...f, scheduledAt: val }))}
            />
            {isPastMockTime && (
              <p className="text-xs font-semibold text-rose-500 mt-1.5 flex items-center gap-1">
                ⚠️ Mock interview cannot be scheduled in the past. Please choose a future time.
              </p>
            )}
          </div>
          {mockForm.mode === 'ONLINE' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Meeting Link *</label>
              <input value={mockForm.meetLink} onChange={e => setMockForm(f => ({ ...f, meetLink: e.target.value }))} placeholder="https://meet.google.com/..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
              <p className="text-[10px] text-gray-400 mt-1">Must be a valid http/https URL.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Location *</label>
              <input value={mockForm.location} onChange={e => setMockForm(f => ({ ...f, location: e.target.value }))} placeholder="Room 204, Building B"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Interviewer (Trainer)
            </label>
            <CustomSelect
              value={mockForm.interviewerName}
              onChange={v => setMockForm(f => ({ ...f, interviewerName: v }))}
              options={trainers.map(t => ({
                value: t.name,
                label: `${t.name}${t.designation ? ` (${t.designation})` : (t.email ? ` · ${t.email}` : '')}`
              }))}
              placeholder="Select a trainer..."
              searchable
            />
            {trainers.length === 0 && (
              <p className="text-[11px] text-gray-400 mt-1">No registered trainers found. You can add trainers under the Trainers menu.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Select Candidates</label>
            <CustomSelect
              value={mockForm.selectionType}
              onChange={v => setMockForm(f => ({ ...f, selectionType: v }))}
              disabled={Boolean(mockForm.lockedStudent)}
              options={[
                { value: 'MANUAL', label: 'Individual students' },
                ...(mockForm.lockedStudent ? [] : [
                  { value: 'BATCH', label: 'All students in batches' },
                  { value: 'COURSE', label: 'All students in courses' },
                  { value: 'RANDOM', label: 'Random selection' },
                ]),
              ]}
            />
          </div>
          {mockForm.selectionType === 'MANUAL' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                {mockForm.lockedStudent ? 'Student *' : 'Students *'}
              </label>
              {mockForm.lockedStudent ? (
                <div className="w-full rounded-xl border border-gray-200 bg-gray-100 dark:bg-gray-800/80 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between">
                  <span className="font-medium">
                    {mockForm.lockedStudent.name}{mockForm.lockedStudent.email ? ` (${mockForm.lockedStudent.email})` : ''}
                  </span>
                  <span className="text-xs text-gray-400 font-semibold">Read-only</span>
                </div>
              ) : (
                <>
                  <MultiSelect
                    value={mockForm.studentIds}
                    onChange={v => setMockForm(f => ({ ...f, studentIds: v }))}
                    options={(overview?.students || []).map(s => ({ value: s.id, label: s.name }))}
                    searchable
                    placeholder="Select students..."
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Search and check to select multiple students.</p>
                </>
              )}
            </div>
          )}
          {mockForm.selectionType === 'BATCH' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Batches *</label>
              <MultiSelect
                value={mockForm.batchIds}
                onChange={v => setMockForm(f => ({ ...f, batchIds: v }))}
                options={batches.map(b => ({ value: b.id, label: b.name || `Batch #${b.id}` }))}
                searchable
                placeholder="Select batches..."
              />
            </div>
          )}
          {mockForm.selectionType === 'COURSE' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Courses *</label>
              <MultiSelect
                value={mockForm.courseIds}
                onChange={v => setMockForm(f => ({ ...f, courseIds: v }))}
                options={courses.map(c => ({ value: c.id, label: c.title }))}
                searchable
                placeholder="Select courses..."
              />
            </div>
          )}
          {mockForm.selectionType === 'RANDOM' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Random Count *</label>
                <input type="number" min={1} value={mockForm.randomCount} onChange={e => setMockForm(f => ({ ...f, randomCount: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Restrict to (optional)</label>
                <div className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-500">All students</div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Preparation Materials</label>
            <MultiSelect
              value={mockForm.preparationMaterialIds}
              onChange={v => setMockForm(f => ({ ...f, preparationMaterialIds: v }))}
              options={prepMaterials.filter(p => p.status === 'PUBLISHED').map(p => ({ value: p.id, label: p.title }))}
              searchable
              placeholder="Select preparation materials..."
            />
            {prepMaterials.filter(p => p.status === 'PUBLISHED').length === 0 && (
              <p className="text-[10px] text-gray-400 mt-1">No published preparation materials yet.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Syllabus Covered</label>
            <textarea value={mockForm.syllabus} onChange={e => setMockForm(f => ({ ...f, syllabus: e.target.value }))} rows={2} placeholder="Arrays, Linked Lists, Time complexity"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Instructions for Candidates</label>
            <textarea value={mockForm.instructions} onChange={e => setMockForm(f => ({ ...f, instructions: e.target.value }))} rows={2} placeholder="Arrive 5 minutes early, keep your college ID ready..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setMockPanel(false); setMockForm(INITIAL_MOCK_FORM) }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={saving || isPastMockTime || !mockForm.scheduledAt}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed shadow-sm hover:shadow transition-all"
            >
              {saving ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Feedback Panel */}
      <SlidePanel open={!!feedbackPanel} onClose={() => setFeedbackPanel(null)} title="Candidate Feedback">
        <form onSubmit={handleFeedback} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Result</label>
            <CustomSelect
              value={feedbackForm.status}
              onChange={v => setFeedbackForm(f => ({ ...f, status: v }))}
              options={[
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'ABSENT', label: 'Absent' },
                { value: 'SCHEDULED', label: 'Keep Scheduled' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} type="button" onClick={() => setFeedbackForm(f => ({ ...f, rating: r }))}
                  className={`text-2xl transition-opacity ${feedbackForm.rating >= r ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Feedback</label>
            <textarea value={feedbackForm.feedback} onChange={e => setFeedbackForm(f => ({ ...f, feedback: e.target.value }))} rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          {[
            { label: 'Strengths (comma-separated)', key: 'strengths', placeholder: 'Good communication, Confident' },
            { label: 'Improvements (comma-separated)', key: 'improvements', placeholder: 'Data structures, System design' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
              <input value={feedbackForm[key]} onChange={e => setFeedbackForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setFeedbackPanel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Feedback'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Create Drive Panel */}
      <SlidePanel open={drivePanel} onClose={() => { setDrivePanel(false); setEditingDrive(null) }} title={editingDrive ? 'Edit Company Drive' : 'Create Company Drive'}>
        <form onSubmit={handleCreateDrive} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Company Name *', key: 'companyName', placeholder: 'TCS Digital' },
              { label: 'Role *', key: 'role', placeholder: 'Junior Developer' },
              { label: 'Package', key: 'packageOffered', placeholder: '3.5 - 5 LPA' },
              { label: 'Location', key: 'location', placeholder: 'Chennai' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                <input value={driveForm[key]} onChange={e => setDriveForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required={label.includes('*')} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Drive Date *</label>
              <input type="date" value={driveForm.driveDate} onChange={e => {
                const newDate = e.target.value
                setDriveForm(f => ({ ...f, driveDate: newDate, applyDeadline: (newDate && f.applyDeadline && f.applyDeadline >= newDate) ? '' : f.applyDeadline }))
              }} required
                className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 ${driveErrors.driveDate ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`} />
              {driveErrors.driveDate && <p className="text-[11px] text-red-500 font-medium mt-1">{driveErrors.driveDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Apply Deadline *</label>
              <input type="date" value={driveForm.applyDeadline} onChange={e => setDriveForm(f => ({ ...f, applyDeadline: e.target.value }))} required
                max={driveForm.driveDate ? (() => { const d = new Date(driveForm.driveDate + 'T00:00:00'); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })() : undefined}
                className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 ${driveErrors.applyDeadline ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`} />
              {driveErrors.applyDeadline && <p className="text-[11px] text-red-500 font-medium mt-1">{driveErrors.applyDeadline}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
            <textarea value={driveForm.description} onChange={e => setDriveForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Requirements (comma-separated)</label>
            <input value={driveForm.requirements} onChange={e => setDriveForm(f => ({ ...f, requirements: e.target.value }))} placeholder="B.Tech/MCA, 60% throughout, No backlogs"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Skills Required (comma-separated)</label>
            <input value={driveForm.skills} onChange={e => setDriveForm(f => ({ ...f, skills: e.target.value }))} placeholder="Python, Django, SQL, Git"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Drive Type *</label>
            <CustomSelect
              value={driveForm.driveType}
              onChange={v => setDriveForm(f => ({ ...f, driveType: v }))}
              options={['CAMPUS', 'OFF_CAMPUS', 'POOL', 'VIRTUAL'].map(t => ({ value: t, label: t.replace('_', ' ') }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">External Apply Link (optional)</label>
            <input value={driveForm.applyLink} onChange={e => setDriveForm(f => ({ ...f, applyLink: e.target.value }))} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            <p className="text-[10px] text-gray-400 mt-1">Company reference link only - students still express interest through the platform, never apply directly.</p>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Eligibility Criteria</p>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`text-xs font-semibold ${driveGeneral ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {driveGeneral ? 'Open to all students' : 'Restricted'}
                </span>
                <button type="button" onClick={() => setDriveGeneral(g => !g)} role="switch" aria-checked={driveGeneral}
                  className={`w-10 h-[22px] rounded-full transition-colors relative ${driveGeneral ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-all ${driveGeneral ? 'left-[20px]' : 'left-0.5'}`} />
                </button>
              </label>
            </div>
            {driveGeneral ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
                No eligibility restrictions — the drive is visible to all students.
              </p>
            ) : (
              <>
                <EligibilityCriteriaFields value={driveForm} errors={driveErrors} onChange={patch => setDriveForm(f => ({ ...f, ...patch }))} />
                {driveErrors.eligibleBatchIds && <p className="text-[11px] text-red-500 font-medium mt-1">{driveErrors.eligibleBatchIds}</p>}
                {driveErrors.eligibleCourseIds && <p className="text-[11px] text-red-500 font-medium mt-1">{driveErrors.eligibleCourseIds}</p>}
              </>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setDrivePanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? (editingDrive ? 'Saving...' : 'Creating...') : (editingDrive ? 'Save Changes' : 'Create Drive')}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* IQ Panel */}
      <SlidePanel open={iqPanel} onClose={() => setIqPanel(false)} title={editIq ? 'Edit Question' : 'Add Question'}>
        <form onSubmit={handleSaveIq} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty</label>
            <CustomSelect
              value={iqForm.difficulty}
              onChange={v => setIqForm(f => ({ ...f, difficulty: v }))}
              options={['EASY', 'MEDIUM', 'HARD'].map(d => ({ value: d, label: d }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Course</label>
            <CustomSelect
              value={iqForm.courseId}
              onChange={v => setIqForm(f => ({ ...f, courseId: v }))}
              options={[
                { value: '', label: 'All Students' },
                ...courses.map(c => ({ value: String(c.id), label: c.title })),
              ]}
              searchable
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Question *</label>
            <textarea value={iqForm.question} onChange={e => setIqForm(f => ({ ...f, question: e.target.value }))} rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Answer *</label>
            <textarea value={iqForm.answer} onChange={e => setIqForm(f => ({ ...f, answer: e.target.value }))} rows={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIqPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : (editIq ? 'Update' : 'Add Question')}
            </button>
          </div>
        </form>
      </SlidePanel>

      <SlidePanel open={aptPanel} onClose={() => setAptPanel(false)} title={editApt ? 'Edit Aptitude Tips' : 'Add Aptitude Tips'}>
        <form onSubmit={handleSaveApt} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Topic *</label>
            <input value={aptForm.topic} onChange={e => setAptForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Time & Work"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Formula *</label>
            <textarea value={aptForm.formula} onChange={e => setAptForm(f => ({ ...f, formula: e.target.value }))} rows={2}
              placeholder="e.g. Combined Rate = 1/A + 1/B; Time = 1/Rate"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Example *</label>
            <textarea value={aptForm.example} onChange={e => setAptForm(f => ({ ...f, example: e.target.value }))} rows={3}
              placeholder="A worked example showing the formula in action"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAptPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : (editApt ? 'Update' : 'Add Tip')}
            </button>
          </div>
        </form>
      </SlidePanel>

      <SlidePanel open={resPanel} onClose={() => setResPanel(false)} title={editRes ? 'Edit Resource' : 'Add Resource'}>
        <form onSubmit={handleSaveRes} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input value={resForm.title} onChange={e => setResForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Cracking the Coding Interview"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
            <textarea value={resForm.description} onChange={e => setResForm(f => ({ ...f, description: e.target.value }))} rows={3}
              placeholder="What is this resource and why is it useful?"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">URL *</label>
            <input value={resForm.url} onChange={e => setResForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tag (optional)</label>
            <input value={resForm.tag} onChange={e => setResForm(f => ({ ...f, tag: e.target.value }))} placeholder="Book, Guide, Free Resource, GitHub..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setResPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : (editRes ? 'Update' : 'Add Resource')}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Issue Offer Panel */}
      <SlidePanel open={offerPanel} onClose={() => setOfferPanel(false)} title="Issue Offer">
        <form onSubmit={handleIssueOffer} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Candidate (Selected in drive) *</label>
            <CustomSelect
              value={offerForm.applicationId}
              onChange={v => setOfferForm(f => ({ ...f, applicationId: v }))}
              options={[
                { value: '', label: 'Select candidate' },
                ...issueCandidates.map(a => ({ value: String(a.id), label: `${a.studentName} (${a.status})` })),
              ]}
              searchable
            />
            {issueCandidates.length === 0 && (
              <p className="text-xs text-gray-400 mt-1.5">No selected candidates yet. Mark an application as SELECTED before issuing an offer.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Role *</label>
            <input value={offerForm.role} onChange={e => setOfferForm(f => ({ ...f, role: e.target.value }))} placeholder="Software Engineer"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">CTC</label>
            <input value={offerForm.ctc} onChange={e => setOfferForm(f => ({ ...f, ctc: e.target.value }))} placeholder="8 - 10 LPA"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Joining Date</label>
              <input type="date" value={offerForm.joiningDate} onChange={e => setOfferForm(f => ({ ...f, joiningDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Offer Expiry</label>
              <input type="date" value={offerForm.offerExpiry} onChange={e => setOfferForm(f => ({ ...f, offerExpiry: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Offer Letter URL</label>
            <input value={offerForm.offerLetterUrl} onChange={e => setOfferForm(f => ({ ...f, offerLetterUrl: e.target.value }))} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOfferPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Issuing...' : 'Issue Offer'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Add Round Panel */}
      <SlidePanel open={roundPanel} onClose={() => setRoundPanel(false)} title="Add Interview Round">
        <form onSubmit={handleCreateRound} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Round Name *</label>
            <input value={roundForm.name} onChange={e => setRoundForm(f => ({ ...f, name: e.target.value }))} placeholder="Technical Round 1"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Type</label>
              <CustomSelect
                value={roundForm.roundType}
                onChange={v => setRoundForm(f => ({ ...f, roundType: v }))}
                options={['APTITUDE', 'TECHNICAL', 'CODING', 'MANAGERIAL', 'HR', 'FINAL', 'OTHER'].map(t => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Sequence *</label>
              <input type="number" min={1} value={roundForm.sequence} onChange={e => setRoundForm(f => ({ ...f, sequence: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Duration (min)</label>
              <input type="number" min={5} value={roundForm.durationMinutes} onChange={e => setRoundForm(f => ({ ...f, durationMinutes: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Min Score</label>
              <input type="number" min={0} max={100} value={roundForm.minimumScore} onChange={e => setRoundForm(f => ({ ...f, minimumScore: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Max Score</label>
              <input type="number" min={0} max={100} value={roundForm.maxScore} onChange={e => setRoundForm(f => ({ ...f, maxScore: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Mode</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <input type="radio" checked={roundForm.online} onChange={() => setRoundForm(f => ({ ...f, online: true, locationLink: '' }))} /> Online
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <input type="radio" checked={!roundForm.online} onChange={() => setRoundForm(f => ({ ...f, online: false }))} /> Offline
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Location / Meeting Link</label>
            <input value={roundForm.locationLink} onChange={e => setRoundForm(f => ({ ...f, locationLink: e.target.value }))} placeholder="https://meet.google.com/... or Room 204"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Description</label>
            <textarea value={roundForm.description} onChange={e => setRoundForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setRoundPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Creating...' : 'Add Round'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Schedule Interview Panel */}
      <SlidePanel open={intPanel} onClose={() => setIntPanel(false)} title="Schedule Interview">
        <form onSubmit={handleScheduleInterview} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Round *</label>
              <CustomSelect
                value={intForm.roundId}
                onChange={v => setIntForm(f => ({ ...f, roundId: v }))}
                options={[
                  { value: '', label: 'Select round' },
                  ...rounds.map(r => ({ value: String(r.id), label: `${r.sequence}. ${r.name} (${r.roundType})` })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Candidate *</label>
              <CustomSelect
                value={intForm.studentId}
                onChange={v => setIntForm(f => ({ ...f, studentId: v }))}
                options={[
                  { value: '', label: 'Select candidate' },
                  ...intApps.filter(a => INTERVIEW_CANDIDATE_STATUSES.includes(a.status)).map(a => ({
                    value: String(a.studentId), label: `${a.studentName} (${a.status})`,
                  })),
                ]}
                searchable
              />
              {intApps.filter(a => INTERVIEW_CANDIDATE_STATUSES.includes(a.status)).length === 0 && (
                <p className="text-xs text-gray-400 mt-1.5">No shortlisted candidates yet for this drive.</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Date & Time *</label>
            <DateTimePicker
              required
              disablePast
              minDate={new Date().toISOString().split('T')[0]}
              value={intForm.scheduledAt}
              onChange={val => setIntForm(f => ({ ...f, scheduledAt: val }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Meeting Link</label>
              <input value={intForm.meetingLink} onChange={e => setIntForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://meet.google.com/..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Location</label>
              <input value={intForm.location} onChange={e => setIntForm(f => ({ ...f, location: e.target.value }))} placeholder="Room 204"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Mode</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <input type="radio" checked={intForm.online} onChange={() => setIntForm(f => ({ ...f, online: true }))} /> Online
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <input type="radio" checked={!intForm.online} onChange={() => setIntForm(f => ({ ...f, online: false }))} /> Offline
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Notes</label>
            <textarea value={intForm.notes} onChange={e => setIntForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIntPanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Complete Interview Panel */}
      <SlidePanel open={!!completePanel} onClose={() => setCompletePanel(null)} title="Complete Interview">
        <form onSubmit={handleCompleteInterview} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Status *</label>
              <CustomSelect
                value={completeForm.status}
                onChange={v => setCompleteForm(f => ({ ...f, status: v }))}
                options={['COMPLETED', 'RESCHEDULED', 'CANCELLED', 'ABSENT'].map(s => ({ value: s, label: s }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Result</label>
              <CustomSelect
                value={completeForm.status === 'COMPLETED' ? completeForm.result : ''}
                onChange={v => setCompleteForm(f => ({ ...f, result: v }))}
                disabled={completeForm.status !== 'COMPLETED'}
                options={['PASS', 'FAIL', 'HOLD'].map(r => ({ value: r, label: r }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Score</label>
            <input type="number" min={0} max={100} value={completeForm.score} onChange={e => setCompleteForm(f => ({ ...f, score: e.target.value }))} placeholder="0-100"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Feedback</label>
            <textarea value={completeForm.feedback} onChange={e => setCompleteForm(f => ({ ...f, feedback: e.target.value }))} rows={3}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2">
            A PASS on the final configured round automatically moves the candidate to SELECTED, so an offer can then be issued.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setCompletePanel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </SlidePanel>
      {confirmModal}
    </div>
  )
}

function DriveAppsModal({ viewingApps, driveApplications, onClose, handleUpdateAppStatus }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || !viewingApps) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-base text-gray-900 dark:text-white">Drive Applications</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {!driveApplications[viewingApps] ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
          ) : driveApplications[viewingApps].length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No applications yet</div>
          ) : (
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  {['Student', 'Email', 'Applied', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {driveApplications[viewingApps].map(app => (
                  <tr key={app.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/20">
                    <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-white">{app.student?.user?.name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{app.student?.user?.email}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{format(new Date(app.appliedAt), 'dd MMM')}</td>
                    <td className="px-4 py-2.5">
                      <CustomSelect
                        compact
                        value={app.status}
                        onChange={v => handleUpdateAppStatus(viewingApps, app.id, v)}
                        options={['INTERESTED', 'UNDER_REVIEW', 'SHORTLISTED', 'RESUME_SHARED', 'SELECTED', 'OFFERED', 'ACCEPTED', 'NOT_SELECTED', 'REJECTED', 'WITHDRAWN'].map(s => ({ value: s, label: s.replace(/_/g, ' ') }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

