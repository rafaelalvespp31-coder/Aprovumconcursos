-- OPERAÇÃO APROVUM — tour guiado e tutoriais por ferramenta.
-- * student_tutorial_progress: progresso de cada aluno em cada tutorial (uma linha por aluno+tutorial; retomada, pular, concluir).
-- * tutorial_settings: o admin liga/desliga cada tutorial (todos podem ler; só o servidor escreve).
-- * tutorial_stats(): números agregados para o admin (sem dados pessoais).
-- Nada aqui altera tabelas existentes.
--
-- Rollback:
--   drop function if exists public.tutorial_stats();
--   drop table if exists public.student_tutorial_progress; drop table if exists public.tutorial_settings;

create table if not exists public.student_tutorial_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  tutorial_id  text not null check (tutorial_id ~ '^[a-z0-9-]{2,40}$'),
  current_step integer not null default 0 check (current_step between 0 and 99),
  completed    boolean not null default false,
  skipped      boolean not null default false,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, tutorial_id)
);
create index if not exists student_tutorial_progress_tutorial on public.student_tutorial_progress (tutorial_id);

create trigger student_tutorial_progress_updated before update on public.student_tutorial_progress
  for each row execute function public.set_updated_at();

alter table public.student_tutorial_progress enable row level security;
alter table public.student_tutorial_progress force row level security;
create policy "dono le" on public.student_tutorial_progress for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.student_tutorial_progress for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono atualiza" on public.student_tutorial_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.student_tutorial_progress from anon, authenticated;
grant select, insert, update on public.student_tutorial_progress to authenticated;
grant all on public.student_tutorial_progress to service_role;

create table if not exists public.tutorial_settings (
  tutorial_id text primary key check (tutorial_id ~ '^[a-z0-9-]{2,40}$'),
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now()
);
alter table public.tutorial_settings enable row level security;
alter table public.tutorial_settings force row level security;
create policy "todos leem" on public.tutorial_settings for select to authenticated using (true);
revoke all on public.tutorial_settings from anon, authenticated;
grant select on public.tutorial_settings to authenticated;
grant all on public.tutorial_settings to service_role;

insert into public.tutorial_settings (tutorial_id) values
  ('tour-completo'), ('estudos'), ('aula'), ('mentor'), ('questoes'), ('jogo'), ('revisoes'), ('desempenho'), ('concursos'), ('perfil')
on conflict (tutorial_id) do nothing;

-- Números agregados (sem identificar ninguém): quantos começaram, concluíram, pularam e onde os demais pararam.
create or replace function public.tutorial_stats()
returns table (tutorial_id text, iniciaram bigint, concluiram bigint, pularam bigint, abandonos jsonb)
language sql stable security definer set search_path = '' as $$
  select p.tutorial_id,
         count(*) as iniciaram,
         count(*) filter (where p.completed) as concluiram,
         count(*) filter (where p.skipped and not p.completed) as pularam,
         coalesce((select jsonb_object_agg(s.step::text, s.n)
                   from (select q.current_step as step, count(*) as n
                         from public.student_tutorial_progress q
                         where q.tutorial_id = p.tutorial_id and not q.completed
                         group by q.current_step) s), '{}'::jsonb) as abandonos
  from public.student_tutorial_progress p
  group by p.tutorial_id
$$;
revoke all on function public.tutorial_stats() from public, anon, authenticated;
grant execute on function public.tutorial_stats() to service_role;
