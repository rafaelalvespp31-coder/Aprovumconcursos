-- =============================================================================
-- Ferramentas de estudo: anotações, marcações, esclarecimentos, confiança,
-- tempo por questão, metas e métricas de desempenho.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Metas do aluno
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column daily_questions_goal int check (daily_questions_goal between 1 and 500),
  add column weekly_lessons_goal int check (weekly_lessons_goal between 1 and 100);
grant update (daily_questions_goal, weekly_lessons_goal) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Anotações na aula: nota pessoal, trecho para revisar, dúvida
-- Escrita direta pelo aluno (dados pessoais dele), protegida por RLS e FK por dono.
-- -----------------------------------------------------------------------------
create table public.lesson_annotations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  lesson_id     uuid not null,
  -- As seções podem ser regeneradas; guardamos o id e o título como âncora estável.
  section_id    uuid,
  section_title text check (char_length(section_title) <= 160),
  kind          text not null check (kind in ('nota', 'revisar', 'duvida')),
  body          text not null default '' check (char_length(body) <= 4000),
  resolved      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade
);
create index lesson_annotations_user on public.lesson_annotations (user_id, lesson_id, created_at desc);
create trigger lesson_annotations_updated before update on public.lesson_annotations
  for each row execute function public.set_updated_at();

alter table public.lesson_annotations enable row level security;
alter table public.lesson_annotations force row level security;
create policy "dono le" on public.lesson_annotations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "dono cria" on public.lesson_annotations for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "dono edita" on public.lesson_annotations for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.lesson_annotations for delete to authenticated
  using (user_id = (select auth.uid()));
grant select, delete on public.lesson_annotations to authenticated;
grant insert (lesson_id, section_id, section_title, kind, body) on public.lesson_annotations to authenticated;
grant update (body, resolved, section_title) on public.lesson_annotations to authenticated;

-- -----------------------------------------------------------------------------
-- "Resolver depois"
-- -----------------------------------------------------------------------------
create table public.question_marks (
  user_id     uuid not null default auth.uid(),
  question_id uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id),
  foreign key (question_id, user_id) references public.questions (id, user_id) on delete cascade
);
alter table public.question_marks enable row level security;
alter table public.question_marks force row level security;
create policy "dono le" on public.question_marks for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.question_marks for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.question_marks for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.question_marks to authenticated;
grant insert (question_id) on public.question_marks to authenticated;

-- -----------------------------------------------------------------------------
-- Esclarecimentos de conceito pedidos durante a aula (gerados no servidor)
-- -----------------------------------------------------------------------------
create table public.concept_clarifications (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null,
  lesson_id            uuid not null,
  section_id           uuid,
  question             text not null check (char_length(question) between 3 and 500),
  answer_markdown      text not null check (char_length(answer_markdown) <= 8000),
  verification_pending boolean not null default false,
  created_at           timestamptz not null default now(),
  foreign key (lesson_id, user_id) references public.lessons (id, user_id) on delete cascade
);
create index concept_clarifications_lesson on public.concept_clarifications (user_id, lesson_id, created_at);
alter table public.concept_clarifications enable row level security;
alter table public.concept_clarifications force row level security;
create policy "dono le" on public.concept_clarifications for select to authenticated using (user_id = (select auth.uid()));
create policy "admin le" on public.concept_clarifications for select to authenticated using ((select public.is_admin()));
grant select on public.concept_clarifications to authenticated;

-- Cota de esclarecimentos por plano.
alter table public.plans add column max_clarifications_per_month int not null default 30 check (max_clarifications_per_month >= 0);
update public.plans set max_clarifications_per_month = case id when 'free' then 20 when 'pro' then 300 else 1000 end;
alter table public.usage_events drop constraint usage_events_kind_check;
alter table public.usage_events add constraint usage_events_kind_check
  check (kind in ('trail_build', 'lesson_generation', 'question_generation', 'clarification'));

create or replace function public.consume_quota(p_user uuid, p_kind text, p_units int default 1)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.plans;
  v_limit int;
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

  select coalesce(sum(units), 0) into v_used
  from public.usage_events
  where user_id = p_user and kind = p_kind and created_at >= date_trunc('month', now());

  if v_used + p_units > v_limit then
    return jsonb_build_object('allowed', false, 'used', v_used, 'limit', v_limit, 'plan', v_plan.id);
  end if;
  insert into public.usage_events (user_id, kind, units) values (p_user, p_kind, p_units);
  return jsonb_build_object('allowed', true, 'used', v_used + p_units, 'limit', v_limit, 'plan', v_plan.id);
