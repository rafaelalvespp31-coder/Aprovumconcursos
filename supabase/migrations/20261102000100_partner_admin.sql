-- APROVUM BUSINESS — painel do SÓCIO ADMINISTRATIVO (PARTNER_ADMIN).
--
-- * partner_accounts: quem é sócio, se o acesso está ativo e QUAIS indicadores pode ver.
--   Só o servidor (service_role, a partir do painel ADMIN MASTER) grava; o navegador não lê nem grava.
-- * partner_dashboard(p_days): ÚNICA porta de dados do sócio. Roda com a sessão dele (auth.uid()),
--   confere no banco se a conta é de sócio e está ativa, e monta SOMENTE os indicadores liberados —
--   o que não está liberado nem é calculado (não volta como zero, não vai para o HTML).
--   Tentativa de quem não é sócio fica na auditoria.
-- * O sócio não ganha nenhum acesso direto a tabelas (assinaturas, pagamentos, auditoria seguem
--   com as políticas de sempre: dono lê o próprio; admin lê tudo).
--
-- Rollback:
--   drop function if exists public.partner_dashboard(integer);
--   drop function if exists public.partner_permission_keys();
--   drop table if exists public.partner_accounts;

create or replace function public.partner_permission_keys() returns text[]
language sql immutable set search_path = '' as $$
  select array[
    'visualizar_total_cadastrados', 'visualizar_usuarios_ativos', 'visualizar_usuarios_inativos',
    'visualizar_cadastros_diarios', 'visualizar_crescimento', 'visualizar_pagantes',
    'visualizar_assinaturas_mensais', 'visualizar_assinaturas_semestrais', 'visualizar_assinaturas_anuais',
    'visualizar_assinaturas_ativas', 'visualizar_assinaturas_vencidas', 'visualizar_faturamento',
    'visualizar_taxa_conversao', 'visualizar_lista_pagantes', 'visualizar_historico_pagamentos'
  ]::text[];
$$;

