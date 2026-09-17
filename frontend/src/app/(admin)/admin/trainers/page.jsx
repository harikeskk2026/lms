'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, Pencil, Trash2, UserCheck, Mail, Phone, Building2, Briefcase, RefreshCw, X, Lock, KeyRound, Eye, FileDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import courseService from '@/services/courseService'
import {
  isValidEmail,
  EMAIL_ERROR_MESSAGE,
  isValidName,
  NAME_ERROR_MESSAGE,
  filterNameKey,
  filterPhoneKey,
  sanitizePhone,
  isValidPhone,
  PHONE_ERROR_MESSAGE,
  isValidPassword,
  PASSWORD_ERROR_MESSAGE
} from '@/utilities/validators'
import LoginAccessToggle from '@/components/admin/LoginAccessToggle'
import ResetPasswordModal from '@/components/admin/ResetPasswordModal'
import CustomSelect from '@/components/ui/CustomSelect'
import MultiSelect from '@/components/ui/MultiSelect'
import FormDrawer from '@/components/ui/FormDrawer'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'
import Pagination from '@/components/ui/Pagination'
import ViewToggle from '@/components/ui/ViewToggle'
import clsx from 'clsx'

const EMPTY_COURSE_GROUP = { courseId: '', batchIds: [] }

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  phone: '',
  designation: '',
  department: '',
  courseGroups: [{ ...EMPTY_COURSE_GROUP }],
}

function genPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '@#$!'
  const all = upper + lower + digits + special
  const pick = (pool) => pool[Math.floor(Math.random() * pool.length)]

  const required = [pick(upper), pick(lower), pick(digits), pick(special)]
  const rest = Array.from({ length: 8 }, () => pick(all))
  const combined = [...required, ...rest]

  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }
  return combined.join('')
}

/**
 * Repeating "Course -> Batches" group editor. Each group pins one course and
 * a multi-select of that course's batches; courses already used by another
 * group are hidden from the picker so the same course can't be added twice.
 */
