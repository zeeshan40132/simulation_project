'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSimulationStore } from '@/store/simulationStore'

const TEAL = '#0f766e'

function Slider({ label, name, min, max, step = 1, unit = '' }) {
  const config    = useSimulationStore((s) => s.config)
  const setConfig = useSimulationStore((s) => s.setConfig)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span style={{ color: '#475569' }}>{label}</span>
        <span className="font-mono font-semibold" style={{ color: TEAL }}>
          {config[name]}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={config[name]}
        onChange={(e) => setConfig({ [name]: Number(e.target.value) })}
        className="w-full cursor-pointer"
        style={{ accentColor: TEAL, height: '6px' }}
      />
      <div className="flex justify-between text-xs" style={{ color: '#94a3b8' }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: '#f0fdfa', border: `1px solid #99f6e4` }}>
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: '#64748b' }}>
        {label}
      </span>
      <span className="text-2xl font-bold font-mono" style={{ color: accent }}>{value}</span>
    </div>
  )
}

export default function SetupPage() {
  const router = useRouter()

  const status          = useSimulationStore((s) => s.status)
  const stats           = useSimulationStore((s) => s.stats)
  const simTime         = useSimulationStore((s) => s.getFormattedSimTime())
  const startSimulation = useSimulationStore((s) => s.startSimulation)
  const resetSimulation = useSimulationStore((s) => s.resetSimulation)

  const isDone    = status === 'done'
  const isRunning = status === 'running' || status === 'paused'

  const handleLaunch = () => {
    startSimulation()
    router.push('/simulation')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f1f5f9', color: '#0f172a' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b shrink-0"
        style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: TEAL }}>
            <span className="text-white text-xs font-bold">ER</span>
          </div>
          <div>
            <span className="text-xs font-mono tracking-widest" style={{ color: TEAL }}>
              SIMULATION &amp; MODELING
            </span>
            <span className="ml-3 font-semibold text-sm" style={{ color: '#0f172a' }}>
              Hospital Emergency Department
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <Link href="/simulation"
              className="text-xs font-mono px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{ background: '#f0fdfa', color: TEAL, border: `1px solid #99f6e4` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Simulation Running →
            </Link>
          )}
          <Link href="/analytics"
            className="text-xs font-mono px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
            Analytics →
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg flex flex-col gap-5">

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>
              Configure Simulation
            </h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
              Set ER parameters, then launch to watch the live 3D simulation.
            </p>
          </div>

          {/* Config card */}
          <div className="rounded-2xl border p-6 flex flex-col gap-5"
            style={{ background: '#ffffff', borderColor: '#e2e8f0',
              boxShadow: '0 1px 8px rgba(15,118,110,0.06)' }}>
            <Slider label="Doctors on duty"  name="numDoctors"    min={1}  max={15} />
            <Slider label="Nurses on duty"   name="numNurses"     min={2}  max={20} />
            <Slider label="Arrival rate"     name="arrivalRate"   min={1}  max={20} unit="/hr" />
            <Slider label="Sim duration"     name="durationHours" min={1}  max={24} unit="h" />
            <Slider label="Speed"            name="speed"         min={1}  max={300} step={1}  unit="×" />
          </div>

          {/* Launch button */}
          <button
            onClick={handleLaunch}
            className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: TEAL,
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(15,118,110,0.3)',
            }}
          >
            ▶ &nbsp;Launch Simulation
          </button>

          {/* Last run results */}
          {isDone && (
            <div className="rounded-2xl border p-5 flex flex-col gap-4"
              style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono tracking-wider font-semibold" style={{ color: TEAL }}>
                  LAST RUN &nbsp;·&nbsp; {simTime}
                </span>
                <button onClick={resetSimulation}
                  className="text-xs hover:text-red-500 transition-colors"
                  style={{ color: '#94a3b8' }}>
                  Clear ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total Patients"     value={stats.totalPatients}                           accent={TEAL} />
                <StatCard label="Avg Wait"            value={`${Math.round(stats.avgWaitTime)} min`}        accent="#f97316" />
                <StatCard label="Doctor Utilization" value={`${Math.round(stats.doctorUtilization * 100)}%`} accent="#22c55e" />
                <StatCard label="Avg Satisfaction"   value={(stats.avgSatisfaction || 0).toFixed(1)}        accent="#8b5cf6" />
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
