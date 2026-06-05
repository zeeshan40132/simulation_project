// Discrete-Event Simulation engine — runs in a Web Worker
// Messages in:  { type: 'START'|'PAUSE'|'RESUME'|'STOP'|'SET_SPEED', config?, speedFactor? }
// Messages out: { type: 'TICK'|'PATIENT_EVENT'|'DONE', ... }

// ─── Min-Heap priority queue keyed on event.time ────────────────────────────
class EventQueue {
  constructor() { this.data = [] }

  push(event) {
    this.data.push(event)
    this._up(this.data.length - 1)
  }

  pop() {
    const top = this.data[0]
    const last = this.data.pop()
    if (this.data.length > 0) {
      this.data[0] = last
      this._down(0)
    }
    return top
  }

  peek() { return this.data[0] }
  get size() { return this.data.length }

  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.data[p].time <= this.data[i].time) break
      ;[this.data[p], this.data[i]] = [this.data[i], this.data[p]]
      i = p
    }
  }

  _down(i) {
    const n = this.data.length
    for (;;) {
      let s = i, l = 2 * i + 1, r = l + 1
      if (l < n && this.data[l].time < this.data[s].time) s = l
      if (r < n && this.data[r].time < this.data[s].time) s = r
      if (s === i) break
      ;[this.data[s], this.data[i]] = [this.data[i], this.data[s]]
      i = s
    }
  }
}

// ─── Statistical helpers ─────────────────────────────────────────────────────
const expRand   = (ratePM) => -Math.log(1 - Math.random()) / ratePM   // rate per minute
const clamp     = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const triangular = (lo, mode, hi) => {
  const u = Math.random()
  const fc = (mode - lo) / (hi - lo)
  return u < fc
    ? lo + Math.sqrt(u * (hi - lo) * (mode - lo))
    : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode))
}

function pickTriageLevel() {
  const r = Math.random()
  if (r < 0.05) return 1   // critical
  if (r < 0.18) return 2   // emergent
  if (r < 0.43) return 3   // urgent
  if (r < 0.74) return 4   // less urgent
  return 5                  // non-urgent
}

// Triage-to-doctor wait multiplier (higher triage = faster service)
const TRIAGE_WAIT_MAX   = [0,  5, 15, 30,  60, 120] // minutes max for triage level
const TRIAGE_TREAT_MEAN = [0, 180, 120, 75,  45,  20]

function triageDelay(level) {
  return triangular(1, TRIAGE_WAIT_MAX[level] * 0.3, TRIAGE_WAIT_MAX[level])
}

function treatmentDuration(level) {
  const mean = TRIAGE_TREAT_MEAN[level]
  return clamp(triangular(mean * 0.4, mean, mean * 1.8), 5, 360)
}

function computeOutcome(waitTime, triageLevel) {
  const pAdmit = clamp(0.05 + (5 - triageLevel) * 0.08 + waitTime / 600, 0.02, 0.60)
  return Math.random() < pAdmit ? 'admitted' : 'discharged'
}

function computeSatisfaction(waitTime, triageLevel) {
  const base = 5 - waitTime / 60 + (triageLevel - 1) * 0.2
  return clamp(base + (Math.random() - 0.5) * 0.8, 1, 5)
}

// ─── Simulation state ────────────────────────────────────────────────────────
const STATES = {
  WAITING_TRIAGE: 'waiting_triage',
  IN_TRIAGE:      'in_triage',
  WAITING_DOCTOR: 'waiting_doctor',
  IN_TREATMENT:   'in_treatment',
  DISCHARGED:     'discharged',
}

let paused = false
let stopped = false
let speedFactor = 60  // simulation minutes processed per real second

