import { create } from 'zustand'
import {
  createSimulationRun,
  completeSimulationRun,
  savePatientsLog,
} from '@/lib/db'
import { enrichPatients } from '@/lib/inference'

// Default simulation config
export const DEFAULT_CONFIG = {
  numDoctors:    5,
  numNurses:     8,
  arrivalRate:   4,     // patients per hour
  durationHours: 8,
  speed:         60,    // sim minutes per real second
}

const EMPTY_STATS = {
  totalPatients:    0,
  inQueue:          0,
  inTreatment:      0,
  discharged:       0,
  avgWaitTime:      0,
  avgSatisfaction:  0,
  doctorUtilization: 0,
}

export const useSimulationStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  status:   'idle',          // 'idle' | 'running' | 'paused' | 'done'
  mlStatus: 'idle',          // 'idle' | 'loading' | 'done' | 'error'
  mlError:  null,
  config:   { ...DEFAULT_CONFIG },
  simTime:  0,               // current simulation clock (minutes)
  patients: [],              // array of patient objects (latest snapshot)
  stats:    { ...EMPTY_STATS },
  recentEvents: [],          // last 50 events for the sidebar event log
  allEvents:    [],          // full event history (up to 500) for analytics page
  history:  [],              // completed simulation summaries
  currentRunId: null,        // Supabase run id for the active session
  _worker:  null,
  _startedAt: null,          // wall-clock start time for duration tracking

  // ── Config ─────────────────────────────────────────────────────────────────
  setConfig: (partial) =>
    set((s) => ({ config: { ...s.config, ...partial } })),

  // ── Controls ───────────────────────────────────────────────────────────────
  startSimulation: () => {
    const { config, _worker: existing } = get()

    // Terminate any previous worker
    if (existing) {
      existing.terminate()
      set({ _worker: null })
    }

    const worker = new Worker(
      new URL('../workers/simulation.worker.js', import.meta.url)
    )

    worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'TICK':
          set((s) => ({
            simTime:  data.simTime,
            patients: data.patients,
            stats:    data.stats,
            recentEvents: [...data.events, ...s.recentEvents].slice(0, 50),
            allEvents:    [...data.events, ...s.allEvents].slice(0, 500),
          }))
          break

        case 'DONE': {
          const { currentRunId, config: cfg, _startedAt } = get()
          const durationSeconds = _startedAt
            ? Math.round((Date.now() - _startedAt) / 1000)
            : null

          set((s) => ({
            status:   'done',
            simTime:  data.simTime,
            patients: data.patients,
            stats:    { ...s.stats, ...data.finalStats },
            history: [
              {
                id:         Date.now(),
                config:     s.config,
                finalStats: data.finalStats,
                simTime:    data.simTime,
              },
              ...s.history,
            ].slice(0, 20),
          }))

          // Enrich discharged patients with ML predictions (non-blocking)
          const discharged = data.patients.filter((p) => p.state === 'discharged')
          if (discharged.length > 0) {
            set({ mlStatus: 'loading', mlError: null })
            enrichPatients(discharged, cfg)
              .then((enriched) => {
                const enrichedMap = new Map(enriched.map((p) => [p.id, p]))
                set((s) => ({
                  mlStatus: 'done',
                  patients: s.patients.map((p) => enrichedMap.get(p.id) ?? p),
                }))
              })
              .catch((err) => {
                console.error('[ML] enrichPatients failed:', err)
                set({ mlStatus: 'error', mlError: err.message })
              })
          }

          // Persist to Supabase (non-blocking)
          if (currentRunId) {
            completeSimulationRun(currentRunId, data.finalStats, durationSeconds)
              .catch((err) => console.warn('[DB] completeSimulationRun failed:', err.message))

            if (discharged.length > 0) {
              savePatientsLog(currentRunId, discharged)
                .catch((err) => console.warn('[DB] savePatientsLog failed:', err.message))
            }
          }
          break
        }
      }
    }

    worker.onerror = (e) => {
      console.error('[SimWorker]', e.message)
      set({ status: 'idle' })
    }

    worker.postMessage({ type: 'START', config })

    set({
      status: 'running', mlStatus: 'idle', mlError: null,
      _worker: worker, patients: [], recentEvents: [], allEvents: [],
      stats: { ...EMPTY_STATS }, simTime: 0, currentRunId: null,
      _startedAt: Date.now(),
    })

    // Create run record in Supabase (non-blocking)
    createSimulationRun(config)
      .then((runId) => set({ currentRunId: runId }))
      .catch((err) => console.warn('[DB] createSimulationRun failed:', err.message))
  },

  pauseSimulation: () => {
    get()._worker?.postMessage({ type: 'PAUSE' })
    set({ status: 'paused' })
  },

  resumeSimulation: () => {
    get()._worker?.postMessage({ type: 'RESUME' })
    set({ status: 'running' })
  },

  stopSimulation: () => {
    get()._worker?.postMessage({ type: 'STOP' })
    get()._worker?.terminate()
    set({ status: 'idle', _worker: null })
  },

  setSpeed: (speedFactor) => {
    get()._worker?.postMessage({ type: 'SET_SPEED', speedFactor })
    set((s) => ({ config: { ...s.config, speed: speedFactor } }))
  },

  resetSimulation: () => {
    get()._worker?.terminate()
    set({
      status: 'idle', _worker: null,
      patients: [], stats: { ...EMPTY_STATS },
      simTime: 0, recentEvents: [],
    })
  },

  // ── Selectors (derived) ────────────────────────────────────────────────────
  getActivePatients: () =>
    get().patients.filter((p) => p.state !== 'discharged'),

  getPatientsByState: (state) =>
    get().patients.filter((p) => p.state === state),

  getFormattedSimTime: () => {
    const m = get().simTime
    const h = Math.floor(m / 60)
    const min = Math.floor(m % 60)
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  },
}))
