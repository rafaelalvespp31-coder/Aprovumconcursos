-- Desafio direto: o aluno escolhe quem desafiar; o desafiado recebe um card em qualquer página.
-- Mesma regra de segurança: nenhuma tabela/função acessível ao cliente; tudo via service_role com o id da sessão.
create table if not exists public.tatico_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now()
);
create table if not exists public.tatico_challenges (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','aceito','recusado','expirado','cancelado')),
  reason text,
  match_id uuid references public.tatico_matches (id) on delete set null,
  seen_by_sender boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '60 seconds'),
  responded_at timestamptz,
  check (from_user <> to_user)
);
create index if not exists tatico_ch_to on public.tatico_challenges (to_user, status, created_at desc);
create index if not exists tatico_ch_from on public.tatico_challenges (from_user, created_at desc);

do $$ declare t text; begin
  foreach t in array array['tatico_presence','tatico_challenges'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)', 'tatico: sem acesso direto', t);
  end loop;
end $$;

create or replace function public.tatico_nome(p_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(split_part(btrim(p.display_name), ' ', 1), '') || coalesce(' ' || left(nullif(split_part(btrim(p.display_name), ' ', 2), ''), 1) || '.', ''), 'Aluno APROVUM')
  from (select 1) d left join public.profiles p on p.id = p_id;
$$;

