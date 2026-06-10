'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSimulationStore } from '@/store/simulationStore'
import SimulationControls from '@/components/SimulationControls'
import StatsDashboard from '@/components/StatsDashboard'
import EventLog from '@/components/EventLog'
import { CAMERA_PRESETS } from '@/components/three/CameraRig'
import ResultsModal from '@/components/ResultsModal'

const ERScene     = dynamic(() => import('@/components/three/ERScene'),     { ssr: false })
const PatientMesh = dynamic(() => import('@/components/three/PatientMesh'), { ssr: false })
const DoctorMesh  = dynamic(() => import('@/components/three/DoctorMesh'),  { ssr: false })

const TEAL = '#0f766e'

const STATUS_STYLES = {
  idle:    { background: '#f1f5f9', color: '#64748b' },
  running: { background: '#f0fdfa', color: TEAL },
  paused:  { background: '#fffbeb', color: '#d97706' },
  done:    { background: '#eff6ff', color: '#2563eb' },
}

const PRESET_LABELS = {
  overview:  'Overview',
  waiting:   'Waiting',
  triage:    'Triage',
  treatment: 'Treatment',
}

export default function SimulationPage() {
  const [cameraPreset, setCameraPreset] = useState('overview')
  const router = useRouter()

  const status   = useSimulationStore((s) => s.status)
  const simTime  = useSimulationStore((s) => s.getFormattedSimTime())
  const patients = useSimulationStore((s) => s.patients)
  const config   = useSimulationStore((s) => s.config)

  // Redirect to setup if no simulation is active
  useEffect(() => {
    if (status === 'idle') {
      router.replace('/')
    }
  }, [status, router])

  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.idle

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#f1f5f9', color: '#0f172a' }}>

      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-2 border-b shrink-0"
        style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
        <div className="flex items-center gap-3">
          <Link href="/"
            className="text-xs font-mono px-2.5 py-1.5 rounded-lg transition-colors hover:bg-slate-100"
            style={{ color: '#64748b', border: '1px solid #e2e8f0' }}>
            ← Setup
          </Link>
          <div className="w-px h-4" style={{ background: '#e2e8f0' }} />
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: TEAL }}>
            <span className="text-white text-xs font-bold">ER</span>
          </div>
          <span className="font-semibold text-sm" style={{ color: '#0f172a' }}>
            Emergency Department Simulation
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm font-mono" style={{ color: '#64748b' }}>
            <span>SIM &nbsp;</span>
            <span className="font-semibold" style={{ color: '#0f172a' }}>{simTime}</span>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg uppercase tracking-wider font-medium"
            style={statusStyle}>
            {status}
          </span>
          <Link href="/analytics"
            className="text-xs font-mono px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-100"
            style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
            Analytics →
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar — controls */}
        <aside className="w-64 shrink-0 flex flex-col overflow-y-auto border-r p-4 gap-4"
          style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
          <SimulationControls />
        </aside>

        {/* Centre — 3D canvas (stays dark — it's a 3D viewport) */}
        <main className="flex-1 relative overflow-hidden">
          <ERScene numDoctors={config.numDoctors} cameraPreset={cameraPreset}>
            <PatientMesh patients={patients} numDoctors={config.numDoctors} />
            <DoctorMesh  patients={patients} numDoctors={config.numDoctors} />
          </ERScene>

          {/* Camera preset buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {Object.keys(CAMERA_PRESETS).map((key) => (
              <button
                key={key}
                onClick={() => setCameraPreset(key)}
                className="px-3 py-1.5 text-xs font-mono rounded-lg transition-all"
                style={{
                  background: cameraPreset === key ? TEAL : 'rgba(255,255,255,0.12)',
                  color:      cameraPreset === key ? '#ffffff' : '#94a3b8',
                  border:     `1px solid ${cameraPreset === key ? TEAL : 'rgba(255,255,255,0.15)'}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {PRESET_LABELS[key]}
              </button>
            ))}
          </div>

          <ResultsModal />
        </main>

        {/* Right sidebar — live stats + event log */}
        <aside className="w-72 shrink-0 flex flex-col overflow-y-auto border-l p-4 gap-4"
          style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
          <StatsDashboard />
          <EventLog />
        </aside>

      </div>
    </div>
  )
}
