'use client'

export default function DataTable({ columns, data = [], loading, emptyMessage = 'No data found' }) {
  if (loading) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-purple-100 dark:border-purple-900/30">
                {columns.map(col => (
                  <th key={col.key} className="px-3 sm:px-4 py-3 text-left font-semibold text-purple-700 dark:text-purple-300 text-xs uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                  {columns.map(col => (
                    <td key={col.key} className="px-3 sm:px-4 py-3">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="glass-card p-8 sm:p-12 text-center">
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10">
              {columns.map(col => (
                <th key={col.key} className="px-3 sm:px-4 py-3 text-left font-semibold text-purple-700 dark:text-purple-300 text-xs uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id || i}
                className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors"
              >
                {columns.map(col => (
                  <td key={col.key} className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
