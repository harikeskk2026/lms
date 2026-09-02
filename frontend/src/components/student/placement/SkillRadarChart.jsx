'use client'
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

export default function SkillRadarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
        <Radar dataKey="avg" stroke="#6d28d9" fill="#6d28d9" fillOpacity={0.25} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
