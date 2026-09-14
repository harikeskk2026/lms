export default function ProgressRing({ pct = 0, size = 90, strokeWidth = 8, color = '#6d28d9', trackColor = '#e9d5ff', label = '' }) {
  const safePct = Math.min(100, Math.max(0, Math.round(pct || 0)))
  const responsiveSize = typeof size === 'number' && size >= 90 ? size : 90
  const r   = (responsiveSize - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (safePct / 100) * circ

  return (
    <svg width={responsiveSize} height={responsiveSize} viewBox={`0 0 ${responsiveSize} ${responsiveSize}`} className="rotate-[-90deg] max-w-full">
      <circle
        cx={responsiveSize / 2} cy={responsiveSize / 2} r={r}
        fill="none" stroke={trackColor} strokeWidth={strokeWidth}
      />
      <circle
        cx={responsiveSize / 2} cy={responsiveSize / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle" textAnchor="middle"
        className="rotate-90 fill-gray-800 dark:fill-white font-bold"
        style={{ fontSize: responsiveSize * 0.22, transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontFamily: 'Outfit, sans-serif' }}
      >
        {safePct}%
      </text>
      {label && (
        <text
          x="50%" y="65%"
          dominantBaseline="middle" textAnchor="middle"
          style={{ fontSize: responsiveSize * 0.12, transform: 'rotate(90deg)', transformOrigin: '50% 50%', fill: '#9ca3af', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          {label}
        </text>
      )}
    </svg>
  )
}
