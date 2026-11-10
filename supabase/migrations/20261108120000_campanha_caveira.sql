-- Campanha "O CAVEIRA FICOU MALUCO — 7 DIAS DE ACESSO PREMIUM".
--
-- Acesso premium TEMPORÁRIO por aluno, sem mexer no plano gravado (subscriptions) nem nos pagamentos.
-- * promo_campaigns: a campanha (duração, plano cujos limites valem, ativa ou não).
-- * promo_grants: uma concessão por aluno e por campanha (unique), com início/fim no relógio do banco,
--   status e registro de quando o aluno viu a popup.
-- A validade é conferida a cada verificação (expires_at > now()); nada depende de rotina agendada.
-- A campanha nasce DESATIVADA: o admin ativa no painel depois do deploy, e só então todos recebem os 7 dias.
-- Escrita só pelo servidor (service_role) ou por funções security definer; o aluno só lê a própria concessão.
--
-- Rollback:
--   drop trigger if exists promo_on_auth_user_created on auth.users;
--   drop function if exists public.promo_on_signup(), public.promo_grant(text, uuid, text, uuid),
--     public.promo_grant_all(text, uuid), public.promo_set_active(text, boolean, uuid),
--     public.promo_extend(uuid, int, uuid), public.promo_ensure(uuid), public.promo_refresh_status(),
--     public.promo_quota_plan(uuid);
--   drop table if exists public.promo_grants; drop table if exists public.promo_campaigns;
--   (e reaplicar consume_quota de 20261010000500_study_tools.sql)

