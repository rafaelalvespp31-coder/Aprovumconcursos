-- =============================================================================
-- Nível Aprovado — schema inicial
-- Convenções:
--  * Toda tabela de dados do aluno tem user_id.
--  * FKs compostas (id, user_id) garantem no banco que filhos pertencem ao mesmo dono.
--  * O cliente (anon/authenticated) só LÊ via RLS; escritas passam pelo servidor.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Catálogos públicos
-- -----------------------------------------------------------------------------
create table public.exam_boards (
  slug        text primary key check (slug ~ '^[a-z0-9_]{2,32}$'),
  name        text not null,
  hint        text,
  sort_order  int  not null default 0
);

create table public.plans (
  id          text primary key check (id in ('free', 'pro', 'premium')),
  name        text not null,
  -- Limites aplicados no servidor. Preço não é definido aqui (sem análise de custos).
  max_active_trails          int not null check (max_active_trails >= 0),
  max_trail_builds_per_month int not null check (max_trail_builds_per_month >= 0),
  max_lesson_generations_per_month int not null check (max_lesson_generations_per_month >= 0),
  max_content_chars          int not null check (max_content_chars > 0),
  features    jsonb not null default '{}'::jsonb
);

-- -----------------------------------------------------------------------------
-- Usuários
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  display_name         text check (char_length(display_name) <= 80),
  onboarding_completed boolean not null default false,
  daily_goal_minutes   int check (daily_goal_minutes between 5 and 600),
  preferences          jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.admin_roles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null check (role in ('admin', 'support')),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);

create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users (id) on delete cascade,
  plan_id            text not null references public.plans (id),
  status             text not null default 'active'
                       check (status in ('active', 'trialing', 'past_due', 'canceled')),
  current_period_end timestamptz,
  -- Preenchidos apenas por webhook autenticado do gateway (fase futura).
  provider           text,
  provider_ref       text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.usage_events (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('trail_build', 'lesson_generation', 'question_generation')),
  units         int  not null default 1 check (units > 0),
  input_tokens  int  not null default 0,
  output_tokens int  not null default 0,
  cost_usd      numeric(12, 6),
  created_at    timestamptz not null default now()
);
create index usage_events_user_kind_time on public.usage_events (user_id, kind, created_at desc);

-- -----------------------------------------------------------------------------
-- Trilhas e documentos de origem
-- -----------------------------------------------------------------------------
create table public.study_trails (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 160),
  board_slug       text not null references public.exam_boards (slug),
  other_board_name text check (char_length(other_board_name) <= 80),
  content_type     text not null check (content_type in ('edital', 'materia', 'artigo_lei', 'tema_livre')),
  status           text not null default 'pending'
                     check (status in ('pending', 'processing', 'review', 'active', 'failed')),
  discipline_mode  text,
  -- Critérios de domínio configuráveis (ver domain/progress/state-machine.ts).
  mastery_criteria jsonb,
  audit_report     jsonb,
  archived_at      timestamptz,
  last_studied_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, user_id),
  check (board_slug <> 'outra' or other_board_name is not null)
);
create index study_trails_user on public.study_trails (user_id, archived_at, updated_at desc);
create trigger study_trails_updated before update on public.study_trails
  for each row execute function public.set_updated_at();

create table public.source_documents (
  id         uuid primary key default gen_random_uuid(),
  trail_id   uuid not null,
  user_id    uuid not null,
  kind       text not null default 'texto' check (kind in ('texto', 'pdf')),
  storage_path text, -- reservado para importação de PDF
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (trail_id, user_id) references public.study_trails (id, user_id) on delete cascade
);
create index source_documents_trail on public.source_documents (trail_id);

