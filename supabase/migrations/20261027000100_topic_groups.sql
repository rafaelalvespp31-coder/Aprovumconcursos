-- Tópicos do edital: agrupam as aulas do catálogo (ex.: "4. Ilicitude" → 4.1, 4.2).
-- O tópico não é uma tabela: as aulas com o mesmo nome de tópico (na mesma matéria) formam o grupo.
alter table public.catalog_topics
  add column if not exists topic_group text check (topic_group is null or char_length(topic_group) between 2 and 160),
  add column if not exists topic_group_code text check (topic_group_code is null or topic_group_code ~ '^[0-9]{1,3}(\.[0-9]{1,3}){0,3}$'),
  add column if not exists subtopic_code text check (subtopic_code is null or subtopic_code ~ '^[0-9]{1,3}(\.[0-9]{1,3}){0,4}$');
create index if not exists catalog_topics_group on public.catalog_topics (discipline_mode, topic_group) where topic_group is not null;

-- Sumários do edital colados pela equipe (plano de tópicos): a árvore é lida do texto a cada vez.
create table if not exists public.catalog_outlines (
  id uuid primary key default gen_random_uuid(),
  discipline_mode text not null,
  title text not null check (char_length(title) between 2 and 160),
  source_text text not null check (char_length(source_text) between 2 and 60000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.catalog_outlines enable row level security;
-- Sem políticas: só o servidor (service_role) lê e grava.
revoke all on public.catalog_outlines from anon, authenticated;
