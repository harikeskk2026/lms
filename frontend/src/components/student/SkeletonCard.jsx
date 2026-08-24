export default function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`glass-card p-5 animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/3 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3" />
      <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-xl w-2/3" />
    </div>
  )
}

export function ErrorCard({ message, onRetry }) {
  return (
    <div className="glass-card p-6 border-l-4 border-yellow-400">
      <p className="text-yellow-700 dark:text-yellow-400 font-semibold mb-1">Unable to load data</p>
      <p className="text-sm text-gray-500 mb-3">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-brand-600 underline hover:text-brand-700">
          Try again
        </button>
      )}
    </div>
  )
}