create table public.source_document_versions (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null,
  user_id         uuid not null,
  version         int  not null check (version > 0),
  original_text   text not null,
  normalized_text text not null,
  char_count      int  not null,
  sha256          text not null,
  created_at      timestamptz not null default now(),
  unique (document_id, version),
  unique (id, user_id),
  foreign key (document_id, user_id) references public.source_documents (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Mapa de cobertura
-- -----------------------------------------------------------------------------
create table public.content_nodes (
  id                       uuid primary key default gen_random_uuid(),
  trail_id                 uuid not null,
  version_id               uuid not null,
  user_id                  uuid not null,
  key                      text not null check (key ~ '^N[0-9]{4,6}$'),
  parent_id                uuid references public.content_nodes (id) on delete cascade,
  kind                     text not null,
  marker                   text,
  title                    text not null,
  source_text              text not null,
  span_start               int  not null check (span_start >= 0),
  span_end                 int  not null,
  depth                    int  not null check (depth >= 0),
  sort_order               int  not null,
  path                     text not null,
  requires_direct_coverage boolean not null,
  relevance                text check (relevance in ('alta', 'media', 'baixa')),
  verification_status      text not null default 'nao_aplicavel'
                             check (verification_status in ('nao_aplicavel', 'pendente', 'verificada', 'divergente')),
  last_verified_at         timestamptz,
  created_at               timestamptz not null default now(),
  check (span_end > span_start),
  unique (version_id, key),
  unique (id, user_id),
  foreign key (trail_id, user_id) references public.study_trails (id, user_id) on delete cascade,
  foreign key (version_id, user_id) references public.source_document_versions (id, user_id) on delete cascade
);
create index content_nodes_trail on public.content_nodes (trail_id, sort_order);
create index content_nodes_parent on public.content_nodes (parent_id);

create table public.node_prerequisites (
  node_id         uuid not null,
  prerequisite_id uuid not null,
  user_id         uuid not null,
  primary key (node_id, prerequisite_id),
  check (node_id <> prerequisite_id),
  foreign key (node_id, user_id) references public.content_nodes (id, user_id) on delete cascade,
  foreign key (prerequisite_id, user_id) references public.content_nodes (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Módulos e aulas
-- -----------------------------------------------------------------------------
create table public.learning_modules (
  id         uuid primary key default gen_random_uuid(),
  trail_id   uuid not null,
  user_id    uuid not null,
  key        text not null,
  title      text not null,
  sort_order int  not null,
  unique (trail_id, key),
  unique (id, user_id),
  foreign key (trail_id, user_id) references public.study_trails (id, user_id) on delete cascade
);

create table public.lessons (
  id                   uuid primary key default gen_random_uuid(),
  trail_id             uuid not null,
  module_id            uuid not null,
  user_id              uuid not null,
  key                  text not null,
  title                text not null,
  objective            text not null,
  sort_order           int  not null,
  estimated_minutes    int  not null check (estimated_minutes between 1 and 600),
  supplementary        jsonb not null default '[]'::jsonb,
  status               text not null default 'planned'
                         check (status in ('planned', 'generating', 'ready', 'failed', 'pending_validation')),
  verification_pending boolean not null default false,
  unverified_claims    jsonb not null default '[]'::jsonb,
  generation_error     text,
  generated_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (trail_id, key),
  unique (id, user_id),
  foreign key (trail_id, user_id) references public.study_trails (id, user_id) on delete cascade,
  foreign key (module_id, user_id) references public.learning_modules (id, user_id) on delete cascade
);
create index lessons_trail on public.lessons (trail_id, sort_order);
create trigger lessons_updated before update on public.lessons
  for each row execute function public.set_updated_at();

-- Vínculo explícito tópico ↔ aula (planejado e efetivamente ensinado).
create table public.lesson_nodes (
  lesson_id uuid not null,
  node_id   uuid not null,
  user_id   uuid not null,
  taught    boolean not null default false,
  primary key (lesson_id, node_id),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade,
  foreign key (node_id, user_id) references public.content_nodes (id, user_id) on delete cascade
);
create index lesson_nodes_node on public.lesson_nodes (node_id);

create table public.lesson_prerequisites (
  lesson_id              uuid not null,
  prerequisite_lesson_id uuid not null,
  user_id                uuid not null,
  primary key (lesson_id, prerequisite_lesson_id),
  check (lesson_id <> prerequisite_lesson_id),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade,
  foreign key (prerequisite_lesson_id, user_id) references public.lessons (id, user_id) on delete cascade
);

create table public.lesson_sections (
  id                  uuid primary key default gen_random_uuid(),
  lesson_id           uuid not null,
  user_id             uuid not null,
  kind                text not null,
  title               text not null,
  body_markdown       text not null check (char_length(body_markdown) <= 20000),
  sort_order          int  not null,
  node_keys           text[] not null default '{}',
  verification_status text not null default 'nao_aplicavel'
                        check (verification_status in ('nao_aplicavel', 'pendente', 'verificada', 'divergente')),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade
);
create index lesson_sections_lesson on public.lesson_sections (lesson_id, sort_order);

create table public.source_references (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null,
  user_id       uuid not null,
  kind          text not null check (kind in ('texto_informado', 'lei', 'doutrina', 'jurisprudencia', 'outro')),
  citation      text not null,
  url           text,
  version_label text,
  consulted_at  timestamptz,
  verified      boolean not null default false,
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Questões e respostas
-- -----------------------------------------------------------------------------
create table public.questions (
  id                         uuid primary key default gen_random_uuid(),
  lesson_id                  uuid not null,
  node_id                    uuid not null,
  user_id                    uuid not null,
  type                       text not null check (type in ('multipla_escolha', 'certo_errado', 'situacional', 'discursiva')),
  statement                  text not null,
  justification              text not null,
  difficulty                 int  not null check (difficulty between 1 and 5),
  essential                  boolean not null default false,
  -- Questões geradas são sempre "original". "oficial_licenciada" exige banco licenciado.
  origin                     text not null default 'original'
                               check (origin in ('original', 'adaptada', 'oficial_licenciada')),
  board_style                text,
  depends_on_external_source boolean not null default false,
  correct_answer_true        boolean,
  active                     boolean not null default true,
  created_at                 timestamptz not null default now(),
  unique (id, user_id),
  check ((type = 'certo_errado') = (correct_answer_true is not null)),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade,
  foreign key (node_id, user_id) references public.content_nodes (id, user_id) on delete cascade
);
create index questions_lesson on public.questions (lesson_id) where active;

create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  user_id     uuid not null,
  label       text not null,
  text        text not null,
  is_correct  boolean not null,
  explanation text not null,
  sort_order  int  not null,
  unique (question_id, label),
  unique (id, user_id),
  foreign key (question_id, user_id) references public.questions (id, user_id) on delete cascade
);
-- No máximo uma alternativa correta por questão.
create unique index question_options_one_correct on public.question_options (question_id) where is_correct;

create table public.answer_attempts (
  id                 uuid primary key default gen_random_uuid(),
  question_id        uuid not null,
  user_id            uuid not null,
  selected_option_id uuid,
  answer_bool        boolean,
  is_correct         boolean not null,
  context            text not null default 'fixacao' check (context in ('fixacao', 'revisao', 'simulado')),
  created_at         timestamptz not null default now(),
  unique (id, user_id),
  check ((selected_option_id is null) <> (answer_bool is null)),
  foreign key (question_id, user_id) references public.questions (id, user_id) on delete cascade,
  foreign key (selected_option_id, user_id) references public.question_options (id, user_id) on delete cascade
);
create index answer_attempts_user_question on public.answer_attempts (user_id, question_id, created_at desc);

-- Reservado para correção de discursivas (feedback individualizado).
create table public.answer_feedback (
  attempt_id       uuid primary key,
  user_id          uuid not null,
  feedback         text not null,
  concept_to_review text,
  created_at       timestamptz not null default now(),
  foreign key (attempt_id, user_id) references public.answer_attempts (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Progresso, domínio e revisão
-- -----------------------------------------------------------------------------
create table public.learning_progress (
  user_id              uuid not null,
  lesson_id            uuid not null,
  trail_id             uuid not null,
  state                text not null check (state in (
                         'nao_iniciada', 'disponivel', 'em_andamento', 'aula_concluida', 'em_revisao',
                         'aguardando_dominio', 'dominada', 'necessita_atualizacao', 'pendente_validacao')),
  resume_state         text,
  reading_completed_at timestamptz,
  passed_at            timestamptz,
  mastered_at          timestamptz,
  updated_at           timestamptz not null default now(),
  primary key (user_id, lesson_id),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade,
  foreign key (trail_id, user_id) references public.study_trails (id, user_id) on delete cascade
);
create index learning_progress_trail on public.learning_progress (user_id, trail_id);
create trigger learning_progress_updated before update on public.learning_progress
  for each row execute function public.set_updated_at();

-- Histórico (append-only) das avaliações que sustentam o status de domínio.
create table public.mastery_records (
  id          bigint generated always as identity primary key,
  user_id     uuid not null,
  lesson_id   uuid not null,
  from_state  text not null,
  to_state    text not null,
  evidence    jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade
);
create index mastery_records_lesson on public.mastery_records (user_id, lesson_id, recorded_at desc);

create table public.review_schedules (
  user_id          uuid not null,
  lesson_id        uuid not null,
  trail_id         uuid not null,
  step             int  not null default 0,
  ease             numeric(4, 2) not null default 2.0,
  lapses           int  not null default 0,
  attempts         int  not null default 0,
  last_reviewed_at timestamptz,
  due_at           timestamptz not null,
  primary key (user_id, lesson_id),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade,
  foreign key (trail_id, user_id) references public.study_trails (id, user_id) on delete cascade
);
create index review_schedules_due on public.review_schedules (user_id, due_at);

-- -----------------------------------------------------------------------------
-- Processamento assíncrono de IA
-- -----------------------------------------------------------------------------
create table public.ai_generation_jobs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  trail_id      uuid not null,
  lesson_id     uuid,
  kind          text not null check (kind in ('build_trail', 'generate_lesson')),
  stage         text not null default 'queued',
  status        text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  progress      int  not null default 0 check (progress between 0 and 100),
  attempts      int  not null default 0,
  max_attempts  int  not null default 3,
  error_code    text,
  error_message text,
  locked_until  timestamptz,
  state         jsonb not null default '{}'::jsonb,
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id),
  foreign key (trail_id, user_id) references public.study_trails (id, user_id) on delete cascade,
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade
);
create index ai_jobs_trail on public.ai_generation_jobs (trail_id, created_at desc);
create index ai_jobs_status on public.ai_generation_jobs (status, updated_at);
create trigger ai_jobs_updated before update on public.ai_generation_jobs
  for each row execute function public.set_updated_at();

create table public.ai_generation_versions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  job_id        uuid,
  trail_id      uuid not null,
  lesson_id     uuid,
  task          text not null,
  provider      text not null,
  model         text not null,
  input_tokens  int  not null default 0,
  output_tokens int  not null default 0,
  cost_usd      numeric(12, 6),
  latency_ms    int,
  warnings      jsonb not null default '[]'::jsonb,
  output        jsonb,
  created_at    timestamptz not null default now(),
  foreign key (job_id, user_id) references public.ai_generation_jobs (id, user_id) on delete set null (job_id),
  foreign key (trail_id, user_id) references public.study_trails (id, user_id) on delete cascade
);
create index ai_versions_trail on public.ai_generation_versions (trail_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Operação
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  user_id    uuid,
  action     text not null,
  entity     text,
  entity_id  text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_time on public.audit_logs (created_at desc);

create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);
