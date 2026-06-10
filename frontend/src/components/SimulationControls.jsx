'use client'

import { useRouter } from 'next/navigation'
import { useSimulationStore, DEFAULT_CONFIG } from '@/store/simulationStore'

const TEAL = '#0f766e'

function Slider({ label, name, min, max, step = 1, unit = '' }) {
  const config    = useSimulationStore((s) => s.config)
  const setConfig = useSimulationStore((s) => s.setConfig)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: '#64748b' }}>{label}</span>
        <span className="font-mono font-semibold" style={{ color: TEAL }}>
          {config[name]}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={config[name]}
        onChange={(e) => setConfig({ [name]: Number(e.target.value) })}
        className="w-full cursor-pointer"
        style={{ accentColor: TEAL }}
      />
      <div className="flex justify-between text-xs" style={{ color: '#94a3b8' }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function SimulationControls() {
  const router          = useRouter()
  const status          = useSimulationStore((s) => s.status)
  const simTime         = useSimulationStore((s) => s.getFormattedSimTime())
  const start           = useSimulationStore((s) => s.startSimulation)
  const pause           = useSimulationStore((s) => s.pauseSimulation)
  const resume          = useSimulationStore((s) => s.resumeSimulation)
  const stop            = useSimulationStore((s) => s.stopSimulation)
  const reset           = useSimulationStore((s) => s.resetSimulation)

  const isIdle    = status === 'idle'
  const isRunning = status === 'running'
  const isPaused  = status === 'paused'
  const isDone    = status === 'done'

  const statusDot = {
    idle:    '#94a3b8',
    running: '#22c55e',
    paused:  '#f59e0b',
    done:    TEAL,
  }[status]

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border"
      style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono tracking-widest uppercase font-semibold"
              style={{ color: TEAL }}>
          Controls
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: statusDot }} />
          <span className="text-xs font-mono" style={{ color: '#64748b' }}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Sim clock */}
      {(isRunning || isPaused || isDone) && (
        <div className="text-center font-mono text-2xl font-bold tracking-widest"
             style={{ color: '#0f172a' }}>
          {simTime}
        </div>
      )}

      {/* Config sliders */}
      {(isIdle || isDone) && (
        <div className="flex flex-col gap-3">
          <Slider label="Doctors on duty"  name="numDoctors"    min={1}  max={15} />
          <Slider label="Nurses on duty"   name="numNurses"     min={2}  max={20} />
          <Slider label="Arrival rate"     name="arrivalRate"   min={1}  max={20} unit="/hr" />
          <Slider label="Sim duration"     name="durationHours" min={1}  max={24} unit="h" />
          <Slider label="Speed"            name="speed"         min={1}  max={300} step={1}  unit="×" />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-1">
        {isIdle && (
          <button
            onClick={start}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: TEAL, color: '#ffffff' }}
          >
            ▶ Start
          </button>
        )}

        {isRunning && (
          <>
            <button
              onClick={pause}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
            >
              ⏸ Pause
            </button>
            <button
              onClick={stop}
              className="py-2 px-4 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
            >
              ■ Stop
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={resume}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: TEAL, color: '#ffffff' }}
            >
              ▶ Resume
            </button>
            <button
              onClick={stop}
              className="py-2 px-4 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
            >
              ■ Stop
            </button>
          </>
        )}

        {isDone && (
          <button
            onClick={() => { reset(); router.push('/') }}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: TEAL, color: '#ffffff' }}
          >
            ↺ New Simulation
          </button>
        )}
      </div>
    </div>
  )
}
