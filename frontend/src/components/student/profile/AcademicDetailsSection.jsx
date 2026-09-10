'use client'
import { useState, useEffect } from 'react'
import { ChevronDown, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import academicDetailsService from '@/services/academicDetailsService'

const EMPTY_FORM = {
  tenthYearOfPassing: '', tenthPercentage: '',
  twelfthYearOfPassing: '', twelfthPercentage: '',
  diplomaYearOfPassing: '', diplomaPercentage: '',
  ugDegree: '', ugDepartment: '', ugYearOfPassing: '', ugScoreType: 'CGPA', ugScore: '', ugBacklogs: '',
  pgDegree: '', pgDepartment: '', pgYearOfPassing: '', pgScoreType: 'CGPA', pgScore: '', pgBacklogs: '',
}

const INPUT_CLS = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500'
const LABEL_CLS = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1'

function yearToDateVal(year) {
  if (!year) return ''
  const str = String(year).trim()
  if (str.length === 4 && !isNaN(str)) {
    return `${str}-06-01`
  }
  if (str.includes('-')) return str.slice(0, 10)
  return ''
}

function dateValToYear(dateStr) {
  if (!dateStr) return ''
  const year = dateStr.split('-')[0]
  return year && year.length === 4 ? year : ''
}

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

function AccordionCard({ title, optional, isExpanded, onToggle, summaryText, isFilled, children }) {
  return (
    <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/60 overflow-hidden transition-all bg-gray-50/50 dark:bg-gray-800/30">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{title}</span>
          {optional && <span className="text-[10px] text-gray-400 font-normal">(optional)</span>}
          {summaryText && (
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/50 px-2 py-0.5 rounded-md truncate max-w-[220px]">
              {summaryText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isFilled && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 size={10} /> Filled
            </span>
          )}
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-purple-600' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

export default function AcademicDetailsSection({ onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [initialForm, setInitialForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState({ tenth: false, twelfth: false, diploma: false, ug: true, pg: false })

  const toggle = (section) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }))

  const load = () => {
    setLoading(true)
    academicDetailsService.getMine()
      .then(r => {
        const d = r.data
        const loadedForm = {
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
        }
        setForm(loadedForm)
        setInitialForm(loadedForm)

        if (!d.tenthPercentage) setExpanded(prev => ({ ...prev, tenth: true }))
        else if (!d.twelfthPercentage) setExpanded(prev => ({ ...prev, twelfth: true }))
        else if (!d.ugScore) setExpanded(prev => ({ ...prev, ug: true }))
      })
      .catch(err => toast.error(err.message || 'Failed to load academic details'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (initialForm && JSON.stringify(form) === JSON.stringify(initialForm)) {
      toast.error('No changes to save')
      return
    }
    setSaving(true)
    try {
      await academicDetailsService.updateMine({
        tenthYearOfPassing: num(form.tenthYearOfPassing),
        tenthPercentage: num(form.tenthPercentage),
        twelfthYearOfPassing: num(form.twelfthYearOfPassing),
        twelfthPercentage: num(form.twelfthPercentage),
        diplomaYearOfPassing: num(form.diplomaYearOfPassing),
        diplomaPercentage: num(form.diplomaPercentage),
        ugDegree: form.ugDegree || null,
        ugDepartment: form.ugDepartment || null,
        ugYearOfPassing: num(form.ugYearOfPassing),
        ugScoreType: form.ugScoreType,
        ugScore: num(form.ugScore),
        ugBacklogs: num(form.ugBacklogs),
        pgDegree: form.pgDegree || null,
        pgDepartment: form.pgDepartment || null,
        pgYearOfPassing: num(form.pgYearOfPassing),
        pgScoreType: form.pgScoreType,
        pgScore: num(form.pgScore),
        pgBacklogs: num(form.pgBacklogs),
      })
      toast.success('Academic details updated')
      load()
      onSaved?.()
    } catch (err) { toast.error(err.message || 'Failed to update') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
  }

  const tenthSummary = form.tenthYearOfPassing || form.tenthPercentage ? `${form.tenthYearOfPassing || '—'} · ${form.tenthPercentage ? form.tenthPercentage + '%' : '—'}` : ''
  const twelfthSummary = form.twelfthYearOfPassing || form.twelfthPercentage ? `${form.twelfthYearOfPassing || '—'} · ${form.twelfthPercentage ? form.twelfthPercentage + '%' : '—'}` : ''
  const diplomaSummary = form.diplomaYearOfPassing || form.diplomaPercentage ? `${form.diplomaYearOfPassing || '—'} · ${form.diplomaPercentage ? form.diplomaPercentage + '%' : '—'}` : ''
  const ugSummary = form.ugDegree || form.ugScore ? `${form.ugDegree || 'UG'} ${form.ugYearOfPassing ? '· ' + form.ugYearOfPassing : ''} ${form.ugScore ? '· ' + form.ugScore + ' ' + (form.ugScoreType || 'CGPA') : ''}` : ''
  const pgSummary = form.pgDegree || form.pgScore ? `${form.pgDegree || 'PG'} ${form.pgYearOfPassing ? '· ' + form.pgYearOfPassing : ''} ${form.pgScore ? '· ' + form.pgScore + ' ' + (form.pgScoreType || 'CGPA') : ''}` : ''

  return (
    <form onSubmit={handleSave} className="space-y-3">
      {/* 10th / SSLC */}
      <AccordionCard
        title="10th / SSLC"
        isExpanded={expanded.tenth}
        onToggle={() => toggle('tenth')}
        summaryText={tenthSummary}
        isFilled={Boolean(form.tenthYearOfPassing && form.tenthPercentage)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Year of Passing (Calendar)</label>
            <input
              type="date"
              value={yearToDateVal(form.tenthYearOfPassing)}
              onChange={e => setForm(f => ({ ...f, tenthYearOfPassing: dateValToYear(e.target.value) }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Percentage (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={form.tenthPercentage}
              onChange={e => setForm(f => ({ ...f, tenthPercentage: e.target.value }))}
              placeholder="e.g. 85.50"
              className={INPUT_CLS} />
          </div>
        </div>
      </AccordionCard>

      {/* 12th / HSC */}
      <AccordionCard
        title="12th / HSC"
        isExpanded={expanded.twelfth}
        onToggle={() => toggle('twelfth')}
        summaryText={twelfthSummary}
        isFilled={Boolean(form.twelfthYearOfPassing && form.twelfthPercentage)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Year of Passing (Calendar)</label>
            <input
              type="date"
              value={yearToDateVal(form.twelfthYearOfPassing)}
              onChange={e => setForm(f => ({ ...f, twelfthYearOfPassing: dateValToYear(e.target.value) }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Percentage (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={form.twelfthPercentage}
              onChange={e => setForm(f => ({ ...f, twelfthPercentage: e.target.value }))}
              placeholder="e.g. 85.50"
              className={INPUT_CLS} />
          </div>
        </div>
      </AccordionCard>

      {/* Diploma */}
      <AccordionCard
        title="Diploma"
        optional
        isExpanded={expanded.diploma}
        onToggle={() => toggle('diploma')}
        summaryText={diplomaSummary}
        isFilled={Boolean(form.diplomaYearOfPassing && form.diplomaPercentage)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Year of Passing (Calendar)</label>
            <input
              type="date"
              value={yearToDateVal(form.diplomaYearOfPassing)}
              onChange={e => setForm(f => ({ ...f, diplomaYearOfPassing: dateValToYear(e.target.value) }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Percentage (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={form.diplomaPercentage}
              onChange={e => setForm(f => ({ ...f, diplomaPercentage: e.target.value }))}
              placeholder="e.g. 85.50"
              className={INPUT_CLS} />
          </div>
        </div>
      </AccordionCard>

      {/* UG / Degree */}
      <AccordionCard
        title="UG / Degree"
        isExpanded={expanded.ug}
        onToggle={() => toggle('ug')}
        summaryText={ugSummary}
        isFilled={Boolean(form.ugDegree && form.ugScore)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Degree / Course</label>
            <input type="text" value={form.ugDegree}
              onChange={e => setForm(f => ({ ...f, ugDegree: e.target.value }))}
              placeholder="e.g. B.Tech / B.E"
              className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Department</label>
            <input type="text" value={form.ugDepartment}
              onChange={e => setForm(f => ({ ...f, ugDepartment: e.target.value }))}
              placeholder="e.g. Computer Science"
              className={INPUT_CLS} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Year of Passing (Calendar)</label>
            <input
              type="date"
              value={yearToDateVal(form.ugYearOfPassing)}
              onChange={e => setForm(f => ({ ...f, ugYearOfPassing: dateValToYear(e.target.value) }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Backlogs</label>
            <input type="number" step="1" min="0" max="50" value={form.ugBacklogs}
              onChange={e => setForm(f => ({ ...f, ugBacklogs: e.target.value }))}
              placeholder="0"
              className={INPUT_CLS} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>CGPA / Percentage</label>
          <div className="flex gap-2">
            <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-0.5 flex-shrink-0">
              {['CGPA', 'PERCENTAGE'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, ugScoreType: type }))}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    form.ugScoreType === type ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
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
              max={form.ugScoreType === 'CGPA' ? 10 : 100}
              value={form.ugScore}
              onChange={e => setForm(f => ({ ...f, ugScore: e.target.value }))}
              placeholder={form.ugScoreType === 'CGPA' ? 'e.g. 8.50' : 'e.g. 82.50'}
              className={`flex-1 min-w-0 ${INPUT_CLS}`}
            />
          </div>
        </div>
      </AccordionCard>

      {/* PG / Master's */}
      <AccordionCard
        title="PG / Master's"
        optional
        isExpanded={expanded.pg}
        onToggle={() => toggle('pg')}
        summaryText={pgSummary}
        isFilled={Boolean(form.pgDegree && form.pgScore)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Degree / Course</label>
            <input type="text" value={form.pgDegree}
              onChange={e => setForm(f => ({ ...f, pgDegree: e.target.value }))}
              placeholder="e.g. M.Tech / M.E"
              className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Department</label>
            <input type="text" value={form.pgDepartment}
              onChange={e => setForm(f => ({ ...f, pgDepartment: e.target.value }))}
              placeholder="e.g. Computer Science"
              className={INPUT_CLS} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Year of Passing (Calendar)</label>
            <input
              type="date"
              value={yearToDateVal(form.pgYearOfPassing)}
              onChange={e => setForm(f => ({ ...f, pgYearOfPassing: dateValToYear(e.target.value) }))}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Backlogs</label>
            <input type="number" step="1" min="0" max="50" value={form.pgBacklogs}
              onChange={e => setForm(f => ({ ...f, pgBacklogs: e.target.value }))}
              placeholder="0"
              className={INPUT_CLS} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>CGPA / Percentage</label>
          <div className="flex gap-2">
            <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-0.5 flex-shrink-0">
              {['CGPA', 'PERCENTAGE'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, pgScoreType: type }))}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    form.pgScoreType === type ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
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
              max={form.pgScoreType === 'CGPA' ? 10 : 100}
              value={form.pgScore}
              onChange={e => setForm(f => ({ ...f, pgScore: e.target.value }))}
              placeholder={form.pgScoreType === 'CGPA' ? 'e.g. 8.50' : 'e.g. 82.50'}
              className={`flex-1 min-w-0 ${INPUT_CLS}`}
            />
          </div>
        </div>
      </AccordionCard>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-medium hover:from-purple-700 hover:to-violet-700 transition-all shadow-sm disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Academic Details'}
        </button>
      </div>
    </form>
  )
}
