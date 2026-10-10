-- =============================================================================
-- Fluxo por tema: o próximo tema só abre após TODAS as questões de fixação.
-- lesson_quiz_outcome passa a informar o total de questões ativas do tema.
-- =============================================================================
create or replace function public.lesson_quiz_outcome(p_user uuid, p_lesson uuid, p_context text default null)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with active as (
    select q.id, q.essential
    from public.questions q
    where q.lesson_id = p_lesson and q.user_id = p_user and q.active
  ), latest as (
    select distinct on (a.question_id) a.question_id, a.is_correct, act.essential
    from public.answer_attempts a
    join active act on act.id = a.question_id
    where a.user_id = p_user
      and (p_context is null or a.context = p_context)
    order by a.question_id, a.created_at desc
  )
  select jsonb_build_object(
    'answered', (select count(*) from latest),
    'correct', (select count(*) from latest where is_correct),
    'essentialAnswered', (select count(*) from latest where essential),
    'essentialCorrect', (select count(*) from latest where essential and is_correct),
    'total', (select count(*) from active)
  );
$$;
revoke all on function public.lesson_quiz_outcome(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.lesson_quiz_outcome(uuid, uuid, text) to service_role;

-- -----------------------------------------------------------------------------
-- Questões de fixação: rodada complementar (níveis/itens que faltaram) acrescenta
-- em vez de substituir.
-- -----------------------------------------------------------------------------
drop function if exists public.save_lesson_questions(uuid, uuid, text, jsonb);
create or replace function public.save_lesson_questions(p_lesson uuid, p_user uuid, p_board text, p_questions jsonb, p_append boolean default false)
returns int
language plpgsql security definer set search_path = '' as $$
declare q jsonb; v_q uuid; v_node uuid; v_count int := 0; v_trail uuid;
begin
  select trail_id into v_trail from public.lessons where id = p_lesson and user_id = p_user;
  if v_trail is null then raise exception 'aula não encontrada' using errcode = 'P0002'; end if;
  -- Rodada complementar acrescenta; a geração principal substitui as questões ativas.
  if not p_append then
    update public.questions set active = false where lesson_id = p_lesson and active;
  end if;

  for q in select * from jsonb_array_elements(p_questions) loop
    select n.id into v_node from public.content_nodes n
     join public.lesson_nodes ln on ln.node_id = n.id and ln.lesson_id = p_lesson
     where n.key = q ->> 'nodeKey';
    continue when v_node is null; -- tópico fora da aula: descartado
    insert into public.questions (lesson_id, node_id, user_id, type, statement, justification, difficulty,
                                  essential, origin, board_style, depends_on_external_source, correct_answer_true)
    values (p_lesson, v_node, p_user, q ->> 'type', q ->> 'statement', q ->> 'justification',
            (q ->> 'difficulty')::int, coalesce((q ->> 'essential')::boolean, false), 'original', p_board,
            coalesce((q ->> 'dependsOnExternalSource')::boolean, false),
            case when q ->> 'type' = 'certo_errado' then (q ->> 'correctAnswerTrue')::boolean end)
    returning id into v_q;
    insert into public.question_options (question_id, user_id, label, text, is_correct, explanation, sort_order)
    select v_q, p_user, o ->> 'label', o ->> 'text', (o ->> 'correct')::boolean, o ->> 'explanation', ord - 1
    from jsonb_array_elements(coalesce(q -> 'options', '[]'::jsonb)) with ordinality as t(o, ord);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function public.save_lesson_questions(uuid, uuid, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.save_lesson_questions(uuid, uuid, text, jsonb, boolean) to service_role;

-- -----------------------------------------------------------------------------
-- Estatísticas para nível, sequência (streak) e conquistas do painel.
-- Security invoker: a RLS de quem consulta se aplica; o filtro por auth.uid() é explícito.
-- As regras (nível, streak, conquistas) ficam em TypeScript puro e testado.
-- -----------------------------------------------------------------------------
create or replace function public.my_study_stats(p_tz text default 'America/Sao_Paulo')
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with a as (
    select is_correct, (created_at at time zone p_tz)::date as d
    from public.answer_attempts
    where user_id = (select auth.uid())
  ), per_day as (
    select d, count(*)::int as n from a group by d
  ), lp as (
    select lesson_id, state from public.learning_progress where user_id = (select auth.uid())
  ), mods as (
    select m.id,
           count(l.id) as total,
           count(l.id) filter (where p.state in ('aguardando_dominio', 'dominada')) as passed
    from public.learning_modules m
    join public.lessons l on l.module_id = m.id and l.user_id = m.user_id
    left join lp p on p.lesson_id = l.id
    where m.user_id = (select auth.uid())
    group by m.id
  )
  select jsonb_build_object(
    'answered', (select count(*) from a),
    'correct', (select count(*) from a where is_correct),
    'activeDays', coalesce((select jsonb_agg(x.d order by x.d desc) from (select d from per_day order by d desc limit 400) x), '[]'::jsonb),
    'maxInDay', coalesce((select max(n) from per_day), 0),
    'themesPassed', (select count(*) from lp where state in ('aguardando_dominio', 'dominada')),
    'themesMastered', (select count(*) from lp where state = 'dominada'),
    'modulesClosed', (select count(*) from mods where total > 0 and passed = total),
    'today', (now() at time zone p_tz)::date
  );
$$;
revoke all on function public.my_study_stats(text) from public, anon;
grant execute on function public.my_study_stats(text) to authenticated;
