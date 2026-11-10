-- Atualização de legislação do catálogo: guarda a última redação oficial conferida de cada
-- tema e o histórico das versões substituídas (para restaurar se a regeneração falhar).
alter table public.catalog_topics
  add column if not exists law_hashes jsonb not null default '{}'::jsonb,
  add column if not exists law_status text not null default 'nao_conferido'
    check (law_status in ('nao_conferido','baseline','ok','desatualizado','sem_referencia','erro','atualizando')),
  add column if not exists law_changed text[] not null default '{}',
  add column if not exists law_missing text[] not null default '{}',
  add column if not exists law_checked_at timestamptz;

create table if not exists public.catalog_topic_history (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.catalog_topics (id) on delete cascade,
  version int not null,
  reason text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists catalog_topic_history_topic_idx on public.catalog_topic_history (topic_id, created_at desc);
alter table public.catalog_topic_history enable row level security;
revoke all on public.catalog_topic_history from public, anon, authenticated;
grant select, insert, delete on public.catalog_topic_history to service_role;
-- catalog_topics já tem RLS (só admin lê); as colunas novas herdam isso.
