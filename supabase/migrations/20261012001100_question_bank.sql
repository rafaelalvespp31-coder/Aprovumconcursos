-- =============================================================================
-- Banco inteligente de questões (Fase 2) + preparação do APROVUM RANKED
--
-- Somente ADITIVA: cria tabelas, funções e gatilhos novos. Nenhuma tabela existente
-- é alterada ou apagada. O fluxo atual de aulas (catalog_questions / questions)
-- continua igual.
--
-- Segurança: o cliente (anon/authenticated) não tem NENHUM privilégio nestas
-- tabelas, e cada uma tem uma política restritiva explícita negando acesso. Tudo
-- passa pelo servidor (service_role) depois de verificar o papel da pessoa.
-- Assim o gabarito não fica acessível por API nem por consulta direta ao banco.
--
-- Regras de integridade no próprio banco (não dependem só do código):
--  * máquina de estados da questão (transições permitidas);
--  * aprovação exige revisor diferente de quem criou + checklist completo +
--    direito de uso válido + alternativas consistentes;
--  * questão aprovada/publicada/suspensa não pode ser editada: volta para
--    revisão e, ao ser reaprovada, gera NOVA versão (as antigas são imutáveis);
--  * provas do Ranked apontam para (questão, versão) e não podem ser alteradas
--    depois de validadas.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Papéis da equipe do banco de questões
-- (admin_roles continua valendo: 'admin' tem todos os papéis)
-- -----------------------------------------------------------------------------
create table if not exists public.staff_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('autor', 'revisor')),
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_bank_role(p_user uuid, p_role text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user is not null and (
    exists (select 1 from public.admin_roles r where r.user_id = p_user and r.role = 'admin')
    or exists (select 1 from public.staff_roles s where s.user_id = p_user and s.role = p_role)
  );
$$;

-- -----------------------------------------------------------------------------
-- Matérias e assuntos (hierarquia flexível)
-- -----------------------------------------------------------------------------
create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name        text not null check (char_length(name) between 2 and 120),
  description text check (char_length(description) <= 2000),
  status      text not null default 'ativa' check (status in ('ativa', 'inativa')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.subjects (slug, name, sort_order) values
  ('lingua-portuguesa', 'Língua Portuguesa', 1),
  ('informatica', 'Informática', 2),
  ('matematica', 'Matemática', 3),
  ('direito-penal', 'Direito Penal', 4),
  ('direito-constitucional', 'Direito Constitucional', 5),
  ('direitos-humanos', 'Direitos Humanos', 6),
  ('direito-processual-penal', 'Direito Processual Penal', 7),
  ('legislacao-especial', 'Legislação Especial', 8),
  ('direito-administrativo', 'Direito Administrativo', 9)
on conflict (slug) do nothing;

create table if not exists public.subject_topics (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects (id) on delete restrict,
  parent_id   uuid,
  slug        text not null check (slug ~ '^[a-z0-9-]{2,80}$'),
  name        text not null check (char_length(name) between 2 and 160),
  description text check (char_length(description) <= 2000),
  status      text not null default 'ativo' check (status in ('ativo', 'inativo')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, subject_id),
  unique nulls not distinct (subject_id, parent_id, slug),
  check (parent_id is null or parent_id <> id),
  -- o assunto-pai precisa ser da mesma matéria
  foreign key (parent_id, subject_id) references public.subject_topics (id, subject_id) on delete restrict
);
create index if not exists subject_topics_parent on public.subject_topics (parent_id);

-- Impede ciclos (A → B → A) na hierarquia de assuntos.
create or replace function public.subject_topics_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.parent_id is not null and exists (
    with recursive up(id, parent_id) as (
      select t.id, t.parent_id from public.subject_topics t where t.id = new.parent_id
      union all
      select t.id, t.parent_id from public.subject_topics t join up on t.id = up.parent_id
    )
    select 1 from up where up.id = new.id
  ) then
    raise exception 'Hierarquia de assuntos não pode formar ciclo.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create or replace trigger subject_topics_guard before insert or update on public.subject_topics
  for each row execute function public.subject_topics_guard();

-- -----------------------------------------------------------------------------
-- Concursos (bancas já existem em exam_boards)
-- -----------------------------------------------------------------------------
create table if not exists public.exams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 200),
  organ      text check (char_length(organ) <= 200),
  role_name  text check (char_length(role_name) <= 200),
  board_slug text references public.exam_boards (slug) on delete restrict,
  year       int check (year between 1950 and 2100),
  notes      text check (char_length(notes) <= 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (name, role_name, board_slug, year)
);

-- -----------------------------------------------------------------------------
-- Fontes (com situação de licença / autorização de reutilização)
-- Uma URL pública, sozinha, NÃO significa autorização de redistribuição.
-- -----------------------------------------------------------------------------
create table if not exists public.question_sources (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 2 and 300),
  kind               text not null check (kind in (
                       'prova_oficial', 'gabarito_oficial', 'legislacao', 'jurisprudencia',
                       'doutrina', 'material_didatico', 'questao_autoral', 'outra')),
  author_institution text check (char_length(author_institution) <= 300),
  url                text check (url ~ '^https?://' and char_length(url) <= 2000),
  published_on       date,
  consulted_on       date,
  license            text check (char_length(license) <= 2000),
  reuse_verified     boolean not null default false,
  reuse_verified_by  uuid references auth.users (id) on delete set null,
  reuse_verified_at  timestamptz,
  legal_notes        text check (char_length(legal_notes) <= 4000),
  status             text not null default 'ativa' check (status in ('ativa', 'restrita', 'bloqueada', 'arquivada')),
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (not reuse_verified or (reuse_verified_by is not null and reuse_verified_at is not null))
);

