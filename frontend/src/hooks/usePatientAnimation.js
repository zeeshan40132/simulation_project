'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Duration and ease vary by triage urgency — critical patients move faster
const TRIAGE_DURATION = { 1: 0.5, 2: 0.65, 3: 0.8, 4: 1.0, 5: 1.2 }
const TRIAGE_EASE     = { 1: 'power3.out', 2: 'power2.out', 3: 'power2.out', 4: 'power1.out', 5: 'sine.out' }

/**
 * Drives a Three.js group ref to `target` via GSAP whenever target changes.
 * Also spins the glow ring ref continuously.
 *
 * @param {React.RefObject} groupRef   - ref attached to the patient group
 * @param {React.RefObject} glowRef    - ref attached to the torus ring
 * @param {[number,number,number]} target - [x, y, z] world destination
 * @param {string} state               - patient simulation state
 * @param {number} triageLevel         - 1–5
 */
export function usePatientAnimation(groupRef, glowRef, target, state, triageLevel) {
  const tweenRef    = useRef(null)
  const spinRef     = useRef(null)
  const prevTarget  = useRef(null)

  // Movement tween — fires whenever target changes
  useEffect(() => {
    const mesh = groupRef.current
    if (!mesh) return

    const [x, , z] = target
    const prev = prevTarget.current

    // Skip if position hasn't meaningfully changed
    if (prev && Math.abs(prev[0] - x) < 0.01 && Math.abs(prev[2] - z) < 0.01) return
    prevTarget.current = target

    const duration = TRIAGE_DURATION[triageLevel] ?? 0.8
    const ease     = TRIAGE_EASE[triageLevel]    ?? 'power2.out'

    // Kill any in-flight tween on this mesh
    if (tweenRef.current) tweenRef.current.kill()

    if (state === 'DISCHARGED') {
      // Slide out and fade: scale down + move to exit
      tweenRef.current = gsap.to(mesh.position, {
        x, z,
        duration: 0.6,
        ease: 'power1.in',
        onComplete: () => {
          gsap.to(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.3, ease: 'power2.in' })
        },
      })
    } else {
      // Arc upward slightly mid-travel for a walking feel
      const midY = mesh.position.y + 0.4
      tweenRef.current = gsap.timeline()
        .to(mesh.position, { x: (mesh.position.x + x) / 2, z: (mesh.position.z + z) / 2, y: midY, duration: duration / 2, ease: 'power1.out' })
        .to(mesh.position, { x, z, y: target[1], duration: duration / 2, ease: 'power1.in' })
      // Restore scale in case this patient was previously discharged
      gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.2 })
    }

    return () => {
      if (tweenRef.current) tweenRef.current.kill()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[2], state])

  // Continuous glow ring spin — start once on mount
  useEffect(() => {
    const ring = glowRef.current
    if (!ring) return

    const speed = triageLevel === 1 ? 2.5 : triageLevel === 2 ? 1.8 : 1.2
    spinRef.current = gsap.to(ring.rotation, {
      y: Math.PI * 2,
      duration: speed,
      repeat: -1,
      ease: 'none',
    })

    return () => {
      if (spinRef.current) spinRef.current.kill()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triageLevel])
}
