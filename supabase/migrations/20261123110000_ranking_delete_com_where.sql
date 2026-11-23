-- Correção da 20261123100000: o Supabase bloqueia DELETE sem WHERE nas chamadas da API ("DELETE requires a WHERE clause"),
-- então o recálculo do ranking falhava nas chamadas reais. Mesma função, com "where true".
create or replace function public.refresh_ranking_xp() returns void language plpgsql security definer set search_path = '' as $$
begin
  if not pg_try_advisory_xact_lock(7246001) then return; end if;
  delete from public.ranking_xp_cache where true;
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
