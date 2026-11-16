-- Cache compartilhado das lousas do Mentor: a mesma explicação serve a outros alunos sem gastar IA.
create table if not exists public.mentor_lousas_cache (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  pedido text not null,
  titulo text not null default '',
  dados jsonb not null,
  usos integer not null default 0,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
alter table public.mentor_lousas_cache enable row level security;
-- Sem políticas: só o servidor (service role) lê e grava.
create index if not exists mentor_lousas_cache_uso on public.mentor_lousas_cache (last_used_at desc);
