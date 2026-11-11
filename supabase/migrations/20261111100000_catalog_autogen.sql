-- Geração automática de aulas do plano de tópicos, em partes, com progresso salvo e retomada.
create table if not exists public.catalog_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  outline_id uuid,
  ref text not null,
  label text not null,
  discipline_mode text not null,
  input jsonb not null,
  plan jsonb not null,
  texts jsonb not null default '[]'::jsonb,
  status text not null default 'planejada' check (status in ('planejada','em_geracao','aguardando','em_revisao','concluida','falha')),
  error text,
  topic_id uuid,
  blockers jsonb not null default '[]'::jsonb,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.catalog_generation_jobs enable row level security;
create index if not exists catalog_generation_jobs_outline_idx on public.catalog_generation_jobs (outline_id, ref, created_at desc);
