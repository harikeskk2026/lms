'use client'
import { useState, useEffect } from 'react'
import { Footprints, Flame, Crown, Lock } from 'lucide-react'
import { format } from 'date-fns'
import quizService from '@/services/quizService'
import SkeletonCard from '@/components/student/SkeletonCard'

// ─── Achievement Badges ─────────────────────────────────────────────────────
// Shared badge-case UI, used both by the Quizzes module's Achievements tab and
// the Student Profile page — both read from the same GET /student/achievements
// response, so a badge only ever shows as unlocked once the backend confirms it.
const ACHIEVEMENT_STYLES = {
  FIRST_QUIZ: {
    icon: 'footprints',
    name: 'First Steps',
    xpReward: 25,
    from: '#b55fe6',
    to: '#7c3aed',
    rimFrom: '#f3e8ff',
    rimTo: '#c084fc',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  PERFECT_SCORE: {
    icon: 'diamond',
    name: 'Perfectionist',
    xpReward: 50,
    from: '#38bdf8',
    to: '#1d4ed8',
    rimFrom: '#dbeafe',
    rimTo: '#60a5fa',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  SEVEN_DAY_STREAK: {
    icon: 'flame',
    name: 'On Fire',
    xpReward: 75,
    from: '#fb923c',
    to: '#ea580c',
    rimFrom: '#ffedd5',
    rimTo: '#f97316',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
  HUNDRED_QUESTIONS: {
    icon: 'wreath',
    name: 'Century Club',
    xpReward: 100,
    from: '#4ade80',
    to: '#15803d',
    rimFrom: '#dcfce7',
    rimTo: '#22c55e',
    textColor: 'text-green-600 dark:text-green-400',
  },
  SPEED_MASTER: {
    icon: 'speedometer',
    name: 'Speed Master',
    xpReward: 40,
    from: '#f472b6',
    to: '#be185d',
    rimFrom: '#fce7f3',
    rimTo: '#ec4899',
    textColor: 'text-pink-600 dark:text-pink-400',
  },
  MOST_IMPROVED: {
    icon: 'trending',
    name: 'Most Improved',
    xpReward: 50,
    from: '#22d3ee',
    to: '#0891b2',
    rimFrom: '#cffafe',
    rimTo: '#06b6d4',
    textColor: 'text-cyan-600 dark:text-cyan-400',
  },
  QUIZ_MASTER: {
    icon: 'trophy',
    name: 'Quiz Master',
    xpReward: 100,
    from: '#fbbf24',
    to: '#b45309',
    rimFrom: '#fef3c7',
    rimTo: '#f59e0b',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  TOP_TEN: {
    icon: 'crown',
    name: 'Top 10',
    xpReward: 30,
    from: '#facc15',
    to: '#a16207',
    rimFrom: '#fef9c3',
    rimTo: '#eab308',
    textColor: 'text-yellow-600 dark:text-yellow-400',
  },
}

const DEFAULT_ACHIEVEMENTS = [
  { code: 'FIRST_QUIZ', name: 'First Steps', xpReward: 25, unlocked: false },
  { code: 'PERFECT_SCORE', name: 'Perfectionist', xpReward: 50, unlocked: false },
  { code: 'SEVEN_DAY_STREAK', name: 'On Fire', xpReward: 75, unlocked: false },
  { code: 'HUNDRED_QUESTIONS', name: 'Century Club', xpReward: 100, unlocked: false },
  { code: 'SPEED_MASTER', name: 'Speed Master', xpReward: 40, unlocked: false },
  { code: 'MOST_IMPROVED', name: 'Most Improved', xpReward: 50, unlocked: false },
  { code: 'QUIZ_MASTER', name: 'Quiz Master', xpReward: 100, unlocked: false },
  { code: 'TOP_TEN', name: 'Top 10', xpReward: 60, unlocked: false },
]

function SparkleStar({ x, y, size = 4 }) {
  return (
    <path
      d={`M ${x} ${y - size} Q ${x} ${y} ${x + size} ${y} Q ${x} ${y} ${x} ${y + size} Q ${x} ${y} ${x - size} ${y} Q ${x} ${y} ${x} ${y - size} Z`}
      fill="white"
      opacity="0.9"
    />
  )
}

function BadgeIconGraphic({ iconType }) {
  switch (iconType) {
    case 'footprints':
      return <Footprints size={34} className="text-white fill-white/20" />
    case 'diamond':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9">
          <path d="M6 3h12l4 6-10 12L2 9z" fill="white" opacity="0.95" />
          <path d="M6 3l4 6h4l4-6M10 9l2 12 2-12" stroke="rgba(0,0,0,0.15)" strokeWidth="1" fill="none" />
        </svg>
      )
    case 'flame':
      return <Flame size={36} className="text-white fill-white" />
    case 'wreath':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="white">
          <polygon points="12,4 13.5,8 18,8.5 14.5,11.5 15.5,16 12,13.5 8.5,16 9.5,11.5 6,8.5 10.5,8" />
          <path d="M4 17c-1.5-2.5-1.5-6 0-9.5M5.5 8c1.2-1.5 3-2.5 4.5-3M3 13c-1.2-1.2-1.2-3.5 0-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M20 17c1.5-2.5 1.5-6 0-9.5M18.5 8c-1.2-1.5-3-2.5-4.5-3M21 13c1.2-1.2 1.2-3.5 0-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      )
    case 'speedometer':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 14l4-4" />
          <path d="M3.34 18a10 10 0 1 1 17.32 0" />
          <line x1="3" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="21" y2="12" />
          <line x1="6.34" y1="6.34" x2="7.76" y2="7.76" />
          <line x1="17.66" y1="6.34" x2="16.24" y2="7.76" />
        </svg>
      )
    case 'trending':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="white">
          <rect x="3" y="14" width="4" height="7" rx="1" />
          <rect x="9.5" y="10" width="4" height="11" rx="1" />
          <rect x="16" y="6" width="4" height="15" rx="1" />
          <path d="M4 10l5-5 4 2.5 6.5-6.5M19.5 3h4v4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
    case 'trophy':
      return (
        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="white">
          <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" />
          <path d="M6 5H3a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h2M18 5h3a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-2" stroke="white" strokeWidth="1.8" fill="none" />
          <rect x="10" y="16" width="4" height="3" />
          <rect x="7" y="19" width="10" height="2" rx="1" />
          <polygon points="12,5.5 12.6,7 14.2,7.2 13,8.3 13.3,9.8 12,9 10.7,9.8 11,8.3 9.8,7.2 11.4,7" fill="#f59e0b" />
        </svg>
      )
    case 'crown':
    default:
      return <Crown size={34} className="text-white fill-white/20" />
  }
}

function BadgeMedallion({ unlocked, style: colorStyle, size = 96 }) {
  const uid = colorStyle.from.replace('#', '')
  const rimId = `rim-${uid}`
  const faceId = `face-${uid}`
  const glowId = `glow-${uid}`
  const sealSize = 28

  return (
    <div className="relative shrink-0 flex flex-col items-center" style={{ width: size, height: size + 10 }}>
      <svg
        viewBox="0 0 100 106"
        width={size}
        height={size}
        className={`drop-shadow-lg overflow-visible transition-all duration-300 ${
          unlocked ? 'opacity-100 saturate-110' : 'opacity-85 grayscale-[10%]'
        }`}
      >
        <defs>
          <linearGradient id={rimId} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={colorStyle.rimFrom} />
            <stop offset="100%" stopColor={colorStyle.rimTo} />
          </linearGradient>

          <linearGradient id={faceId} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor={colorStyle.from} />
            <stop offset="100%" stopColor={colorStyle.to} />
          </linearGradient>

          <linearGradient id={glowId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.45" />
            <stop offset="100%" stopColor="white" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Outer translucent bevel rim */}
        <polygon
          points="50,4 93,26 93,74 50,96 7,74 7,26"
          fill={`url(#${rimId})`}
          stroke={`url(#${rimId})`}
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* Outer dark stroke shadow */}
        <polygon
          points="50,8 89,28 89,72 50,92 11,72 11,28"
          fill="none"
          stroke="rgba(0, 0, 0, 0.15)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Inner face polygon */}
        <polygon
          points="50,10 87,29 87,71 50,90 13,71 13,29"
          fill={`url(#${faceId})`}
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Upper glass highlight sheen */}
        <polygon
          points="50,11 86,29 80,48 50,56 20,48 14,29"
          fill={`url(#${glowId})`}
        />

        {/* Sparkles */}
        <SparkleStar x={26} y={30} size={3.5} />
        <SparkleStar x={74} y={28} size={4.5} />
        <SparkleStar x={28} y={70} size={3} />
        <SparkleStar x={72} y={68} size={4} />
      </svg>

      {/* Central Icon */}
      <div
        className={`absolute inset-0 flex items-center justify-center pb-2.5 pointer-events-none ${
          !unlocked ? 'opacity-90' : 'opacity-100'
        }`}
        style={{ width: size, height: size }}
      >
        <BadgeIconGraphic iconType={colorStyle.icon} />
      </div>

      {/* Lock seal overlay for locked badges */}
      {!unlocked && (
        <div
          className="absolute rounded-full flex items-center justify-center border-2 border-white shadow-md z-10"
          style={{
            width: sealSize,
            height: sealSize,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            background: `linear-gradient(135deg, ${colorStyle.from}, ${colorStyle.to})`,
          }}
        >
          <Lock size={13} className="text-white fill-white" />
        </div>
      )}
    </div>
  )
}

