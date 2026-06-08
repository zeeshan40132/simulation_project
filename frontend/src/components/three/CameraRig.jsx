'use client'

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'

export const CAMERA_PRESETS = {
  overview:  { pos: [0,   18, 14], target: [0,   0, 0] },
  waiting:   { pos: [-7,   9, 11], target: [-7,  0, 0] },
  triage:    { pos: [-1,   7,  9], target: [-1,  0, 0] },
  treatment: { pos: [6.5,  9, 11], target: [6.5, 0, 0] },
}

/**
 * Drop inside <Canvas>. When `preset` changes, GSAP-animates the camera
 * to the named preset position and updates OrbitControls target.
 *
 * @param {string}  preset        - key of CAMERA_PRESETS
 * @param {object}  controlsRef   - ref forwarded from OrbitControls
 */
export default function CameraRig({ preset = 'overview', controlsRef }) {
  const { camera } = useThree()
  const tweenRef   = useRef(null)

  useEffect(() => {
    const cfg = CAMERA_PRESETS[preset] ?? CAMERA_PRESETS.overview
    if (tweenRef.current) tweenRef.current.kill()

    // Animate camera position
    tweenRef.current = gsap.to(camera.position, {
      x: cfg.pos[0],
      y: cfg.pos[1],
      z: cfg.pos[2],
      duration: 1.4,
      ease: 'power3.inOut',
      onUpdate: () => {
        // Keep OrbitControls in sync if available
        if (controlsRef?.current) {
          controlsRef.current.target.set(...cfg.target)
          controlsRef.current.update()
        } else {
          camera.lookAt(...cfg.target)
        }
      },
    })

    return () => { if (tweenRef.current) tweenRef.current.kill() }
  }, [preset]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