create table if not exists public.partner_accounts (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  active      boolean not null default true,
  permissions text[] not null default '{}' check (permissions <@ public.partner_permission_keys()),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.partner_accounts enable row level security;
-- Sem políticas: nenhum acesso pelo navegador (nem do próprio sócio).

create or replace function public.partner_dashboard(p_days integer default 30)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_acc   public.partner_accounts%rowtype;
  v_p     text[];
  v_days  integer := least(greatest(coalesce(p_days, 30), 7), 366);
  v_tz    text := 'America/Sao_Paulo';
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_from  date;
  v_out   jsonb;
  v_total integer;
  v_active integer;
  v_payers integer;
begin
  if v_uid is null then
    return jsonb_build_object('status', 'sem_sessao');
  end if;
  select * into v_acc from public.partner_accounts where user_id = v_uid;
  if not found then
    insert into public.audit_logs (actor_id, user_id, action, entity, meta)
    values (v_uid, v_uid, 'partner.acesso_negado', 'partner_dashboard', jsonb_build_object('motivo', 'nao_e_socio'));
    return jsonb_build_object('status', 'sem_acesso');
  end if;
  if not v_acc.active then
    return jsonb_build_object('status', 'desativado');
  end if;

  v_p := v_acc.permissions;
  v_from := v_today - (v_days - 1);
  v_out := jsonb_build_object('status', 'ok', 'days', v_days, 'today', v_today, 'permissions', to_jsonb(v_p));

  -- Alunos = contas que não são da equipe (admin) nem de sócio. (Tabelas temporárias da transação:
  -- somem no fim da chamada; uma chamada por transação, como faz a API.)
  create temporary table pg_temp.pd_students (id uuid primary key, created_day date, created_at timestamptz) on commit drop;
  insert into pg_temp.pd_students
    select u.id, (u.created_at at time zone v_tz)::date, u.created_at
    from auth.users u
    where not exists (select 1 from public.admin_roles a where a.user_id = u.id)
      and not exists (select 1 from public.partner_accounts s where s.user_id = u.id);

  -- Atividade real registrada (entrada, respostas, Modo Jogo, aulas do dia).
  create temporary table pg_temp.pd_activity (user_id uuid, day date) on commit drop;
  if 'visualizar_usuarios_ativos' = any (v_p) or 'visualizar_usuarios_inativos' = any (v_p) then
    insert into pg_temp.pd_activity
      select distinct x.user_id, (x.at at time zone v_tz)::date
      from (
        select u.id as user_id, u.last_sign_in_at as at from auth.users u where u.last_sign_in_at is not null
        union all select user_id, created_at from public.answer_attempts
        union all select user_id, created_at from public.bank_attempts
        union all select user_id, created_at from public.quiz_attempts
        union all select user_id, created_at from public.daily_lesson_access
      ) x
      join pg_temp.pd_students st on st.id = x.user_id
      where x.at >= (v_today - 365)::timestamp at time zone v_tz;
  end if;

  select count(*) into v_total from pg_temp.pd_students;
  select count(distinct user_id) into v_active from pg_temp.pd_activity where day >= v_today - 29;

  -- A. Visão geral
  if 'visualizar_total_cadastrados' = any (v_p) then
    v_out := v_out || jsonb_build_object('total_cadastrados', v_total);
  end if;
  if 'visualizar_usuarios_ativos' = any (v_p) then
    v_out := v_out || jsonb_build_object('usuarios_ativos_30d', v_active);
  end if;
  if 'visualizar_usuarios_inativos' = any (v_p) then
    v_out := v_out || jsonb_build_object('usuarios_inativos_30d', v_total - (select count(distinct user_id) from pg_temp.pd_activity where day >= v_today - 29));
  end if;
  if 'visualizar_cadastros_diarios' = any (v_p) then
    v_out := v_out || jsonb_build_object(
      'cadastros_hoje', (select count(*) from pg_temp.pd_students where created_day = v_today),
      'cadastros_7d', (select count(*) from pg_temp.pd_students where created_day > v_today - 7),
      'cadastros_30d', (select count(*) from pg_temp.pd_students where created_day > v_today - 30));
  end if;

  -- B. Crescimento (série diária do período e comparação com o período anterior)
  if 'visualizar_crescimento' = any (v_p) then
    v_out := v_out || jsonb_build_object(
      'crescimento_mensal_pct', (
        select case when prev = 0 then null else round(100.0 * (cur - prev) / prev, 1) end
        from (select count(*) filter (where created_day > v_today - 30) as cur,
                     count(*) filter (where created_day <= v_today - 30 and created_day > v_today - 60) as prev
              from pg_temp.pd_students) t),
      'serie_cadastros', (
        select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'novos', (select count(*) from pg_temp.pd_students s where s.created_day = d::date)) order by d), '[]'::jsonb)
        from generate_series(v_from, v_today, interval '1 day') d),
      'periodo_atual', (select count(*) from pg_temp.pd_students where created_day >= v_from),
      'periodo_anterior', (select count(*) from pg_temp.pd_students where created_day >= v_from - v_days and created_day < v_from));
    -- Base total acumulada só com o total liberado (senão revelaria o total).
    if 'visualizar_total_cadastrados' = any (v_p) then
      v_out := v_out || jsonb_build_object('serie_base', (
        select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'total', (select count(*) from pg_temp.pd_students s where s.created_day <= d::date)) order by d), '[]'::jsonb)
        from generate_series(v_from, v_today, interval '1 day') d));
    end if;
  end if;

  -- D. Desempenho (só com atividade liberada)
  if 'visualizar_usuarios_ativos' = any (v_p) then
    v_out := v_out || jsonb_build_object(
      'ativos_periodo', (select count(distinct user_id) from pg_temp.pd_activity where day >= v_from),
      'dias_ativos_media', (select round(avg(n), 1) from (select count(*) n from pg_temp.pd_activity where day >= v_from group by user_id) t),
      'retornaram', (select count(*) from (select user_id from pg_temp.pd_activity where day >= v_from group by user_id having count(*) >= 2) t),
      'serie_ativos', (
        select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'ativos', (select count(distinct a.user_id) from pg_temp.pd_activity a where a.day = d::date)) order by d), '[]'::jsonb)
        from generate_series(v_from, v_today, interval '1 day') d),
      'respostas_periodo', (
        (select count(*) from public.answer_attempts x join pg_temp.pd_students st on st.id = x.user_id where x.created_at >= v_from::timestamp at time zone v_tz)
        + (select count(*) from public.bank_attempts x join pg_temp.pd_students st on st.id = x.user_id where x.created_at >= v_from::timestamp at time zone v_tz)
        + (select count(*) from public.quiz_attempts x join pg_temp.pd_students st on st.id = x.user_id where x.created_at >= v_from::timestamp at time zone v_tz)));
  end if;

  -- C. Comercial: SOMENTE pagamentos confirmados pelo ADMIN MASTER (subscription_payments).
  if v_p && array['visualizar_pagantes', 'visualizar_assinaturas_mensais', 'visualizar_assinaturas_semestrais', 'visualizar_assinaturas_anuais',
                  'visualizar_assinaturas_ativas', 'visualizar_assinaturas_vencidas', 'visualizar_faturamento', 'visualizar_taxa_conversao',
                  'visualizar_lista_pagantes', 'visualizar_historico_pagamentos'] then
    create temporary table pg_temp.pd_payers (user_id uuid primary key, period text, period_end timestamptz, plan_id text) on commit drop;
    -- Pagante = pagamento confirmado ainda vigente E plano pago ativo na assinatura.
    insert into pg_temp.pd_payers
      select distinct on (p.user_id) p.user_id, p.period, p.period_end, p.plan_id
      from public.subscription_payments p
      join pg_temp.pd_students st on st.id = p.user_id
      join public.subscriptions s on s.user_id = p.user_id and s.plan_id <> 'free' and s.status = 'active'
      where p.period_end > now()
      order by p.user_id, p.paid_at desc;
    select count(*) into v_payers from pg_temp.pd_payers;

    if 'visualizar_pagantes' = any (v_p) then
      v_out := v_out || jsonb_build_object('pagantes', v_payers);
    end if;
    if 'visualizar_assinaturas_mensais' = any (v_p) then
      v_out := v_out || jsonb_build_object('assinaturas_mensais', (select count(*) from pg_temp.pd_payers where period = 'mensal'));
    end if;
    if 'visualizar_assinaturas_semestrais' = any (v_p) then
      v_out := v_out || jsonb_build_object('assinaturas_semestrais', (select count(*) from pg_temp.pd_payers where period = 'semestral'));
    end if;
    if 'visualizar_assinaturas_anuais' = any (v_p) then
      v_out := v_out || jsonb_build_object('assinaturas_anuais', (select count(*) from pg_temp.pd_payers where period = 'anual'));
    end if;
    if 'visualizar_assinaturas_ativas' = any (v_p) then
      v_out := v_out || jsonb_build_object('assinaturas_ativas', v_payers);
    end if;
    if 'visualizar_assinaturas_vencidas' = any (v_p) then
      v_out := v_out || jsonb_build_object('assinaturas_vencidas', (
        select count(distinct p.user_id) from public.subscription_payments p
        join pg_temp.pd_students st on st.id = p.user_id
        where not exists (select 1 from pg_temp.pd_payers y where y.user_id = p.user_id)));
    end if;
    -- Conversão revela os pagantes: só junto com visualizar_pagantes.
    if 'visualizar_taxa_conversao' = any (v_p) and 'visualizar_pagantes' = any (v_p) then
      v_out := v_out || jsonb_build_object('taxa_conversao_pct', case when v_total = 0 then null else round(100.0 * v_payers / v_total, 1) end);
    end if;
    if 'visualizar_faturamento' = any (v_p) then
      v_out := v_out || jsonb_build_object(
        'faturamento_periodo_cents', (select coalesce(sum(p.amount_cents), 0) from public.subscription_payments p join pg_temp.pd_students st on st.id = p.user_id where p.paid_at >= v_from::timestamp at time zone v_tz),
        'pagamentos_sem_valor', (select count(*) from public.subscription_payments p join pg_temp.pd_students st on st.id = p.user_id where p.paid_at >= v_from::timestamp at time zone v_tz and p.amount_cents is null),
        'faturamento_mensal', (
          select coalesce(jsonb_agg(jsonb_build_object('mes', to_char(m, 'YYYY-MM'), 'cents', (
            select coalesce(sum(p.amount_cents), 0) from public.subscription_payments p join pg_temp.pd_students st on st.id = p.user_id
            where (p.paid_at at time zone v_tz) >= m and (p.paid_at at time zone v_tz) < m + interval '1 month')) order by m), '[]'::jsonb)
          from generate_series(date_trunc('month', v_today::timestamp) - interval '11 months', date_trunc('month', v_today::timestamp), interval '1 month') m));
    end if;
    -- Lista de assinantes revela os pagantes: só junto com visualizar_pagantes. E-mail mascarado.
    if 'visualizar_lista_pagantes' = any (v_p) and 'visualizar_pagantes' = any (v_p) then
      v_out := v_out || jsonb_build_object('lista_pagantes', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'nome', coalesce(nullif(btrim(pr.display_name), ''), 'Aluno'),
          'email', regexp_replace(coalesce(u.email, ''), '^(.).*(@.*)$', '\1•••\2'),
          'plano', y.plan_id, 'periodo', y.period, 'vence', y.period_end) order by y.period_end), '[]'::jsonb)
        from pg_temp.pd_payers y
        join auth.users u on u.id = y.user_id
        left join public.profiles pr on pr.id = y.user_id));
    end if;
    if 'visualizar_historico_pagamentos' = any (v_p) then
      v_out := v_out || jsonb_build_object('historico_pagamentos', (
        select coalesce(jsonb_agg(h order by h->>'pago_em' desc), '[]'::jsonb) from (
          select jsonb_build_object(
            'pago_em', p.paid_at, 'plano', p.plan_id, 'periodo', p.period, 'vence', p.period_end,
            'nome', coalesce(nullif(btrim(pr.display_name), ''), 'Aluno'))
            -- Valor só com o faturamento liberado.
            || case when 'visualizar_faturamento' = any (v_p) then jsonb_build_object('valor_cents', p.amount_cents) else '{}'::jsonb end as h
          from public.subscription_payments p
          join pg_temp.pd_students st on st.id = p.user_id
          left join public.profiles pr on pr.id = p.user_id
          order by p.paid_at desc
          limit 100) t));
    end if;
  end if;

  return v_out;
end;
$$;

revoke all on function public.partner_dashboard(integer) from public, anon;
grant execute on function public.partner_dashboard(integer) to authenticated;
revoke all on function public.partner_permission_keys() from public, anon;
grant execute on function public.partner_permission_keys() to authenticated;
revoke all on public.partner_accounts from anon, authenticated;

comment on table public.partner_accounts is 'Sócio administrativo (PARTNER_ADMIN): acesso e indicadores liberados pelo ADMIN MASTER. Escrita só pelo servidor.';
