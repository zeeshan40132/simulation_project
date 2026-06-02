'use client'

export default function Home() {
  return (
    <main className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="text-xs font-mono tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
          SIMULATION &amp; MODELING PROJECT
        </div>
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          Hospital ER Simulation
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          3D Emergency Room Discrete-Event Simulation
        </p>
      </div>
    </main>
  )
}
