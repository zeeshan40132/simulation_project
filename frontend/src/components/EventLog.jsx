'use client'

import { useEffect, useRef } from 'react'
import { useSimulationStore } from '@/store/simulationStore'

const TEAL = '#0f766e'

const TRIAGE_COLOR = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#3b82f6', 5: TEAL }
const TRIAGE_LABEL = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5' }

function formatSimTime(minutes) {
  const h   = Math.floor(minutes / 60)
  const min = Math.floor(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function EventRow({ event }) {
  let icon, label, accent

  switch (event.kind) {
    case 'ARRIVAL':
      icon   = '→'
      label  = `Patient #${event.patientId} arrived`
      accent = TRIAGE_COLOR[event.triageLevel] ?? '#94a3b8'
      break
    case 'TRIAGE_DONE':
      icon   = '✓'
      label  = `Patient #${event.patientId} triage complete`
      accent = '#8b5cf6'
      break
    case 'DOCTOR_ASSIGNED':
      icon   = '+'
      label  = `Patient #${event.patientId} → Dr. ${event.doctorId + 1}`
      accent = TEAL
      break
    case 'DISCHARGE':
      icon   = event.outcome === 'admitted' ? '⬆' : '✓'
      label  = `Patient #${event.patientId} ${event.outcome}`
      accent = event.outcome === 'admitted' ? '#f97316' : '#22c55e'
      break
    default:
      return null
  }

  return (
    <div className="flex items-center gap-2 py-1.5 border-b last:border-0"
         style={{ borderColor: '#f1f5f9' }}>
      <span className="text-xs font-mono w-10 shrink-0" style={{ color: '#94a3b8' }}>
        {formatSimTime(event.time)}
      </span>
      <span className="w-4 text-center text-xs shrink-0 font-bold" style={{ color: accent }}>
        {icon}
      </span>
      {event.triageLevel && (
        <span className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0 font-semibold"
              style={{ background: `${TRIAGE_COLOR[event.triageLevel]}18`,
                       color: TRIAGE_COLOR[event.triageLevel] }}>
          {TRIAGE_LABEL[event.triageLevel]}
        </span>
      )}
      <span className="text-xs truncate" style={{ color: '#475569' }}>{label}</span>
    </div>
  )
}

export default function EventLog() {
  const events  = useSimulationStore((s) => s.recentEvents)
  const status  = useSimulationStore((s) => s.status)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [events.length])

  return (
    <div className="flex flex-col rounded-xl border overflow-hidden"
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
           style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
        <span className="text-xs font-mono tracking-widest uppercase font-semibold"
              style={{ color: TEAL }}>
          Event Log
        </span>
        <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
          {events.length} events
        </span>
      </div>

      {/* Event list */}
      <div ref={listRef} className="overflow-y-auto px-3"
        style={{ height: 240, scrollbarWidth: 'thin' }}>
        {status === 'idle' ? (
          <p className="text-xs text-center py-8" style={{ color: '#94a3b8' }}>
            Events will appear here during simulation
          </p>
        ) : events.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: '#94a3b8' }}>
            Waiting for first event…
          </p>
        ) : (
          events.map((ev, i) => <EventRow key={i} event={ev} />)
        )}
      </div>
    </div>
  )
}
