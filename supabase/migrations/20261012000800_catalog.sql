-- =============================================================================
-- Catálogo revisado (modelo híbrido)
--
-- Temas e dispositivos de lei preparados e revisados pela equipe. Quando o pedido do
-- aluno é coberto pelo catálogo, o estudo é montado a partir dele — sem chamar a IA.
-- O que não estiver no catálogo continua sendo gerado pela IA, como antes.
-- Os estudos dos alunos recebem CÓPIAS (o progresso de cada um continua isolado);
-- `lessons.catalog_topic_id` guarda a origem e a versão usada.
-- =============================================================================

create table if not exists public.catalog_topics (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  title           text not null check (char_length(title) between 2 and 200),
  kind            text not null check (kind in ('tema', 'dispositivo')),
  law_code        text check (law_code ~ '^[A-Z0-9]{2,12}$'),
  articles        text[] not null default '{}',
  aliases         text[] not null default '{}',
  discipline_mode text not null default 'outra',
  summary         text check (char_length(summary) <= 2000),
  -- Texto normalizado a que os spans dos nós se referem (texto legal ou roteiro de subtemas).
  source_text     text not null default '' check (char_length(source_text) <= 60000),
  nodes           jsonb not null default '[]'::jsonb,
  lesson          jsonb,
  estimated_minutes int not null default 40 check (estimated_minutes between 5 and 600),
  status          text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'arquivado')),
  version         int not null default 0 check (version >= 0),
  origin          text not null default 'equipe' check (origin in ('equipe', 'promovido')),
  origin_lesson_id uuid,
  created_by      uuid references auth.users (id) on delete set null,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (kind = 'tema' or (law_code is not null and cardinality(articles) > 0))
);
create index if not exists catalog_topics_status on public.catalog_topics (status);
create index if not exists catalog_topics_law on public.catalog_topics (law_code) where kind = 'dispositivo';

create table if not exists public.catalog_questions (
  id            uuid primary key default gen_random_uuid(),
  topic_id      uuid not null references public.catalog_topics (id) on delete cascade,
  level         text not null check (level in ('facil', 'medio', 'dificil')),
  type          text not null check (type in ('multipla_escolha', 'certo_errado', 'situacional')),
  statement     text not null check (char_length(statement) between 10 and 4000),
  options       jsonb not null default '[]'::jsonb,
  correct_answer_true boolean,
  justification text not null check (char_length(justification) between 10 and 3000),
  node_key      text not null check (node_key ~ '^N[0-9]{4}$'),
  difficulty    int not null check (difficulty between 1 and 5),
  essential     boolean not null default false,
  depends_on_external_source boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  check (type <> 'certo_errado' or correct_answer_true is not null)
);
create index if not exists catalog_questions_topic on public.catalog_questions (topic_id, level) where active;

-- Somente leitura para administradores; gravações passam pelo servidor (service role).
alter table public.catalog_topics enable row level security;
alter table public.catalog_topics force row level security;
alter table public.catalog_questions enable row level security;
alter table public.catalog_questions force row level security;
grant select on public.catalog_topics, public.catalog_questions to authenticated;
drop policy if exists "admin le" on public.catalog_topics;
create policy "admin le" on public.catalog_topics for select to authenticated using ((select public.is_admin()));
drop policy if exists "admin le" on public.catalog_questions;
create policy "admin le" on public.catalog_questions for select to authenticated using ((select public.is_admin()));

-- Origem das unidades montadas a partir do catálogo.
alter table public.lessons
  add column if not exists catalog_topic_id uuid references public.catalog_topics (id) on delete set null,
  add column if not exists catalog_version int,
  add column if not exists catalog_key_map jsonb;
create index if not exists lessons_catalog on public.lessons (catalog_topic_id) where catalog_topic_id is not null;

-- Publicação: incrementa a versão. Unidades de alunos com versão anterior passam a
-- exibir o aviso de conteúdo atualizado (comparação feita na leitura).
create or replace function public.publish_catalog_topic(p_topic uuid)
returns int
language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  update public.catalog_topics
     set status = 'publicado', version = version + 1, published_at = now(), updated_at = now()
   where id = p_topic
  returning version into v;
  if v is null then raise exception 'tema não encontrado' using errcode = 'P0002'; end if;
  return v;
end $$;
revoke all on function public.publish_catalog_topic(uuid) from public, anon, authenticated;
grant execute on function public.publish_catalog_topic(uuid) to service_role;

-- Versão publicada atual dos temas (para o aluno saber se a unidade dele está desatualizada).
-- Expõe só id e versão de temas publicados — nunca o conteúdo do catálogo.
create or replace function public.catalog_topic_versions(p_ids uuid[])
returns table (id uuid, version int)
language sql stable security definer set search_path = '' as $$
  select t.id, t.version from public.catalog_topics t where t.id = any(p_ids) and t.status = 'publicado';
$$;
revoke all on function public.catalog_topic_versions(uuid[]) from public, anon;
grant execute on function public.catalog_topic_versions(uuid[]) to authenticated;
