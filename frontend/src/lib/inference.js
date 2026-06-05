import * as ort from 'onnxruntime-web'

// Models are served from Supabase Storage public bucket
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/models`

const MODEL_URLS = {
  waitTime:     `${STORAGE_BASE}/wait_time_model.onnx`,
  outcome:      `${STORAGE_BASE}/outcome_model.onnx`,
  satisfaction: `${STORAGE_BASE}/satisfaction_model.onnx`,
}

// Feature order must match training (feature_engineering.py)
const FEATURE_NAMES = [
  'Age', 'Triage Level', 'Day of Week', 'Hour of Day',
  'Number of Previous Visits', 'Insurance Type',
  'Chief Complaint Code', 'Facility Size',
  'Number of Doctors on Duty', 'Number of Nurses on Duty',
  'Nurse Load', 'Is Peak Hour', 'Resource Pressure',
  'Urgency x Time', 'Urgency x Weekend', 'Large Facility',
]

// Singleton sessions — loaded once, reused
const sessions = { waitTime: null, outcome: null, satisfaction: null }
let loadPromise = null

async function loadSessions() {
  ort.env.wasm.numThreads = 1
  ort.env.wasm.simd = true

  await Promise.all(
    Object.entries(MODEL_URLS).map(async ([key, url]) => {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`Failed to fetch ${key} model: ${resp.status}`)
      const buffer = await resp.arrayBuffer()
      sessions[key] = await ort.InferenceSession.create(buffer, {
        executionProviders: ['wasm'],
      })
    })
  )
}

export async function ensureModelsLoaded() {
  if (sessions.waitTime && sessions.outcome && sessions.satisfaction) return
  if (!loadPromise) loadPromise = loadSessions()
  await loadPromise
}

// ─── Feature builder ──────────────────────────────────────────────────────────
// Constructs the 16-feature float32 vector from a patient-like object.
// Missing fields get sensible defaults so callers can pass partial objects.
export function buildFeatureVector({
  age              = 35,
  triageLevel      = 3,
  dayOfWeek        = 1,
  hourOfDay        = 12,
  previousVisits   = 1,
  insuranceType    = 1,
  chiefComplaintCode = 5,
  facilitySize     = 2,
  numDoctors       = 5,
  numNurses        = 8,
}) {
  const nurseLoad       = numNurses  > 0 ? numDoctors / numNurses : 0
  const isPeakHour      = (hourOfDay >= 8 && hourOfDay <= 20) ? 1 : 0
  const resourcePressure = numDoctors > 0 ? (numNurses + numDoctors) / numDoctors : 0
  const urgencyXTime    = triageLevel * hourOfDay
  const urgencyXWeekend = triageLevel * (dayOfWeek >= 5 ? 1 : 0)
  const largeFacility   = facilitySize >= 3 ? 1 : 0

  return new Float32Array([
    age, triageLevel, dayOfWeek, hourOfDay,
    previousVisits, insuranceType,
    chiefComplaintCode, facilitySize,
    numDoctors, numNurses,
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

export async function predictOutcome(patientFeatures) {
  await ensureModelsLoaded()
  const feat   = buildFeatureVector(patientFeatures)
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
export async function enrichPatients(patients, simConfig = {}) {
  await ensureModelsLoaded()

  return Promise.all(
    patients.map(async (p) => {
      const feat = {
        triageLevel:  p.triageLevel,
        numDoctors:   simConfig.numDoctors  ?? 5,
        numNurses:    simConfig.numNurses   ?? 8,
        hourOfDay:    Math.floor((p.arrivedAt ?? 0) / 60) % 24,
        dayOfWeek:    1,
      }
      const [waitTime, { label, probAdmitted }, satisfaction] = await Promise.all([
        predictWaitTime(feat),
        predictOutcome(feat),
        predictSatisfaction(feat),
      ])
      return { ...p, mlWaitTime: waitTime, mlProbAdmitted: probAdmitted,
               mlOutcome: label, mlSatisfaction: satisfaction }
    })
  )
}
