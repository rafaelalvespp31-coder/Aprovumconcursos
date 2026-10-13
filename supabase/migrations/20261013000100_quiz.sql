-- Quiz "Complete a lei": respostas do aluno (XP e progresso por dispositivo do catálogo).
-- Gravação só pelo servidor (service_role), depois de conferir a resposta; o aluno só lê as próprias.

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.catalog_topics (id) on delete cascade,
  node_key text not null check (node_key ~ '^N[0-9]{4}$'),
  correct boolean not null,
  xp int not null default 0 check (xp between 0 and 50),
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_time on public.quiz_attempts (user_id, created_at desc);
create index if not exists quiz_attempts_user_topic on public.quiz_attempts (user_id, topic_id);

alter table public.quiz_attempts enable row level security;

create policy "quiz: aluno lê as próprias respostas" on public.quiz_attempts
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.quiz_attempts from anon, authenticated;
grant select on public.quiz_attempts to authenticated;
grant select, insert on public.quiz_attempts to service_role;

-- Sequência de estudo (ofensiva): dias com questão respondida OU quiz feito.
create or replace function public.my_study_stats(p_tz text default 'America/Sao_Paulo')
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with a as (
    select is_correct, (created_at at time zone p_tz)::date as d
    from public.answer_attempts
    where user_id = (select auth.uid())
  ), q as (
    select (created_at at time zone p_tz)::date as d
    from public.quiz_attempts
    where user_id = (select auth.uid())
  ), per_day as (
    select d, count(*)::int as n from (select d from a union all select d from q) x group by d
  ), lp as (
    select lesson_id, state from public.learning_progress where user_id = (select auth.uid())
  ), mods as (
    select m.id,
           count(l.id) as total,
           count(l.id) filter (where p.state in ('aguardando_dominio', 'dominada')) as passed
    from public.learning_modules m
    join public.lessons l on l.module_id = m.id and l.user_id = m.user_id
    left join lp p on p.lesson_id = l.id
    where m.user_id = (select auth.uid())
    group by m.id
  )
  select jsonb_build_object(
    'answered', (select count(*) from a),
    'correct', (select count(*) from a where is_correct),
    'activeDays', coalesce((select jsonb_agg(x.d order by x.d desc) from (select d from per_day order by d desc limit 400) x), '[]'::jsonb),
    'maxInDay', coalesce((select max(n) from per_day), 0),
    'themesPassed', (select count(*) from lp where state in ('aguardando_dominio', 'dominada')),
    'themesMastered', (select count(*) from lp where state = 'dominada'),
    'modulesClosed', (select count(*) from mods where total > 0 and passed = total),
    'today', (now() at time zone p_tz)::date
  );
$$;
revoke all on function public.my_study_stats(text) from public, anon;
grant execute on function public.my_study_stats(text) to authenticated;
