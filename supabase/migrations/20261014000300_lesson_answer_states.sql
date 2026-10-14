-- Respostas já dadas nas questões de uma aula, para a tela reabrir com tudo marcado.
-- Devolve, por questão respondida, a resposta mais recente do aluno, se acertou, quantas
-- tentativas fez e o gabarito comentado (o mesmo que aparece logo após responder).
-- Só o dono da aula vê; questões ainda não respondidas não aparecem (o gabarito continua oculto).
create or replace function public.lesson_answer_states(p_lesson uuid)
returns table (question_id uuid, choice text, correct boolean, attempts int, feedback jsonb)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select a.question_id, a.selected_option_id, a.answer_bool, a.is_correct, a.created_at
    from public.answer_attempts a
    join public.questions q on q.id = a.question_id and q.user_id = a.user_id
    where q.lesson_id = p_lesson
      and a.user_id = (select auth.uid())
  ), last as (
    select distinct on (m.question_id) m.question_id, m.selected_option_id, m.answer_bool, m.is_correct
    from mine m
    order by m.question_id, m.created_at desc
  ), n as (
    select m.question_id, count(*)::int as c from mine m group by m.question_id
  )
  select l.question_id,
         coalesce(l.selected_option_id::text, l.answer_bool::text),
         l.is_correct,
         n.c,
         jsonb_build_object(
           'justification', q.justification,
           'correctAnswerTrue', q.correct_answer_true,
           'options', coalesce((
             select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'isCorrect', o.is_correct, 'explanation', o.explanation) order by o.sort_order)
             from public.question_options o where o.question_id = q.id), '[]'::jsonb)
         )
  from last l
  join n on n.question_id = l.question_id
  join public.questions q on q.id = l.question_id;
$$;
revoke all on function public.lesson_answer_states(uuid) from public, anon;
grant execute on function public.lesson_answer_states(uuid) to authenticated;
