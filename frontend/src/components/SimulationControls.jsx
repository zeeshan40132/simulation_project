'use client'

import { useSimulationStore, DEFAULT_CONFIG } from '@/store/simulationStore'

function Slider({ label, name, min, max, step = 1, unit = '' }) {
  const config    = useSimulationStore((s) => s.config)
  const setConfig = useSimulationStore((s) => s.setConfig)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text)' }}>
          {config[name]}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={config[name]}
        onChange={(e) => setConfig({ [name]: Number(e.target.value) })}
        className="w-full accent-blue-500 cursor-pointer"
      />
      <div className="flex justify-between text-xs" style={{ color: 'var(--muted)', opacity: 0.5 }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function SimulationControls() {
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

  const statusColor = {
    idle:    'var(--muted)',
    running: '#22c55e',
    paused:  '#f59e0b',
    done:    '#3b82f6',
  }[status]

  return (
    <div
      className="flex flex-col gap-4 p-4 rounded-xl border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono tracking-widest uppercase"
              style={{ color: 'var(--accent)' }}>
          Simulation
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
          <span className="text-xs font-mono" style={{ color: statusColor }}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Sim clock */}
      {(isRunning || isPaused || isDone) && (
        <div className="text-center font-mono text-2xl tracking-widest"
             style={{ color: 'var(--text)' }}>
          {simTime}
        </div>
      )}

      {/* Config sliders — only editable when idle or done */}
      {(isIdle || isDone) && (
        <div className="flex flex-col gap-4">
          <Slider label="Doctors on duty"  name="numDoctors"    min={1}  max={15} />
          <Slider label="Nurses on duty"   name="numNurses"     min={2}  max={20} />
          <Slider label="Arrival rate"     name="arrivalRate"   min={1}  max={20} unit="/hr" />
          <Slider label="Sim duration"     name="durationHours" min={1}  max={24} unit="h" />
          <Slider label="Speed"            name="speed"         min={10} max={300} step={10} unit="×" />
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 mt-1">
        {isIdle && (
          <button
            onClick={start}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#22c55e', color: '#000' }}
          >
            ▶ Start
          </button>
        )}

        {isRunning && (
          <>
            <button
              onClick={pause}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#f59e0b', color: '#000' }}
            >
              ⏸ Pause
            </button>
            <button
              onClick={stop}
              className="py-2 px-4 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--border)', color: 'var(--text)' }}
            >
              ■ Stop
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={resume}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#22c55e', color: '#000' }}
            >
              ▶ Resume
            </button>
            <button
              onClick={stop}
              className="py-2 px-4 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--border)', color: 'var(--text)' }}
            >
              ■ Stop
            </button>
          </>
        )}

        {isDone && (
          <button
            onClick={reset}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#3b82f6', color: '#fff' }}
          >
            ↺ New Simulation
          </button>
        )}
      </div>
    </div>
  )
}
