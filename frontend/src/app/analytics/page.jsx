'use client'

import Link from 'next/link'
import { useSimulationStore } from '@/store/simulationStore'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'

const TEAL = '#0f766e'

const TRIAGE_COLORS = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#3b82f6', 5: TEAL }
const TRIAGE_LABELS = {
  1: 'Critical', 2: 'Emergent', 3: 'Urgent', 4: 'Less Urgent', 5: 'Non-Urgent',
}
const TRIAGE_SHORT = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5' }

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

function formatSimTime(minutes) {
  const h   = Math.floor(minutes / 60)
  const min = Math.floor(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function KpiCard({ label, value, sub, accent = TEAL }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-2 border"
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
      <span className="text-xs font-mono uppercase tracking-widest font-semibold"
        style={{ color: '#64748b' }}>{label}</span>
      <span className="text-4xl font-bold font-mono" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-sm" style={{ color: '#94a3b8' }}>{sub}</span>}
    </div>
  )
}

function EventRow({ event }) {
  let icon, label, accent

  switch (event.kind) {
    case 'ARRIVAL':
      icon  = '→'; label = `Patient #${event.patientId} arrived`
      accent = TRIAGE_COLORS[event.triageLevel] ?? '#94a3b8'; break
    case 'TRIAGE_DONE':
      icon  = '✓'; label = `Patient #${event.patientId} triage complete`
      accent = '#8b5cf6'; break
    case 'DOCTOR_ASSIGNED':
      icon  = '+'; label = `Patient #${event.patientId} → Dr. ${event.doctorId + 1}`
      accent = TEAL; break
    case 'DISCHARGE':
      icon  = event.outcome === 'admitted' ? '⬆' : '✓'
      label = `Patient #${event.patientId} ${event.outcome}`
      accent = event.outcome === 'admitted' ? '#f97316' : '#22c55e'; break
    default:
      return null
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0"
      style={{ borderColor: '#f1f5f9' }}>
      <span className="text-xs font-mono w-12 shrink-0" style={{ color: '#94a3b8' }}>
        {formatSimTime(event.time)}
      </span>
      <span className="w-5 text-center text-sm shrink-0 font-bold" style={{ color: accent }}>
        {icon}
      </span>
      {event.triageLevel && (
        <span className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0 font-semibold"
          style={{ background: `${TRIAGE_COLORS[event.triageLevel]}18`,
                   color: TRIAGE_COLORS[event.triageLevel] }}>
          {TRIAGE_SHORT[event.triageLevel]}
        </span>
      )}
      <span className="text-sm" style={{ color: '#475569' }}>{label}</span>
      <span className="ml-auto text-xs font-mono" style={{ color: '#cbd5e1' }}>
        {event.kind}
      </span>
    </div>
  )
}

export default function AnalyticsPage() {
  const stats     = useSimulationStore((s) => s.stats)
  const patients  = useSimulationStore((s) => s.patients)
  const allEvents = useSimulationStore((s) => s.allEvents)
  const simTime   = useSimulationStore((s) => s.getFormattedSimTime())
  const status    = useSimulationStore((s) => s.status)
  const config    = useSimulationStore((s) => s.config)

  const triageData = [1, 2, 3, 4, 5].map((lvl) => ({
    name: TRIAGE_LABELS[lvl], short: TRIAGE_SHORT[lvl],
    count: patients.filter((p) => p.triageLevel === lvl).length,
    fill: TRIAGE_COLORS[lvl],
  }))

  const discharged = patients.filter((p) => p.state === 'discharged' && p.waitTime != null)
  const waitBuckets = [
    { range: '0–15m',   count: discharged.filter((p) => p.waitTime < 15).length },
    { range: '15–30m',  count: discharged.filter((p) => p.waitTime >= 15  && p.waitTime < 30).length },
    { range: '30–60m',  count: discharged.filter((p) => p.waitTime >= 30  && p.waitTime < 60).length },
    { range: '60–120m', count: discharged.filter((p) => p.waitTime >= 60  && p.waitTime < 120).length },
    { range: '>120m',   count: discharged.filter((p) => p.waitTime >= 120).length },
  ]

  const outcomeData = [
    { name: 'Discharged', value: discharged.filter((p) => p.outcome === 'discharged').length, fill: '#22c55e' },
    { name: 'Admitted',   value: discharged.filter((p) => p.outcome === 'admitted').length,   fill: '#f97316' },
  ].filter((d) => d.value > 0)

  const utilPct = Math.round((stats.doctorUtilization ?? 0) * 100)
  const isEmpty = status === 'idle' && allEvents.length === 0

  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ background: '#f1f5f9', color: '#0f172a' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-3 border-b shrink-0"
        style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
        <div className="flex items-center gap-4">
          <Link href="/simulation"
            className="text-xs font-mono px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-100"
            style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
            ← Back to Simulation
          </Link>
          <div className="w-px h-4" style={{ background: '#e2e8f0' }} />
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: TEAL }}>
            <span className="text-white text-xs font-bold">ER</span>
          </div>
          <span className="text-xs font-mono tracking-widest font-semibold" style={{ color: TEAL }}>
            ANALYTICS
          </span>
          <span className="text-lg font-bold" style={{ color: '#0f172a' }}>
            Hospital ER — Full Report
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono">
          <span style={{ color: '#64748b' }}>SIM TIME</span>
          <span className="font-semibold" style={{ color: '#0f172a' }}>{simTime}</span>
          <span className="text-xs px-2.5 py-1 rounded-lg uppercase font-semibold"
            style={{
              background: status === 'running' ? '#f0fdfa' : '#f8fafc',
              color:      status === 'running' ? TEAL      : '#64748b',
              border:     `1px solid ${status === 'running' ? '#99f6e4' : '#e2e8f0'}`,
            }}>
            {status}
          </span>
        </div>
      </header>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-lg font-mono" style={{ color: '#94a3b8' }}>NO SIMULATION DATA</p>
          <Link href="/" className="text-sm font-semibold" style={{ color: TEAL }}>
            Go to simulation →
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-6 flex flex-col gap-6">

          {/* Config summary */}
          <div className="flex gap-3 flex-wrap">
            {[
              ['Doctors',  config.numDoctors],
              ['Nurses',   config.numNurses],
              ['Arrival',  `${config.arrivalRate}/hr`],
              ['Duration', `${config.durationHours}h`],
              ['Speed',    `${config.speed}×`],
            ].map(([k, v]) => (
              <div key={k} className="px-3 py-1.5 rounded-lg text-xs font-mono border"
                style={{ background: '#ffffff', borderColor: '#e2e8f0', color: '#64748b' }}>
                {k}: <span className="font-semibold" style={{ color: '#0f172a' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Patients"     value={stats.totalPatients ?? 0}                   accent={TEAL}     sub="processed through ER" />
            <KpiCard label="Avg Wait Time"      value={`${Math.round(stats.avgWaitTime ?? 0)}m`}   accent="#f97316"  sub="queue + triage time" />
            <KpiCard label="Doctor Utilization" value={`${utilPct}%`}                              accent="#22c55e"  sub={`${stats.inTreatment ?? 0} currently active`} />
            <KpiCard label="Avg Satisfaction"   value={(stats.avgSatisfaction ?? 0).toFixed(1)}    accent="#8b5cf6"  sub="out of 5.0" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Triage breakdown */}
            <div className="rounded-xl p-5 border" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
              <p className="text-xs font-mono uppercase tracking-widest mb-4 font-semibold"
                style={{ color: '#64748b' }}>
                Patients by Triage Level
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={triageData} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                  <XAxis dataKey="short" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={TT_STYLE} labelStyle={TT_LABEL_STYLE} itemStyle={TT_ITEM_STYLE}
                    cursor={{ fill: 'rgba(15,118,110,0.05)' }}
                    formatter={(v, _, props) => [v, props.payload.name]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {triageData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Wait time distribution */}
            <div className="rounded-xl p-5 border" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
              <p className="text-xs font-mono uppercase tracking-widest mb-4 font-semibold"
                style={{ color: '#64748b' }}>
                Wait Time Distribution
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={waitBuckets} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={TT_STYLE} labelStyle={TT_LABEL_STYLE} itemStyle={TT_ITEM_STYLE}
                    cursor={{ fill: 'rgba(15,118,110,0.05)' }} />
                  <Bar dataKey="count" fill={TEAL} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Outcome pie */}
            <div className="rounded-xl p-5 border" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
              <p className="text-xs font-mono uppercase tracking-widest mb-4 font-semibold"
                style={{ color: '#64748b' }}>
                Patient Outcomes
              </p>
              {outcomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={outcomeData} cx="50%" cy="45%" innerRadius={55} outerRadius={85}
                      dataKey="value" paddingAngle={3}>
                      {outcomeData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={TT_STYLE} labelStyle={TT_LABEL_STYLE} itemStyle={TT_ITEM_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-xs"
                  style={{ color: '#94a3b8' }}>
                  Waiting for discharged patients…
                </div>
              )}
            </div>
          </div>

          {/* Full event log */}
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#e2e8f0' }}>
            <div className="flex items-center justify-between px-6 py-3 border-b"
              style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <span className="text-xs font-mono uppercase tracking-widest font-semibold"
                style={{ color: TEAL }}>
                Full Event Log
              </span>
              <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
                {allEvents.length} events {allEvents.length >= 500 ? '(capped at 500)' : ''}
              </span>
            </div>
            <div className="px-6 py-2" style={{ background: '#ffffff' }}>
              {allEvents.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: '#94a3b8' }}>
                  No events yet — start a simulation
                </p>
              ) : (
                allEvents.map((ev, i) => <EventRow key={i} event={ev} />)
              )}
            </div>
          </div>

        </div>
        </div>
      )}
    </div>
  )
}
