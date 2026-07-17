import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const STATUS_COLORS = {
  Paid: '#D4A853',
  Pending: '#C4B5FD',
  'May come': '#78716C',
} as const

type StatusRow = { name: keyof typeof STATUS_COLORS; value: number }
type CategoryRow = { name: string; allocated: number; paid: number }

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-gold/40 bg-[#10081c] px-3 py-2 text-sm shadow-lg">
      {label && <p className="mb-1 font-medium text-gold">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.name)} className="text-white/90">
          <span style={{ color: p.color }}>{p.name}</span>
          {': '}
          {formatCurrency(Number(p.value) || 0)}
        </p>
      ))}
    </div>
  )
}

export function BudgetCharts({
  statusData,
  categoryData,
}: {
  statusData: StatusRow[]
  categoryData: CategoryRow[]
}) {
  const statusTotal = statusData.reduce((s, d) => s + d.value, 0)
  const hasStatus = statusTotal > 0
  const hasCategories = categoryData.length > 0

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gold/30 bg-white/5 p-3">
        <p className="mb-2 font-display text-lg font-semibold text-gold">Payment status</p>
        {!hasStatus ? (
          <p className="py-8 text-center text-sm text-white/60">No payments yet</p>
        ) : (
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData.filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {statusData
                    .filter((d) => d.value > 0)
                    .map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  formatter={(value) => <span className="text-sm text-white/85">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
              <p className="font-display text-sm font-semibold text-gold">
                {formatCurrency(statusData.find((d) => d.name === 'Paid')?.value ?? 0)}
              </p>
              <p className="text-xs text-white/60">paid</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-gold/30 bg-white/5 p-3">
        <p className="mb-2 font-display text-lg font-semibold text-gold">By category</p>
        {!hasCategories ? (
          <p className="py-8 text-center text-sm text-white/60">No categories yet</p>
        ) : (
          <div style={{ height: Math.max(220, categoryData.length * 36) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,168,83,0.15)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                  tickFormatter={(v) => `₹${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 11 }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={(value) => <span className="text-sm text-white/85">{value}</span>} />
                <Bar dataKey="allocated" name="Allocated" fill="#6D28D9" radius={[0, 3, 3, 0]} barSize={10} />
                <Bar dataKey="paid" name="Paid" fill="#D4A853" radius={[0, 3, 3, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
