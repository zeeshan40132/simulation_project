'use client'

import { useRef, useMemo, useEffect } from 'react'
import gsap from 'gsap'
import { treatmentSlotPosition, ZONES } from './ERScene'

// ─── Doctor colours ───────────────────────────────────────────────────────────
const COAT_COLOR    = '#f1f5f9'   // white coat
const SCRUB_COLOR   = '#2563eb'   // blue scrubs
const BUSY_EMISSIVE = '#22c55e'   // bright green glow when treating
const IDLE_EMISSIVE = '#1e3a5f'   // dim blue when idle

// Idle doctors line up near the central nurses' station
function idlePosition(doctorIndex) {
  return [ZONES.triage.x + 3, 0.7, -3 + doctorIndex * 1.8]
}

// Busy: stand beside the treatment bed (offset in x so they don't overlap)
function busyPosition(doctorId, numDoctors) {
  const slot = treatmentSlotPosition(doctorId, numDoctors)
  return [slot.x - 1.2, 0.7, slot.z]
}

// ─── Single doctor figure ─────────────────────────────────────────────────────
function DoctorFigure({ target, isBusy }) {
  const groupRef = useRef()
  const prevTarget = useRef(null)
  const tweenRef   = useRef(null)

  useEffect(() => {
    const mesh = groupRef.current
    if (!mesh) return

    const [x, , z] = target
    const prev = prevTarget.current
    if (prev && Math.abs(prev[0] - x) < 0.01 && Math.abs(prev[2] - z) < 0.01) return
    prevTarget.current = target

    if (tweenRef.current) tweenRef.current.kill()

    // Arc walk — same pattern as patients but doctors move faster (0.45 s)
    tweenRef.current = gsap.timeline()
      .to(mesh.position, {
        x: (mesh.position.x + x) / 2,
        z: (mesh.position.z + z) / 2,
        y: mesh.position.y + 0.3,
        duration: 0.22,
        ease: 'power1.out',
      })
      .to(mesh.position, {
        x, z, y: target[1],
        duration: 0.23,
        ease: 'power1.in',
      })

    return () => { if (tweenRef.current) tweenRef.current.kill() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[2]])

  const emissive = isBusy ? BUSY_EMISSIVE : IDLE_EMISSIVE
  const emissiveIntensity = isBusy ? 0.6 : 0.2

  return (
    <group ref={groupRef} position={target}>
      {/* torso — white coat */}
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.22, 0.55, 4, 8]} />
        <meshStandardMaterial
          color={COAT_COLOR}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.5}
          metalness={0.05}
        />
      </mesh>

      {/* head */}
      <mesh castShadow position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} />
      </mesh>

      {/* scrub stripe */}
      <mesh position={[0, -0.1, 0.21]}>
        <boxGeometry args={[0.3, 0.5, 0.02]} />
        <meshStandardMaterial color={SCRUB_COLOR} emissive={emissive} emissiveIntensity={emissiveIntensity * 0.5} />
      </mesh>

      {/* stethoscope — small torus around neck */}
      <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2.5, 0, 0]}>
        <torusGeometry args={[0.15, 0.025, 6, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* busy indicator — glowing ring above head */}
      {isBusy && (
        <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.04, 6, 20]} />
          <meshStandardMaterial
            color="#4ade80"
            emissive="#4ade80"
            emissiveIntensity={2.5}
            transparent
            opacity={0.95}
          />
        </mesh>
      )}
    </group>
  )
}

// ─── Derive per-doctor busy state from patient data ───────────────────────────
function buildDoctorStates(patients, numDoctors) {
  const busyMap = {}  // doctorId → true

  patients.forEach((p) => {
    if (p.state === 'in_treatment' && p.assignedDoctor !== undefined) {
      busyMap[p.assignedDoctor] = true
    }
  })

  return Array.from({ length: numDoctors }, (_, i) => ({
    id:     i,
    isBusy: Boolean(busyMap[i]),
  }))
}

// ─── Exported component ───────────────────────────────────────────────────────
export default function DoctorMesh({ patients = [], numDoctors = 5 }) {
  const doctors = useMemo(
    () => buildDoctorStates(patients, numDoctors),
    [patients, numDoctors]
  )

  // Count idle doctors to assign stable idle-slot indices
  let idleCount = 0

  return (
    <>
      {doctors.map((doc) => {
        const target = doc.isBusy
          ? busyPosition(doc.id, numDoctors)
          : idlePosition(idleCount++)

        return (
          <DoctorFigure
            key={doc.id}
            target={target}
            isBusy={doc.isBusy}
          />
        )
      })}
    </>
  )
}