-- -----------------------------------------------------------------------------
-- Lotes de geração por IA (custos e rastreio; Fase 5)
-- -----------------------------------------------------------------------------
create table if not exists public.bank_generation_batches (
  id              uuid primary key default gen_random_uuid(),
  requested_by    uuid not null references auth.users (id) on delete restrict,
  provider        text not null,
  model           text not null,
  prompt_version  text not null,
  params          jsonb not null default '{}'::jsonb,
  requested_count int  not null check (requested_count between 1 and 10),
  produced_count  int  not null default 0,
  status          text not null default 'pendente' check (status in ('pendente', 'processando', 'concluido', 'falhou', 'cancelado')),
  input_tokens    int  not null default 0,
  output_tokens   int  not null default 0,
  cost_usd        numeric(12, 6),
  duration_ms     int,
  error           text,
  created_at      timestamptz not null default now(),
  finished_at     timestamptz
);
create index if not exists bank_generation_batches_time on public.bank_generation_batches (created_at desc);

-- -----------------------------------------------------------------------------
-- Questões
-- Um único "status" cobre revisão e publicação (máquina de estados no gatilho).
-- -----------------------------------------------------------------------------
create table if not exists public.bank_questions (
  id                   uuid primary key default gen_random_uuid(),
  seq                  bigint generated always as identity,
  public_code          text generated always as ('APV-' || lpad(seq::text, 6, '0')) stored unique,
  subject_id           uuid not null references public.subjects (id) on delete restrict,
  topic_id             uuid,
  source_id            uuid references public.question_sources (id) on delete restrict,
  exam_id              uuid references public.exams (id) on delete restrict,
  generation_batch_id  uuid references public.bank_generation_batches (id) on delete set null,
  -- prova anterior real / autoral humana / inédita com auxílio de IA
  origin               text not null check (origin in ('prova_anterior', 'autoral_humana', 'ia_assistida')),
  question_type        text not null check (question_type in ('multipla_escolha', 'certo_errado')),
  statement            text not null check (char_length(statement) between 10 and 6000),
  case_context         text check (char_length(case_context) <= 6000),
  -- banca de onde a questão VEIO (só prova anterior); estilo de cobrança é outra coisa
  board_slug           text references public.exam_boards (slug) on delete restrict,
  board_style          text references public.exam_boards (slug) on delete restrict,
  year                 int check (year between 1950 and 2100),
  original_number      text check (char_length(original_number) <= 20),
  initial_difficulty   text not null check (initial_difficulty in ('dificil', 'muito_dificil', 'extrema')),
  calibrated_difficulty text check (calibrated_difficulty in ('dificil', 'muito_dificil', 'extrema')),
  calibrated_at        timestamptz,
  correct_answer_true  boolean,
  justification        text check (char_length(justification) <= 6000),
  legal_basis          text check (char_length(legal_basis) <= 2000),
  usage_rights         text not null default 'nao_verificado'
                         check (usage_rights in ('nao_verificado', 'autorizado', 'proprio', 'uso_restrito', 'proibido')),
  status               text not null default 'rascunho' check (status in (
                         'rascunho', 'importada', 'aguardando_conferencia', 'em_revisao', 'correcao_necessaria',
                         'aprovada', 'publicada', 'suspensa', 'arquivada')),
  -- checklist obrigatório para aprovar (zerado quando o conteúdo muda)
  content_checked      boolean not null default false,
  answer_checked       boolean not null default false,
  source_checked       boolean not null default false,
  rights_checked       boolean not null default false,
  verified_at          date,
  reviewed_at          timestamptz,
  current_version      int  not null default 0,
  created_by           uuid not null references auth.users (id) on delete restrict,
  approved_by          uuid references auth.users (id) on delete restrict,
  approved_at          timestamptz,
  published_at         timestamptz,
  status_changed_by    uuid references auth.users (id) on delete restrict,
  change_reason        text check (char_length(change_reason) <= 2000),
  search               tsvector generated always as (
                         to_tsvector('portuguese'::regconfig, coalesce(statement, '') || ' ' || coalesce(case_context, ''))
                       ) stored,
  content_hash         text generated always as (md5(lower(regexp_replace(btrim(statement), '\s+', ' ', 'g')))) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  foreign key (topic_id, subject_id) references public.subject_topics (id, subject_id) on delete restrict,
  check ((question_type = 'certo_errado') = (correct_answer_true is not null)),
  -- não inventar procedência: concurso, ano e número só existem em prova anterior real
  check (origin = 'prova_anterior' or (exam_id is null and year is null and original_number is null and board_slug is null)),
  check (origin <> 'prova_anterior' or source_id is not null),
  -- "próprio" só para conteúdo autoral; prova anterior precisa de autorização
  check (usage_rights <> 'proprio' or origin in ('autoral_humana', 'ia_assistida'))
);
create index if not exists bank_questions_subject on public.bank_questions (subject_id, status);
create index if not exists bank_questions_topic on public.bank_questions (topic_id);
create index if not exists bank_questions_status on public.bank_questions (status);
create index if not exists bank_questions_hash on public.bank_questions (content_hash);
create index if not exists bank_questions_search on public.bank_questions using gin (search);
create index if not exists bank_questions_trgm on public.bank_questions using gin (statement extensions.gin_trgm_ops);