end $$;

-- -----------------------------------------------------------------------------
-- Respostas: confiança declarada e tempo gasto (confiança NÃO é prova de domínio)
-- -----------------------------------------------------------------------------
alter table public.answer_attempts
  add column confidence smallint check (confidence between 1 and 3),
  add column time_spent_seconds int check (time_spent_seconds between 0 and 86400);

drop function public.submit_answer(uuid, uuid, uuid, boolean, text);
create function public.submit_answer(
  p_user uuid, p_question uuid, p_option uuid, p_bool boolean, p_context text default 'fixacao',
  p_confidence smallint default null, p_seconds int default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_q public.questions;
  v_correct boolean;
  v_option public.question_options;
  v_attempts int;
begin
  select * into v_q from public.questions where id = p_question and user_id = p_user and active;
  if not found then raise exception 'questão não encontrada' using errcode = 'P0002'; end if;

  if v_q.type = 'certo_errado' then
    if p_bool is null then raise exception 'resposta certo/errado ausente' using errcode = '22023'; end if;
    v_correct := p_bool = v_q.correct_answer_true;
    insert into public.answer_attempts (question_id, user_id, answer_bool, is_correct, context, confidence, time_spent_seconds)
    values (p_question, p_user, p_bool, v_correct, p_context, p_confidence, p_seconds);
  else
    select * into v_option from public.question_options where id = p_option and question_id = p_question;
    if not found then raise exception 'alternativa inválida' using errcode = '22023'; end if;
    v_correct := v_option.is_correct;
    insert into public.answer_attempts (question_id, user_id, selected_option_id, is_correct, context, confidence, time_spent_seconds)
    values (p_question, p_user, p_option, v_correct, p_context, p_confidence, p_seconds);
  end if;

  select count(*) into v_attempts from public.answer_attempts where question_id = p_question and user_id = p_user;

  return jsonb_build_object(
    'correct', v_correct,
    'justification', v_q.justification,
    'correctAnswerTrue', v_q.correct_answer_true,
    'nodeId', v_q.node_id,
    'attempts', v_attempts,
    'options', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'isCorrect', o.is_correct, 'explanation', o.explanation) order by o.sort_order)
      from public.question_options o where o.question_id = p_question), '[]'::jsonb)
  );
end $$;
revoke all on function public.submit_answer(uuid, uuid, uuid, boolean, text, smallint, int) from public, anon, authenticated;
grant execute on function public.submit_answer(uuid, uuid, uuid, boolean, text, smallint, int) to service_role;

-- Gabarito de questões já respondidas (para rever explicações depois).
-- Só devolve questões em que o próprio usuário já tem tentativa.
create or replace function public.answered_question_review(p_question uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'justification', q.justification,
    'correctAnswerTrue', q.correct_answer_true,
    'options', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'isCorrect', o.is_correct, 'explanation', o.explanation) order by o.sort_order)
      from public.question_options o where o.question_id = q.id), '[]'::jsonb)
  )
  from public.questions q
  where q.id = p_question
    and q.user_id = (select auth.uid())
    and exists (select 1 from public.answer_attempts a where a.question_id = q.id and a.user_id = (select auth.uid()));
$$;
revoke all on function public.answered_question_review(uuid) from public, anon;
grant execute on function public.answered_question_review(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Métricas (security invoker: a RLS de quem consulta se aplica)
-- -----------------------------------------------------------------------------
create or replace function public.my_daily_activity(p_days int default 14, p_tz text default 'America/Sao_Paulo')
returns table (day date, correct int, wrong int)
language sql stable security invoker set search_path = '' as $$
  with days as (
    select generate_series(
      (now() at time zone p_tz)::date - (least(greatest(p_days, 1), 90) - 1),
      (now() at time zone p_tz)::date,
      interval '1 day')::date as day
  )
  select d.day,
         count(a.*) filter (where a.is_correct)::int,
         count(a.*) filter (where not a.is_correct)::int
  from days d
  left join public.answer_attempts a
    on (a.created_at at time zone p_tz)::date = d.day and a.user_id = (select auth.uid())
  group by d.day
  order by d.day;
$$;
grant execute on function public.my_daily_activity(int, text) to authenticated;

create or replace function public.my_lessons_completed_since(p_since timestamptz)
returns int
language sql stable security invoker set search_path = '' as $$
  select count(distinct lesson_id)::int
  from public.mastery_records
  where user_id = (select auth.uid()) and to_state = 'aula_concluida' and recorded_at >= p_since;
$$;
grant execute on function public.my_lessons_completed_since(timestamptz) to authenticated;
