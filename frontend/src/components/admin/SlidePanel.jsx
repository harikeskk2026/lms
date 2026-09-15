'use client'
import FormDrawer from '@/components/ui/FormDrawer'

export default function SlidePanel({ open, onClose, title, subtitle, children, width = 'w-full sm:w-[480px] lg:w-[540px]', variant = 'slide' }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  if (variant === 'modal') {
    return createPortal(
      <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] animate-fadeIn" onClick={onClose} />
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
          <div className={`pointer-events-auto ${width} max-w-full min-w-0 max-h-[90vh] bg-white dark:bg-gray-900 shadow-2xl rounded-3xl flex flex-col animate-scaleIn border border-purple-100 dark:border-purple-900/30`}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-purple-100 dark:border-purple-900/30">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-lg text-gray-800 dark:text-white break-words">{title}</h2>
                {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-lg font-medium shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-8 sm:pb-10">{children}</div>
          </div>
        </div>
      </>,
      document.body
    )
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] animate-fadeIn" onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full ${width} max-w-full min-w-0 z-[100] bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slideInRight border-l border-purple-100 dark:border-purple-900/30`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-purple-100 dark:border-purple-900/30">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg text-gray-800 dark:text-white break-words">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-lg font-medium"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-8 sm:pb-10">{children}</div>
      </div>
    </>,
    document.body
  )
}

