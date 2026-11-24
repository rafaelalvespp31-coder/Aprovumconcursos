-- Estatísticas de uma questão para o aluno: acertos x erros e quantidade de respostas por alternativa (todos os alunos).
-- Só devolve números agregados (nenhum aluno é identificável) e só para quem já respondeu a questão (não vira dica antes da resposta).
-- Rollback: drop function public.bank_question_distribution(uuid, uuid);
create or replace function public.bank_question_distribution(p_user uuid, p_question uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  q record;
  total int; certas int; alunos int; minhas int; minhas_certas int;
  opts jsonb;
begin
  if p_user is null or p_question is null then
    raise exception 'Pedido inválido.' using errcode = '22023';
  end if;
  select id, question_type, current_version, status, correct_answer_true into q from public.bank_questions where id = p_question;
  if not found or q.status <> 'publicada' then
    raise exception 'Questão indisponível.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.bank_attempts a where a.user_id = p_user and a.question_id = p_question) then
    raise exception 'Responda a questão para ver as estatísticas.' using errcode = '42501';
  end if;

  select count(*), count(*) filter (where a.is_correct), count(distinct a.user_id)
    into total, certas, alunos
    from public.bank_attempts a
   where a.question_id = p_question and a.version = q.current_version and coalesce(a.omitted, false) = false;

  select count(*), count(*) filter (where a.is_correct)
    into minhas, minhas_certas
    from public.bank_attempts a
   where a.question_id = p_question and a.user_id = p_user and coalesce(a.omitted, false) = false;

  if q.question_type = 'certo_errado' then
    select jsonb_build_array(
      jsonb_build_object('label', 'CERTO',  'isCorrect', q.correct_answer_true is true,
        'count', (select count(*) from public.bank_attempts a where a.question_id = p_question and a.version = q.current_version and coalesce(a.omitted,false) = false and a.answer_bool is true)),
      jsonb_build_object('label', 'ERRADO', 'isCorrect', q.correct_answer_true is false,
        'count', (select count(*) from public.bank_attempts a where a.question_id = p_question and a.version = q.current_version and coalesce(a.omitted,false) = false and a.answer_bool is false))
    ) into opts;
  else
    select coalesce(jsonb_agg(jsonb_build_object('label', o.label, 'isCorrect', o.is_correct,
             'count', (select count(*) from public.bank_attempts a where a.question_id = p_question and a.version = q.current_version and coalesce(a.omitted,false) = false and a.selected_label = o.label)
           ) order by o.sort_order), '[]'::jsonb)
      into opts from public.bank_question_options o where o.question_id = p_question;
  end if;

  return jsonb_build_object(
    'type', q.question_type, 'total', total, 'correct', certas, 'wrong', total - certas, 'students', alunos,
    'options', opts, 'mine', jsonb_build_object('attempts', minhas, 'correct', minhas_certas)
  );
end;
$function$;
revoke all on function public.bank_question_distribution(uuid, uuid) from public, anon, authenticated;
grant execute on function public.bank_question_distribution(uuid, uuid) to service_role;
