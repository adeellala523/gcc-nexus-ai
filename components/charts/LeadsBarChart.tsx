'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dictionaries, type Lang } from '@/lib/i18n'

// Gold bar chart of lead counts per pipeline status. Status keys are
// translated through the CRM stage dictionary; unknown keys fall back to raw.
export default function LeadsBarChart({
  data,
  lang,
}: {
  data: { status: string; count: number }[]
  lang: Lang
}) {
  const dict = dictionaries[lang]
  const stages = dict.crm.stages as Record<string, string>
  const chartData = data.map((d) => ({ ...d, label: stages[d.status] ?? d.status }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#93a1bd', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: '#93a1bd', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip cursor={{ fill: 'rgba(212,175,55,0.08)' }} />
        <Bar dataKey="count" fill="#D4AF37" radius={[6, 6, 0, 0]} maxBarSize={52} />
      </BarChart>
    </ResponsiveContainer>
  )
}
