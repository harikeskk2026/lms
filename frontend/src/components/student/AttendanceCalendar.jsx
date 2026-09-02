'use client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'

const STATUS_STYLE = {
  PRESENT: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  ABSENT:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  LATE:    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  LEAVE:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
}

const STATUS_DOT = {
  PRESENT: 'bg-green-500',
  ABSENT:  'bg-red-500',
  LATE:    'bg-yellow-400',
  LEAVE:   'bg-blue-500',
}


export default function AttendanceCalendar({ calendarData = [], activeMonth, onDayClick }) {
  const monthDate = activeMonth ? new Date(activeMonth + '-01') : new Date()
  const start = startOfMonth(monthDate)
  const end   = endOfMonth(monthDate)
  const days  = eachDayOfInterval({ start, end })

  // Build lookup
  const lookup = {}
  for (const d of calendarData) {
    const key = format(new Date(d.date), 'yyyy-MM-dd')
    lookup[key] = d
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const startPad = getDay(start)

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map(day => {
          const key  = format(day, 'yyyy-MM-dd')
          const info = lookup[key]
          const isToday = key === format(new Date(), 'yyyy-MM-dd')
          const isFuture = day > new Date()
          const status = info?.status || null
          return (
            <div
              key={key}
              title={info?.classTitle || ''}
              onClick={() => { if (info && !isFuture && onDayClick) onDayClick(key) }}
              className={`
                relative min-h-[40px] rounded-xl flex flex-col items-center justify-center
                text-xs font-medium transition-all
                ${isToday ? 'ring-2 ring-brand-500 ring-offset-1' : ''}
                ${status ? STATUS_STYLE[status] : isFuture ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}
                ${info && !isFuture ? 'cursor-pointer hover:scale-105' : ''}
              `}
            >
              <span>{format(day, 'd')}</span>
              {status && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${STATUS_DOT[status]}`} />
              )}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Present</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />Absent</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Late</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" />Half Day</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" />Leave</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" />Excused</span>
      </div>
    </div>
  )
}