create table if not exists public.bank_question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.bank_questions (id) on delete cascade,
  label       text not null check (label in ('A', 'B', 'C', 'D', 'E')),
  text        text not null check (char_length(text) between 1 and 3000),
  sort_order  int  not null check (sort_order between 0 and 4),
  is_correct  boolean not null default false,
  explanation text check (char_length(explanation) <= 3000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (question_id, label),
  unique (question_id, sort_order)
);
create unique index if not exists bank_question_options_one_correct on public.bank_question_options (question_id) where is_correct;

-- Rastreabilidade normativa / jurisprudencial
create table if not exists public.bank_question_legal_refs (
  id               uuid primary key default gen_random_uuid(),
  question_id      uuid not null references public.bank_questions (id) on delete cascade,
  norm_name        text not null check (char_length(norm_name) between 2 and 200),
  norm_number      text check (char_length(norm_number) <= 60),
  norm_year        int check (norm_year between 1800 and 2100),
  article          text check (char_length(article) <= 30),
  paragraph        text check (char_length(paragraph) <= 30),
  item             text check (char_length(item) <= 30),
  letter           text check (char_length(letter) <= 10),
  official_url     text check (official_url ~ '^https://' and char_length(official_url) <= 2000),
  consulted_on     date not null,
  norm_version     text check (char_length(norm_version) <= 300),
  amendment_note   text check (char_length(amendment_note) <= 2000),
  case_law_court   text check (char_length(case_law_court) <= 60),
  case_law_id      text check (char_length(case_law_id) <= 120),
  case_law_thesis  text check (char_length(case_law_thesis) <= 2000),
  last_reviewed_on date,
  created_at       timestamptz not null default now(),
  -- jurisprudência precisa ser localizável: tribunal + identificação
  check ((case_law_court is null) = (case_law_id is null)),
  check (case_law_thesis is null or case_law_id is not null)
);
create index if not exists bank_question_legal_refs_q on public.bank_question_legal_refs (question_id);
create index if not exists bank_question_legal_refs_norm on public.bank_question_legal_refs (norm_number, article);

-- Versões congeladas (imutáveis)
create table if not exists public.bank_question_versions (
  id               uuid primary key default gen_random_uuid(),
  question_id      uuid not null references public.bank_questions (id) on delete restrict,
  version          int  not null check (version >= 1),
  previous_version int,
  snapshot         jsonb not null,
  reason           text,
  changed_by       uuid references auth.users (id) on delete restrict,
  source_id        uuid references public.question_sources (id) on delete restrict,
  review_result    text not null,
  notes            text,
  created_at       timestamptz not null default now(),
  unique (question_id, version)
);

