-- Quadros prontos por tópico do catálogo (roteiros de comandos de desenho gerados por IA uma vez e reaproveitados por todos os alunos).
create table if not exists public.mentor_lousas_topico (
  id uuid primary key default gen_random_uuid(),
  catalog_topic_id uuid not null references public.catalog_topics(id) on delete cascade,
  ordem integer not null default 1,
  tipo text not null,
  titulo text not null,
  gatilhos text[] not null default '{}',
  roteiro jsonb not null,
  created_at timestamptz not null default now(),
  unique (catalog_topic_id, ordem)
);
alter table public.mentor_lousas_topico enable row level security;
create index if not exists mentor_lousas_topico_topico on public.mentor_lousas_topico (catalog_topic_id);