// ─── Main simulation loop ────────────────────────────────────────────────────
function runSimulation(config) {
  const {
    numDoctors   = 5,
    numNurses    = 8,
    arrivalRate  = 4,       // patients per hour
    durationHours = 8,
    speed        = 60,
  } = config

  speedFactor = speed
  paused  = false
  stopped = false

  const endTime    = durationHours * 60          // total sim minutes
  const arrivalRPM = arrivalRate / 60            // arrivals per minute

  const queue    = new EventQueue()
  const patients = new Map()
  const doctors  = Array.from({ length: numDoctors }, (_, i) => ({
    id: i, busy: false, patientId: null,
  }))
  const doctorWaitQueue = []  // patient ids waiting for a doctor

  let simTime      = 0
  let patientCount = 0
  let lastTickTime = Date.now()   // wall-clock for speed control
  let lastTickSim  = 0

  // Batch of events buffered between ticks
  const pendingEvents = []

  const stats = {
    totalPatients:    0,
    inQueue:          0,
    inTreatment:      0,
    discharged:       0,
    sumWait:          0,
    sumSatisfaction:  0,
    doctorBusy:       0,
  }

  function sendTick() {
    self.postMessage({
      type:    'TICK',
      simTime,
      patients: [...patients.values()],
      stats: {
        ...stats,
        avgWaitTime:     stats.discharged > 0 ? stats.sumWait / stats.discharged : 0,
        avgSatisfaction: stats.discharged > 0 ? stats.sumSatisfaction / stats.discharged : 0,
        doctorUtilization: numDoctors > 0 ? stats.doctorBusy / numDoctors : 0,
      },
      events: pendingEvents.splice(0),
    })
  }

  function scheduleArrival(afterTime) {
    if (afterTime < endTime) {
      queue.push({ time: afterTime + expRand(arrivalRPM), type: 'ARRIVAL' })
    }
  }

  function assignDoctor(doctor, patientId, time) {
    doctor.busy      = true
    doctor.patientId = patientId
    const p = patients.get(patientId)
    p.state             = STATES.IN_TREATMENT
    p.treatmentStartAt  = time
    p.assignedDoctor    = doctor.id
    const dur           = treatmentDuration(p.triageLevel)
    p.treatmentDuration = dur
    stats.inQueue--
    stats.inTreatment++
    stats.doctorBusy++
    queue.push({ time: time + dur, type: 'DISCHARGE', patientId })
    pendingEvents.push({ kind: 'DOCTOR_ASSIGNED', patientId, doctorId: doctor.id, time })
  }

  // Seed first arrival
  scheduleArrival(0)

  function processChunk() {
    if (stopped) return

    const now     = Date.now()
    const elapsed = (now - lastTickTime) / 1000          // real seconds
    const simAdvance = elapsed * speedFactor              // sim minutes to advance
    const chunkEnd = Math.min(lastTickSim + simAdvance, endTime)

    while (queue.size > 0 && queue.peek().time <= chunkEnd) {
      if (paused || stopped) break
      const ev = queue.pop()
      simTime = ev.time

      if (ev.type === 'ARRIVAL') {
        patientCount++
        const id    = patientCount
        const level = pickTriageLevel()
        const p = {
          id, triageLevel: level, state: STATES.IN_TRIAGE,
          arrivedAt: simTime, triageStartAt: simTime,
          triageCompletedAt: null, treatmentStartAt: null,
          dischargedAt: null, treatmentDuration: 0,
          waitTime: 0, outcome: null, satisfaction: null,
          assignedDoctor: null,
        }
        patients.set(id, p)
        stats.totalPatients++
        pendingEvents.push({ kind: 'ARRIVAL', patientId: id, triageLevel: level, time: simTime })

        const tDelay = triageDelay(level)
        queue.push({ time: simTime + tDelay, type: 'TRIAGE_DONE', patientId: id })
        scheduleArrival(simTime)

      } else if (ev.type === 'TRIAGE_DONE') {
        const p = patients.get(ev.patientId)
        if (!p || p.state === STATES.DISCHARGED) continue
        p.state = STATES.WAITING_DOCTOR
        p.triageCompletedAt = simTime
        stats.inQueue++
        pendingEvents.push({ kind: 'TRIAGE_DONE', patientId: p.id, time: simTime })

        const free = doctors.find(d => !d.busy)
        if (free) {
          assignDoctor(free, p.id, simTime)
        } else {
          doctorWaitQueue.push(p.id)
        }

      } else if (ev.type === 'DISCHARGE') {
        const p = patients.get(ev.patientId)
        if (!p) continue
        p.state       = STATES.DISCHARGED
        p.dischargedAt = simTime
        p.waitTime    = (p.treatmentStartAt ?? simTime) - p.arrivedAt
        p.outcome     = computeOutcome(p.waitTime, p.triageLevel)
        p.satisfaction = computeSatisfaction(p.waitTime, p.triageLevel)
        stats.inTreatment--
        stats.discharged++
        stats.doctorBusy--
        stats.sumWait        += p.waitTime
        stats.sumSatisfaction += p.satisfaction
        pendingEvents.push({ kind: 'DISCHARGE', patientId: p.id, outcome: p.outcome, time: simTime })

        const doctor = doctors.find(d => d.patientId === ev.patientId)
        if (doctor) {
          doctor.busy      = false
          doctor.patientId = null
          if (doctorWaitQueue.length > 0) {
            assignDoctor(doctor, doctorWaitQueue.shift(), simTime)
          }
        }
      }
    }

    lastTickTime = now
    lastTickSim  = chunkEnd

    sendTick()

    if (chunkEnd >= endTime || queue.size === 0) {
      self.postMessage({
        type:        'DONE',
        finalStats: {
          totalPatients:    stats.totalPatients,
          discharged:       stats.discharged,
          avgWaitTime:      stats.discharged > 0 ? stats.sumWait / stats.discharged : 0,
          avgSatisfaction:  stats.discharged > 0 ? stats.sumSatisfaction / stats.discharged : 0,
          doctorUtilization: numDoctors > 0 ? stats.doctorBusy / numDoctors : 0,
          peakQueue:        Math.max(...[...patients.values()].map(() => 0), 0),
        },
        patients: [...patients.values()],
        simTime,
      })
      return
    }

    // Yield to allow pause/stop messages; reschedule chunk
    const realMsPerChunk = (1 / speedFactor) * 1000 * simAdvance
    setTimeout(processChunk, Math.max(16, realMsPerChunk))
  }

  processChunk()
}

// ─── Message handler ─────────────────────────────────────────────────────────
self.onmessage = ({ data }) => {
  switch (data.type) {
    case 'START':
      runSimulation(data.config ?? {})
      break
    case 'PAUSE':
      paused = true
      break
    case 'RESUME':
      paused = false
      break
    case 'STOP':
      stopped = true
      break
    case 'SET_SPEED':
      speedFactor = data.speedFactor ?? 60
      break
  }
}
