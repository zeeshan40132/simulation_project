'use client'

import { useSimulationStore } from '@/store/simulationStore'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const COLORS = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#3b82f6',
}
const TRIAGE_LABELS = {
  1: 'Critical', 2: 'Emergent', 3: 'Urgent', 4: 'Less Urgent', 5: 'Non-Urgent',
}

function StatCard({ label, value, sub }) {
  return (
    <div
      className="flex flex-col gap-1 p-3 rounded-lg"
      style={{ background: 'var(--surface-2, #1e293b)' }}
    >
      <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-xl font-mono font-bold" style={{ color: 'var(--text)' }}>
        {value}
      </span>
      {sub && <span className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</span>}
    </div>
  )
}

const TT_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 8,
  fontSize: 12,
  color: '#e2e8f0',
}

export default function StatsDashboard() {
  const stats    = useSimulationStore((s) => s.stats)
  const patients = useSimulationStore((s) => s.patients)
  const status   = useSimulationStore((s) => s.status)

  if (status === 'idle') {
    return (
      <div
        className="flex items-center justify-center h-32 rounded-xl border text-sm"
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
      >
        Start a simulation to see live stats
      </div>
    )
  }

  // Triage breakdown from current patient list
  const triageCounts = [1, 2, 3, 4, 5].map((lvl) => ({
    level: TRIAGE_LABELS[lvl],
    count: patients.filter((p) => p.triageLevel === lvl).length,
    fill:  COLORS[lvl],
  }))

  // Wait time buckets (discharged patients)
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
        <StatCard
          label="Total Patients"
          value={stats.totalPatients ?? 0}
        />
        <StatCard
          label="Avg Wait"
          value={`${Math.round(stats.avgWaitTime ?? 0)}m`}
        />
        <StatCard
          label="In Queue"
          value={stats.inQueue ?? 0}
          sub="waiting for doctor"
        />
        <StatCard
          label="Doctor Util."
          value={`${utilPct}%`}
          sub={`${stats.inTreatment ?? 0} active`}
        />
      </div>

      {/* Satisfaction score */}
      {(stats.avgSatisfaction ?? 0) > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg"
             style={{ background: 'var(--surface-2, #1e293b)' }}>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            Avg Satisfaction
          </span>
          <div className="flex-1 h-2 rounded-full overflow-hidden"
               style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${((stats.avgSatisfaction ?? 0) / 5) * 100}%`,
                background: '#22c55e',
              }}
            />
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--text)' }}>
            {(stats.avgSatisfaction ?? 0).toFixed(1)} / 5
          </span>
        </div>
      )}

      {/* Triage breakdown bar chart */}
      <div>
        <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
          Patients by Triage Level
        </p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={triageCounts} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="level" tick={{ fontSize: 9, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
            <Tooltip contentStyle={TT_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {triageCounts.map((entry) => (
                <Cell key={entry.level} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wait time distribution */}
      {discharged.length > 0 && (
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
            Wait Time Distribution
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={buckets} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip contentStyle={TT_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
