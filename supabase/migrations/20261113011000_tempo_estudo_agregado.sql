-- Tempo de estudo somado no banco (antes: até 50 mil linhas por abertura da página).
create or replace function public.my_study_seconds()
returns bigint language sql stable security invoker set search_path = public
as $$ select coalesce(sum(time_spent_seconds), 0)::bigint from public.answer_attempts where user_id = auth.uid() $$;

-- Segundos por semana: índice 0 = semana mais antiga; a última posição é a semana atual.
create or replace function public.my_study_weeks(p_weeks integer default 4)
returns table (idx integer, seconds bigint) language sql stable security invoker set search_path = public
as $$
  select (p_weeks - 1 - floor(extract(epoch from (now() - a.created_at)) / 604800))::int as idx, coalesce(sum(a.time_spent_seconds), 0)::bigint
  from public.answer_attempts a
  where a.user_id = auth.uid() and a.time_spent_seconds is not null and a.created_at >= now() - make_interval(days => p_weeks * 7)
  group by 1
$$;
revoke all on function public.my_study_seconds() from public, anon;
revoke all on function public.my_study_weeks(integer) from public, anon;
grant execute on function public.my_study_seconds() to authenticated;
grant execute on function public.my_study_weeks(integer) to authenticated;
