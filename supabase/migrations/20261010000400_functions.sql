-- =============================================================================
-- Escritas atômicas do servidor (somente service_role)
-- Cada função valida a posse (p_user) antes de qualquer alteração.
-- =============================================================================

create or replace function public.assert_trail_owner(p_trail uuid, p_user uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.study_trails where id = p_trail and user_id = p_user) then
    raise exception 'trilha não encontrada' using errcode = 'P0002';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Mapa de cobertura: substitui todos os nós da trilha
-- -----------------------------------------------------------------------------
create or replace function public.replace_trail_nodes(p_trail uuid, p_user uuid, p_version uuid, p_nodes jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  perform public.assert_trail_owner(p_trail, p_user);
  delete from public.content_nodes where trail_id = p_trail and user_id = p_user;

  with src as (
    select * from jsonb_to_recordset(p_nodes) as x(
      key text, kind text, marker text, title text, source_text text, span_start int, span_end int,
      depth int, ord int, path text, parent_key text, requires_direct_coverage boolean)
  ), ids as (
    select key, gen_random_uuid() as id from src
  )
  insert into public.content_nodes (
    id, trail_id, version_id, user_id, key, parent_id, kind, marker, title, source_text,
    span_start, span_end, depth, sort_order, path, requires_direct_coverage)
  select i.id, p_trail, p_version, p_user, s.key, p.id, s.kind, s.marker, s.title, s.source_text,
         s.span_start, s.span_end, s.depth, s.ord, s.path, s.requires_direct_coverage
  from src s
  join ids i on i.key = s.key
  left join ids p on p.key = s.parent_key;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- -----------------------------------------------------------------------------
-- Plano de aulas + análise + relatório de auditoria (atômico)
-- -----------------------------------------------------------------------------
create or replace function public.persist_trail_plan(p_trail uuid, p_user uuid, p_payload jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb; l jsonb;
  v_module uuid; v_lesson uuid;
  mi int := 0; li int := 0;
begin
  perform public.assert_trail_owner(p_trail, p_user);
  delete from public.learning_modules where trail_id = p_trail and user_id = p_user;

  for m in select * from jsonb_array_elements(p_payload -> 'modules') loop
    insert into public.learning_modules (trail_id, user_id, key, title, sort_order)
    values (p_trail, p_user, m ->> 'key', m ->> 'title', mi)
    returning id into v_module;
    mi := mi + 1;
    for l in select * from jsonb_array_elements(m -> 'lessons') loop
      insert into public.lessons (trail_id, module_id, user_id, key, title, objective, sort_order, estimated_minutes, supplementary)
      values (p_trail, v_module, p_user, l ->> 'key', l ->> 'title', l ->> 'objective', li,
              least(greatest((l ->> 'estimatedMinutes')::int, 1), 600), coalesce(l -> 'supplementary', '[]'::jsonb))
      returning id into v_lesson;
      li := li + 1;
      insert into public.lesson_nodes (lesson_id, node_id, user_id)
      select v_lesson, n.id, p_user
      from jsonb_array_elements_text(l -> 'nodeKeys') as k(value)
      join public.content_nodes n on n.trail_id = p_trail and n.user_id = p_user and n.key = k.value
      on conflict do nothing;
    end loop;
  end loop;

  -- Pré-requisitos entre aulas (após todas existirem).
  insert into public.lesson_prerequisites (lesson_id, prerequisite_lesson_id, user_id)
  select a.id, b.id, p_user
  from jsonb_array_elements(p_payload -> 'modules') as m2(value)
  cross join lateral jsonb_array_elements(m2.value -> 'lessons') as l2(value)
  cross join lateral jsonb_array_elements_text(coalesce(l2.value -> 'prerequisiteLessonKeys', '[]'::jsonb)) as pk(value)
  join public.lessons a on a.trail_id = p_trail and a.key = (l2.value ->> 'key')
  join public.lessons b on b.trail_id = p_trail and b.key = pk.value
  where a.id <> b.id
  on conflict do nothing;

  -- Análise por nó: relevância, verificação e pré-requisitos.
  update public.content_nodes n
     set relevance = x.relevance,
         verification_status = case when x.needs_verification and n.verification_status = 'nao_aplicavel'
                                    then 'pendente' else n.verification_status end
    from jsonb_to_recordset(coalesce(p_payload -> 'analysis', '[]'::jsonb))
         as x(key text, relevance text, needs_verification boolean)
   where n.trail_id = p_trail and n.user_id = p_user and n.key = x.key;

  delete from public.node_prerequisites np
   using public.content_nodes n
   where np.node_id = n.id and n.trail_id = p_trail;
  insert into public.node_prerequisites (node_id, prerequisite_id, user_id)
  select a.id, b.id, p_user
  from jsonb_to_recordset(coalesce(p_payload -> 'analysis', '[]'::jsonb)) as x(key text, prerequisite_keys jsonb)
  cross join lateral jsonb_array_elements_text(coalesce(x.prerequisite_keys, '[]'::jsonb)) as pk(value)
  join public.content_nodes a on a.trail_id = p_trail and a.key = x.key
  join public.content_nodes b on b.trail_id = p_trail and b.key = pk.value
  where a.id <> b.id
  on conflict do nothing;

  update public.study_trails
     set audit_report = p_payload -> 'audit',
         discipline_mode = p_payload ->> 'disciplineMode'
   where id = p_trail and user_id = p_user;
end $$;

-- -----------------------------------------------------------------------------
-- Conteúdo de uma aula gerada (atômico)
-- -----------------------------------------------------------------------------
create or replace function public.save_lesson_content(p_lesson uuid, p_user uuid, p_payload jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_trail uuid;
begin
  select trail_id into v_trail from public.lessons where id = p_lesson and user_id = p_user;
  if v_trail is null then raise exception 'aula não encontrada' using errcode = 'P0002'; end if;

  delete from public.lesson_sections where lesson_id = p_lesson;
  delete from public.source_references where lesson_id = p_lesson;

  insert into public.lesson_sections (lesson_id, user_id, kind, title, body_markdown, sort_order, node_keys, verification_status)
  select p_lesson, p_user, s.kind, s.title, s.body_markdown, s.ord, coalesce(s.node_keys, '{}'), s.verification_status
  from jsonb_to_recordset(p_payload -> 'sections')
       as s(kind text, title text, body_markdown text, ord int, node_keys text[], verification_status text);

  insert into public.source_references (lesson_id, user_id, kind, citation, verified)
  select p_lesson, p_user, r.kind, r.citation, r.kind = 'texto_informado'
  from jsonb_to_recordset(coalesce(p_payload -> 'references', '[]'::jsonb)) as r(kind text, citation text);

  update public.lesson_nodes ln
     set taught = exists (
       select 1 from jsonb_array_elements_text(p_payload -> 'taughtNodeKeys') as k(value)
       join public.content_nodes n on n.id = ln.node_id and n.key = k.value)
   where ln.lesson_id = p_lesson;

  if (p_payload ->> 'verificationPending')::boolean then
    update public.content_nodes n set verification_status = 'pendente'
      from public.lesson_nodes ln
     where ln.lesson_id = p_lesson and ln.node_id = n.id and n.verification_status = 'nao_aplicavel';
  end if;

  update public.lessons
     set status = p_payload ->> 'status',
         title = coalesce(nullif(p_payload ->> 'title', ''), title),
         verification_pending = (p_payload ->> 'verificationPending')::boolean,
         unverified_claims = coalesce(p_payload -> 'unverifiedClaims', '[]'::jsonb),
         generation_error = null,
         generated_at = now()
   where id = p_lesson;
end $$;

-- -----------------------------------------------------------------------------
-- Questões de uma aula: desativa as anteriores (histórico preservado) e insere novas
-- -----------------------------------------------------------------------------
create or replace function public.save_lesson_questions(p_lesson uuid, p_user uuid, p_board text, p_questions jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare q jsonb; v_q uuid; v_node uuid; v_count int := 0; v_trail uuid;
begin
  select trail_id into v_trail from public.lessons where id = p_lesson and user_id = p_user;
  if v_trail is null then raise exception 'aula não encontrada' using errcode = 'P0002'; end if;
  update public.questions set active = false where lesson_id = p_lesson and active;

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

-- -----------------------------------------------------------------------------
-- Resposta do aluno: correção determinística no banco
-- -----------------------------------------------------------------------------
create or replace function public.submit_answer(
  p_user uuid, p_question uuid, p_option uuid, p_bool boolean, p_context text default 'fixacao')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_q public.questions;
  v_correct boolean;
  v_option public.question_options;
begin
  select * into v_q from public.questions where id = p_question and user_id = p_user and active;
  if not found then raise exception 'questão não encontrada' using errcode = 'P0002'; end if;

  if v_q.type = 'certo_errado' then
    if p_bool is null then raise exception 'resposta certo/errado ausente' using errcode = '22023'; end if;
    v_correct := p_bool = v_q.correct_answer_true;
    insert into public.answer_attempts (question_id, user_id, answer_bool, is_correct, context)
    values (p_question, p_user, p_bool, v_correct, p_context);
  else
    select * into v_option from public.question_options where id = p_option and question_id = p_question;
    if not found then raise exception 'alternativa inválida' using errcode = '22023'; end if;
    v_correct := v_option.is_correct;
    insert into public.answer_attempts (question_id, user_id, selected_option_id, is_correct, context)
    values (p_question, p_user, p_option, v_correct, p_context);
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'justification', v_q.justification,
    'correctAnswerTrue', v_q.correct_answer_true,
    'nodeId', v_q.node_id,
    'options', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'isCorrect', o.is_correct, 'explanation', o.explanation) order by o.sort_order)
      from public.question_options o where o.question_id = p_question), '[]'::jsonb)
  );
end $$;

-- Desempenho na aula: considera a ÚLTIMA tentativa de cada questão ativa.
create or replace function public.lesson_quiz_outcome(p_user uuid, p_lesson uuid, p_context text default null)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with latest as (
    select distinct on (a.question_id) a.question_id, a.is_correct, q.essential
    from public.answer_attempts a
    join public.questions q on q.id = a.question_id
    where q.lesson_id = p_lesson and q.active and a.user_id = p_user
      and (p_context is null or a.context = p_context)
    order by a.question_id, a.created_at desc
  )
  select jsonb_build_object(
    'answered', count(*),
    'correct', count(*) filter (where is_correct),
    'essentialAnswered', count(*) filter (where essential),
    'essentialCorrect', count(*) filter (where essential and is_correct)
  ) from latest;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'assert_trail_owner(uuid, uuid)',
    'replace_trail_nodes(uuid, uuid, uuid, jsonb)',
    'persist_trail_plan(uuid, uuid, jsonb)',
    'save_lesson_content(uuid, uuid, jsonb)',
    'save_lesson_questions(uuid, uuid, text, jsonb)',
    'submit_answer(uuid, uuid, uuid, boolean, text)',
    'lesson_quiz_outcome(uuid, uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
