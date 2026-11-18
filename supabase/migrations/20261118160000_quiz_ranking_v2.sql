-- Ranking do Modo Jogo v2: posições ÚNICAS (1,2,3… sem empates repetidos), período (hoje/semana/geral),
-- acertos e total de participantes. Desempate: XP, acertos, menos questões, quem chegou primeiro.
-- Expõe só primeiro nome + inicial, nunca e-mail ou id. Rollback: recriar a versão de 20261104001100.
drop function if exists public.quiz_ranking(int);
drop function if exists public.quiz_ranking(int, text);
create or replace function public.quiz_ranking(p_limit int default 20, p_period text default 'geral')
returns table (pos int, name text, xp int, answered int, hits int, is_me boolean, motto text, total int)
language sql stable security definer set search_path = '' as $$
  with ini as (
    select case p_period
      when 'hoje' then (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo'
      when 'semana' then (date_trunc('week', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo'
      else '-infinity'::timestamptz end as t
  ), s as (
    select a.user_id, sum(a.xp)::int as xp, count(*)::int as answered,
           count(*) filter (where a.correct)::int as hits, min(a.created_at) as first_at
    from public.quiz_attempts a, ini
    where a.created_at >= ini.t
    group by a.user_id
    having sum(a.xp) > 0
  ), r as (
    select s.*, (row_number() over (order by s.xp desc, s.hits desc, s.answered asc, s.first_at asc, s.user_id))::int as pos,
           (count(*) over ())::int as total
    from s
  )
  select r.pos,
         coalesce(
           nullif(split_part(btrim(p.display_name), ' ', 1), '')
             || coalesce(' ' || left(nullif(split_part(btrim(p.display_name), ' ', 2), ''), 1) || '.', ''),
           'Aluno APROVUM'
         ) as name,
         r.xp, r.answered, r.hits,
         r.user_id = (select auth.uid()) as is_me,
         nullif(btrim(p.motto), '') as motto,
         r.total
  from r
  left join public.profiles p on p.id = r.user_id
  where r.pos <= least(greatest(p_limit, 1), 100) or r.user_id = (select auth.uid())
  order by r.pos;
$$;
revoke all on function public.quiz_ranking(int, text) from public, anon;
grant execute on function public.quiz_ranking(int, text) to authenticated;