function CourseBatchGroups({ groups, onChange, courseOptions, batches }) {
  const usedCourseIds = groups.map(g => g.courseId).filter(Boolean)

  const updateGroup = (idx, patch) => {
    onChange(groups.map((g, i) => (i === idx ? { ...g, ...patch } : g)))
  }
  const addGroup = () => onChange([...groups, { ...EMPTY_COURSE_GROUP }])
  const removeGroup = (idx) => {
    onChange(groups.length <= 1 ? [{ ...EMPTY_COURSE_GROUP }] : groups.filter((_, i) => i !== idx))
  }

  const lastGroup = groups[groups.length - 1]
  const canAddMore = usedCourseIds.length < courseOptions.length && Boolean(lastGroup?.courseId)

  return (
    <div>
      <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1.5 block">
        Course &amp; Batch Assignments <span className="text-[11px] text-slate-400 font-normal">(Optional)</span>
      </label>
      <div className="space-y-2.5">
        {groups.map((group, idx) => {
          const availableCourseOptions = courseOptions.filter(
            c => c.value === group.courseId || !usedCourseIds.includes(c.value)
          )
          const batchOptionsForGroup = group.courseId
            ? batches
                .filter(b => b.course && String(b.course.id) === String(group.courseId))
                .map(b => ({
                  value: String(b.id),
                  label: `${b.name}${b.trainers && b.trainers.length > 0 ? ` (Current: ${b.trainers.map(t => t.name).join(', ')})` : ' (Unassigned)'}`,
                }))
            : []

          return (
            <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/60 dark:bg-gray-800/40">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:items-end">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Course</label>
                  <CustomSelect
                    value={group.courseId}
                    onChange={(val) => updateGroup(idx, { courseId: val, batchIds: [] })}
                    options={availableCourseOptions}
                    placeholder="Select course"
                    searchable={availableCourseOptions.length >= 10}
                    compact
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Batches</label>
                  <MultiSelect
                    value={group.batchIds}
                    onChange={(vals) => updateGroup(idx, { batchIds: vals })}
                    options={batchOptionsForGroup}
                    placeholder={group.courseId ? 'Select batches' : 'Select a course first'}
                    disabled={!group.courseId}
                    emptyLabel={group.courseId ? 'No batches for this course' : 'Select a course first'}
                    compact
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGroup(idx)}
                  className="justify-self-end sm:justify-self-auto w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Remove this course"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={addGroup}
        disabled={!canAddMore}
        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={13} /> Add Another Course
      </button>
    </div>
  )
}

export default function TrainersPage() {
  const router = useRouter()
  const [trainers, setTrainers] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalActive, setTotalActive] = useState(0)
  const [totalInactive, setTotalInactive] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const searchTimer = useRef(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [viewMode, setViewMode] = useState('table')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Course and Batch options for assignment
  const [courses, setCourses] = useState([])
  const [batches, setBatches] = useState([])

  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState({})
  const [editingTrainer, setEditingTrainer] = useState(null)
  const [deletingTrainer, setDeletingTrainer] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadCoursesAndBatches = useCallback(async () => {
    try {
      const [cRes, bRes] = await Promise.all([
        courseService.list().catch(() => ({ data: [] })),
        adminApi.getBatches().catch(() => ({ data: { data: [] } })),
      ])
      setCourses(cRes.data || [])
      setBatches(bRes.data?.data || [])
    } catch (err) {
      console.error('Failed to load courses and batches', err)
    }
  }, [])

  useEffect(() => {
    loadCoursesAndBatches()
  }, [loadCoursesAndBatches])

  const courseOptions = useMemo(() => {
    return courses.map(c => ({
      value: String(c.id),
      label: c.title,
    }))
  }, [courses])

  const batchFilterOptions = useMemo(() => {
    return batches.map(b => ({
      value: String(b.id),
      label: b.course?.title ? `${b.name} — ${b.course.title}` : b.name,
    }))
  }, [batches])

  const handleSearchChange = (val) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(val)
      setPage(1)
    }, 300)
  }

  const fetchTrainersAbortRef = useRef(null)

  const fetchTrainers = useCallback(async () => {
    fetchTrainersAbortRef.current?.abort()
    const controller = new AbortController()
    fetchTrainersAbortRef.current = controller
    setLoading(true)
    try {
      const res = await adminApi.getTrainers({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        batchId: batchFilter || undefined,
        page,
        limit: pageSize,
      }, { signal: controller.signal })
      const data = res.data?.data || {}
      setTrainers(data.trainers || [])
      setTotalElements(data.totalElements ?? 0)
      setTotalPages(data.totalPages ?? 1)
      setTotalActive(data.totalActive ?? 0)
      setTotalInactive(data.totalInactive ?? 0)
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return
      toast.error(err.response?.data?.message || 'Failed to load trainers')
    } finally {
      if (fetchTrainersAbortRef.current === controller) setLoading(false)
    }
  }, [search, statusFilter, batchFilter, page, pageSize])

  useEffect(() => {
    fetchTrainers()
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('action') === 'add') {
      handleOpenAdd()
    }
  }, [fetchTrainers])

  const [touched, setTouched] = useState({})
  const [formSubmitted, setFormSubmitted] = useState(false)

  const isFormDirty = Object.values(form).some(v => v !== '')

  const createErrors = {
    name: !form.name.trim()
      ? 'Full Name is required'
      : !isValidName(form.name.trim())
      ? NAME_ERROR_MESSAGE
      : null,
    email: !form.email.trim()
      ? 'Email Address is required'
      : !isValidEmail(form.email.trim())
      ? EMAIL_ERROR_MESSAGE
      : null,
    password: !form.password
      ? 'Initial Password is required'
      : !isValidPassword(form.password)
      ? PASSWORD_ERROR_MESSAGE
      : null,
    phone: form.phone && form.phone.trim() && !isValidPhone(form.phone.trim())
      ? PHONE_ERROR_MESSAGE
      : null,
  }

  const isCreateValid = !createErrors.name && !createErrors.email && !createErrors.password && !createErrors.phone && Boolean(form.name.trim() && form.email.trim() && form.password)

  const editErrors = {
    name: !form.name.trim()
      ? 'Full Name is required'
      : !isValidName(form.name.trim())
      ? NAME_ERROR_MESSAGE
      : null,
    email: !form.email.trim()
      ? 'Email Address is required'
      : !isValidEmail(form.email.trim())
      ? EMAIL_ERROR_MESSAGE
      : null,
    phone: form.phone && form.phone.trim() && !isValidPhone(form.phone.trim())
      ? PHONE_ERROR_MESSAGE
      : null,
  }

  const isEditValid = !editErrors.name && !editErrors.email && !editErrors.phone && Boolean(form.name.trim() && form.email.trim())
  const isEditDirty = Boolean(
    editingTrainer && (
      form.name !== (editingTrainer.name || '') ||
      form.email !== (editingTrainer.email || '') ||
      form.phone !== (editingTrainer.phone || '') ||
      form.designation !== (editingTrainer.designation || '') ||
      form.department !== (editingTrainer.department || '')
    )
  )

  // Open Create Modal
  function handleOpenAdd() {
    setForm({ ...EMPTY_FORM, password: '', courseGroups: [{ ...EMPTY_COURSE_GROUP }] })
    setTouched({})
    setFormSubmitted(false)
    setFormErr({})
    setShowAddModal(true)
    loadCoursesAndBatches()
  }

  // Open Edit Modal
  function handleOpenEdit(trainer) {
    setEditingTrainer(trainer)
    // Group the trainer's existing batches by their course so each course
    // shows up as its own row, pre-populated with all of that course's
    // currently-assigned batches (not just the first one).
    const batchesByCourse = new Map()
    for (const tb of (trainer.batches || [])) {
      const courseId = batches.find(b => String(b.id) === String(tb.id))?.course?.id
      if (!courseId) continue
      const key = String(courseId)
      if (!batchesByCourse.has(key)) batchesByCourse.set(key, [])
      batchesByCourse.get(key).push(String(tb.id))
    }
    const existingGroups = Array.from(batchesByCourse.entries()).map(([courseId, batchIds]) => ({ courseId, batchIds }))
    setForm({
      name: trainer.name || '',
      email: trainer.email || '',
      password: '',
      phone: trainer.phone || '',
      designation: trainer.designation || '',
      department: trainer.department || '',
      courseGroups: existingGroups.length > 0 ? existingGroups : [{ ...EMPTY_COURSE_GROUP }],
    })
    setTouched({})
    setFormSubmitted(false)
    setFormErr({})
    setShowEditModal(true)
    loadCoursesAndBatches()
  }

  // Open Delete Modal
  function handleOpenDelete(trainer) {
    setDeletingTrainer(trainer)
    setShowDeleteModal(true)
  }

  // Submit Create Trainer
  async function handleCreateTrainer(e) {
    e.preventDefault()
    setFormSubmitted(true)
    if (!isCreateValid) return
    setSubmitting(true)
    try {
      await adminApi.createTrainer({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        designation: form.designation.trim() || null,
        department: form.department.trim() || null,
        courseBatchAssignments: form.courseGroups
          .filter(g => g.courseId)
          .map(g => ({ courseId: Number(g.courseId), batchIds: g.batchIds.map(Number) })),
      })
      toast.success('Trainer created successfully!')
      setShowAddModal(false)
      setForm({ ...EMPTY_FORM })
      setTouched({})
      setFormSubmitted(false)
      fetchTrainers()
      loadCoursesAndBatches()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create trainer')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Update Trainer
  async function handleUpdateTrainer(e) {
    e.preventDefault()
    setFormSubmitted(true)
    if (!isEditValid) return
    setSubmitting(true)
    try {
      await adminApi.updateTrainer(editingTrainer.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        designation: form.designation.trim() || null,
        department: form.department.trim() || null,
        courseBatchAssignments: form.courseGroups
          .filter(g => g.courseId)
          .map(g => ({ courseId: Number(g.courseId), batchIds: g.batchIds.map(Number) })),
      })
      toast.success('Trainer updated successfully!')
      setShowEditModal(false)
      setTouched({})
      setFormSubmitted(false)
      fetchTrainers()
      loadCoursesAndBatches()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update trainer')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleStatus(trainer) {
    try {
      await adminApi.toggleTrainerStatus(trainer.id)
      toast.success(`Login access ${trainer.active ? 'blocked' : 'allowed'} for ${trainer.name}`)
      fetchTrainers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update login access')
    }
  }

  // Confirm Delete Trainer
  async function handleConfirmDelete() {
    if (!deletingTrainer) return
    setSubmitting(true)
    try {
      await adminApi.deleteTrainer(deletingTrainer.id)
      toast.success('Trainer deleted successfully')
      setShowDeleteModal(false)
      fetchTrainers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete trainer')
    } finally {
      setSubmitting(false)
    }
  }

  const downloadCSV = async () => {
    try {
      setExporting(true)
      const exportLimit = Math.max(totalElements || 0, 10000)
      const res = await adminApi.getTrainers({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        batchId: batchFilter || undefined,
        page: 1,
        limit: exportLimit,
      })
      const allTrainers = res.data?.data?.trainers || []
      if (allTrainers.length === 0) {
        toast.error('No trainers found to export')
        return
      }

      const headers = ['Name', 'Email', 'Phone', 'Department', 'Designation', 'Assigned Batches', 'Login Access']
      const rows = allTrainers.map(t => [
        t.name || '',
        t.email || '',
        t.phone || '',
        t.department || '',
        t.designation || '',
        (t.batches && t.batches.length > 0) ? t.batches.map(b => b.name).join('; ') : '',
        t.active ? 'Active' : 'Inactive',
      ])

      const csvContent = '﻿' + [headers, ...rows]
        .map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trainers_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported all ${allTrainers.length} trainer records`)
    } catch (err) {
      toast.error('Failed to export trainers: ' + (err.response?.data?.message || err.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border border-purple-100 dark:border-purple-900/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              <UserCheck size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Trainers Management</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage trainer profiles, credentials, departments, and active statuses.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-purple-500/20 active:scale-95"
        >
          <Plus size={18} />
          Add Trainer
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-purple-100 dark:border-purple-900/30">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setPage(1) }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="All Login Access"
            compact
          />

          <CustomSelect
            value={batchFilter}
            onChange={(val) => { setBatchFilter(val); setPage(1) }}
            options={batchFilterOptions}
            placeholder="All Batches"
            searchable={batchFilterOptions.length >= 10}
            compact
          />

          <button
            onClick={downloadCSV}
            disabled={exporting}
            className="flex items-center gap-2 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            {exporting ? 'Exporting...' : 'Export'}
          </button>

          <ViewToggle value={viewMode} onChange={setViewMode} />

          <button
            onClick={fetchTrainers}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={16} className={clsx(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Trainers Data Table */}
      <div className="glass-card overflow-hidden border border-purple-100 dark:border-purple-900/30">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <svg className="animate-spin h-8 w-8 mx-auto text-purple-600 mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading trainers...
          </div>
        ) : trainers.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-bold text-slate-700 dark:text-slate-200 text-lg">No trainers found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try adjusting your search criteria or add a new trainer.</p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainers.map(trainer => (
              <div
                key={trainer.id}
                className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 flex flex-col gap-3 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-sm flex-shrink-0">
                      {trainer.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{trainer.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">{trainer.email}</p>
                    </div>
                  </div>
                  <LoginAccessToggle active={trainer.active} name={trainer.name} onToggle={() => handleToggleStatus(trainer)} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-semibold mb-0.5">Contact</p>
                    {trainer.phone ? (
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Phone size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{trainer.phone}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic">No contact</span>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-semibold mb-0.5">Department</p>
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate block">{trainer.department || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-semibold mb-0.5">Designation / Role</p>
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate block">{trainer.designation || '—'}</span>
                  </div>
                </div>

                <div>
                  <p className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-semibold mb-1">Assigned Batches</p>
                  {trainer.batches && trainer.batches.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {trainer.batches.map(b => (
                        <Link
                          key={b.id}
                          href={`/admin/batches/${b.id}`}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 transition-all"
                          title={`${b.courseTitle ? b.courseTitle + ' · ' : ''}${b.timing || 'No time set'}`}
                        >
                          <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', b.active ? 'bg-green-500' : 'bg-slate-400')} />
                          <span className="break-words">{b.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">No batches assigned</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 mt-auto border-t border-slate-100 dark:border-gray-800">
                  <button
                    onClick={() => router.push(`/admin/trainers/${trainer.id}`)}
                    className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center justify-center transition-colors"
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => setResetTarget({ ...trainer, role: 'TRAINER' })}
                    className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center justify-center transition-colors"
                    title="Reset Password"
                  >
                    <KeyRound size={14} />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(trainer)}
                    className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors"
                    title="Edit Trainer"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(trainer)}
                    className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center justify-center transition-colors"
                    title="Delete Trainer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-purple-50/60 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-center w-16">S.No.</th>
                  <th className="py-3.5 px-6">Trainer</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Designation / Role</th>
                  <th className="py-3.5 px-4">Assigned Batches</th>
                  <th className="py-3.5 px-4">Login Access</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                {trainers.map((trainer, index) => (
                  <tr key={trainer.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors">
                    <td className="py-4 px-4 text-center font-semibold text-slate-500 dark:text-slate-400 text-xs">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="py-4 px-6 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-sm flex-shrink-0">
                          {trainer.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{trainer.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{trainer.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {trainer.phone ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Phone size={13} className="text-slate-400" />
                          {trainer.phone}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">No contact number</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {trainer.department ? (
                        <span>{trainer.department}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {trainer.designation ? (
                        <span>{trainer.designation}</span>
                      ) : (
                        <span className="font-normal text-slate-400 dark:text-slate-500 italic">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {trainer.batches && trainer.batches.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {trainer.batches.map(b => (
                            <Link
                              key={b.id}
                              href={`/admin/batches/${b.id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 hover:shadow-sm border border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 transition-all"
                              title={`${b.courseTitle ? b.courseTitle + ' · ' : ''}${b.timing || 'No time set'}`}
                            >
                              <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', b.active ? 'bg-green-500' : 'bg-slate-400')} />
                              <span className="break-words">{b.name}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">No batches assigned</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <LoginAccessToggle active={trainer.active} name={trainer.name} onToggle={() => handleToggleStatus(trainer)} />
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/admin/trainers/${trainer.id}`)}
                          className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center justify-center transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setResetTarget({ ...trainer, role: 'TRAINER' })}
                          className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center justify-center transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(trainer)}
                          className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors"
                          title="Edit Trainer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(trainer)}
                          className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center justify-center transition-colors"
                          title="Delete Trainer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          total={totalElements}
          totalPages={totalPages}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1) }}
          label="trainers"
        />
      </div>

      {/* Add Trainer Drawer */}
      <FormDrawer
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setForm({ ...EMPTY_FORM })
          setTouched({})
          setFormSubmitted(false)
        }}
        title="Add New Trainer"
        subtitle="Create a new trainer profile to grant system access and assign them to specific courses and batches for class management."
        isDirty={isFormDirty}
        width="w-full sm:w-[580px] lg:w-[640px]"
      >
        <form onSubmit={handleCreateTrainer} noValidate className="space-y-3.5">
          <div className="bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 rounded-xl p-3 text-xs text-purple-900 dark:text-purple-200">
            <span className="font-semibold">Trainer Account Purpose:</span> Registering a trainer provides portal access credentials. Assigning a course and batch enables the trainer to manage class schedules and track student attendance.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onKeyDown={filterNameKey}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onBlur={() => setTouched(t => ({ ...t, name: true }))}
                placeholder="Enter full name"
                className={clsx(
                  'w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                  (touched.name || formSubmitted) && createErrors.name && 'border-red-500'
                )}
              />
              {(touched.name || formSubmitted) && createErrors.name && (
                <p className="text-[11px] text-red-500 mt-0.5 font-medium">{createErrors.name}</p>
              )}
            </div>

            <div>
              <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1">Email Address *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                placeholder="Enter email address"
                className={clsx(
                  'w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                  (touched.email || formSubmitted) && createErrors.email && 'border-red-500'
                )}
              />
              {(touched.email || formSubmitted) && createErrors.email && (
                <p className="text-[11px] text-red-500 mt-0.5 font-medium">{createErrors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-xs mb-0">Initial Password *</label>
                <button
                  type="button"
                  onClick={() => {
                    const p = genPassword()
                    setForm({ ...form, password: p })
                    setTouched(t => ({ ...t, password: true }))
                  }}
                  className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                >
                  Generate Random
                </button>
              </div>
              <input
                type="text"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onBlur={() => setTouched(t => ({ ...t, password: true }))}
                placeholder="Enter password"
                className={clsx(
                  'w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                  (touched.password || formSubmitted) && createErrors.password && 'border-red-500'
                )}
              />
              {form.password && <PasswordStrengthMeter password={form.password} />}
              {(touched.password || formSubmitted) && createErrors.password && (
                <p className="text-[11px] text-red-500 mt-0.5 font-medium">{createErrors.password}</p>
              )}
            </div>

            <div>
              <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onKeyDown={filterPhoneKey}
                onChange={e => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
                onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                placeholder="Enter phone number"
                className={clsx(
                  'w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                  (touched.phone || formSubmitted) && createErrors.phone && 'border-red-500'
                )}
              />
              {(touched.phone || formSubmitted) && createErrors.phone && (
                <p className="text-[11px] text-red-500 mt-0.5 font-medium">{createErrors.phone}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                placeholder="Enter department"
                className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1">Designation / Role</label>
              <input
                type="text"
                value={form.designation}
                onChange={e => setForm({ ...form, designation: e.target.value })}
                placeholder="Enter designation / role"
                className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <CourseBatchGroups
            groups={form.courseGroups}
            onChange={(groups) => setForm(prev => ({ ...prev, courseGroups: groups }))}
            courseOptions={courseOptions}
            batches={batches}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isCreateValid}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              {submitting ? 'Creating...' : 'Create Trainer'}
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* Edit Trainer FormDrawer */}
      <FormDrawer
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Trainer Profile"
        subtitle="Update trainer details and assignments"
        isDirty={isEditDirty}
        width="w-full sm:w-[580px] lg:w-[640px]"
      >
        <form onSubmit={handleUpdateTrainer} noValidate className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-sm">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onKeyDown={filterNameKey}
              onBlur={() => setTouched(prev => ({ ...prev, edit_name: true }))}
              onChange={e => {
                const val = e.target.value
                setForm(prev => ({ ...prev, name: val }))
                if (formErr.name) setFormErr(prev => ({ ...prev, name: null }))
              }}
              placeholder="Enter full name"
              className={clsx(
                'w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                ((touched.edit_name || formSubmitted) && editErrors.name) && 'border-red-500'
              )}
            />
            {(touched.edit_name || formSubmitted) && editErrors.name && (
              <p className="text-xs text-red-500 mt-1">{editErrors.name}</p>
            )}
          </div>

          <div>
            <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-sm">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onBlur={() => setTouched(prev => ({ ...prev, edit_email: true }))}
              onChange={e => {
                const val = e.target.value
                setForm(prev => ({ ...prev, email: val }))
                if (formErr.email) setFormErr(prev => ({ ...prev, email: null }))
              }}
              placeholder="Enter email address"
              className={clsx(
                'w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                ((touched.edit_email || formSubmitted) && editErrors.email) && 'border-red-500'
              )}
            />
            {(touched.edit_email || formSubmitted) && editErrors.email && (
              <p className="text-xs text-red-500 mt-1">{editErrors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-sm">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                onKeyDown={filterPhoneKey}
                value={form.phone}
                onBlur={() => setTouched(prev => ({ ...prev, edit_phone: true }))}
                onChange={e => {
                  const val = sanitizePhone(e.target.value)
                  setForm(prev => ({ ...prev, phone: val }))
                  if (formErr.phone) setFormErr(prev => ({ ...prev, phone: null }))
                }}
                placeholder="Enter phone number"
                className={clsx(
                  'w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
                  ((touched.edit_phone || formSubmitted) && editErrors.phone) && 'border-red-500'
                )}
              />
              {(touched.edit_phone || formSubmitted) && editErrors.phone && (
                <p className="text-xs text-red-500 mt-1">{editErrors.phone}</p>
              )}
            </div>
            <div>
              <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-sm">Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={e => setForm(prev => ({ ...prev, designation: e.target.value }))}
                placeholder="Enter designation"
                className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="form-label text-slate-700 dark:text-slate-300 font-semibold text-sm">Department</label>
            <input
              type="text"
              value={form.department}
              onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
              placeholder="Enter department"
              className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {editingTrainer && !editingTrainer.active ? (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-0.5">Trainer account is inactive</p>
              <p className="text-amber-700 dark:text-amber-300">Batches cannot be assigned to an inactive trainer. Please activate this trainer account before assigning batches.</p>
            </div>
          ) : (
            <CourseBatchGroups
              groups={form.courseGroups}
              onChange={(groups) => setForm(prev => ({ ...prev, courseGroups: groups }))}
              courseOptions={courseOptions}
              batches={batches}
            />
          )}

          {editingTrainer?.batches && editingTrainer.batches.length > 0 && (
            <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-800/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                  Assigned Batches ({editingTrainer.batches.length})
                </p>
                <span className="text-[10px] text-purple-600 dark:text-purple-400">Click to view</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {editingTrainer.batches.map(b => (
                  <Link
                    key={b.id}
                    href={`/admin/batches/${b.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 hover:border-purple-400 shadow-2xs transition-all"
                    title={`${b.courseTitle ? b.courseTitle + ' · ' : ''}${b.timing || ''}`}
                  >
                    <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', b.active ? 'bg-green-500' : 'bg-slate-400')} />
                    <span className="break-words">{b.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isEditValid}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingTrainer && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleUp text-center border border-slate-100 dark:border-gray-800">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Delete Trainer Account?</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Are you sure you want to delete <strong className="text-slate-800 dark:text-gray-200">{deletingTrainer.name}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors w-1/2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-xl w-1/2 transition-colors shadow-md shadow-red-500/20"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ResetPasswordModal open={!!resetTarget} user={resetTarget} onClose={() => setResetTarget(null)} onSuccess={fetchTrainers} />
    </div>
  )
}
