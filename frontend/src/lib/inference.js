import * as ort from 'onnxruntime-web'

// Models are served from Supabase Storage public bucket
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/models`

const MODEL_URLS = {
  waitTime:     `${STORAGE_BASE}/wait_time_model.onnx`,
  outcome:      `${STORAGE_BASE}/outcome_model.onnx`,
  satisfaction: `${STORAGE_BASE}/satisfaction_model.onnx`,
}

// Feature order must match training (preprocessing.py FEATURE_COLS + feature_engineering.py)
const FEATURE_NAMES = [
  'Urgency Level', 'Time of Day', 'Day of Week', 'Season', 'Region',
  'Nurse-to-Patient Ratio', 'Specialist Availability', 'Facility Size (Beds)', 'Is Weekend', 'Hour',
  'Nurse Load', 'Is Peak Hour', 'Resource Pressure',
  'Urgency x Time', 'Urgency x Weekend', 'Large Facility',
]

// Singleton sessions — loaded once, reused
const sessions = { waitTime: null, outcome: null, satisfaction: null }
let loadPromise = null

async function loadSessions() {
  for (const [key, url] of Object.entries(MODEL_URLS)) {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`Failed to fetch ${key} model: ${resp.status}`)
    const buffer = await resp.arrayBuffer()
    sessions[key] = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
    })
  }
}

export async function ensureModelsLoaded() {
  if (sessions.waitTime && sessions.outcome && sessions.satisfaction) return
  if (!loadPromise) {
    loadPromise = loadSessions().catch((err) => {
      loadPromise = null  // allow retry on next simulation
      throw err
    })
  }
  await loadPromise
}

// ─── Feature builder ──────────────────────────────────────────────────────────
// Constructs the 16-feature float32 vector matching the training schema exactly.
// triageLevel 1-5 (1=Critical) maps to urgencyLevel 4-1 (4=Critical).
export function buildFeatureVector({
  triageLevel     = 3,
  dayOfWeek       = 1,    // 1=Mon … 7=Sun
  hourOfDay       = 12,   // 0-23 real clock hour
  numNurses       = 8,
  arrivalRate     = 4,    // patients/hr — used to compute nurse load relative to demand
  facilityBeds    = 80,   // bed count; default below training median (94) → largeFacility=0
  specialistAvail = 5,    // 0-10; mapped from numDoctors
  season          = 2,    // 1=Winter 2=Spring 3=Summer 4=Fall
  region          = 1,    // 1=Urban 0=Rural
}) {
  // Urgency Level: Critical=4, High=3, Medium=2, Low=1  (inverse of triage 1-5)
  const urgencyLevel = Math.max(1, Math.min(4, 5 - triageLevel))

  // Time of Day categories matching training TIME_MAP
  let timeOfDay
  if      (hourOfDay >= 5  && hourOfDay < 10) timeOfDay = 1  // Early Morning
  else if (hourOfDay >= 10 && hourOfDay < 13) timeOfDay = 2  // Late Morning
  else if (hourOfDay >= 13 && hourOfDay < 18) timeOfDay = 3  // Afternoon (peak)
  else if (hourOfDay >= 18 && hourOfDay < 22) timeOfDay = 4  // Evening (peak)
  else                                         timeOfDay = 5  // Night

  const isWeekend = dayOfWeek >= 6 ? 1 : 0

  // Nurse-to-Patient Ratio (integer 1-5): accounts for patient demand, not just headcount.
  // arrivalRate/2 approximates concurrent patients needing nursing at any moment.
  // e.g. 8 nurses, 4 pts/hr → round(8/2) = 4 (well-staffed).
  const nurseToPatientRatio = Math.max(1, Math.min(5, Math.round(numNurses / Math.max(1, arrivalRate / 2))))

  // Engineered features — formulas must match feature_engineering.py exactly
  const nurseLoad        = 1 / (nurseToPatientRatio + 1)
  const isPeakHour       = (timeOfDay === 3 || timeOfDay === 4) ? 1 : 0
  const resourcePressure = nurseLoad * (1 / (specialistAvail + 1)) * (1 / Math.log1p(facilityBeds))
  const urgencyXTime     = urgencyLevel * timeOfDay
  const urgencyXWeekend  = urgencyLevel * isWeekend
  const largeFacility    = facilityBeds > 94 ? 1 : 0

  return new Float32Array([
    urgencyLevel, timeOfDay, dayOfWeek, season, region,
    nurseToPatientRatio, specialistAvail, facilityBeds, isWeekend, hourOfDay,
    nurseLoad, isPeakHour, resourcePressure,
    urgencyXTime, urgencyXWeekend, largeFacility,
  ])
}

// ─── Prediction helpers ───────────────────────────────────────────────────────
async function runSession(sessionKey, features) {
  const sess   = sessions[sessionKey]
  const iname  = sess.inputNames[0]
  const tensor = new ort.Tensor('float32', features, [1, features.length])
  const out    = await sess.run({ [iname]: tensor })
  return out
}

export async function predictWaitTime(patientFeatures) {
  await ensureModelsLoaded()
  const feat = buildFeatureVector(patientFeatures)
  const out  = await runSession('waitTime', feat)
  return Math.max(0, out[Object.keys(out)[0]].data[0])
}

// Outcome model uses 17 features: base 16 + Total Wait Time (min) appended.
// waitTime is known at enrichment time (post-simulation), so this is valid post-hoc analysis.
export async function predictOutcome(patientFeatures, waitTime = 60) {
  await ensureModelsLoaded()
  const base   = buildFeatureVector(patientFeatures)
  const feat   = new Float32Array([...base, waitTime])
  const out    = await runSession('outcome', feat)
  const keys   = Object.keys(out)
  // output[0] = label, output[1] = probabilities map
  const label  = Number(out[keys[0]].data[0])
  const probRaw = out[keys[1]]
  let prob1 = 0.5
  if (probRaw?.data) {
    // Float32Array shape [1, 2] — index 1 is P(admitted)
    prob1 = probRaw.data[1] ?? 0.5
  }
  return { label, probAdmitted: prob1 }
}

export async function predictSatisfaction(patientFeatures) {
  await ensureModelsLoaded()
  const feat = buildFeatureVector(patientFeatures)
  const out  = await runSession('satisfaction', feat)
  const raw  = out[Object.keys(out)[0]].data[0]
  return Math.min(5, Math.max(1, raw))
}

// ─── Batch helper (for post-sim enrichment) ───────────────────────────────────
// Patients are processed sequentially — ONNX Runtime Web does not support
// concurrent runs on the same session. The 3 models run in parallel per patient
// (safe: each uses a different session).
export async function enrichPatients(patients, simConfig = {}) {
  await ensureModelsLoaded()

  // Simulate ER opening at 8 AM so hourOfDay distribution matches training data
  const SIM_START_HOUR = 8

  const results = []
  for (const p of patients) {
    const feat = {
      triageLevel:     p.triageLevel,
      numNurses:       simConfig.numNurses   ?? 8,
      arrivalRate:     simConfig.arrivalRate ?? 4,
      facilityBeds:    simConfig.numBeds     ?? 80,
      specialistAvail: simConfig.numDoctors  ?? 5,
      hourOfDay:       (SIM_START_HOUR + Math.floor((p.arrivedAt ?? 0) / 60)) % 24,
      dayOfWeek:       1,
    }
    // All three run sequentially — v1.18 WASM backend is a singleton,
    // concurrent sess.run() calls across any sessions throw "Session already started"
    const waitTime     = await predictWaitTime(feat)
    const outcome      = await predictOutcome(feat, p.waitTime ?? 60)
    const satisfaction = await predictSatisfaction(feat)
    results.push({
      ...p,
      mlWaitTime:     waitTime,
      mlProbAdmitted: outcome.probAdmitted,
      mlOutcome:      outcome.label,
      mlSatisfaction: satisfaction,
    })
  }
  return results
}
