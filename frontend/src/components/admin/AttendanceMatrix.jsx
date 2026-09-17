'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import Pagination from '@/components/ui/Pagination'

const STATUS_CELL = {
  PRESENT: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  ABSENT:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_LABEL = { PRESENT: 'P', ABSENT: 'A' }


function PctChip({ pct }) {
  const cls =
    pct >= 85 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
    pct >= 75 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${cls}`}>
      {pct}%
    </span>
  )
}

/**
 * Props:
 *   classes — array of { classId, date, title, present, absent, late, pct }
 *   matrix  — array of { studentId, name, email, enrollmentNo, records: { [classId]: status|null }, present, total, pct }
 */
export default function AttendanceMatrix({ classes = [], matrix = [] }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  if (!classes.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No classes found for this period.
      </div>
    )
  }

  const pagedMatrix = matrix.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="rounded-xl border border-purple-100 dark:border-purple-900/30 overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[600px]">
        <thead>
          <tr className="bg-purple-50/70 dark:bg-purple-900/20">
            <th className="sticky left-0 z-10 bg-purple-50 dark:bg-[#1a0f35] px-4 py-3 text-left font-semibold text-purple-700 dark:text-purple-300 whitespace-nowrap min-w-[160px]">
              Student
            </th>
            {classes.map(cls => (
              <th key={cls.classId} className="px-2 py-3 text-center font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap min-w-[52px]">
                <div>{format(new Date(cls.date), 'MMM d')}</div>
                <div className="text-[9px] text-gray-400 font-normal break-words">{cls.title}</div>
              </th>
            ))}
            <th className="sticky right-0 z-10 bg-purple-50 dark:bg-[#1a0f35] px-4 py-3 text-center font-semibold text-purple-700 dark:text-purple-300 whitespace-nowrap">
              Total %
            </th>
          </tr>
        </thead>
        <tbody>
          {pagedMatrix.map((row, i) => (
            <tr key={row.studentId}
              className={`border-t border-purple-50 dark:border-purple-900/20 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-900/10'}`}>
              <td className="sticky left-0 z-10 bg-white dark:bg-[#0f0a1e] px-4 py-2.5 whitespace-nowrap border-r border-purple-50 dark:border-purple-900/20">
                <div className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{row.name}</div>
                {row.enrollmentNo && (
                  <div className="text-[10px] text-gray-400">{row.enrollmentNo}</div>
                )}
              </td>
              {classes.map(cls => {
                const status = row.records?.[cls.classId]
                return (
                  <td key={cls.classId} className="px-2 py-2.5 text-center">
                    {status ? (
                      <span className={`inline-block w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center ${STATUS_CELL[status] || ''}`}>
                        {STATUS_LABEL[status] || '?'}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
                    )}
                  </td>
                )
              })}
              <td className="sticky right-0 z-10 bg-white dark:bg-[#0f0a1e] px-4 py-2.5 text-center border-l border-purple-50 dark:border-purple-900/20">
                <PctChip pct={row.pct} />
                <div className="text-[9px] text-gray-400 mt-0.5">{row.present}/{row.total}</div>
              </td>
            </tr>
          ))}
        </tbody>
        {/* Footer: per-class summary */}
        <tfoot>
          <tr className="border-t-2 border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10">
            <td className="sticky left-0 z-10 bg-purple-50 dark:bg-[#1a0f35] px-4 py-2.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
              Class Rate
            </td>
            {classes.map(cls => (
              <td key={cls.classId} className="px-2 py-2.5 text-center">
                <span className={`text-[10px] font-bold ${
                  cls.pct >= 85 ? 'text-green-600' :
                  cls.pct >= 75 ? 'text-yellow-600' : 'text-amber-600'
                }`}>{cls.pct}%</span>
                <div className="text-[9px] text-gray-400">{cls.present}P</div>
              </td>
            ))}
            <td className="sticky right-0 z-10 bg-purple-50 dark:bg-[#1a0f35]" />
          </tr>
        </tfoot>
      </table>
      </div>
      <Pagination
        data={matrix}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(v) => { setPageSize(v); setPage(1) }}
        pageSizeOptions={[10, 20, 50, 100]}
        label="students"
      />
    </div>
  )
}
