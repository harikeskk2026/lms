export default function ProgressRing({ pct = 0, size = 90, strokeWidth = 8, color = '#6d28d9', label = '' }) {
  const r   = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#e9d5ff" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle" textAnchor="middle"
        className="rotate-90 fill-gray-800 dark:fill-white font-bold"
        style={{ fontSize: size * 0.22, transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontFamily: 'Outfit, sans-serif' }}
      >
        {pct}%
      </text>
      {label && (
        <text
          x="50%" y="65%"
          dominantBaseline="middle" textAnchor="middle"
          style={{ fontSize: size * 0.12, transform: 'rotate(90deg)', transformOrigin: '50% 50%', fill: '#9ca3af', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          {label}
        </text>
      )}
    </svg>
  )
}
