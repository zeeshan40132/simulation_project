'use client'

import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import * as THREE from 'three'
import CameraRig from './CameraRig'

// ─── Zone definitions ─────────────────────────────────────────────────────────
// Each zone has a world-space center used by patient placement logic
export const ZONES = {
  entrance:  { x: -14, z:  0 },
  waiting:   { x:  -7, z:  0 },
  triage:    { x:  -1, z:  0 },
  treatment: { x:   6, z:  0 },  // base; offset per doctor slot
  exit:      { x:  14, z:  0 },
}

export function treatmentSlotPosition(doctorId, numDoctors = 5) {
  const cols   = Math.ceil(Math.sqrt(numDoctors))
  const col    = doctorId % cols
  const row    = Math.floor(doctorId / cols)
  const startZ = -((cols - 1) * 2.5) / 2
  return { x: ZONES.treatment.x + row * 3.5, z: startZ + col * 2.5 }
}

export function waitingSlotPosition(index) {
  const col = index % 4
  const row = Math.floor(index / 4)
  return { x: ZONES.waiting.x + row * 1.8, z: -4.5 + col * 3 }
}

// ─── Zone label (floating text replaced with a thin labeled plane) ─────────────
function ZoneMarker({ label, position, width = 6, depth = 10, color }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* thin border */}
      <lineSegments>
        <edgesGeometry
          args={[new THREE.PlaneGeometry(width, depth)]}
        />
        <lineBasicMaterial color={color} transparent opacity={0.25} />
      </lineSegments>
    </group>
  )
}

// ─── Triage desk ──────────────────────────────────────────────────────────────
function TriageDesk({ position }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.7, 0.8]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>
      {/* monitor */}
      <mesh position={[0, 0.55, -0.2]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.05]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

// ─── Treatment room ───────────────────────────────────────────────────────────
function TreatmentBay({ position }) {
  return (
    <group position={position}>
      {/* bed */}
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1.8, 0.2, 0.9]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* pillow */}
      <mesh position={[0.6, 0.45, 0]} castShadow>
        <boxGeometry args={[0.4, 0.1, 0.7]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {/* monitor stand */}
      <mesh position={[-0.9, 0.8, 0]} castShadow>
        <boxGeometry args={[0.05, 1.0, 0.05]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[-0.9, 1.35, 0]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.05]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}

// ─── Waiting chairs ───────────────────────────────────────────────────────────
function WaitingArea() {
  const chairs = Array.from({ length: 12 }, (_, i) => {
    const pos = waitingSlotPosition(i)
    return <Chair key={i} position={[pos.x, 0, pos.z]} />
  })
  return <>{chairs}</>
}

function Chair({ position }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[0.6, 0.08, 0.6]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>
      <mesh castShadow position={[0, 0.55, -0.26]}>
        <boxGeometry args={[0.6, 0.55, 0.07]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>
      {[[-0.22, 0.11, -0.22], [0.22, 0.11, -0.22],
        [-0.22, 0.11,  0.22], [0.22, 0.11,  0.22]].map(([x, y, z], i) => (
        <mesh key={i} castShadow position={[x, y, z]}>
          <cylinderGeometry args={[0.03, 0.03, 0.22, 6]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
    </group>
  )
}

// ─── Reception desk ───────────────────────────────────────────────────────────
function Reception() {
  return (
    <group position={[-11, 0, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.2, 0.9, 3]} />
        <meshStandardMaterial color="#0f2744" />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1.4, 0.06, 3.2]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      {/* cross sign */}
      <mesh position={[0.5, 1.6, 0]} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.5, 1.6, 0]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.08]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

// ─── Main scene ───────────────────────────────────────────────────────────────
function SceneContent({ numDoctors = 5 }) {
  const treatmentBays = Array.from({ length: numDoctors }, (_, i) => {
    const pos = treatmentSlotPosition(i, numDoctors)
    return <TreatmentBay key={i} position={[pos.x, 0, pos.z]} />
  })

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#1e3a5f', '#0a1628', 0.5]} />
      <directionalLight
        position={[8, 22, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      {/* Zone accent lights */}
      <pointLight position={[-7, 6, 0]}  intensity={0.8} color="#3b82f6" />
      <spotLight
        position={[-1, 9, 0]}
        angle={0.45}
        penumbra={0.6}
        intensity={1.2}
        color="#a78bfa"
        castShadow={false}
        target-position={[-1, 0, 0]}
      />
      <spotLight
        position={[6.5, 9, 0]}
        angle={0.55}
        penumbra={0.5}
        intensity={1.0}
        color="#22c55e"
        castShadow={false}
        target-position={[6.5, 0, 0]}
      />
      <pointLight position={[14, 5, 0]} intensity={0.4} color="#0ea5e9" />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial color="#0a1628" roughness={0.8} />
      </mesh>

      {/* Grid overlay */}
      <Grid
        args={[40, 20]}
        position={[0, 0, 0]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#1e3a5f"
        sectionSize={5}
        sectionThickness={0.6}
        sectionColor="#1e40af"
        fadeDistance={35}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      {/* Zone markers */}
      <ZoneMarker label="Waiting"   position={[-7,  0.01, 0]} width={8}  depth={12} color="#3b82f6" />
      <ZoneMarker label="Triage"    position={[-1,  0.01, 0]} width={4}  depth={8}  color="#a78bfa" />
      <ZoneMarker label="Treatment" position={[6.5, 0.01, 0]} width={9}  depth={14} color="#22c55e" />

      {/* Furniture */}
      <Reception />
      <WaitingArea />
      <TriageDesk position={[-1, 0.35, -2]} />
      <TriageDesk position={[-1, 0.35,  2]} />
      {treatmentBays}

      {/* Walls — side boundaries */}
      {[[-20, 1, 0], [20, 1, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.3, 3, 22]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      ))}
      {[[0, 1, -10], [0, 1, 10]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={[40, 3, 0.3]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      ))}
    </>
  )
}

// ─── Exported canvas wrapper ──────────────────────────────────────────────────
export default function ERScene({ numDoctors = 5, cameraPreset = 'overview', children }) {
  const controlsRef = useRef()

  return (
    <Canvas
      shadows
      camera={{ position: [0, 18, 14], fov: 50 }}
      style={{ background: '#060d1a' }}
      gl={{ antialias: true, toneMapping: 4 /* ACESFilmic */ }}
    >
      <SceneContent numDoctors={numDoctors} />
      {children}
      <CameraRig preset={cameraPreset} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        target={[0, 0, 0]}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={8}
        maxDistance={40}
        enablePan={true}
        enableDamping
        dampingFactor={0.07}
      />
      <Environment preset="city" />
    </Canvas>
  )
}
