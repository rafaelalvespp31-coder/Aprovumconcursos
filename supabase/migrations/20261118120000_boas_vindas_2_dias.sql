-- Boas-vindas: toda conta NOVA ganha 2 dias de acesso premium (todas as funcionalidades) e, ao vencer, volta ao plano gratuito.
-- Reaproveita o sistema de concessões (promo_campaigns/promo_grants): a validade é conferida a cada verificação
-- (expires_at > now()), então não depende de rotina agendada e não mexe em subscriptions nem em pagamentos.
-- only_new: a campanha vale só para contas criadas DEPOIS da ativação (nunca para contas existentes).
--
-- Rollback:
--   update public.promo_campaigns set active = false where id = 'boas-vindas-2-dias';
--   (as concessões já dadas vencem sozinhas; para encerrar agora: update public.promo_grants set status='revogado' where campaign_id='boas-vindas-2-dias')

alter table public.promo_campaigns add column if not exists only_new boolean not null default false;

insert into public.promo_campaigns (id, name, plan_id, duration_days, active, only_new, activated_at)
values ('boas-vindas-2-dias', 'BOAS-VINDAS — 2 DIAS DE ACESSO PREMIUM', 'premium', 2, true, true, now())
on conflict (id) do nothing;

-- A concessão global (botão do admin) nunca atinge campanhas "só para contas novas".
create or replace function public.promo_grant_all(p_campaign text, p_actor uuid default null)
returns integer
language plpgsql security definer set search_path = '' as $$
declare c public.promo_campaigns; n integer;
begin
  select * into c from public.promo_campaigns where id = p_campaign for update;
  if not found then raise exception 'campanha inexistente: %', p_campaign using errcode = '22023'; end if;
  if not c.active or c.only_new then return 0; end if;
  insert into public.promo_grants (campaign_id, user_id, starts_at, expires_at, source, granted_by)
  select c.id, u.id, now(), now() + make_interval(days => c.duration_days), 'global', p_actor
  from auth.users u
  where not exists (select 1 from public.admin_roles a where a.user_id = u.id and a.role = 'admin')
  on conflict (campaign_id, user_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Primeira entrada autenticada: concede as campanhas ativas ainda não concedidas; as "só contas novas"
-- só valem para quem se cadastrou depois da ativação da campanha.
create or replace function public.promo_ensure(p_user uuid)
returns table (grant_id uuid, campaign_id text, campaign_name text, plan_id text, starts_at timestamptz, expires_at timestamptz, popup_seen_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.users u where u.id = p_user)
     and not exists (select 1 from public.admin_roles a where a.user_id = p_user and a.role = 'admin') then
    insert into public.promo_grants (campaign_id, user_id, starts_at, expires_at, source)
    select c.id, p_user, now(), now() + make_interval(days => c.duration_days), case when c.only_new then 'cadastro' else 'login' end
    from public.promo_campaigns c
    where c.active
      and (not c.only_new or exists (select 1 from auth.users u where u.id = p_user and u.created_at >= c.activated_at))
      and not exists (select 1 from public.promo_grants g where g.campaign_id = c.id and g.user_id = p_user)
    on conflict on constraint promo_grants_campaign_id_user_id_key do nothing;
  end if;
  return query
    select g.id, g.campaign_id, c.name, c.plan_id, g.starts_at, g.expires_at, g.popup_seen_at
    from public.promo_grants g join public.promo_campaigns c on c.id = g.campaign_id
    where g.user_id = p_user and g.status <> 'revogado' and g.expires_at > now()
    order by g.expires_at desc
    limit 1;
end $$;

revoke all on function public.promo_grant_all(text, uuid), public.promo_ensure(uuid) from public, anon, authenticated;
grant execute on function public.promo_grant_all(text, uuid), public.promo_ensure(uuid) to service_role;
