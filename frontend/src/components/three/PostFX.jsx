'use client'

import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

/**
 * Post-processing stack for the ER scene.
 * - Bloom:               makes emissive rings, monitors, and zone lights glow
 * - Vignette:            darkens edges for cinematic depth
 * - ChromaticAberration: subtle RGB fringe adds sci-fi atmosphere
 */
export default function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={1.8}
        luminanceThreshold={0.12}
        luminanceSmoothing={0.85}
        mipmapBlur
        blendFunction={BlendFunction.ADD}
      />
      <Vignette
        offset={0.35}
        darkness={0.55}
        blendFunction={BlendFunction.NORMAL}
      />
      <ChromaticAberration
        offset={new Vector2(0.0008, 0.0008)}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
