'use client'

import { useSimulationStore } from '@/store/simulationStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TEAL = '#0f766e'

const TRIAGE_COLORS = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#3b82f6', 5: TEAL }
const TRIAGE_LABELS = {
  1: 'Critical', 2: 'Emergent', 3: 'Urgent', 4: 'Less Urgent', 5: 'Non-Urgent',
}

const TT_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 12,
  color: '#0f172a',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}
const TT_LABEL_STYLE = { color: '#0f172a', fontWeight: 700 }
const TT_ITEM_STYLE  = { color: '#64748b' }

function StatCard({ label, value, sub, accent = TEAL }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl border"
      style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
      <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
      <span className="text-xl font-mono font-bold" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: '#94a3b8' }}>{sub}</span>}
    </div>
  )
}

export default function StatsDashboard() {
  const stats    = useSimulationStore((s) => s.stats)
  const patients = useSimulationStore((s) => s.patients)
  const status   = useSimulationStore((s) => s.status)

  if (status === 'idle') {
    return (
      <div className="flex items-center justify-center h-32 rounded-xl border text-sm"
        style={{ borderColor: '#e2e8f0', color: '#94a3b8', background: '#f8fafc' }}>
        Start a simulation to see live stats
      </div>
    )
  }

  const triageCounts = [1, 2, 3, 4, 5].map((lvl) => ({
    level: TRIAGE_LABELS[lvl],
    count: patients.filter((p) => p.triageLevel === lvl).length,
    fill:  TRIAGE_COLORS[lvl],
  }))

  const discharged = patients.filter((p) => p.state === 'discharged' && p.waitTime != null)
  const buckets = [
    { range: '0–15m',   count: discharged.filter((p) => p.waitTime < 15).length },
    { range: '15–30m',  count: discharged.filter((p) => p.waitTime >= 15 && p.waitTime < 30).length },
    { range: '30–60m',  count: discharged.filter((p) => p.waitTime >= 30 && p.waitTime < 60).length },
    { range: '60–120m', count: discharged.filter((p) => p.waitTime >= 60 && p.waitTime < 120).length },
    { range: '>120m',   count: discharged.filter((p) => p.waitTime >= 120).length },
  ]

  const utilPct = Math.round((stats.doctorUtilization ?? 0) * 100)

  return (
    <div className="flex flex-col gap-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total Patients" value={stats.totalPatients ?? 0} accent={TEAL} />
        <StatCard label="Avg Wait"       value={`${Math.round(stats.avgWaitTime ?? 0)}m`} accent="#f97316" />
        <StatCard label="In Queue"       value={stats.inQueue ?? 0} sub="waiting" accent="#64748b" />
        <StatCard label="Doctor Util."   value={`${utilPct}%`} sub={`${stats.inTreatment ?? 0} active`} accent="#22c55e" />
      </div>

      {/* Satisfaction bar */}
      {(stats.avgSatisfaction ?? 0) > 0 && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
          style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
          <span className="text-xs" style={{ color: '#64748b' }}>Satisfaction</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${((stats.avgSatisfaction ?? 0) / 5) * 100}%`, background: TEAL }} />
          </div>
          <span className="text-xs font-mono font-semibold" style={{ color: TEAL }}>
            {(stats.avgSatisfaction ?? 0).toFixed(1)}
          </span>
        </div>
      )}

      {/* Triage breakdown */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>
          Patients by Triage Level
        </p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={triageCounts} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="level" tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <Tooltip contentStyle={TT_STYLE} labelStyle={TT_LABEL_STYLE} itemStyle={TT_ITEM_STYLE}
              cursor={{ fill: 'rgba(15,118,110,0.05)' }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {triageCounts.map((e) => <Cell key={e.level} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wait time distribution */}
      {discharged.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>
            Wait Time Distribution
          </p>
          <ResponsiveContainer width="100%" height={95}>
            <BarChart data={buckets} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={TT_STYLE} labelStyle={TT_LABEL_STYLE} itemStyle={TT_ITEM_STYLE}
                cursor={{ fill: 'rgba(15,118,110,0.05)' }} />
              <Bar dataKey="count" fill={TEAL} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