create table if not exists public.promo_campaigns (
  id             text primary key check (id ~ '^[a-z0-9-]{3,60}$'),
  name           text not null check (char_length(name) between 3 and 120),
  plan_id        text not null references public.plans (id),
  duration_days  integer not null check (duration_days between 1 and 90),
  active         boolean not null default false,
  activated_at   timestamptz,
  deactivated_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.promo_grants (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   text not null references public.promo_campaigns (id),
  user_id       uuid not null references auth.users (id) on delete cascade,
  starts_at     timestamptz not null default now(),
  expires_at    timestamptz not null,
  status        text not null default 'ativo' check (status in ('ativo', 'expirado', 'revogado')),
  source        text not null check (source in ('global', 'cadastro', 'login', 'manual')),
  popup_seen_at timestamptz,
  granted_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Uma concessão por aluno e por campanha: logins/cadastros simultâneos não duplicam nem reiniciam.
  unique (campaign_id, user_id),
  check (expires_at > starts_at)
);
create index if not exists promo_grants_user on public.promo_grants (user_id, expires_at desc);
create index if not exists promo_grants_campaign on public.promo_grants (campaign_id, expires_at);

alter table public.promo_campaigns enable row level security;
alter table public.promo_campaigns force row level security;
alter table public.promo_grants enable row level security;
alter table public.promo_grants force row level security;
create policy "dono le" on public.promo_grants for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.promo_campaigns, public.promo_grants from anon, authenticated;
grant select on public.promo_grants to authenticated;
grant all on public.promo_campaigns, public.promo_grants to service_role;

insert into public.promo_campaigns (id, name, plan_id, duration_days, active)
values ('caveira-ficou-maluco', 'O CAVEIRA FICOU MALUCO — 7 DIAS DE ACESSO PREMIUM', 'premium', 7, false)
on conflict (id) do nothing;

-- Concessão idempotente para um aluno. Automática (global/cadastro/login) só com a campanha ativa e
-- nunca para administradores; manual (admin) vale mesmo com a campanha desativada.
-- Devolve a concessão (nova ou já existente); conjunto vazio quando não concede.
create or replace function public.promo_grant(p_campaign text, p_user uuid, p_source text, p_actor uuid default null)
returns setof public.promo_grants
language plpgsql security definer set search_path = '' as $$
declare c public.promo_campaigns;
begin
  if p_source not in ('global', 'cadastro', 'login', 'manual') then
    raise exception 'origem inválida: %', p_source using errcode = '22023';
  end if;
  select * into c from public.promo_campaigns where id = p_campaign;
  if not found then raise exception 'campanha inexistente: %', p_campaign using errcode = '22023'; end if;
  if p_source <> 'manual' then
    if not c.active then return; end if;
    if exists (select 1 from public.admin_roles a where a.user_id = p_user and a.role = 'admin') then return; end if;
  end if;
  insert into public.promo_grants (campaign_id, user_id, starts_at, expires_at, source, granted_by)
  values (c.id, p_user, now(), now() + make_interval(days => c.duration_days), p_source, p_actor)
  on conflict (campaign_id, user_id) do nothing;
  if p_source = 'manual' and found then
    insert into public.audit_logs (actor_id, user_id, action, entity, entity_id, meta)
    values (p_actor, p_user, 'promo.concessao_manual', 'promo_campaign', c.id, jsonb_build_object('dias', c.duration_days));
  end if;
  return query select * from public.promo_grants g where g.campaign_id = c.id and g.user_id = p_user;
end $$;

-- Concessão global: todas as contas existentes que ainda não têm esta campanha (exceto admins).
create or replace function public.promo_grant_all(p_campaign text, p_actor uuid default null)
returns integer
language plpgsql security definer set search_path = '' as $$
declare c public.promo_campaigns; n integer;
begin
  select * into c from public.promo_campaigns where id = p_campaign for update;
  if not found then raise exception 'campanha inexistente: %', p_campaign using errcode = '22023'; end if;
  if not c.active then return 0; end if;
  insert into public.promo_grants (campaign_id, user_id, starts_at, expires_at, source, granted_by)
  select c.id, u.id, now(), now() + make_interval(days => c.duration_days), 'global', p_actor
  from auth.users u
  where not exists (select 1 from public.admin_roles a where a.user_id = u.id and a.role = 'admin')
  on conflict (campaign_id, user_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Liga/desliga a campanha. Ligar concede a todas as contas existentes na mesma transação.
-- Desligar só impede novas concessões: períodos já concedidos continuam valendo até o fim.
create or replace function public.promo_set_active(p_campaign text, p_active boolean, p_actor uuid)
returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer := 0;
begin
  update public.promo_campaigns
     set active = p_active,
         activated_at = case when p_active then now() else activated_at end,
         deactivated_at = case when p_active then null else now() end,
         updated_at = now()
   where id = p_campaign;
  if not found then raise exception 'campanha inexistente: %', p_campaign using errcode = '22023'; end if;
  if p_active then n := public.promo_grant_all(p_campaign, p_actor); end if;
  insert into public.audit_logs (actor_id, user_id, action, entity, entity_id, meta)
  values (p_actor, null, case when p_active then 'promo.ativada' else 'promo.desativada' end, 'promo_campaign', p_campaign,
          jsonb_build_object('novas_concessoes', n));
  return n;
end $$;

-- Extensão manual (admin): soma dias ao fim atual (ou a partir de agora, se já venceu).
create or replace function public.promo_extend(p_grant uuid, p_days integer, p_actor uuid)
returns public.promo_grants
language plpgsql security definer set search_path = '' as $$
declare g public.promo_grants; antes timestamptz;
begin
  if p_days is null or p_days < 1 or p_days > 30 then
    raise exception 'dias inválidos' using errcode = '22023';
  end if;
  select expires_at into antes from public.promo_grants where id = p_grant for update;
  if not found then raise exception 'concessão inexistente' using errcode = '22023'; end if;
  update public.promo_grants
     set expires_at = greatest(expires_at, now()) + make_interval(days => p_days),
         status = 'ativo', updated_at = now()
   where id = p_grant
  returning * into g;
  insert into public.audit_logs (actor_id, user_id, action, entity, entity_id, meta)
  values (p_actor, g.user_id, 'promo.extensao', 'promo_grant', g.id::text,
          jsonb_build_object('dias', p_days, 'campanha', g.campaign_id, 'fim_anterior', antes, 'novo_fim', g.expires_at));
  return g;
end $$;

-- Primeira inicialização autenticada: concede (idempotente) as campanhas ativas que o aluno ainda
-- não tem e devolve a concessão vigente (se houver), numa ida só ao banco.
create or replace function public.promo_ensure(p_user uuid)
returns table (grant_id uuid, campaign_id text, campaign_name text, plan_id text, starts_at timestamptz, expires_at timestamptz, popup_seen_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.users u where u.id = p_user)
     and not exists (select 1 from public.admin_roles a where a.user_id = p_user and a.role = 'admin') then
    insert into public.promo_grants (campaign_id, user_id, starts_at, expires_at, source)
    select c.id, p_user, now(), now() + make_interval(days => c.duration_days), 'login'
    from public.promo_campaigns c
    where c.active and not exists (select 1 from public.promo_grants g where g.campaign_id = c.id and g.user_id = p_user)
    on conflict on constraint promo_grants_campaign_id_user_id_key do nothing;
  end if;
  return query
    select g.id, g.campaign_id, c.name, c.plan_id, g.starts_at, g.expires_at, g.popup_seen_at
    from public.promo_grants g join public.promo_campaigns c on c.id = g.campaign_id
    where g.user_id = p_user and g.status <> 'revogado' and g.expires_at > now()
    order by g.expires_at desc
    limit 1;
end $$;

-- Atualiza o status gravado (só informativo: a autorização sempre confere expires_at > now()).
create or replace function public.promo_refresh_status()
returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.promo_grants set status = 'expirado', updated_at = now() where status = 'ativo' and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;

-- Plano de limites da concessão vigente (null sem concessão válida).
create or replace function public.promo_quota_plan(p_user uuid)
returns text
language sql stable security definer set search_path = '' as $$
  select c.plan_id
  from public.promo_grants g join public.promo_campaigns c on c.id = g.campaign_id
  where g.user_id = p_user and g.status <> 'revogado' and g.expires_at > now()
  order by g.expires_at desc
  limit 1
$$;

-- Conta nova durante a campanha recebe os dias no cadastro. Erro aqui nunca impede o cadastro
-- (a primeira entrada autenticada concede de novo, de forma idempotente).
create or replace function public.promo_on_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform public.promo_grant(c.id, new.id, 'cadastro', null) from public.promo_campaigns c where c.active;
  exception when others then
    null;
  end;
  return new;
end $$;
drop trigger if exists promo_on_auth_user_created on auth.users;
create trigger promo_on_auth_user_created after insert on auth.users
  for each row execute function public.promo_on_signup();

-- Cotas mensais (estudos gerados, aulas geradas, dúvidas): durante a concessão vale o MAIOR limite
-- entre o plano gravado e o plano da campanha (nunca reduz o de quem já paga).
create or replace function public.consume_quota(p_user uuid, p_kind text, p_units int default 1)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.plans;
  v_promo public.plans;
  v_limit int;
  v_promo_limit int;
  v_used int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || p_kind, 0));
  select p.* into v_plan
  from public.subscriptions s join public.plans p on p.id = s.plan_id
  where s.user_id = p_user and s.status in ('active', 'trialing');
  if not found then
    select * into v_plan from public.plans where id = 'free';
  end if;

  v_limit := case p_kind
    when 'trail_build' then v_plan.max_trail_builds_per_month
    when 'lesson_generation' then v_plan.max_lesson_generations_per_month
    when 'clarification' then v_plan.max_clarifications_per_month
    else null end;
  if v_limit is null then
    raise exception 'tipo de cota desconhecido: %', p_kind using errcode = '22023';
  end if;

  select p.* into v_promo from public.plans p where p.id = public.promo_quota_plan(p_user);
  if found then
    v_promo_limit := case p_kind
      when 'trail_build' then v_promo.max_trail_builds_per_month
      when 'lesson_generation' then v_promo.max_lesson_generations_per_month
      when 'clarification' then v_promo.max_clarifications_per_month
      end;
    if v_promo_limit > v_limit then
      v_limit := v_promo_limit;
      v_plan := v_promo;
    end if;
  end if;

  select coalesce(sum(units), 0) into v_used
  from public.usage_events
  where user_id = p_user and kind = p_kind and created_at >= date_trunc('month', now());

  if v_used + p_units > v_limit then
    return jsonb_build_object('allowed', false, 'used', v_used, 'limit', v_limit, 'plan', v_plan.id);
  end if;
  insert into public.usage_events (user_id, kind, units) values (p_user, p_kind, p_units);
  return jsonb_build_object('allowed', true, 'used', v_used + p_units, 'limit', v_limit, 'plan', v_plan.id);
end $$;

revoke all on function public.promo_grant(text, uuid, text, uuid), public.promo_grant_all(text, uuid),
  public.promo_set_active(text, boolean, uuid), public.promo_extend(uuid, int, uuid), public.promo_ensure(uuid),
  public.promo_refresh_status(), public.promo_quota_plan(uuid), public.promo_on_signup(),
  public.consume_quota(uuid, text, int)
  from public, anon, authenticated;
grant execute on function public.promo_grant(text, uuid, text, uuid), public.promo_grant_all(text, uuid),
  public.promo_set_active(text, boolean, uuid), public.promo_extend(uuid, int, uuid), public.promo_ensure(uuid),
  public.promo_refresh_status(), public.promo_quota_plan(uuid), public.consume_quota(uuid, text, int)
  to service_role;