-- cria a partida (usada pelo aceite do desafio): p1 = quem desafiou
create or replace function public.tatico_criar_partida(p_p1 uuid, p_p2 uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare mid uuid; dia date := public.tatico_dia();
begin
  delete from public.tatico_queue where user_id in (p_p1, p_p2);
  insert into public.tatico_matches (p1, p2, status, phase, phase_until, day)
    values (p_p1, p_p2, 'aguardando_inicio', 'contagem', now() + interval '9 seconds', dia) returning id into mid;
  insert into public.tatico_match_questions (match_id, pos, source, question_id, snapshot)
    select mid, (row_number() over (order by random()))::int, s.source, s.qid, s.snap
    from (select * from public.tatico_pool() order by random() limit 10) s;
  insert into public.tatico_daily (user_id, day, used) values (p_p1, dia, 1), (p_p2, dia, 1)
    on conflict (user_id, day) do update set used = least(3, public.tatico_daily.used + 1);
  return mid;
end $$;

create or replace function public.tatico_buscar(p_user uuid, p_q text default '')
returns table (id uuid, name text, online boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, public.tatico_nome(p.id),
         coalesce((select pr.seen_at > now() - interval '90 seconds' from public.tatico_presence pr where pr.user_id = p.id), false) as online
  from public.profiles p
  where p.id <> p_user and nullif(btrim(p.display_name), '') is not null
    and ( (length(btrim(coalesce(p_q, ''))) >= 2 and p.display_name ilike '%' || btrim(p_q) || '%')
       or (length(btrim(coalesce(p_q, ''))) < 2 and exists (select 1 from public.tatico_presence pr where pr.user_id = p.id and pr.seen_at > now() - interval '15 minutes')) )
  order by 3 desc, 2 asc
  limit 20;
$$;

create or replace function public.tatico_desafiar(p_user uuid, p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare dia date := public.tatico_dia(); u1 int; u2 int; id uuid; n int;
begin
  perform pg_advisory_xact_lock(hashtext('tatico_fila'));
  update public.tatico_challenges set status = 'expirado' where status = 'pendente' and expires_at < now();
  if p_target is null or p_target = p_user or not exists (select 1 from public.profiles where profiles.id = p_target) then
    return jsonb_build_object('ok', false, 'erro', 'aluno_invalido'); end if;
  select coalesce(used, 0) into u1 from public.tatico_daily where user_id = p_user and day = dia;
  select coalesce(used, 0) into u2 from public.tatico_daily where user_id = p_target and day = dia;
  if coalesce(u1, 0) >= 3 then return jsonb_build_object('ok', false, 'erro', 'seu_limite'); end if;
  if coalesce(u2, 0) >= 3 then return jsonb_build_object('ok', false, 'erro', 'limite_dele'); end if;
  if exists (select 1 from public.tatico_matches where status not in ('finalizada','cancelada') and p_user in (p1, p2)) then
    return jsonb_build_object('ok', false, 'erro', 'voce_em_partida'); end if;
  if exists (select 1 from public.tatico_matches where status not in ('finalizada','cancelada') and p_target in (p1, p2)) then
    return jsonb_build_object('ok', false, 'erro', 'ele_em_partida'); end if;
  if exists (select 1 from public.tatico_challenges where from_user = p_user and status = 'pendente') then
    return jsonb_build_object('ok', false, 'erro', 'ja_pendente'); end if;
  select count(*) into n from public.tatico_challenges where from_user = p_user and created_at > now() - interval '1 hour';
  if n >= 10 then return jsonb_build_object('ok', false, 'erro', 'muitos_desafios'); end if;
  if (select count(*) from public.tatico_pool()) < 10 then return jsonb_build_object('ok', false, 'erro', 'sem_questoes'); end if;
  insert into public.tatico_challenges (from_user, to_user) values (p_user, p_target) returning tatico_challenges.id into id;
  return jsonb_build_object('ok', true, 'id', id, 'para', public.tatico_nome(p_target));
end $$;

create or replace function public.tatico_desafios(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare ent record; sai record; ativa boolean; r_ent jsonb := null; r_sai jsonb := null;
begin
  insert into public.tatico_presence (user_id, seen_at) values (p_user, now())
    on conflict (user_id) do update set seen_at = now();
  update public.tatico_challenges set status = 'expirado', responded_at = now() where status = 'pendente' and expires_at < now() and (from_user = p_user or to_user = p_user);
  ativa := exists (select 1 from public.tatico_matches where status not in ('finalizada','cancelada') and p_user in (p1, p2));
  if not ativa then
    select c.id, c.from_user, c.expires_at into ent from public.tatico_challenges c
      where c.to_user = p_user and c.status = 'pendente' order by c.created_at desc limit 1;
    if found then r_ent := jsonb_build_object('id', ent.id, 'de', public.tatico_nome(ent.from_user),
      'ms', greatest(0, (extract(epoch from (ent.expires_at - now())) * 1000)::int)); end if;
  end if;
  select c.id, c.to_user, c.status, c.reason, c.match_id, c.expires_at, c.seen_by_sender into sai from public.tatico_challenges c
    where c.from_user = p_user and c.created_at > now() - interval '10 minutes'
      and (c.status = 'pendente' or not c.seen_by_sender) order by c.created_at desc limit 1;
  if found then
    r_sai := jsonb_build_object('id', sai.id, 'para', public.tatico_nome(sai.to_user), 'status', sai.status, 'reason', sai.reason, 'match', sai.match_id,
      'ms', greatest(0, (extract(epoch from (sai.expires_at - now())) * 1000)::int));
    if sai.status <> 'pendente' then update public.tatico_challenges set seen_by_sender = true where id = sai.id; end if;
  end if;
  return jsonb_build_object('entrada', r_ent, 'saida', r_sai);
end $$;

create or replace function public.tatico_responder_desafio(p_user uuid, p_id uuid, p_aceitar boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.tatico_challenges%rowtype; dia date := public.tatico_dia(); u1 int; u2 int; mid uuid;
begin
  perform pg_advisory_xact_lock(hashtext('tatico_fila'));
  select * into c from public.tatico_challenges where id = p_id for update;
  if not found or c.to_user <> p_user then return jsonb_build_object('ok', false, 'erro', 'sem_acesso'); end if;
  if c.status <> 'pendente' or c.expires_at < now() then
    if c.status = 'pendente' then update public.tatico_challenges set status = 'expirado', responded_at = now() where id = p_id; end if;
    return jsonb_build_object('ok', false, 'erro', 'expirado');
  end if;
  if not p_aceitar then
    update public.tatico_challenges set status = 'recusado', reason = 'recusou', responded_at = now() where id = p_id;
    return jsonb_build_object('ok', true, 'estado', 'recusado');
  end if;
  select coalesce(used, 0) into u1 from public.tatico_daily where user_id = c.from_user and day = dia;
  select coalesce(used, 0) into u2 from public.tatico_daily where user_id = c.to_user and day = dia;
  if coalesce(u1, 0) >= 3 or coalesce(u2, 0) >= 3
     or exists (select 1 from public.tatico_matches where status not in ('finalizada','cancelada') and (c.from_user in (p1, p2) or c.to_user in (p1, p2))) then
    update public.tatico_challenges set status = 'recusado', reason = 'indisponivel', responded_at = now() where id = p_id;
    return jsonb_build_object('ok', false, 'erro', 'indisponivel');
  end if;
  mid := public.tatico_criar_partida(c.from_user, c.to_user);
  update public.tatico_challenges set status = 'aceito', match_id = mid, responded_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'estado', 'aceito', 'match', mid);
end $$;

create or replace function public.tatico_cancelar_desafio(p_user uuid, p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.tatico_challenges set status = 'cancelado', responded_at = now(), seen_by_sender = true
  where id = p_id and from_user = p_user and status = 'pendente';
$$;

do $$ declare f text; begin
  foreach f in array array['tatico_nome(uuid)','tatico_criar_partida(uuid,uuid)','tatico_buscar(uuid,text)','tatico_desafiar(uuid,uuid)','tatico_desafios(uuid)','tatico_responder_desafio(uuid,uuid,boolean)','tatico_cancelar_desafio(uuid,uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
