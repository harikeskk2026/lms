'use client'

const CATEGORY_COLORS = {
  'Programming': { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-200' },
  'Framework':   { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200' },
  'Tool':        { bg: 'bg-emerald-100', text: 'text-emerald-700',dot: 'bg-emerald-500',border: 'border-emerald-200' },
  'Database':    { bg: 'bg-amber-100',   text: 'text-amber-700',  dot: 'bg-amber-500',  border: 'border-amber-200' },
  'Soft Skill':  { bg: 'bg-violet-100',  text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-violet-200' },
}

const PROFICIENCY_LABELS = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert']

function ProficiencyDots({ value, dotColor }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all ${i < value ? dotColor : 'bg-gray-200 dark:bg-gray-700'}`}
        />
      ))}
    </div>
  )
}

export default function SkillCard({ skill, onEdit, onDelete }) {
  const colors = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS['Programming']

  return (
    <div className={`group relative bg-white dark:bg-gray-800/80 rounded-xl border ${colors.border} dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200`}>
      {/* Category badge */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text} mb-2.5`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {skill.category}
      </div>

      {/* Skill name */}
      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2 leading-tight">{skill.name}</h3>

      {/* Proficiency */}
      <div className="mb-2">
        <ProficiencyDots value={skill.proficiency} dotColor={colors.dot} />
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
          {PROFICIENCY_LABELS[skill.proficiency] || 'Intermediate'}
          {skill.yearsExp ? ` · ${skill.yearsExp}yr${skill.yearsExp !== 1 ? 's' : ''}` : ''}
        </p>
      </div>

      {/* Actions — appear on hover */}
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit && onEdit(skill)}
          className="flex-1 text-[10px] py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-100 hover:text-purple-700 transition-colors font-medium"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete && onDelete(skill.id)}
          className="flex-1 text-[10px] py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 transition-colors font-medium"
        >
          Remove
        </button>
      </div>

      {/* Verified badge */}
      {skill.isVerified && (
        <div className="absolute top-3 right-3 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center" title="Verified">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  )
}
