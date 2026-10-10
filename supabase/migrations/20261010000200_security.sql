-- =============================================================================
-- Segurança: RLS, privilégios, funções de cota/limite e auditoria
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Papel administrativo
-- -----------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Privilégios: o cliente nunca escreve diretamente (exceto campos do próprio perfil)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- Leitura pública de catálogos
grant select on public.exam_boards, public.plans to anon, authenticated;

-- Leitura dos próprios dados
grant select on
  public.profiles, public.subscriptions, public.usage_events,
  public.study_trails, public.source_documents, public.source_document_versions,
  public.content_nodes, public.node_prerequisites,
  public.learning_modules, public.lessons, public.lesson_nodes, public.lesson_prerequisites,
  public.lesson_sections, public.source_references,
  public.questions, public.answer_attempts, public.answer_feedback,
  public.learning_progress, public.mastery_records, public.review_schedules,
  public.ai_generation_jobs
to authenticated;

-- question_options: o gabarito (is_correct/explanation) NÃO é legível pelo cliente;
-- é revelado pelo servidor somente após a resposta.
grant select (id, question_id, user_id, label, text, sort_order) on public.question_options to authenticated;

-- Perfil: somente campos editáveis pelo aluno
grant update (display_name, daily_goal_minutes, preferences, onboarding_completed) on public.profiles to authenticated;

-- Admin: leitura operacional (as políticas abaixo restringem a is_admin())
grant select on public.audit_logs, public.ai_generation_versions, public.admin_roles to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.exam_boards enable row level security;
alter table public.plans enable row level security;
create policy "catalogo publico" on public.exam_boards for select to anon, authenticated using (true);
create policy "planos publicos" on public.plans for select to anon, authenticated using (true);

alter table public.profiles enable row level security;
create policy "perfil: ler o proprio" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "perfil: editar o proprio" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter table public.admin_roles enable row level security;
create policy "admin: ver papeis" on public.admin_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

alter table public.audit_logs enable row level security;
create policy "admin: ver auditoria" on public.audit_logs for select to authenticated
  using ((select public.is_admin()));

alter table public.rate_limits enable row level security; -- sem políticas: só service_role

-- Tabelas com user_id: dono lê; admin lê (suporte/diagnóstico).
do $$
declare t text;
begin
  foreach t in array array[
    'subscriptions', 'usage_events', 'study_trails', 'source_documents', 'source_document_versions',
    'content_nodes', 'node_prerequisites', 'learning_modules', 'lessons', 'lesson_nodes',
    'lesson_prerequisites', 'lesson_sections', 'source_references', 'questions', 'question_options',
    'answer_attempts', 'answer_feedback', 'learning_progress', 'mastery_records', 'review_schedules',
    'ai_generation_jobs', 'ai_generation_versions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy "dono le" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "admin le" on public.%I for select to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

-- ai_generation_versions guarda saídas brutas e custos: apenas admin.
drop policy "dono le" on public.ai_generation_versions;

-- -----------------------------------------------------------------------------
-- Visão de cobertura (seção 11) — security_invoker: respeita a RLS de quem consulta
-- -----------------------------------------------------------------------------
create view public.topic_coverage with (security_invoker = true) as
select
  n.id                       as node_id,
  n.trail_id,
  n.user_id,
  n.key,
  n.path,
  n.kind,
  n.requires_direct_coverage,
  true                       as identified,
  exists (select 1 from public.lesson_nodes ln where ln.node_id = n.id) as planned,
  exists (select 1 from public.lesson_nodes ln where ln.node_id = n.id and ln.taught) as taught,
  (select count(*) from public.questions q where q.node_id = n.id and q.active)::int as questions_available,
  (select count(distinct a.question_id) from public.answer_attempts a
     join public.questions q on q.id = a.question_id where q.node_id = n.id)::int as questions_answered,
  exists (
    select 1 from public.lesson_nodes ln
    join public.learning_progress lp on lp.lesson_id = ln.lesson_id and lp.user_id = n.user_id
    where ln.node_id = n.id and ln.taught and lp.state = 'dominada'
  ) as mastered,
  n.verification_status,
  n.last_verified_at
from public.content_nodes n;

grant select on public.topic_coverage to authenticated;

-- -----------------------------------------------------------------------------
-- Novo usuário → perfil + plano gratuito
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80))
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Cotas: verificação e consumo atômicos (somente servidor)
-- -----------------------------------------------------------------------------
create or replace function public.consume_quota(p_user uuid, p_kind text, p_units int default 1)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.plans;
  v_limit int;
  v_used int;
begin
  -- Serializa consumos simultâneos do mesmo usuário.
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
    else null end;
  if v_limit is null then
    raise exception 'tipo de cota desconhecido: %', p_kind using errcode = '22023';
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

create or replace function public.count_active_trails(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.study_trails where user_id = p_user and archived_at is null;
$$;

-- -----------------------------------------------------------------------------
-- Limite de taxa por janela fixa (somente servidor)
-- -----------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;
  -- Limpeza oportunista de janelas antigas.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_count <= p_max;
end $$;

-- -----------------------------------------------------------------------------
-- Lease de jobs: impede dois processamentos simultâneos do mesmo job
-- -----------------------------------------------------------------------------
create or replace function public.acquire_job_lease(p_job uuid, p_user uuid, p_seconds int default 90)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.ai_generation_jobs
     set locked_until = now() + make_interval(secs => p_seconds),
         status = case when status = 'queued' then 'running' else status end,
         started_at = coalesce(started_at, now())
   where id = p_job and user_id = p_user
     and status in ('queued', 'running')
     and (locked_until is null or locked_until < now());
  return found;
end $$;

-- Somente o papel de servidor executa funções privilegiadas.
revoke all on function public.consume_quota(uuid, text, int) from public, anon, authenticated;
revoke all on function public.count_active_trails(uuid) from public, anon, authenticated;
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
revoke all on function public.acquire_job_lease(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.consume_quota(uuid, text, int) to service_role;
grant execute on function public.count_active_trails(uuid) to service_role;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
grant execute on function public.acquire_job_lease(uuid, uuid, int) to service_role;
