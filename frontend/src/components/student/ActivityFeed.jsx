'use client'
import { formatDistanceToNow } from 'date-fns'
import { Calendar, Brain, ClipboardList, Briefcase, Bell } from 'lucide-react'

const iconMap = {
  Calendar, Brain, ClipboardList, Briefcase, Bell
}

const colorMap = {
  green:  'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue:   'bg-blue-100 text-blue-600',
  purple: 'bg-brand-100 text-brand-600',
}

export default function ActivityFeed({ items = [] }) {
  if (!items.length) return (
    <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
  )

  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-purple-100 dark:bg-purple-900/30" />
      <div className="space-y-3">
        {items.map((item, i) => {
          const Icon = iconMap[item.icon] || Bell
          const colCls = colorMap[item.color] || colorMap.purple
          return (
            <div key={i} className="relative flex gap-2 sm:gap-3 items-start pl-8 sm:pl-9 group hover:bg-purple-50/50 dark:hover:bg-purple-900/10 rounded-xl p-2 -ml-2 transition-colors">
              <div className={`absolute left-0 sm:left-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${colCls}`}>
                <Icon size={11} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-100 font-medium leading-tight">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.subtitle}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                {item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
