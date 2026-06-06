'use client'

import { useEffect, useRef } from 'react'
import { useSimulationStore } from '@/store/simulationStore'

const TRIAGE_COLOR = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#3b82f6',
}

const TRIAGE_LABEL = {
  1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5',
}

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
      accent = '#a78bfa'
      break
    case 'DOCTOR_ASSIGNED':
      icon   = '+'
      label  = `Patient #${event.patientId} → Dr. ${event.doctorId + 1}`
      accent = '#38bdf8'
      break
    case 'DISCHARGE':
      icon   = event.outcome === 'admitted' ? '⬆' : '✗'
      label  = `Patient #${event.patientId} ${event.outcome}`
      accent = event.outcome === 'admitted' ? '#f97316' : '#22c55e'
      break
    default:
      return null
  }

  return (
    <div className="flex items-center gap-2 py-1 border-b"
         style={{ borderColor: 'var(--border)', opacity: 0.9 }}>
      <span className="text-xs font-mono w-10 shrink-0"
            style={{ color: 'var(--muted)' }}>
        {formatSimTime(event.time)}
      </span>
      <span className="w-4 text-center text-xs shrink-0 font-bold"
            style={{ color: accent }}>
        {icon}
      </span>
      {event.triageLevel && (
        <span className="text-xs font-mono px-1 rounded shrink-0"
              style={{ background: `${TRIAGE_COLOR[event.triageLevel]}22`,
                       color: TRIAGE_COLOR[event.triageLevel] }}>
          {TRIAGE_LABEL[event.triageLevel]}
        </span>
      )}
      <span className="text-xs truncate" style={{ color: 'var(--text)' }}>
        {label}
      </span>
    </div>
  )
}

export default function EventLog() {
  const events = useSimulationStore((s) => s.recentEvents)
  const status = useSimulationStore((s) => s.status)
  const listRef = useRef(null)

  // Auto-scroll to top (newest events are prepended)
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [events.length])

  return (
    <div
      className="flex flex-col rounded-xl border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b"
           style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-mono tracking-widest uppercase"
              style={{ color: 'var(--accent)' }}>
          Event Log
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
          {events.length} events
        </span>
      </div>

      {/* Event list */}
      <div
        ref={listRef}
        className="overflow-y-auto px-3"
        style={{ height: 240, scrollbarWidth: 'thin' }}
      >
        {status === 'idle' ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--muted)' }}>
            Events will appear here during simulation
          </p>
        ) : events.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--muted)' }}>
            Waiting for first event…
          </p>
        ) : (
          events.map((ev, i) => <EventRow key={i} event={ev} />)
        )}
      </div>
    </div>
  )
}
