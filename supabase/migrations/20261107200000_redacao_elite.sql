-- APROVUM REDAÇÃO ELITE: temas, redações, avaliações, erros, competências, reescritas, exercícios, rubricas e uso de IA.
-- Aluno só LÊ o que é dele (RLS); toda escrita passa pelo servidor (service_role) com a posse validada.

create table if not exists public.writing_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.writing_rubrics (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version int not null default 1,
  modality text not null,
  board text,
  name text not null,
  criteria jsonb not null,
  max_score numeric not null check (max_score > 0),
  estimated boolean not null default false,
  source_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (key, version)
);

create table if not exists public.writing_themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,        -- nulo = proposta da equipe (visível a todos)
  category_slug text,
  mode text not null default 'categoria' check (mode in ('surpreenda','categoria','atualidades','simulado','equipe')),
  difficulty text not null default 'intermediario' check (difficulty in ('basico','intermediario','avancado','especialista')),
  title text not null,
  context text not null default '',
  problem text not null default '',
  motivators jsonb not null default '[]'::jsonb,
  command text not null,
  genre text not null default 'dissertativo-argumentativo',
  lines_min int,
  lines_max int,
  guidance text,
  board text,
  verified boolean not null default false,                          -- true só quando houver fontes datadas verificadas
  sources jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists writing_themes_user on public.writing_themes(user_id, created_at desc);

create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme_id uuid references public.writing_themes(id) on delete set null,
  theme_title text,
  theme_text text,
  title text not null default '',
  body text not null default '',
  modality text not null default 'enem',
  board text,
  contest text,
  criteria_text text,                                               -- critérios do edital/espelho colados pelo aluno
  line_limit int,
  parent_id uuid references public.writing_submissions(id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','processando','concluida','falhou')),
  word_count int not null default 0,
  char_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists writing_submissions_user on public.writing_submissions(user_id, created_at desc);

create table if not exists public.writing_evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'processando' check (status in ('processando','concluida','falhou')),
  stage text,
  rubric_key text not null,
  rubric_version int not null,
  modality text not null,
  estimated boolean not null default false,
  model text,
  provider text,
  score numeric,
  max_score numeric,
  zero_reason text,
  analysis jsonb,
  diagnostic jsonb,
  plan jsonb,
  consistency_notes jsonb,
  error text,
  attempts int not null default 0,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_usd numeric,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists writing_evaluations_sub on public.writing_evaluations(submission_id, created_at desc);
create index if not exists writing_evaluations_user on public.writing_evaluations(user_id, created_at desc);

create table if not exists public.writing_competencies (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.writing_evaluations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  score numeric not null,
  max_score numeric not null,
  level int,
  justification text not null,
  position int not null default 0
);
create index if not exists writing_competencies_eval on public.writing_competencies(evaluation_id, position);

create table if not exists public.writing_errors (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.writing_evaluations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  kind text not null check (kind in ('erro_objetivo','problema_construcao','fragilidade_argumentativa','oportunidade','estilistica')),
  severity text not null check (severity in ('leve','moderada','grave')),
  start_offset int not null check (start_offset >= 0),
  end_offset int not null check (end_offset > start_offset),
  paragraph int,
  excerpt text not null,
  issue text not null,
  explanation text not null,
  rule text,
  suggestion text,
  example text,
  position int not null default 0
);
create index if not exists writing_errors_eval on public.writing_errors(evaluation_id, start_offset);
create index if not exists writing_errors_user_cat on public.writing_errors(user_id, category);

create table if not exists public.writing_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  to_submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  comparison jsonb,
  status text not null default 'pendente' check (status in ('pendente','concluida','falhou')),
  created_at timestamptz not null default now(),
  unique (from_submission_id, to_submission_id)
);

create table if not exists public.writing_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evaluation_id uuid references public.writing_evaluations(id) on delete set null,
  topic text not null,
  category text not null,
  explanation text,
  questions jsonb not null,
  answer_key jsonb,
  answers jsonb,
  feedback jsonb,
  score numeric,
  max_score numeric,
  status text not null default 'aberto' check (status in ('aberto','corrigido')),
  created_at timestamptz not null default now(),
  corrected_at timestamptz
);
create index if not exists writing_exercises_user on public.writing_exercises(user_id, created_at desc);

create table if not exists public.writing_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null,
  ok boolean not null default true,
  model text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_usd numeric,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists writing_usage_day on public.writing_usage(created_at desc);
create index if not exists writing_usage_user on public.writing_usage(user_id, created_at desc);

-- RLS
do $$
declare t text;
begin
  foreach t in array array['writing_categories','writing_rubrics','writing_themes','writing_submissions','writing_evaluations','writing_competencies','writing_errors','writing_revisions','writing_exercises','writing_usage'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  foreach t in array array['writing_categories','writing_rubrics','writing_themes','writing_submissions','writing_evaluations','writing_competencies','writing_errors','writing_revisions'] loop
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

create policy writing_categories_read on public.writing_categories for select to authenticated using (active);
create policy writing_rubrics_read on public.writing_rubrics for select to authenticated using (active);
create policy writing_themes_read on public.writing_themes for select to authenticated using (user_id is null or user_id = auth.uid());
create policy writing_submissions_own on public.writing_submissions for select to authenticated using (user_id = auth.uid());
create policy writing_evaluations_own on public.writing_evaluations for select to authenticated using (user_id = auth.uid());
create policy writing_competencies_own on public.writing_competencies for select to authenticated using (user_id = auth.uid());
create policy writing_errors_own on public.writing_errors for select to authenticated using (user_id = auth.uid());
create policy writing_revisions_own on public.writing_revisions for select to authenticated using (user_id = auth.uid());
-- writing_exercises: sem acesso direto do aluno (guarda o gabarito); leitura só pelo servidor, com a posse validada.
-- writing_usage: sem política para aluno (só servidor/admin via service_role).

insert into public.writing_categories (slug, name, sort) values
 ('atualidades-mundo','Atualidades e mundo',10),('historia-sociedade','História e sociedade',20),('tecnologia-inovacao','Tecnologia e inovação',30),
 ('inteligencia-artificial','Inteligência artificial',40),('educacao','Educação',50),('saude-publica','Saúde pública',60),
 ('seguranca-publica','Segurança pública',70),('direito-cidadania','Direito e cidadania',80),('meio-ambiente','Meio ambiente',90),
 ('sustentabilidade','Sustentabilidade',100),('arte-cultura','Arte e cultura',110),('literatura','Literatura',120),
 ('ciencia-pesquisa','Ciência e pesquisa',130),('economia-trabalho','Economia e trabalho',140),('desigualdade-social','Desigualdade social',150),
 ('comportamento-humano','Comportamento humano',160),('transformacoes-digitais','Transformações digitais',170),('geopolitica','Geopolítica',180),
 ('politica-internacional','Política internacional',190),('direitos-humanos','Direitos humanos',200),('mobilidade-urbana','Mobilidade urbana',210),
 ('comunicacao-midia','Comunicação e mídia',220),('etica','Ética',230),('familia-sociedade','Família e sociedade',240),('relacoes-trabalho','Relações de trabalho',250)
on conflict (slug) do nothing;
