'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'

const TEAL = '#0f766e'

const TRIAGE_COLORS = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#3b82f6', 5: TEAL }
const TRIAGE_LABELS = {
  1: 'Critical', 2: 'Emergent', 3: 'Urgent', 4: 'Less Urgent', 5: 'Non-Urgent',
}

function StatCard({ label, value, sub, accent = TEAL }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1 border"
      style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#64748b' }}>
        {label}
      </span>
      <span className="text-2xl font-bold font-mono" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: '#94a3b8' }}>{sub}</span>}
    </div>
  )
}

function TriageRow({ level, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono w-4 font-bold" style={{ color: TRIAGE_COLORS[level] }}>
        T{level}
      </span>
      <span className="text-xs w-24 truncate" style={{ color: '#64748b' }}>
        {TRIAGE_LABELS[level]}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: TRIAGE_COLORS[level] }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: 0.05 * level, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color: '#94a3b8' }}>
        {count}
      </span>
    </div>
  )
}

export default function ResultsModal() {
  const router  = useRouter()
  const status  = useSimulationStore((s) => s.status)
  const stats   = useSimulationStore((s) => s.stats)
  const patients = useSimulationStore((s) => s.patients)
  const simTime = useSimulationStore((s) => s.getFormattedSimTime())
  const resetSimulation = useSimulationStore((s) => s.resetSimulation)

  const triageCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    patients.forEach((p) => {
      if (p.triageLevel && counts[p.triageLevel] !== undefined) counts[p.triageLevel]++
    })
    return counts
  }, [patients])

  const handleDownload = () => {
    const report = {
      simulationTime: simTime, stats, triageBreakdown: triageCounts,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `er-simulation-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleNewSimulation = () => {
    resetSimulation()
    router.push('/')
  }

  return (
    <AnimatePresence>
      {status === 'done' && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 z-20"
            style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="absolute z-30 left-1/2 top-1/2 w-[520px] rounded-2xl overflow-hidden"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            initial={{ opacity: 0, y: 32, x: '-50%', translateY: '-50%' }}
            animate={{ opacity: 1, y: 0,  x: '-50%', translateY: '-50%' }}
            exit={{   opacity: 0, y: 16, x: '-50%', translateY: '-50%' }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: TEAL }}>
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-xs font-mono tracking-widest font-semibold" style={{ color: TEAL }}>
                  SIMULATION COMPLETE
                </span>
              </div>
              <h2 className="text-xl font-bold" style={{ color: '#0f172a' }}>Final Results</h2>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                Simulated time: <span style={{ color: '#0f172a', fontWeight: 600 }}>{simTime}</span>
              </p>
            </div>

            {/* KPI grid */}
            <div className="px-6 py-4 grid grid-cols-2 gap-3">
              <StatCard label="Total Patients"     value={stats.totalPatients}                            accent={TEAL} sub="processed through ER" />
              <StatCard label="Avg Wait Time"      value={`${Math.round(stats.avgWaitTime)} min`}          accent="#f97316" sub="triage + doctor queue" />
              <StatCard label="Doctor Utilization" value={`${Math.round(stats.doctorUtilization * 100)}%`} accent="#22c55e" sub="active treatment time" />
              <StatCard label="Avg Satisfaction"   value={(stats.avgSatisfaction || 0).toFixed(1)}         accent="#8b5cf6" sub="out of 10" />
            </div>

            {/* Triage breakdown */}
            <div className="px-6 pb-4">
              <p className="text-xs font-mono uppercase tracking-wider mb-3 font-semibold"
                style={{ color: '#64748b' }}>
                Triage Breakdown
              </p>
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <TriageRow key={lvl} level={lvl} count={triageCounts[lvl]}
                    total={stats.totalPatients} />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleNewSimulation}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85"
                style={{ background: TEAL, color: '#ffffff' }}
              >
                New Simulation
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-slate-100"
                style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
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
