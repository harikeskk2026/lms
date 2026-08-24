'use client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'purple', trend, trendDir }) {
  const colors = {
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/40' },
    green:  { bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-600 dark:text-green-300',   border: 'border-green-200 dark:border-green-800/40' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800/40' },
    blue:   { bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-600 dark:text-blue-300',     border: 'border-blue-200 dark:border-blue-800/40' },
    indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800/40' },
  }
  const c = colors[color] || colors.purple

  return (
    <div className={`glass-card p-5 hover:scale-[1.02] transition-transform duration-200 border ${c.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          {Icon && <Icon size={20} className={c.text} />}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${
            trendDir === 'up' ? 'text-green-600' : trendDir === 'down' ? 'text-amber-500' : 'text-gray-400'
          }`}>
            {trendDir === 'up' ? <TrendingUp size={12} /> : trendDir === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-display">{value}</p>
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mt-0.5">{title}</p>
      {subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}
