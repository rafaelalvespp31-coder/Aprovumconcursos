-- Alivia o banco nos picos (segunda 09:40 houve fila e erros 504). Aditiva; nenhuma tabela de dados é alterada.
-- 1) Ranking: antes recalculava o XP de TODOS os alunos (varrendo answer_attempts/quiz_attempts/learning_progress) a cada abertura do painel.
--    Agora lê um retrato guardado, recalculado no máximo 1x por minuto (mesma fórmula). Pode atrasar até 60 s para refletir uma resposta nova.
-- 2) Contagem de questões do painel inicial feita no banco (antes o app baixava até 5.000 questões + 5.000 respostas).
-- 3) Índice por aluno em questions (a RLS filtra por user_id e não havia índice: varredura da tabela inteira, ~0,6 s por chamada).
-- Rollback: recriar my_ranking_position() com a definição anterior (migração 20261103*); drop function my_question_counts, refresh_ranking_xp;
--           drop table ranking_xp_cache, ranking_xp_meta; drop index questions_user_active_idx.

create table if not exists public.ranking_xp_cache (user_id uuid primary key, xp integer not null);
create table if not exists public.ranking_xp_meta (id smallint primary key default 1 check (id = 1), refreshed_at timestamptz not null default timestamptz 'epoch');
insert into public.ranking_xp_meta (id) values (1) on conflict (id) do nothing;
alter table public.ranking_xp_cache enable row level security;
alter table public.ranking_xp_meta enable row level security;
revoke all on public.ranking_xp_cache, public.ranking_xp_meta from anon, authenticated;

create or replace function public.refresh_ranking_xp() returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Se outra chamada já está recalculando, usa o retrato atual.
  if not pg_try_advisory_xact_lock(7246001) then return; end if;
  delete from public.ranking_xp_cache;
  insert into public.ranking_xp_cache (user_id, xp)
  with students as (
    select u.id from auth.users u
    where not exists (select 1 from public.admin_roles a where a.user_id = u.id)
      and not exists (select 1 from public.partner_accounts s where s.user_id = u.id)
  ), correct as (
    select user_id, count(*) filter (where is_correct) as n from public.answer_attempts group by user_id
  ), lp as (
    select user_id,
           count(*) filter (where state in ('aguardando_dominio','dominada')) as passed,
           count(*) filter (where state = 'dominada') as mastered
    from public.learning_progress group by user_id
  ), days as (
    select user_id, count(distinct (created_at at time zone 'America/Sao_Paulo')::date) as n
    from (select user_id, created_at from public.answer_attempts union all select user_id, created_at from public.quiz_attempts) x
    group by user_id
  )
  select s.id, (coalesce(c.n, 0) * 10 + coalesce(l.passed, 0) * 100 + coalesce(l.mastered, 0) * 150 + coalesce(d.n, 0) * 20)::integer
  from students s left join correct c on c.user_id = s.id left join lp l on l.user_id = s.id left join days d on d.user_id = s.id;
  update public.ranking_xp_meta set refreshed_at = now() where id = 1;
end $$;
revoke all on function public.refresh_ranking_xp() from public, anon, authenticated;

create or replace function public.my_ranking_position() returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_xp integer;
begin
  if v_uid is null then return jsonb_build_object('posicao', null, 'total', 0); end if;
  if (select refreshed_at from public.ranking_xp_meta where id = 1) < now() - interval '60 seconds' then
    perform public.refresh_ranking_xp();
  end if;
  select coalesce((select xp from public.ranking_xp_cache where user_id = v_uid), 0) into v_xp;
  return jsonb_build_object('posicao', 1 + (select count(*) from public.ranking_xp_cache where xp > v_xp), 'total', (select count(*) from public.ranking_xp_cache));
end $$;

create or replace function public.my_question_counts() returns jsonb language sql stable set search_path = '' as $$
  with answered as (select distinct question_id from public.answer_attempts where user_id = (select auth.uid())),
  q as (select id, difficulty from public.questions where active and user_id = (select auth.uid()))
  select jsonb_build_object(
    'total', count(*),
    'unanswered', count(*) filter (where a.question_id is null),
    'facil', count(*) filter (where a.question_id is null and q.difficulty <= 2),
    'medio', count(*) filter (where a.question_id is null and q.difficulty = 3),
    'dificil', count(*) filter (where a.question_id is null and q.difficulty >= 4))
  from q left join answered a on a.question_id = q.id;
$$;
revoke all on function public.my_question_counts() from public, anon;
grant execute on function public.my_question_counts() to authenticated;

create index if not exists questions_user_active_idx on public.questions (user_id) include (difficulty) where active;
