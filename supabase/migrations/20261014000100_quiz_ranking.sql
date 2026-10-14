-- Ranking do Modo Jogo entre todos os alunos da plataforma.
-- Expõe só posição, primeiro nome + inicial do sobrenome, XP e questões respondidas — nunca e-mail ou id.
create or replace function public.quiz_ranking(p_limit int default 20)
returns table (pos int, name text, xp int, answered int, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with s as (
    select user_id, sum(xp)::int as xp, count(*)::int as answered
    from public.quiz_attempts
    group by user_id
  ), r as (
    select user_id, xp, answered, (rank() over (order by xp desc, answered asc))::int as pos
    from s
  )
  select r.pos,
         coalesce(
           nullif(split_part(btrim(p.display_name), ' ', 1), '')
             || coalesce(' ' || left(nullif(split_part(btrim(p.display_name), ' ', 2), ''), 1) || '.', ''),
           'Aluno APROVUM'
         ) as name,
         r.xp,
         r.answered,
         r.user_id = (select auth.uid()) as is_me
  from r
  left join public.profiles p on p.id = r.user_id
  where r.pos <= least(greatest(p_limit, 1), 100) or r.user_id = (select auth.uid())
  order by r.pos, r.answered
  limit least(greatest(p_limit, 1), 100) + 1;
$$;
revoke all on function public.quiz_ranking(int) from public, anon;
grant execute on function public.quiz_ranking(int) to authenticated;
