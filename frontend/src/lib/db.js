import { supabase } from './supabase'

export async function createSimulationRun(params) {
  const { data, error } = await supabase
    .from('simulation_runs')
    .insert({ params, status: 'running' })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

export async function completeSimulationRun(runId, finalStats, durationSeconds) {
  const { error } = await supabase
    .from('simulation_runs')
    .update({ status: 'completed', final_stats: finalStats, duration_seconds: durationSeconds })
    .eq('id', runId)

  if (error) throw error
}

export async function savePatientsLog(runId, patients) {
  const rows = patients.map((p, i) => ({
    run_id: runId,
    patient_number: i + 1,
    triage_level: p.triageLevel,
    wait_time_minutes: p.waitTime,
    treatment_duration_minutes: p.treatmentDuration,
    outcome: p.outcome,
    satisfaction_score: p.satisfaction,
    arrived_at: p.arrivedAt,
    discharged_at: p.dischargedAt,
  }))

  const { error } = await supabase.from('patients_log').insert(rows)
  if (error) throw error
}

export async function getSimulationHistory(limit = 10) {
  const { data, error } = await supabase
    .from('simulation_runs')
    .select('id, created_at, params, status, final_stats, duration_seconds')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getSimulationPatients(runId) {
  const { data, error } = await supabase
    .from('patients_log')
    .select('*')
    .eq('run_id', runId)
    .order('patient_number')

  if (error) throw error
  return data
}

export async function saveModelMetrics(metrics) {
  const { error } = await supabase.from('model_metrics').insert(metrics)
  if (error) throw error
}
