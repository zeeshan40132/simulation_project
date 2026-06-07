'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { ZONES, waitingSlotPosition, treatmentSlotPosition } from './ERScene'

// ─── Triage-level colours (match StatsDashboard) ──────────────────────────────
const TRIAGE_COLORS = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#3b82f6',
}

const STATE_EMISSIVE = {
  WAITING_TRIAGE:  '#1e40af',
  IN_TRIAGE:       '#7c3aed',
  WAITING_DOCTOR:  '#1e40af',
  IN_TREATMENT:    '#15803d',
  DISCHARGED:      '#374151',
}

// ─── Derive a deterministic world position from patient state ─────────────────
function targetPosition(patient, allPatients, numDoctors) {
  const { state, triageLevel, id } = patient

  if (state === 'WAITING_TRIAGE' || state === 'WAITING_DOCTOR') {
    // rank among currently waiting patients to assign a seat index
    const waiters = allPatients.filter(
      (p) => p.state === 'WAITING_TRIAGE' || p.state === 'WAITING_DOCTOR'
    )
    const idx = waiters.findIndex((p) => p.id === id)
    const slot = waitingSlotPosition(Math.max(idx, 0))
    return [slot.x, 0.7, slot.z]
  }

  if (state === 'IN_TRIAGE') {
    const triagers = allPatients.filter((p) => p.state === 'IN_TRIAGE')
    const idx = triagers.findIndex((p) => p.id === id)
    const side = idx % 2 === 0 ? -2 : 2
    return [ZONES.triage.x + 1.5, 0.7, side]
  }

  if (state === 'IN_TREATMENT') {
    // use doctorId if available, else spread by patient id
    const doctorId =
      patient.doctorId !== undefined ? patient.doctorId : id % numDoctors
    const slot = treatmentSlotPosition(doctorId, numDoctors)
    return [slot.x, 0.7, slot.z]
  }

  if (state === 'DISCHARGED') {
    // drift toward exit
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
  const emissive = STATE_EMISSIVE[patient.state] || '#111827'
  const target  = useMemo(
    () => targetPosition(patient, allPatients, numDoctors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patient.state, patient.id, allPatients.length, numDoctors]
  )

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const speed = 4
    meshRef.current.position.x +=
      (target[0] - meshRef.current.position.x) * Math.min(speed * delta, 1)
    meshRef.current.position.z +=
      (target[2] - meshRef.current.position.z) * Math.min(speed * delta, 1)

    // bob the glow ring
    if (glowRef.current) {
      glowRef.current.rotation.y += delta * 1.5
    }
  })

  const isDischarged = patient.state === 'DISCHARGED'

  return (
    <group
      ref={meshRef}
      position={target}
      visible={!isDischarged}
    >
      {/* body capsule */}
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.5, 4, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.5}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* head sphere */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.4}
          roughness={0.4}
        />
      </mesh>

      {/* triage level indicator ring */}
      <mesh ref={glowRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.04, 6, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  )
}

// ─── Render all active (non-discharged) patients ──────────────────────────────
export default function PatientMesh({ patients = [], numDoctors = 5 }) {
  const active = useMemo(
    () => patients.filter((p) => p.state !== 'DISCHARGED').slice(0, 60),
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
