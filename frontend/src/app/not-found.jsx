import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-600/20 text-purple-400 ring-1 ring-purple-500/30 mb-2">
          <span className="text-4xl font-extrabold font-display">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Page Not Found
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/25"
          >
            <Home size={16} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
