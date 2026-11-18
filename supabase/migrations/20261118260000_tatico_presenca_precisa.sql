-- Presença precisa: online = visto há < 15 s (heartbeat com a plataforma aberta); marca quem está em partida.
drop function if exists public.tatico_buscar(uuid, text);
create function public.tatico_buscar(p_user uuid, p_q text default '')
returns table (id uuid, name text, online boolean, em_partida boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, public.tatico_nome(p.id), true as online,
         exists (select 1 from public.tatico_matches m where m.status not in ('finalizada','cancelada') and p.id in (m.p1, m.p2)) as em_partida
  from public.profiles p
  where p.id <> p_user and nullif(btrim(p.display_name), '') is not null
    and exists (select 1 from public.tatico_presence pr where pr.user_id = p.id and pr.seen_at > now() - interval '15 seconds')
    and (length(btrim(coalesce(p_q, ''))) < 2 or p.display_name ilike '%' || btrim(p_q) || '%')
  order by 4 asc, 2 asc
  limit 40;
$$;
create or replace function public.tatico_sair(p_user uuid)
returns void language sql volatile security definer set search_path = '' as $$
  update public.tatico_presence set seen_at = now() - interval '1 hour' where user_id = p_user;
$$;
revoke all on function public.tatico_buscar(uuid, text), public.tatico_sair(uuid) from public, anon, authenticated;
grant execute on function public.tatico_buscar(uuid, text), public.tatico_sair(uuid) to service_role;
