'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'

// ─── Triage level colours ─────────────────────────────────────────────────────
const TRIAGE_COLORS = {
  1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#3b82f6',
}
const TRIAGE_LABELS = {
  1: 'Critical', 2: 'Emergent', 3: 'Urgent', 4: 'Semi-urgent', 5: 'Non-urgent',
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = '#3b82f6' }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: '#0d1f38', border: '1px solid #1e3a5f' }}>
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#475569' }}>
        {label}
      </span>
      <span className="text-2xl font-bold" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: '#64748b' }}>{sub}</span>}
    </div>
  )
}

// ─── Triage row ───────────────────────────────────────────────────────────────
function TriageRow({ level, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono w-4" style={{ color: TRIAGE_COLORS[level] }}>
        T{level}
      </span>
      <span className="text-xs w-24 truncate" style={{ color: '#94a3b8' }}>
        {TRIAGE_LABELS[level]}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e3a5f' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: TRIAGE_COLORS[level] }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: 0.05 * level, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color: '#64748b' }}>
        {count}
      </span>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function ResultsModal() {
  const status  = useSimulationStore((s) => s.status)
  const stats   = useSimulationStore((s) => s.stats)
  const patients = useSimulationStore((s) => s.patients)
  const simTime = useSimulationStore((s) => s.getFormattedSimTime())
  const resetSimulation = useSimulationStore((s) => s.resetSimulation)

  // Count patients per triage level
  const triageCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    patients.forEach((p) => {
      if (p.triageLevel && counts[p.triageLevel] !== undefined) {
        counts[p.triageLevel]++
      }
    })
    return counts
  }, [patients])

  const handleDownload = () => {
    const report = {
      simulationTime: simTime,
      stats,
      triageBreakdown: triageCounts,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `er-simulation-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AnimatePresence>
      {status === 'done' && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 z-20"
            style={{ background: 'rgba(6,13,26,0.75)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="absolute z-30 left-1/2 top-1/2 w-[540px] rounded-xl overflow-hidden"
            style={{
              border: '1px solid #1e3a5f',
              background: '#080f1e',
              boxShadow: '0 0 60px rgba(59,130,246,0.15)',
            }}
            initial={{ opacity: 0, y: 32, x: '-50%', translateY: '-50%' }}
            animate={{ opacity: 1, y: 0,  x: '-50%', translateY: '-50%' }}
            exit={{   opacity: 0, y: 16, x: '-50%', translateY: '-50%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#1e3a5f' }}>
              <div className="text-xs font-mono tracking-widest mb-1" style={{ color: '#3b82f6' }}>
                SIMULATION COMPLETE
              </div>
              <h2 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>
                Final Results
              </h2>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>
                Simulated time: <span style={{ color: '#94a3b8' }}>{simTime}</span>
              </p>
            </div>

            {/* KPI grid */}
            <div className="px-6 py-4 grid grid-cols-2 gap-3">
              <StatCard
                label="Total Patients"
                value={stats.totalPatients}
                sub="processed through ER"
                accent="#3b82f6"
              />
              <StatCard
                label="Avg Wait Time"
                value={`${Math.round(stats.avgWaitTime)} min`}
                sub="triage + doctor queue"
                accent="#f97316"
              />
              <StatCard
                label="Doctor Utilization"
                value={`${Math.round(stats.doctorUtilization * 100)}%`}
                sub="active treatment time"
                accent="#22c55e"
              />
              <StatCard
                label="Avg Satisfaction"
                value={(stats.avgSatisfaction || 0).toFixed(1)}
                sub="out of 10"
                accent="#a78bfa"
              />
            </div>

            {/* Triage breakdown */}
            <div className="px-6 pb-4">
              <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
                Triage Breakdown
              </p>
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <TriageRow
                    key={lvl}
                    level={lvl}
                    count={triageCounts[lvl]}
                    total={stats.totalPatients}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={resetSimulation}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#1d4ed8', color: '#e2e8f0' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1d4ed8')}
              >
                New Simulation
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#0d1f38', color: '#94a3b8', border: '1px solid #1e3a5f' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                Export JSON
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
