-- Menu Questões: cadernos de questões (filtros salvos do banco de questões de concurso),
-- avisos da plataforma e o mapa anual de estudo ("Investida").

-- ---------------------------------------------------------------------------
-- Cadernos: cada aluno vê e altera só os seus.
-- ---------------------------------------------------------------------------
create table if not exists public.question_notebooks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text not null check (char_length(btrim(title)) between 1 and 80),
  subject_id     uuid references public.subjects (id) on delete set null,
  exam_id        uuid references public.exams (id) on delete set null,
  board_slug     text references public.exam_boards (slug) on delete set null,
  question_type  text check (question_type in ('multipla_escolha', 'certo_errado')),
  pinned         boolean not null default false,
  last_opened_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists question_notebooks_user_recent on public.question_notebooks (user_id, (coalesce(last_opened_at, created_at)) desc);

drop trigger if exists question_notebooks_updated on public.question_notebooks;
create trigger question_notebooks_updated before update on public.question_notebooks
  for each row execute function public.set_updated_at();

alter table public.question_notebooks enable row level security;
drop policy if exists "dono le" on public.question_notebooks;
drop policy if exists "dono cria" on public.question_notebooks;
drop policy if exists "dono altera" on public.question_notebooks;
drop policy if exists "dono apaga" on public.question_notebooks;
create policy "dono le" on public.question_notebooks for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.question_notebooks for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono altera" on public.question_notebooks for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.question_notebooks for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, update, delete on public.question_notebooks to authenticated;

-- No máximo 100 cadernos por aluno.
create or replace function public.question_notebooks_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.question_notebooks where user_id = new.user_id) >= 100 then
    raise exception 'Limite de 100 cadernos atingido.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.question_notebooks_limit() from public, anon, authenticated;
drop trigger if exists question_notebooks_limit on public.question_notebooks;
create trigger question_notebooks_limit before insert on public.question_notebooks
  for each row execute function public.question_notebooks_limit();

-- Respostas dadas dentro de um caderno ficam ligadas a ele (desempenho por caderno).
alter table public.bank_attempts add column if not exists notebook_id uuid references public.question_notebooks (id) on delete set null;
create index if not exists bank_attempts_user_notebook on public.bank_attempts (user_id, notebook_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Avisos da plataforma (carrossel). Leitura pública só dos ativos e dentro do período;
-- escrita apenas pelo servidor/administração (sem política de escrita para o cliente).
-- ---------------------------------------------------------------------------
create table if not exists public.app_notices (
  id          uuid primary key default gen_random_uuid(),
  kicker      text check (char_length(kicker) <= 40),
  title       text not null check (char_length(title) between 1 and 60),
  highlight   text check (char_length(highlight) <= 40),
  body        text not null check (char_length(body) between 1 and 160),
  cta_label   text not null default 'Acessar agora' check (char_length(cta_label) between 1 and 30),
  href        text not null check (href ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  image       text check (image ~ '^/[A-Za-z0-9/_.-]+$'),
  active      boolean not null default true,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.app_notices enable row level security;
drop policy if exists "avisos ativos" on public.app_notices;
create policy "avisos ativos" on public.app_notices for select to authenticated
  using (active and starts_at <= now() and (ends_at is null or ends_at > now()));
grant select on public.app_notices to authenticated;

insert into public.app_notices (kicker, title, highlight, body, cta_label, href, image, sort_order)
select 'Conheça os novos', 'Cadernos de', 'Questões', 'Monte cadernos por matéria, concurso e banca e treine com questões de concurso revisadas.', 'Criar caderno', '/questoes/cadernos/novo', '/images/jogo-hero-arte-sm.webp', 0
where not exists (select 1 from public.app_notices where href = '/questoes/cadernos/novo');

-- ---------------------------------------------------------------------------
-- Mapa anual de estudo: respostas por dia (aulas, Modo Jogo e cadernos), só do próprio aluno.
-- ---------------------------------------------------------------------------
create or replace function public.my_year_activity(p_year int, p_tz text default 'America/Sao_Paulo')
returns table (day date, answers int)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as uid),
  bounds as (select make_date(greatest(least(p_year, 2100), 2000), 1, 1) as d0),
  ev as (
    select (a.created_at at time zone p_tz)::date as day from public.answer_attempts a, me where a.user_id = me.uid
    union all
    select (q.created_at at time zone p_tz)::date from public.quiz_attempts q, me where q.user_id = me.uid
    union all
    select (b.created_at at time zone p_tz)::date from public.bank_attempts b, me where b.user_id = me.uid
  )
  select ev.day, count(*)::int
  from ev, bounds
  where (select uid from me) is not null
    and ev.day >= bounds.d0 and ev.day < (bounds.d0 + interval '1 year')::date
  group by ev.day
  order by ev.day;
$$;
revoke all on function public.my_year_activity(int, text) from public, anon;
grant execute on function public.my_year_activity(int, text) to authenticated;
