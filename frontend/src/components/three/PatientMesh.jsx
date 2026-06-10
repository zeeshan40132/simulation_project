'use client'

import { useRef, useMemo } from 'react'
import { ZONES, waitingSlotPosition, treatmentSlotPosition } from './ERScene'
import { usePatientAnimation } from '@/hooks/usePatientAnimation'

// ─── Triage-level colours (match StatsDashboard) ──────────────────────────────
const TRIAGE_COLORS = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#3b82f6',
}

// Emissive multiplier per state — triage color itself is always the emissive hue
const STATE_EMISSIVE_INTENSITY = {
  waiting_triage:  0.55,
  in_triage:       0.9,
  waiting_doctor:  0.55,
  in_treatment:    0.9,
  discharged:      0.0,
}

// ─── Derive a deterministic world position from patient state ─────────────────
function targetPosition(patient, allPatients, numDoctors) {
  const { state, triageLevel, id } = patient

  if (state === 'waiting_triage' || state === 'waiting_doctor') {
    const waiters = allPatients.filter(
      (p) => p.state === 'waiting_triage' || p.state === 'waiting_doctor'
    )
    const idx = waiters.findIndex((p) => p.id === id)
    const slot = waitingSlotPosition(Math.max(idx, 0))
    return [slot.x, 0.7, slot.z]
  }

  if (state === 'in_triage') {
    const triagers = allPatients.filter((p) => p.state === 'in_triage')
    const idx = triagers.findIndex((p) => p.id === id)
    const side = idx % 2 === 0 ? -2 : 2
    return [ZONES.triage.x + 1.5, 0.7, side]
  }

  if (state === 'in_treatment') {
    const doctorId =
      patient.assignedDoctor !== undefined ? patient.assignedDoctor : id % numDoctors
    const slot = treatmentSlotPosition(doctorId, numDoctors)
    return [slot.x, 0.7, slot.z]
  }

  if (state === 'discharged') {
    return [ZONES.exit.x, 0.7, (id % 5) * 1.2 - 3]
  }

  // fallback: entrance
  return [ZONES.entrance.x, 0.7, 0]
}

// ─── Single patient capsule ───────────────────────────────────────────────────
function PatientCapsule({ patient, allPatients, numDoctors }) {
  const meshRef  = useRef()
  const glowRef  = useRef()

  const color   = TRIAGE_COLORS[patient.triageLevel] || '#64748b'
  const emissiveIntensity = STATE_EMISSIVE_INTENSITY[patient.state] ?? 0.5
  const target  = useMemo(
    () => targetPosition(patient, allPatients, numDoctors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patient.state, patient.id, allPatients.length, numDoctors]
  )

  usePatientAnimation(meshRef, glowRef, target, patient.state, patient.triageLevel)

  const isDischarged = patient.state === 'discharged'

  return (
    <group
      ref={meshRef}
      visible={!isDischarged}
    >
      {/* body capsule — emissive uses same triage hue so red stays red */}
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.5, 4, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>

      {/* head sphere */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity * 0.8}
          roughness={0.35}
        />
      </mesh>

      {/* triage level indicator ring */}
      <mesh ref={glowRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.04, 6, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.0}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  )
}

// ─── Render all active (non-discharged) patients ──────────────────────────────
export default function PatientMesh({ patients = [], numDoctors = 5 }) {
  const active = useMemo(
    () => patients.filter((p) => p.state !== 'discharged').slice(0, 60),
    [patients]
  )

  return (
    <>
      {active.map((patient) => (
        <PatientCapsule
          key={patient.id}
          patient={patient}
          allPatients={active}
          numDoctors={numDoctors}
        />
      ))}
    </>
  )
}
