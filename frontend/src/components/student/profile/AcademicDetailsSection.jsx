'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import academicDetailsService from '@/services/academicDetailsService'

// Same shape/fields as the admin-side academic details form
// (admin/students/[id]/page.jsx) — kept visually consistent since both write
// to the exact same AcademicDetails row, just through different endpoints.
const EMPTY_FORM = {
  tenthYearOfPassing: '', tenthPercentage: '',
  twelfthYearOfPassing: '', twelfthPercentage: '',
  diplomaYearOfPassing: '', diplomaPercentage: '',
  ugDegree: '', ugDepartment: '', ugYearOfPassing: '', ugScoreType: 'CGPA', ugScore: '', ugBacklogs: '',
  pgDegree: '', pgDepartment: '', pgYearOfPassing: '', pgScoreType: 'CGPA', pgScore: '', pgBacklogs: '',
}

const INPUT_CLS = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500'
const LABEL_CLS = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1'

function AcademicLevelFields({ title, optional, values, setValues, yearKey, percentageKey }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
        {title}{optional && <span className="font-normal text-gray-400"> (optional)</span>}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>Year of Passing</label>
          <input type="number" step="1" min="1950" max="2100" value={values[yearKey]}
            onChange={e => setValues(f => ({ ...f, [yearKey]: e.target.value }))}
            className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>Percentage</label>
          <input type="number" step="0.1" min="0" max="100" value={values[percentageKey]}
            onChange={e => setValues(f => ({ ...f, [percentageKey]: e.target.value }))}
            className={INPUT_CLS} />
        </div>
      </div>
    </div>
  )
}

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
          <label className={LABEL_CLS}>Degree / Course</label>
          <input type="text" value={values[degreeKey]}
            onChange={e => setValues(f => ({ ...f, [degreeKey]: e.target.value }))}
            placeholder="e.g. B.Tech"
            className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>Department</label>
          <input type="text" value={values[departmentKey]}
            onChange={e => setValues(f => ({ ...f, [departmentKey]: e.target.value }))}
            placeholder="e.g. Computer Science"
            className={INPUT_CLS} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={LABEL_CLS}>Year of Passing</label>
          <input type="number" step="1" min="1950" max="2100" value={values[yearKey]}
            onChange={e => setValues(f => ({ ...f, [yearKey]: e.target.value }))}
            className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>Backlogs</label>
          <input type="number" step="1" min="0" value={values[backlogsKey]}
            onChange={e => setValues(f => ({ ...f, [backlogsKey]: e.target.value }))}
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
            className={`flex-1 min-w-0 ${INPUT_CLS}`}
          />
        </div>
      </div>
    </div>
  )
}

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export default function AcademicDetailsSection({ onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    academicDetailsService.getMine()
      .then(r => {
        const d = r.data
        setForm({
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
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
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

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <AcademicLevelFields title="10th / SSLC" values={form} setValues={setForm}
        yearKey="tenthYearOfPassing" percentageKey="tenthPercentage" />
      <AcademicLevelFields title="12th / HSC" values={form} setValues={setForm}
        yearKey="twelfthYearOfPassing" percentageKey="twelfthPercentage" />
      <AcademicLevelFields title="Diploma" optional values={form} setValues={setForm}
        yearKey="diplomaYearOfPassing" percentageKey="diplomaPercentage" />
      <DegreeLevelFields title="UG / Degree" values={form} setValues={setForm} prefix="ug" />
      <DegreeLevelFields title="PG / Master's" optional values={form} setValues={setForm} prefix="pg" />
      <button type="submit" disabled={saving}
        className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">
        {saving ? 'Saving...' : 'Save Academic Details'}
      </button>
    </form>
  )
}