-- Decisões humanas (registradas automaticamente a cada mudança de status)
create table if not exists public.bank_question_reviews (
  id          bigint generated always as identity primary key,
  question_id uuid not null references public.bank_questions (id) on delete cascade,
  reviewer_id uuid references auth.users (id) on delete set null,
  from_status text,
  to_status   text not null,
  checklist   jsonb not null default '{}'::jsonb,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists bank_question_reviews_q on public.bank_question_reviews (question_id, created_at desc);

-- Análises por IA (a confiança declarada NÃO é prova de correção)
create table if not exists public.bank_question_ai_reviews (
  id                  uuid primary key default gen_random_uuid(),
  question_id         uuid not null references public.bank_questions (id) on delete cascade,
  provider            text not null,
  model               text not null,
  prompt_version      text not null,
  result              jsonb not null,
  alerts              jsonb not null default '[]'::jsonb,
  declared_confidence numeric(4, 3) check (declared_confidence between 0 and 1),
  human_status        text not null default 'pendente' check (human_status in ('pendente', 'aceita', 'rejeitada')),
  input_tokens        int not null default 0,
  output_tokens       int not null default 0,
  cost_usd            numeric(12, 6),
  duration_ms         int,
  created_at          timestamptz not null default now()
);
create index if not exists bank_question_ai_reviews_q on public.bank_question_ai_reviews (question_id, created_at desc);

-- Alertas: erro relatado, duplicidade, desatualização, ambiguidade, divergência, direitos
create table if not exists public.bank_question_flags (
  id                  uuid primary key default gen_random_uuid(),
  question_id         uuid not null references public.bank_questions (id) on delete cascade,
  kind                text not null check (kind in ('erro_relatado', 'duplicidade', 'desatualizada', 'ambiguidade', 'divergencia_juridica', 'direitos')),
  status              text not null default 'aberto' check (status in ('aberto', 'em_analise', 'resolvido', 'descartado')),
  details             text check (char_length(details) <= 4000),
  similar_question_id uuid references public.bank_questions (id) on delete set null,
  similarity          numeric(4, 3),
  reported_by         uuid references auth.users (id) on delete set null,
  resolved_by         uuid references auth.users (id) on delete set null,
  resolved_at         timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists bank_question_flags_open on public.bank_question_flags (status, kind) where status in ('aberto', 'em_analise');
create index if not exists bank_question_flags_q on public.bank_question_flags (question_id);

-- -----------------------------------------------------------------------------
-- Importação (Fase 4): arquivo → itens para conferência → questões
-- -----------------------------------------------------------------------------
create table if not exists public.question_imports (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references auth.users (id) on delete restrict,
  source_id   uuid references public.question_sources (id) on delete restrict,
  exam_id     uuid references public.exams (id) on delete restrict,
  kind        text not null check (kind in ('pdf_prova', 'pdf_gabarito', 'csv', 'json')),
  file_path   text,
  file_name   text check (char_length(file_name) <= 300),
  file_sha256 text check (file_sha256 ~ '^[0-9a-f]{64}$'),
  file_size   int check (file_size between 1 and 20000000),
  status      text not null default 'recebido' check (status in ('recebido', 'processando', 'aguardando_conferencia', 'concluido', 'falhou', 'cancelado')),
  stats       jsonb not null default '{}'::jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.question_import_items (
  id            uuid primary key default gen_random_uuid(),
  import_id     uuid not null references public.question_imports (id) on delete cascade,
  item_number   int not null,
  parsed        jsonb not null,
  issues        jsonb not null default '[]'::jsonb,
  duplicate_of  uuid references public.bank_questions (id) on delete set null,
  similarity    numeric(4, 3),
  decision      text not null default 'pendente' check (decision in ('pendente', 'aceito', 'rejeitado')),
  question_id   uuid references public.bank_questions (id) on delete set null,
  decided_by    uuid references auth.users (id) on delete set null,
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (import_id, item_number)
);

-- -----------------------------------------------------------------------------
-- Tentativas (respostas individuais) e estatísticas agregadas
-- -----------------------------------------------------------------------------
create table if not exists public.ranked_seasons (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name          text not null check (char_length(name) between 2 and 120),
  status        text not null default 'planejada' check (status in ('planejada', 'ativa', 'encerrada')),
  starts_at     timestamptz,
  ends_at       timestamptz,
  -- distribuição obrigatória por matéria e faixa de dificuldade (ver ranked_default_blueprint)
  blueprint     jsonb not null,
  -- regras de pontuação gravadas para auditoria (copiadas para cada partida)
  scoring_rules jsonb not null,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.ranked_forms (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references public.ranked_seasons (id) on delete restrict,
  code        text not null check (code ~ '^[A-Z0-9-]{1,20}$'),
  status      text not null default 'rascunho' check (status in ('rascunho', 'validada', 'ativa', 'retirada')),
  validated_at timestamptz,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (season_id, code)
);

create table if not exists public.ranked_form_items (
  form_id     uuid not null references public.ranked_forms (id) on delete restrict,
  position    int  not null check (position between 1 and 500),
  question_id uuid not null,
  version     int  not null,
  subject_id  uuid not null references public.subjects (id) on delete restrict,
  topic_id    uuid,
  tier        text not null check (tier in ('dificil', 'muito_dificil', 'extrema')),
  primary key (form_id, position),
  unique (form_id, question_id),
  foreign key (question_id, version) references public.bank_question_versions (question_id, version) on delete restrict
);

create table if not exists public.ranked_matches (
  id               uuid primary key default gen_random_uuid(),
  season_id        uuid not null references public.ranked_seasons (id) on delete restrict,
  form_id          uuid not null references public.ranked_forms (id) on delete restrict,
  user_id          uuid not null references auth.users (id) on delete cascade,
  status           text not null default 'em_andamento' check (status in ('em_andamento', 'finalizada', 'anulada')),
  started_at       timestamptz not null default now(),
  deadline_at      timestamptz,
  finished_at      timestamptz,
  correct_count    int,
  score            numeric(10, 3),
  scoring_snapshot jsonb not null,
  elo_before       int,
  elo_after        int,
  -- a mesma prova não se repete para o mesmo participante
  unique (user_id, form_id)
);
create index if not exists ranked_matches_season on public.ranked_matches (season_id, status);

create table if not exists public.ranked_item_invalidations (
  form_id     uuid not null references public.ranked_forms (id) on delete restrict,
  position    int  not null,
  rule        text not null check (rule in ('anular_conta_acerto', 'remover_item')),
  reason      text not null check (char_length(reason) between 5 and 2000),
  decided_by  uuid not null references auth.users (id) on delete restrict,
  created_at  timestamptz not null default now(),
  primary key (form_id, position),
  foreign key (form_id, position) references public.ranked_form_items (form_id, position) on delete restrict
);

create table if not exists public.ranked_ratings (
  season_id  uuid not null references public.ranked_seasons (id) on delete restrict,
  user_id    uuid not null references auth.users (id) on delete cascade,
  elo        int  not null default 1000,
  matches    int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

create table if not exists public.bank_attempts (
  id             bigint generated always as identity primary key,
  question_id    uuid not null,
  version        int  not null,
  user_id        uuid not null references auth.users (id) on delete cascade,
  context        text not null check (context in ('ranked', 'simulado', 'treino')),
  match_id       uuid references public.ranked_matches (id) on delete cascade,
  position       int,
  selected_label text check (selected_label in ('A', 'B', 'C', 'D', 'E')),
  answer_bool    boolean,
  omitted        boolean not null default false,
  is_correct     boolean not null,
  duration_ms    int check (duration_ms between 0 and 3600000),
  created_at     timestamptz not null default now(),
  foreign key (question_id, version) references public.bank_question_versions (question_id, version) on delete restrict,
  check ((context = 'ranked') = (match_id is not null and position is not null)),
  check (not omitted or (selected_label is null and answer_bool is null and not is_correct))
);
-- uma resposta por item de partida (não dá para reenviar)
create unique index if not exists bank_attempts_match_item on public.bank_attempts (match_id, position) where match_id is not null;
create index if not exists bank_attempts_question on public.bank_attempts (question_id, version);

create table if not exists public.bank_question_stats (
  question_id    uuid not null references public.bank_questions (id) on delete cascade,
  version        int  not null,
  attempts       int  not null default 0,
  correct        int  not null default 0,
  omitted        int  not null default 0,
  median_ms      int,
  p_value        numeric(5, 4),
  discrimination numeric(5, 4),
  low_sample     boolean not null default true,
  computed_at    timestamptz not null default now(),
  primary key (question_id, version)
);

-- -----------------------------------------------------------------------------
-- Gatilhos de integridade
-- -----------------------------------------------------------------------------
create or replace function public.bank_questions_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  allowed text[];
  content_changed boolean;
  n_opts int;
  n_correct int;
  src record;
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if new.status not in ('rascunho', 'importada', 'aguardando_conferencia') then
      raise exception 'Questão nova começa como rascunho, importada ou aguardando conferência.' using errcode = 'check_violation';
    end if;
    new.approved_by := null; new.approved_at := null; new.published_at := null; new.current_version := 0;
    new.content_checked := false; new.answer_checked := false; new.source_checked := false; new.rights_checked := false;
    return new;
  end if;

  if new.created_by is distinct from old.created_by or new.current_version < old.current_version then
    raise exception 'Autoria e versão não podem ser alteradas.' using errcode = 'check_violation';
  end if;

  content_changed :=
       new.statement is distinct from old.statement
    or new.case_context is distinct from old.case_context
    or new.question_type is distinct from old.question_type
    or new.correct_answer_true is distinct from old.correct_answer_true
    or new.justification is distinct from old.justification
    or new.subject_id is distinct from old.subject_id
    or new.topic_id is distinct from old.topic_id
    or new.legal_basis is distinct from old.legal_basis
    or new.initial_difficulty is distinct from old.initial_difficulty
    or new.origin is distinct from old.origin;

  if old.status in ('aprovada', 'publicada', 'suspensa') and (
       content_changed
    or new.source_id is distinct from old.source_id
    or new.usage_rights is distinct from old.usage_rights
    or new.exam_id is distinct from old.exam_id
    or new.year is distinct from old.year
    or new.board_slug is distinct from old.board_slug
    or new.original_number is distinct from old.original_number) then
    raise exception 'Questão aprovada, publicada ou suspensa não pode ser editada: devolva para revisão (gera nova versão).' using errcode = 'check_violation';
  end if;

  if content_changed then
    new.content_checked := false;
    new.answer_checked := false;
  end if;
  if new.source_id is distinct from old.source_id or new.usage_rights is distinct from old.usage_rights then
    new.source_checked := false;
    new.rights_checked := false;
  end if;

  if new.status is not distinct from old.status then
    if new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at
       or new.published_at is distinct from old.published_at or new.current_version <> old.current_version then
      raise exception 'Aprovação e versão só mudam junto com a mudança de status.' using errcode = 'check_violation';
    end if;
    if old.status in ('aprovada', 'publicada', 'suspensa') and (
         new.content_checked <> old.content_checked or new.answer_checked <> old.answer_checked
      or new.source_checked <> old.source_checked or new.rights_checked <> old.rights_checked) then
      raise exception 'Checklist de questão aprovada não pode ser alterado.' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- Mudança de status ----------------------------------------------------------
  if new.status_changed_by is null then
    raise exception 'Informe quem mudou o status.' using errcode = 'check_violation';
  end if;

  allowed := case old.status
    when 'rascunho'               then array['aguardando_conferencia', 'em_revisao', 'arquivada']
    when 'importada'              then array['aguardando_conferencia', 'arquivada']
    when 'aguardando_conferencia' then array['em_revisao', 'correcao_necessaria', 'arquivada']
    when 'em_revisao'             then array['aprovada', 'correcao_necessaria', 'arquivada']
    when 'correcao_necessaria'    then array['em_revisao', 'arquivada']
    when 'aprovada'               then array['publicada', 'em_revisao', 'suspensa', 'arquivada']
    when 'publicada'              then array['suspensa', 'em_revisao', 'arquivada']
    when 'suspensa'               then array['em_revisao', 'arquivada']
    when 'arquivada'              then array['rascunho']
  end;
  if not (new.status = any (allowed)) then
    raise exception 'Transição de status não permitida: % → %.', old.status, new.status using errcode = 'check_violation';
  end if;

  if new.status = 'aprovada' then
    if new.approved_by is null or new.approved_by is distinct from new.status_changed_by then
      raise exception 'A aprovação precisa ser registrada por quem aprova.' using errcode = 'check_violation';
    end if;
    if new.approved_by = new.created_by then
      raise exception 'Quem criou a questão não pode aprová-la: é preciso outro revisor.' using errcode = 'check_violation';
    end if;
    if not public.has_bank_role(new.approved_by, 'revisor') then
      raise exception 'Somente revisores podem aprovar questões.' using errcode = 'insufficient_privilege';
    end if;
    if not (new.content_checked and new.answer_checked and new.source_checked and new.rights_checked) then
      raise exception 'Checklist incompleto: confira conteúdo, gabarito, fonte e direito de uso.' using errcode = 'check_violation';
    end if;
    if new.usage_rights not in ('autorizado', 'proprio') then
      raise exception 'Direito de uso não permite aprovação (%).', new.usage_rights using errcode = 'check_violation';
    end if;
    if new.source_id is not null then
      select s.status, s.reuse_verified into src from public.question_sources s where s.id = new.source_id;
      if src.status in ('bloqueada', 'arquivada') then
        raise exception 'A fonte da questão está bloqueada ou arquivada.' using errcode = 'check_violation';
      end if;
      if new.origin = 'prova_anterior' and not src.reuse_verified then
        raise exception 'Prova anterior só pode ser aprovada com autorização de reutilização verificada na fonte.' using errcode = 'check_violation';
      end if;
    end if;
    if coalesce(char_length(btrim(new.justification)), 0) < 10 then
      raise exception 'Justificativa do gabarito é obrigatória.' using errcode = 'check_violation';
    end if;
    select count(*), count(*) filter (where o.is_correct) into n_opts, n_correct
      from public.bank_question_options o where o.question_id = new.id;
    if new.question_type = 'multipla_escolha' and (n_opts < 2 or n_correct <> 1) then
      raise exception 'Múltipla escolha precisa de 2 a 5 alternativas e exatamente uma correta.' using errcode = 'check_violation';
    end if;
    if new.question_type = 'certo_errado' and n_opts > 0 then
      raise exception 'Questão certo/errado não tem alternativas.' using errcode = 'check_violation';
    end if;
    new.approved_at := now();
    new.reviewed_at := now();
    new.current_version := old.current_version + 1;
  elsif new.status = 'publicada' then
    if new.current_version < 1 or new.approved_by is null then
      raise exception 'Só questões aprovadas (com versão gerada) podem ser publicadas.' using errcode = 'check_violation';
    end if;
    if new.approved_by is distinct from old.approved_by then
      raise exception 'Aprovação não pode ser trocada na publicação.' using errcode = 'check_violation';
    end if;
    new.published_at := now();
  elsif new.status = 'suspensa' then
    if new.approved_by is distinct from old.approved_by then
      raise exception 'Aprovação não pode ser trocada na suspensão.' using errcode = 'check_violation';
    end if;
  else
    -- volta para revisão/correção/rascunho/arquivo: aprovação e checklist deixam de valer
    new.approved_by := null; new.approved_at := null; new.published_at := null;
    new.content_checked := false; new.answer_checked := false; new.source_checked := false; new.rights_checked := false;
    if new.status = 'em_revisao' then new.reviewed_at := now(); end if;
  end if;
  return new;
end $$;
create or replace trigger bank_questions_guard before insert or update on public.bank_questions
  for each row execute function public.bank_questions_guard();

-- Depois da mudança de status: registra a decisão e, na aprovação, congela a versão.
create or replace function public.bank_questions_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  snap jsonb;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.bank_question_reviews (question_id, reviewer_id, from_status, to_status, checklist, notes)
    values (new.id, new.status_changed_by, old.status, new.status,
            jsonb_build_object('conteudo', old.content_checked, 'gabarito', old.answer_checked,
                               'fonte', old.source_checked, 'direitos', old.rights_checked),
            new.change_reason);
    if new.status = 'aprovada' then
      select jsonb_build_object(
        'public_code', new.public_code,
        'subject_id', new.subject_id, 'topic_id', new.topic_id, 'source_id', new.source_id, 'exam_id', new.exam_id,
        'origin', new.origin, 'question_type', new.question_type, 'statement', new.statement,
        'case_context', new.case_context, 'board_slug', new.board_slug, 'board_style', new.board_style,
        'year', new.year, 'original_number', new.original_number, 'difficulty', new.initial_difficulty,
        'correct_answer_true', new.correct_answer_true, 'justification', new.justification,
        'legal_basis', new.legal_basis, 'usage_rights', new.usage_rights,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object('label', o.label, 'text', o.text, 'is_correct', o.is_correct,
                                              'explanation', o.explanation, 'sort_order', o.sort_order) order by o.sort_order)
          from public.bank_question_options o where o.question_id = new.id), '[]'::jsonb),
        'legal_refs', coalesce((
          select jsonb_agg(to_jsonb(r) - 'question_id' - 'created_at' order by r.created_at)
          from public.bank_question_legal_refs r where r.question_id = new.id), '[]'::jsonb)
      ) into snap;
      insert into public.bank_question_versions (question_id, version, previous_version, snapshot, reason, changed_by, source_id, review_result, notes)
      values (new.id, new.current_version, nullif(old.current_version, 0), snap,
              coalesce(new.change_reason, 'Aprovação'), new.approved_by, new.source_id, 'aprovada', new.change_reason);
    end if;
  end if;
  return null;
end $$;
create or replace trigger bank_questions_after after update on public.bank_questions
  for each row execute function public.bank_questions_after();

-- Alternativas e referências fazem parte do conteúdo: travadas após aprovação.
create or replace function public.bank_child_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  qid uuid := case when tg_op = 'DELETE' then old.question_id else new.question_id end;
  st text;
begin
  select q.status into st from public.bank_questions q where q.id = qid;
  if st in ('aprovada', 'publicada', 'suspensa') then
    raise exception 'Questão aprovada, publicada ou suspensa não pode ser editada: devolva para revisão.' using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and new.question_id <> old.question_id then
    raise exception 'Não é possível mover para outra questão.' using errcode = 'check_violation';
  end if;
  if st is not null then
    update public.bank_questions q set content_checked = false, answer_checked = false
      where q.id = qid and (q.content_checked or q.answer_checked);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_table_name = 'bank_question_options' then new.updated_at := now(); end if;
  return new;
end $$;
create or replace trigger bank_options_guard before insert or update or delete on public.bank_question_options
  for each row execute function public.bank_child_guard();
create or replace trigger bank_legal_refs_guard before insert or update or delete on public.bank_question_legal_refs
  for each row execute function public.bank_child_guard();

-- Versões: somente inserção.
create or replace function public.immutable_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Registro imutável (%).', tg_table_name using errcode = 'check_violation';
end $$;
create or replace trigger bank_question_versions_immutable before update or delete on public.bank_question_versions
  for each row execute function public.immutable_row();
create or replace trigger bank_question_reviews_immutable before update on public.bank_question_reviews
  for each row execute function public.immutable_row();

-- -----------------------------------------------------------------------------
-- Ranked: distribuição padrão (120 questões) e validação das provas
-- -----------------------------------------------------------------------------
create or replace function public.ranked_default_blueprint() returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('total', 120, 'subjects', jsonb_build_array(
    jsonb_build_object('subject', 'lingua-portuguesa',        'count', 10, 'tiers', jsonb_build_object('dificil', 4, 'muito_dificil', 4, 'extrema', 2)),
    jsonb_build_object('subject', 'informatica',              'count', 10, 'tiers', jsonb_build_object('dificil', 4, 'muito_dificil', 4, 'extrema', 2)),
    jsonb_build_object('subject', 'matematica',               'count', 10, 'tiers', jsonb_build_object('dificil', 4, 'muito_dificil', 4, 'extrema', 2)),
    jsonb_build_object('subject', 'direito-penal',            'count', 15, 'tiers', jsonb_build_object('dificil', 6, 'muito_dificil', 6, 'extrema', 3)),
    jsonb_build_object('subject', 'direito-constitucional',   'count', 15, 'tiers', jsonb_build_object('dificil', 6, 'muito_dificil', 6, 'extrema', 3)),
    jsonb_build_object('subject', 'direitos-humanos',         'count', 15, 'tiers', jsonb_build_object('dificil', 6, 'muito_dificil', 6, 'extrema', 3)),
    jsonb_build_object('subject', 'direito-processual-penal', 'count', 15, 'tiers', jsonb_build_object('dificil', 6, 'muito_dificil', 6, 'extrema', 3)),
    jsonb_build_object('subject', 'legislacao-especial',      'count', 15, 'tiers', jsonb_build_object('dificil', 6, 'muito_dificil', 6, 'extrema', 3)),
    jsonb_build_object('subject', 'direito-administrativo',   'count', 15, 'tiers', jsonb_build_object('dificil', 6, 'muito_dificil', 6, 'extrema', 3))
  ));
$$;

-- Itens: só questões PUBLICADAS na versão vigente; prova validada não muda mais.
create or replace function public.ranked_form_items_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  fst text;
  q record;
  snap jsonb;
begin
  select f.status into fst from public.ranked_forms f
    where f.id = case when tg_op = 'DELETE' then old.form_id else new.form_id end;
  if fst is distinct from 'rascunho' then
    raise exception 'Prova validada/ativa/retirada não pode ser alterada.' using errcode = 'check_violation';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  select b.status, b.current_version into q from public.bank_questions b where b.id = new.question_id;
  if q.status is distinct from 'publicada' or q.current_version <> new.version then
    raise exception 'Só entram na prova questões publicadas, na versão vigente.' using errcode = 'check_violation';
  end if;
  select v.snapshot into snap from public.bank_question_versions v where v.question_id = new.question_id and v.version = new.version;
  new.subject_id := (snap ->> 'subject_id')::uuid;
  new.topic_id := (snap ->> 'topic_id')::uuid;
  new.tier := snap ->> 'difficulty';
  return new;
end $$;
create or replace trigger ranked_form_items_guard before insert or update or delete on public.ranked_form_items
  for each row execute function public.ranked_form_items_guard();

-- Validação: quantidades por matéria e por faixa exatamente iguais ao blueprint da temporada
-- (é o que garante provas equivalentes entre participantes).
create or replace function public.ranked_form_problems(p_form uuid) returns text[]
language plpgsql stable set search_path = '' as $$
declare
  bp jsonb;
  s jsonb;
  t record;
  problems text[] := '{}';
  sid uuid;
  n int;
  total int;
begin
  select se.blueprint into bp from public.ranked_forms f join public.ranked_seasons se on se.id = f.season_id where f.id = p_form;
  if bp is null then return array['Prova não encontrada.']; end if;
  select count(*) into total from public.ranked_form_items i where i.form_id = p_form;
  if total <> (bp ->> 'total')::int then
    problems := problems || format('Total de questões: %s (esperado %s).', total, bp ->> 'total');
  end if;
  for s in select * from jsonb_array_elements(bp -> 'subjects') loop
    select su.id into sid from public.subjects su where su.slug = s ->> 'subject';
    if sid is null then
      problems := problems || format('Matéria inexistente no blueprint: %s.', s ->> 'subject');
      continue;
    end if;
    select count(*) into n from public.ranked_form_items i where i.form_id = p_form and i.subject_id = sid;
    if n <> (s ->> 'count')::int then
      problems := problems || format('%s: %s questões (esperado %s).', s ->> 'subject', n, s ->> 'count');
    end if;
    for t in select key, value from jsonb_each_text(s -> 'tiers') loop
      select count(*) into n from public.ranked_form_items i where i.form_id = p_form and i.subject_id = sid and i.tier = t.key;
      if n <> t.value::int then
        problems := problems || format('%s / %s: %s (esperado %s).', s ->> 'subject', t.key, n, t.value);
      end if;
    end loop;
  end loop;
  if exists (
    select 1 from public.ranked_form_items i join public.bank_questions b on b.id = i.question_id
    where i.form_id = p_form and (b.status <> 'publicada' or b.current_version <> i.version)
  ) then
    problems := problems || 'Há questões que deixaram de estar publicadas na versão usada.'::text;
  end if;
  return problems;
end $$;

create or replace function public.ranked_forms_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  problems text[];
begin
  if new.status is distinct from old.status then
    if not (
         (old.status = 'rascunho' and new.status = 'validada')
      or (old.status = 'validada' and new.status in ('ativa', 'rascunho', 'retirada'))
      or (old.status = 'ativa' and new.status = 'retirada')) then
      raise exception 'Transição de prova não permitida: % → %.', old.status, new.status using errcode = 'check_violation';
    end if;
    if new.status = 'validada' then
      problems := public.ranked_form_problems(new.id);
      if cardinality(problems) > 0 then
        raise exception 'Prova fora do blueprint: %', array_to_string(problems, ' ') using errcode = 'check_violation';
      end if;
      new.validated_at := now();
    end if;
    if new.status = 'rascunho' and exists (select 1 from public.ranked_matches m where m.form_id = new.id) then
      raise exception 'Prova já usada em partida não volta a rascunho.' using errcode = 'check_violation';
    end if;
  elsif new.season_id is distinct from old.season_id or new.code is distinct from old.code then
    raise exception 'Temporada e código da prova não mudam.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create or replace trigger ranked_forms_guard before update on public.ranked_forms
  for each row execute function public.ranked_forms_guard();

-- Temporada ativa ou encerrada: blueprint e regras de pontuação ficam congelados.
create or replace function public.ranked_seasons_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status <> 'planejada' and (new.blueprint is distinct from old.blueprint or new.scoring_rules is distinct from old.scoring_rules) then
    raise exception 'Regras de temporada ativa/encerrada não podem mudar.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create or replace trigger ranked_seasons_guard before update on public.ranked_seasons
  for each row execute function public.ranked_seasons_guard();

-- -----------------------------------------------------------------------------
-- Funções de apoio (servidor)
-- -----------------------------------------------------------------------------
-- Duplicidade: semelhança textual (trigramas). Gera alerta, não conclusão.
create or replace function public.bank_similar_questions(p_text text, p_subject uuid default null, p_threshold real default 0.45, p_exclude uuid default null)
returns table (question_id uuid, public_code text, status text, similarity real)
language sql stable set search_path = '' as $$
  select b.id, b.public_code, b.status, extensions.similarity(b.statement, p_text) as sim
  from public.bank_questions b
  where (p_subject is null or b.subject_id = p_subject)
    and (p_exclude is null or b.id <> p_exclude)
    and b.status <> 'arquivada'
    and extensions.similarity(b.statement, p_text) >= greatest(p_threshold, 0.2)
  order by sim desc
  limit 10;
$$;

-- Atualização legislativa: sinaliza questões ligadas a uma norma/artigo alterado.
create or replace function public.bank_flag_outdated(p_norm_number text, p_article text, p_actor uuid, p_details text)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if not public.has_bank_role(p_actor, 'revisor') then
    raise exception 'Somente revisores.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.bank_question_flags (question_id, kind, details, reported_by)
  select distinct r.question_id, 'desatualizada', p_details, p_actor
  from public.bank_question_legal_refs r
  join public.bank_questions b on b.id = r.question_id and b.status <> 'arquivada'
  where r.norm_number = p_norm_number
    and (p_article is null or r.article = p_article)
    and not exists (
      select 1 from public.bank_question_flags f
      where f.question_id = r.question_id and f.kind = 'desatualizada' and f.status in ('aberto', 'em_analise'));
  get diagnostics n = row_count;
  return n;
end $$;

-- -----------------------------------------------------------------------------
-- Privilégios e RLS: nada para o cliente; política restritiva explícita em cada tabela
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'staff_roles', 'subjects', 'subject_topics', 'exams', 'question_sources', 'bank_generation_batches',
    'bank_questions', 'bank_question_options', 'bank_question_legal_refs', 'bank_question_versions',
    'bank_question_reviews', 'bank_question_ai_reviews', 'bank_question_flags', 'question_imports',
    'question_import_items', 'ranked_seasons', 'ranked_forms', 'ranked_form_items', 'ranked_matches',
    'ranked_item_invalidations', 'ranked_ratings', 'bank_attempts', 'bank_question_stats'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy "sem acesso direto do cliente" on public.%I as restrictive for all to anon, authenticated using (false) with check (false)', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

revoke all on function public.has_bank_role(uuid, text) from public, anon, authenticated;
revoke all on function public.bank_similar_questions(text, uuid, real, uuid) from public, anon, authenticated;
revoke all on function public.bank_flag_outdated(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.ranked_form_problems(uuid) from public, anon, authenticated;
revoke all on function public.ranked_default_blueprint() from public, anon, authenticated;
grant execute on function public.has_bank_role(uuid, text) to service_role;
grant execute on function public.bank_similar_questions(text, uuid, real, uuid) to service_role;
grant execute on function public.bank_flag_outdated(text, text, uuid, text) to service_role;
grant execute on function public.ranked_form_problems(uuid) to service_role;
grant execute on function public.ranked_default_blueprint() to service_role;

-- Funções de gatilho: ninguém as chama por RPC.
revoke all on function public.bank_questions_after() from public, anon, authenticated;
revoke all on function public.bank_questions_guard() from public, anon, authenticated;
revoke all on function public.bank_child_guard() from public, anon, authenticated;
revoke all on function public.immutable_row() from public, anon, authenticated;
revoke all on function public.subject_topics_guard() from public, anon, authenticated;
revoke all on function public.ranked_form_items_guard() from public, anon, authenticated;
revoke all on function public.ranked_forms_guard() from public, anon, authenticated;
revoke all on function public.ranked_seasons_guard() from public, anon, authenticated;
