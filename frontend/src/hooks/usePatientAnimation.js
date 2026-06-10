'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

const TRIAGE_DURATION = { 1: 0.5, 2: 0.65, 3: 0.8, 4: 1.0, 5: 1.2 }
const TRIAGE_EASE     = { 1: 'power3.out', 2: 'power2.out', 3: 'power2.out', 4: 'power1.out', 5: 'sine.out' }

export function usePatientAnimation(groupRef, glowRef, target, state, triageLevel) {
  const tweenRef   = useRef(null)
  const spinRef    = useRef(null)
  const mountedRef = useRef(false)   // true after first position snap

  // On first mount: snap to initial target immediately (no tween)
  // R3F does NOT set position because we removed the position prop from the group —
  // so we own the Three.js position entirely here.
  useLayoutEffect(() => {
    const mesh = groupRef.current
    if (!mesh || mountedRef.current) return
    mesh.position.set(target[0], target[1], target[2])
    mountedRef.current = true
  }) // no deps — runs after every render until mounted, then guards with mountedRef

  // Movement tween — fires when target destination changes
  useEffect(() => {
    const mesh = groupRef.current
    if (!mesh || !mountedRef.current) return

    const [x, y, z] = target

    // Skip micro-movements (position hasn't meaningfully changed)
    const dx = Math.abs(mesh.position.x - x)
    const dz = Math.abs(mesh.position.z - z)
    if (dx < 0.05 && dz < 0.05) return

    if (tweenRef.current) tweenRef.current.kill()

    const duration = TRIAGE_DURATION[triageLevel] ?? 0.8
    const ease     = TRIAGE_EASE[triageLevel]     ?? 'power2.out'

    if (state === 'discharged') {
      tweenRef.current = gsap.to(mesh.position, {
        x, z,
        duration: 0.6,
        ease: 'power1.in',
        onComplete: () => {
          gsap.to(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.3, ease: 'power2.in' })
        },
      })
    } else {
      // Arc upward mid-travel for a walking feel
      const midX = (mesh.position.x + x) / 2
      const midZ = (mesh.position.z + z) / 2
      const midY = y + 0.4
      tweenRef.current = gsap.timeline()
        .to(mesh.position, { x: midX, z: midZ, y: midY, duration: duration * 0.5, ease: 'power1.out' })
        .to(mesh.position, { x, z, y,             duration: duration * 0.5, ease: 'power1.in'  })
      gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.2 })
    }

    return () => { if (tweenRef.current) tweenRef.current.kill() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[2], state])

  // Glow ring continuous spin — start once on mount
  useEffect(() => {
    const ring = glowRef.current
    if (!ring) return
    const speed = triageLevel === 1 ? 2.5 : triageLevel === 2 ? 1.8 : 1.2
    spinRef.current = gsap.to(ring.rotation, {
      y: Math.PI * 2, duration: speed, repeat: -1, ease: 'none',
    })
    return () => { if (spinRef.current) spinRef.current.kill() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triageLevel])
}
