-- Catálogo Estratégico de Concursos (alimenta o RAIO-X). Independente do catálogo de aulas, ligado a ele por título/ID.
create table if not exists public.strategic_exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  organ text,
  status text not null default 'rascunho' check (status in ('rascunho','em_revisao','aprovado','publicado','arquivado')),
  limitations text,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.strategic_positions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.strategic_exams(id) on delete cascade,
  name text not null,
  unique (exam_id, name)
);
create table if not exists public.strategic_editions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.strategic_exams(id) on delete cascade,
  year int not null check (year between 1990 and 2100),
  board text,
  total_questions int check (total_questions is null or total_questions > 0),
  counting_rule text,
  notes text,
  unique (exam_id, year, board)
);
create table if not exists public.strategic_sources (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.strategic_exams(id) on delete cascade,
  key text,
  kind text not null default 'oficial' check (kind in ('oficial','extraido','propria')),
  name text not null,
  url text,
  page int,
  organ text,
  published_at date,
  consulted_at date,
  reviewer text,
  notes text
);
create table if not exists public.strategic_cutoffs (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.strategic_exams(id) on delete cascade,
  edition_id uuid not null references public.strategic_editions(id) on delete cascade,
  position_name text,
  modality text not null default 'ampla' check (modality in ('ampla','pcd','negros','indigenas','quilombolas','outra')),
  stage text,
  kind text not null check (kind in ('minima_aprovacao','corte_primeira_fase','ultimo_classificado','ultimo_convocado','ultimo_dentro_vagas')),
  score numeric not null,
  max_score numeric,
  candidates int,
  criterion text,
  source_id uuid references public.strategic_sources(id) on delete set null,
  source_page int,
  verified_at date
);
create table if not exists public.strategic_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.strategic_exams(id) on delete cascade,
  edition_id uuid not null references public.strategic_editions(id) on delete cascade,
  name text not null,
  mode text,
  questions int not null check (questions >= 0),
  annulled int not null default 0 check (annulled >= 0)
);
create table if not exists public.strategic_topics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.strategic_exams(id) on delete cascade,
  subject_id uuid not null references public.strategic_subjects(id) on delete cascade,
  edition_id uuid not null references public.strategic_editions(id) on delete cascade,
  title text not null,
  title_key text not null,
  questions int not null check (questions >= 0),
  annulled int not null default 0 check (annulled >= 0)
);
create table if not exists public.strategic_recommendations (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.strategic_exams(id) on delete cascade,
  priority text not null check (priority in ('maxima','alta','complementar')),
  subject text,
  topic text not null,
  justification text not null,
  position int not null default 0
);
create table if not exists public.strategic_imports (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  status text not null default 'aplicada' check (status in ('aplicada','descartada')),
  exam_id uuid references public.strategic_exams(id) on delete set null,
  summary jsonb,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists strategic_editions_exam on public.strategic_editions(exam_id, year desc);
create index if not exists strategic_subjects_ed on public.strategic_subjects(edition_id);
create index if not exists strategic_topics_subj on public.strategic_topics(subject_id);
create index if not exists strategic_topics_exam on public.strategic_topics(exam_id, title_key);
create index if not exists strategic_cutoffs_ed on public.strategic_cutoffs(edition_id);
create index if not exists strategic_reco_exam on public.strategic_recommendations(exam_id, position);
create index if not exists strategic_sources_exam on public.strategic_sources(exam_id);

alter table public.edital_preparations add column if not exists strategic_exam_id uuid references public.strategic_exams(id) on delete set null;

-- RLS: aluno só lê dados de concursos PUBLICADOS; escrita só pelo servidor (service_role).
do $$
declare t text;
begin
  foreach t in array array['strategic_exams','strategic_positions','strategic_editions','strategic_sources','strategic_cutoffs','strategic_subjects','strategic_topics','strategic_recommendations','strategic_imports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
  foreach t in array array['strategic_exams','strategic_positions','strategic_editions','strategic_sources','strategic_cutoffs','strategic_subjects','strategic_topics','strategic_recommendations'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  execute 'grant all on public.strategic_imports to service_role';
end $$;
create policy strategic_exams_pub on public.strategic_exams for select to authenticated using (status = 'publicado');
do $$
declare t text;
begin
  foreach t in array array['strategic_positions','strategic_editions','strategic_sources','strategic_cutoffs','strategic_subjects','strategic_topics','strategic_recommendations'] loop
    execute format('create policy %I on public.%I for select to authenticated using (exists (select 1 from public.strategic_exams e where e.id = exam_id and e.status = ''publicado''))', t || '_pub', t);
  end loop;
end $$;
