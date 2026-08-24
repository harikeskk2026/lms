'use client'
import { useState, useEffect } from 'react'
import { Plus, ClipboardList, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api'
import SlidePanel from '@/components/admin/SlidePanel'

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([])
  const [batches, setBatches] = useState([])
  const [batchFilter, setBatchFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [subLoading, setSubLoading] = useState(false)
  const [createPanel, setCreatePanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gradeInputs, setGradeInputs] = useState({})
  const [feedbackInputs, setFeedbackInputs] = useState({})
  const [form, setForm] = useState({ title: '', description: '', batchId: '', dueDate: '', maxMarks: 100, fileUrl: '' })

  const load = () => {
    setLoading(true)
    adminApi.getAssignments(batchFilter ? { batchId: batchFilter } : {})
      .then(r => setAssignments(r.data.data || []))
      .catch(() => toast.error('Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [batchFilter])

  useEffect(() => {
    adminApi.getBatches().then(r => setBatches(r.data.data || [])).catch(() => {})
  }, [])

  const loadSubmissions = async (a) => {
    setSelectedAssignment(a)
    setSubLoading(true)
    try {
      const r = await adminApi.getSubmissions(a.id)
      setSubmissions(r.data.data || [])
    } catch { toast.error('Failed to load submissions') } finally { setSubLoading(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createAssignment(form)
      toast.success('Assignment created — students notified')
      setCreatePanel(false)
      setForm({ title: '', description: '', batchId: '', dueDate: '', maxMarks: 100, fileUrl: '' })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  const handleGrade = async (sub) => {
    const grade = gradeInputs[sub.id]
    const feedback = feedbackInputs[sub.id] || ''
    if (grade === undefined || grade === '') return toast.error('Enter a grade')
    try {
      await adminApi.gradeSubmission(selectedAssignment.id, sub.id, { grade: parseInt(grade), feedback })
      toast.success('Graded')
      loadSubmissions(selectedAssignment)
    } catch { toast.error('Failed to grade') }
  }

  const isOverdue = (dueDate) => new Date(dueDate) < new Date()

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-white">Assignments</h1>
        <div className="flex gap-3">
          <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
            className="bg-purple-50 dark:bg-purple-900/20 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 outline-none">
            <option value="">All Batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => setCreatePanel(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus size={16} /> Create Assignment
          </button>
        </div>
      </div>

      <div className={`grid ${selectedAssignment ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-5`}>
        {/* Assignments List */}
        <div className="space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-24 glass-card animate-pulse" />)
          ) : assignments.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <ClipboardList size={32} className="text-purple-200 mx-auto mb-3" />
              <p className="text-gray-400">No assignments yet.</p>
            </div>
          ) : (
            assignments.map(a => {
              const overdue = isOverdue(a.dueDate)
              const isSelected = selectedAssignment?.id === a.id
              return (
                <div key={a.id}
                  className={`glass-card p-5 cursor-pointer hover:border-purple-300 transition-all ${isSelected ? 'border-2 border-purple-500 bg-purple-50/30 dark:bg-purple-900/10' : ''}`}
                  onClick={() => loadSubmissions(a)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-gray-800 dark:text-white">{a.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{a.batch?.name}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${overdue ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          Due: {format(new Date(a.dueDate), 'dd MMM yyyy')}
                        </span>
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Max: {a.maxMarks} marks</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-extrabold text-purple-600 font-display">{a._count?.submissions || 0}</p>
                      <p className="text-[10px] text-gray-400">submissions</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Submissions Panel */}
        {selectedAssignment && (
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-100 dark:border-purple-900/30">
              <h3 className="font-display font-bold text-gray-800 dark:text-white">{selectedAssignment.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{submissions.length} submissions · Max: {selectedAssignment.maxMarks} marks</p>
            </div>
            {subLoading ? (
              <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : submissions.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No submissions yet</div>
            ) : (
              <div className="overflow-y-auto max-h-[600px]">
                {submissions.map(sub => (
                  <div key={sub.id} className="p-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/10 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white text-sm">{sub.student?.user?.name}</p>
                        <p className="text-xs text-gray-400">{format(new Date(sub.submittedAt), 'dd MMM, HH:mm')}</p>
                        {sub.notes && <p className="text-xs text-gray-500 mt-1 italic">"{sub.notes}"</p>}
                      </div>
                      {sub.fileUrl && (
                        <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-purple-600 hover:underline font-semibold flex-shrink-0">
                          <ExternalLink size={11} /> File
                        </a>
                      )}
                    </div>
                    {sub.grade !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-green-600">{sub.grade}/{selectedAssignment.maxMarks}</span>
                        {sub.feedback && <p className="text-xs text-gray-500">"{sub.feedback}"</p>}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="number" min="0" max={selectedAssignment.maxMarks}
                            value={gradeInputs[sub.id] || ''}
                            onChange={e => setGradeInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            placeholder={`Grade (0-${selectedAssignment.maxMarks})`}
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button onClick={() => handleGrade(sub)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 whitespace-nowrap">
                            Grade
                          </button>
                        </div>
                        <textarea
                          value={feedbackInputs[sub.id] || ''}
                          onChange={e => setFeedbackInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          placeholder="Feedback (optional)"
                          rows={2}
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Assignment Panel */}
      <SlidePanel open={createPanel} onClose={() => setCreatePanel(false)} title="Create Assignment">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Assignment title" required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Batch *</label>
            <select value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))} required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date *</label>
              <input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Marks</label>
              <input type="number" min="1" value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Reference File URL (optional)</label>
            <input value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setCreatePanel(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Creating...' : 'Create & Notify Students'}
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}
