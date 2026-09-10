'use client'
import Link from 'next/link'
import { Calendar, AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import ProgressRing from '@/components/student/ProgressRing'

export default function AttendanceCompareChart({
  attendance,
  overview,
  summary,
  trend = [],
  loading = false
}) {
  // Normalize metrics
  const present = summary?.present ?? (attendance?.present ?? 1)
  const absent  = summary?.absent  ?? (attendance?.absent  ?? 3)
  const late    = summary?.late    ?? (attendance?.late    ?? 0)
  const total   = summary?.total   ?? summary?.overallTotal ?? (attendance?.totalClasses ?? (present + absent + late || 4))
  const pct     = summary?.overallPercentage ?? summary?.percentage ?? overview?.attendancePct ?? attendance?.currentPercentage ?? (total > 0 ? Math.round(((present + late) * 100) / total) : 25)
  const needed  = summary?.neededFor75 ?? (pct < 75 && total > 0 ? Math.max(0, Math.ceil((0.75 * total - (present + late)) / 0.25)) : 8)

  const isHealthy  = pct >= 75
  const isAtRisk   = pct >= 60 && pct < 75
  const ringColor  = isHealthy ? '#10b981' : isAtRisk ? '#f59e0b' : '#ef4444'

  const statusBadge = isHealthy
    ? { text: 'Healthy', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' }
    : isAtRisk
      ? { text: 'At Risk', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60' }
      : { text: 'Critical', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60' }

  if (loading) {
    return (
      <div className="h-[200px] flex items-center justify-center animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-between h-full space-y-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-purple-600 dark:text-purple-400" />
          <h3 className="font-display font-bold text-gray-800 dark:text-white text-base">
            Attendance
          </h3>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.cls}`}>
            ● {statusBadge.text}
          </span>
          <Link
            href="/student/attendance"
            className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-0.5"
          >
            Details <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Main Clean Visual: Ring + 3 Stat Metric Cards ────────────── */}
      <div className="flex items-center justify-between gap-4 py-1">
        {/* Left: Clean Circular Progress Ring */}
        <div className="flex flex-col items-center justify-center pl-1">
          <ProgressRing
            pct={pct}
            size={90}
            strokeWidth={9}
            color={ringColor}
            trackColor="#f1f5f9"
          />
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-400 mt-1">
            Target: 75%
          </span>
        </div>

        {/* Right: Clean 3-Box Stat Cards */}
        <div className="grid grid-cols-3 gap-2.5 flex-1 max-w-[280px]">
          {/* Attended Card */}
          <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center transition-transform hover:scale-105">
            <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300 leading-tight">
              {present}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5">
              Attended
            </span>
          </div>

          {/* Missed Card */}
          <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-center transition-transform hover:scale-105">
            <span className="text-lg font-extrabold text-rose-700 dark:text-rose-300 leading-tight">
              {absent}
            </span>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mt-0.5">
              Missed
            </span>
          </div>

          {/* Total Conducted Card */}
          <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-center transition-transform hover:scale-105">
            <span className="text-lg font-extrabold text-purple-700 dark:text-purple-300 leading-tight">
              {total}
            </span>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mt-0.5">
              Total
            </span>
          </div>
        </div>
      </div>

      {/* ── Single Clean Footer Status Alert ─────────────────────────── */}
      {pct < 75 && needed > 0 ? (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
          <p className="text-[11px] leading-snug">
            Attend the next <strong>{needed} consecutive classes</strong> to reach the 75% target.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
          <p className="text-[11px] leading-snug font-medium">
            On track! Meeting the 75% placement attendance criteria.
          </p>
        </div>
      )}
    </div>
  )
}
