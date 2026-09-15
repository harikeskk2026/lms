'use client'
import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * React error boundary. Catches render-time exceptions from its children so a
 * single bad component (crashed tab, malformed API data, invalid date) shows a
 * contained fallback instead of taking down the whole page / the Next.js red
 * error screen. The user can retry, and the rest of the UI keeps working.
 *
 * Usage:
 *   <ErrorBoundary label="the dashboard">
 *     ...content...
 *   </ErrorBoundary>
 *   <ErrorBoundary key={activeSection} label="...">...per-section content...</ErrorBoundary>
 *
 * Optional props: fallback (custom node), renderFallback({ error, reset }).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info)
    } else {
      console.error('[ErrorBoundary]', error, info)
    }
  }

  reset = () => {
    this.setState({ error: null })
    if (typeof this.props.onReset === 'function') this.props.onReset()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback

    if (typeof this.props.renderFallback === 'function') {
      return this.props.renderFallback({ error, reset: this.reset })
    }

    const label = typeof this.props.label === 'string' ? this.props.label : 'this section'

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center space-y-3">
        <AlertTriangle size={28} className="mx-auto mb-1 text-amber-500" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Something went wrong while loading {label}.
        </p>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          An unexpected error occurred. Please try again.
        </p>
        <p className="text-xs text-gray-400">
          Your other data is still available. Use the tabs above or retry below.
        </p>
        <button
          onClick={this.reset}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
        >
          <RotateCcw size={12} /> Try Again
        </button>
      </div>
    )
  }
}