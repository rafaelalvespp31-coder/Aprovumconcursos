-- APROVUM AI — Intelligence System: preparação por edital (sem IA externa).
-- Referencia as aulas ORIGINAIS do catálogo (catalog_topics) por id; nada é copiado.
-- Escrita só pelo servidor (service_role); o aluno só lê o que é dele (RLS por dono).
-- Rollback: drop table edital_events, edital_topic_lessons, edital_topics, edital_disciplines, edital_preparations, edital_extractions cascade; delete bucket "editais".

create table if not exists public.edital_extractions (
  file_hash text primary key,
  page_count integer not null,
  pages jsonb not null,            -- ["texto da pág. 1", ...]
  chars integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.edital_preparations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contest_name text,
  role_name text,
  board text,
  contest_year integer,
  file_name text not null,
  file_size integer not null,
  file_hash text not null,
  file_path text not null,
  page_count integer,
  status text not null default 'recebendo'
    check (status in ('recebendo','lendo','identificando','mapeando','organizando','concluido','conferencia','erro')),
  step integer not null default 1,
  error text,
  section_pages int4range,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, file_hash)
);
create index if not exists edital_prep_user_idx on public.edital_preparations (user_id, created_at desc);

create table if not exists public.edital_disciplines (
  id uuid primary key default gen_random_uuid(),
  preparation_id uuid not null references public.edital_preparations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null,
  name text not null,
  discipline_mode text,            -- matéria do catálogo quando reconhecida
  source_page integer
);
create index if not exists edital_disc_prep_idx on public.edital_disciplines (preparation_id, position);

create table if not exists public.edital_topics (
  id uuid primary key default gen_random_uuid(),
  preparation_id uuid not null references public.edital_preparations(id) on delete cascade,
  discipline_id uuid not null references public.edital_disciplines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null,
  code text,
  depth smallint not null default 1,
  title text not null,
  title_key text not null,         -- título normalizado (frequência de pendências no admin)
  source_page integer,
  match_status text not null default 'pendente'
    check (match_status in ('pendente','completa','parcial','nao_encontrado','conferencia')),
  score numeric(4,3)
);
create index if not exists edital_topics_prep_idx on public.edital_topics (preparation_id, discipline_id, position);
create index if not exists edital_topics_gap_idx on public.edital_topics (match_status, title_key);

create table if not exists public.edital_topic_lessons (
  topic_id uuid not null references public.edital_topics(id) on delete cascade,
  catalog_topic_id uuid not null references public.catalog_topics(id) on delete cascade,
  coverage text not null check (coverage in ('completa','parcial','conferencia')),
  score numeric(4,3) not null,
  primary key (topic_id, catalog_topic_id)
);
create index if not exists edital_tl_catalog_idx on public.edital_topic_lessons (catalog_topic_id);

create table if not exists public.edital_events (
  id bigint generated always as identity primary key,
  preparation_id uuid not null references public.edital_preparations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  step integer not null,
  level text not null default 'info' check (level in ('info','ok','warn','error')),
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists edital_events_prep_idx on public.edital_events (preparation_id, id);

alter table public.edital_extractions enable row level security;
alter table public.edital_preparations enable row level security;
alter table public.edital_disciplines enable row level security;
alter table public.edital_topics enable row level security;
alter table public.edital_topic_lessons enable row level security;
alter table public.edital_events enable row level security;

create policy edital_prep_dono on public.edital_preparations for select to authenticated using (user_id = (select auth.uid()));
create policy edital_disc_dono on public.edital_disciplines for select to authenticated using (user_id = (select auth.uid()));
create policy edital_topics_dono on public.edital_topics for select to authenticated using (user_id = (select auth.uid()));
create policy edital_events_dono on public.edital_events for select to authenticated using (user_id = (select auth.uid()));
create policy edital_tl_dono on public.edital_topic_lessons for select to authenticated
  using (exists (select 1 from public.edital_topics t where t.id = topic_id and t.user_id = (select auth.uid())));

revoke all on public.edital_extractions, public.edital_preparations, public.edital_disciplines, public.edital_topics, public.edital_topic_lessons, public.edital_events from anon, authenticated;
grant select on public.edital_preparations, public.edital_disciplines, public.edital_topics, public.edital_topic_lessons, public.edital_events to authenticated;
grant all on public.edital_extractions, public.edital_preparations, public.edital_disciplines, public.edital_topics, public.edital_topic_lessons, public.edital_events to service_role;

do $$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('editais', 'editais', false, 26214400, array['application/pdf'])
  on conflict (id) do nothing;
exception when others then null;
end $$;
