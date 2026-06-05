-- Hospital ER Simulation — Supabase Schema
-- Run in: Supabase dashboard → SQL Editor → New query → Run

-- ─── simulation_runs ──────────────────────────────────────────────────────────
create table if not exists simulation_runs (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  status           text not null default 'running'
                     check (status in ('running', 'completed', 'failed')),
  params           jsonb not null default '{}',
  final_stats      jsonb,
  duration_seconds numeric(10, 2)
);

create index if not exists idx_sim_runs_status      on simulation_runs (status);
create index if not exists idx_sim_runs_created_at  on simulation_runs (created_at desc);

-- ─── patients_log ─────────────────────────────────────────────────────────────
-- triage_level: 1=critical, 2=emergent, 3=urgent, 4=less urgent, 5=non-urgent
-- arrived_at / discharged_at: simulation clock in minutes
create table if not exists patients_log (
  id                         bigserial primary key,
  run_id                     uuid not null references simulation_runs (id) on delete cascade,
  patient_number             integer not null,
  triage_level               smallint not null check (triage_level between 1 and 5),
  wait_time_minutes          numeric(8, 2),
  treatment_duration_minutes numeric(8, 2),
  outcome                    text check (outcome in ('discharged', 'admitted')),
  satisfaction_score         numeric(4, 2),
  arrived_at                 numeric(10, 2),
  discharged_at              numeric(10, 2)
);

create index if not exists idx_patients_run_id   on patients_log (run_id);
create index if not exists idx_patients_triage   on patients_log (triage_level);

-- ─── model_metrics ────────────────────────────────────────────────────────────
create table if not exists model_metrics (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  model_name   text not null,
  model_type   text not null check (model_type in ('regression', 'classification')),
  rmse         numeric(10, 6),
  mae          numeric(10, 6),
  r2_score     numeric(10, 6),
  accuracy     numeric(10, 6),
  auc_roc      numeric(10, 6),
  features     jsonb
);

create index if not exists idx_model_metrics_name on model_metrics (model_name);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table simulation_runs enable row level security;
alter table patients_log     enable row level security;
alter table model_metrics    enable row level security;

-- Open access (anon key, no auth required for this project)
create policy "public_all" on simulation_runs for all using (true) with check (true);
create policy "public_all" on patients_log    for all using (true) with check (true);
create policy "public_all" on model_metrics   for all using (true) with check (true);
