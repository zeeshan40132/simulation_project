-- Run this entire file in your Supabase SQL Editor

create table simulation_runs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  params jsonb not null,
  status text default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  duration_seconds integer,
  final_stats jsonb
);

create table patients_log (
  id uuid default gen_random_uuid() primary key,
  run_id uuid references simulation_runs(id) on delete cascade,
  patient_number integer,
  triage_level text check (triage_level in ('Critical', 'High', 'Medium', 'Low')),
  wait_time_minutes numeric,
  treatment_duration_minutes numeric,
  outcome text check (outcome in ('Discharged', 'Admitted')),
  satisfaction_score numeric,
  arrived_at numeric,
  discharged_at numeric
);

create table model_metrics (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  model_name text not null,
  model_type text not null,
  rmse numeric,
  mae numeric,
  r2_score numeric,
  accuracy numeric,
  features jsonb
);

-- Enable Row Level Security
alter table simulation_runs enable row level security;
alter table patients_log enable row level security;
alter table model_metrics enable row level security;

-- Public read + write (open for demo purposes)
create policy "public_all" on simulation_runs for all using (true) with check (true);
create policy "public_all" on patients_log for all using (true) with check (true);
create policy "public_all" on model_metrics for all using (true) with check (true);