function BadgeCaseItem({ achievement }) {
  const style = ACHIEVEMENT_STYLES[achievement.code] || ACHIEVEMENT_STYLES.FIRST_QUIZ
  const isUnlocked = achievement.unlocked

  return (
    <div className="flex flex-col items-center shrink-0 w-32 text-center group transition-transform duration-200 hover:-translate-y-1">
      <BadgeMedallion unlocked={isUnlocked} style={style} size={96} />
      <div className="min-w-0 mt-3.5 flex flex-col items-center">
        <p className="text-sm font-bold text-gray-900 dark:text-white break-words tracking-tight">
          {achievement.name}
        </p>
        <p className={`text-xs font-bold mt-1 ${style.textColor}`}>
          +{achievement.xpReward} XP
        </p>
        {isUnlocked && achievement.unlockedAt && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {format(new Date(achievement.unlockedAt), 'MMM d, yyyy')}
          </p>
        )}
      </div>
    </div>
  )
}

// `embedded` drops the outer white card chrome + "Badge Case" heading so the
// caller (e.g. the Student Profile page) can wrap this in its own section card
// without nesting two card looks. The Quizzes module's Achievements tab uses
// the default (non-embedded) look unchanged.
export default function AchievementBadges({ embedded = false, onlyUnlocked = false }) {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('unlocked') // 'unlocked' | 'locked'

  useEffect(() => {
    quizService.getAchievements()
      .then(r => setAchievements(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Merge default list so all 8 reference badges exist, but `unlocked`/`unlockedAt`
  // always come from the API response — never assumed locally.
  const achievementMap = (achievements || []).reduce((acc, cur) => {
    acc[cur.code] = cur
    return acc
  }, {})

  const allAchievements = DEFAULT_ACHIEVEMENTS.map(def => {
    const fromApi = achievementMap[def.code]
    return {
      ...def,
      ...(fromApi || {}),
    }
  })

  const unlocked = allAchievements.filter(a => a.unlocked)
  const locked = allAchievements.filter(a => !a.unlocked)
  const list = onlyUnlocked ? unlocked : (view === 'unlocked' ? unlocked : locked)

  if (loading) return <div className="space-y-3">{[0, 1, 2].map(i => <SkeletonCard key={i} lines={2} />)}</div>

  const header = (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
      {!embedded && (
        <h3 className="font-display font-extrabold text-xl text-gray-900 dark:text-white tracking-tight">
          Badge Case
        </h3>
      )}
      {!onlyUnlocked && (
        <div className="flex gap-1 p-1 bg-gray-100/90 dark:bg-gray-800/90 rounded-full w-fit">
          {[
            { id: 'unlocked', label: `Unlocked (${unlocked.length})` },
            { id: 'locked', label: `Locked (${locked.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                view === tab.id
                  ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const body = (
    <>
      {(!embedded || !onlyUnlocked) && header}
      {list.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10 font-medium">
          {onlyUnlocked || view === 'unlocked'
            ? 'No badges unlocked yet — take a quiz to earn your first one!'
            : "Nothing locked — you've earned them all! 🎉"}
        </p>
      ) : (
        <div className={`flex items-center gap-2 overflow-x-auto pb-4 pt-2 px-1 scrollbar-none ${embedded ? 'flex-wrap justify-start gap-6' : 'justify-between'}`}>
          {list.map(a => <BadgeCaseItem key={a.code} achievement={a} />)}
        </div>
      )}
    </>
  )

  if (embedded) return body

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
      {body}
    </div>
  )
}
