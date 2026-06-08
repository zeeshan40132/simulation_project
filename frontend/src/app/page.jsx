'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useSimulationStore } from '@/store/simulationStore'
import SimulationControls from '@/components/SimulationControls'
import StatsDashboard from '@/components/StatsDashboard'
import EventLog from '@/components/EventLog'
import { CAMERA_PRESETS } from '@/components/three/CameraRig'
import ResultsModal from '@/components/ResultsModal'

// R3F must be loaded client-side only — no SSR
const ERScene    = dynamic(() => import('@/components/three/ERScene'),    { ssr: false })
const PatientMesh = dynamic(() => import('@/components/three/PatientMesh'), { ssr: false })
const DoctorMesh  = dynamic(() => import('@/components/three/DoctorMesh'),  { ssr: false })

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  idle:    'bg-slate-700 text-slate-300',
  running: 'bg-green-900 text-green-300 animate-pulse',
  paused:  'bg-yellow-900 text-yellow-300',
  done:    'bg-blue-900  text-blue-300',
}

// ─── Camera preset button strip ───────────────────────────────────────────────
const PRESET_LABELS = {
  overview:  'Overview',
  waiting:   'Waiting',
  triage:    'Triage',
  treatment: 'Treatment',
}

export default function Home() {
  const [cameraPreset, setCameraPreset] = useState('overview')

  const status   = useSimulationStore((s) => s.status)
  const simTime  = useSimulationStore((s) => s.getFormattedSimTime())
  const patients = useSimulationStore((s) => s.patients)
  const config   = useSimulationStore((s) => s.config)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#060d1a', color: '#e2e8f0' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-2 border-b shrink-0"
        style={{ borderColor: '#1e3a5f', background: '#080f1e' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tracking-widest" style={{ color: '#3b82f6' }}>
            SIMULATION &amp; MODELING
          </span>
          <span className="text-base font-bold">Hospital ER Simulation</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Sim clock */}
          <div className="text-sm font-mono" style={{ color: '#94a3b8' }}>
            <span style={{ color: '#475569' }}>SIM </span>
            <span style={{ color: '#e2e8f0' }}>{simTime}</span>
          </div>
          {/* Status badge */}
          <span className={`text-xs font-mono px-2 py-0.5 rounded uppercase tracking-wider ${STATUS_STYLES[status]}`}>
            {status}
          </span>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar — controls ─────────────────────────────────────── */}
        <aside className="w-64 shrink-0 flex flex-col overflow-y-auto border-r p-4 gap-4"
          style={{ borderColor: '#1e3a5f', background: '#080f1e' }}>
          <SimulationControls />
        </aside>

        {/* ── Centre — 3D canvas ──────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-hidden">
          <ERScene numDoctors={config.numDoctors} cameraPreset={cameraPreset}>
            <PatientMesh patients={patients} numDoctors={config.numDoctors} />
            <DoctorMesh  patients={patients} numDoctors={config.numDoctors} />
          </ERScene>

          {/* Camera preset buttons — bottom overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {Object.keys(CAMERA_PRESETS).map((key) => (
              <button
                key={key}
                onClick={() => setCameraPreset(key)}
                className="px-3 py-1 text-xs font-mono rounded transition-colors"
                style={{
                  background: cameraPreset === key ? '#1d4ed8' : 'rgba(8,15,30,0.85)',
                  color:      cameraPreset === key ? '#e2e8f0' : '#64748b',
                  border:     `1px solid ${cameraPreset === key ? '#3b82f6' : '#1e3a5f'}`,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {PRESET_LABELS[key]}
              </button>
            ))}
          </div>

          {/* Results modal */}
          <ResultsModal />

          {/* Idle overlay hint */}
          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs font-mono tracking-widest" style={{ color: '#1e3a5f' }}>
                CONFIGURE &amp; START SIMULATION
              </p>
            </div>
          )}
        </main>

        {/* ── Right sidebar — stats + log ─────────────────────────────────── */}
        <aside className="w-72 shrink-0 flex flex-col overflow-y-auto border-l p-4 gap-4"
          style={{ borderColor: '#1e3a5f', background: '#080f1e' }}>
          <StatsDashboard />
          <EventLog />
        </aside>

      </div>
    </div>
  )
}
