-- Banco de questões de concursos: correção segura no servidor, tentativa idempotente,
-- novas bancas e validação do gabarito pelo administrador.

-- Bancas que faltavam (não altera as existentes).
insert into public.exam_boards (slug, name, hint, sort_order)
values ('fundatec', 'FUNDATEC', null, 90), ('crs_pmmg', 'CRS (PM MG)', 'Centro de Recrutamento e Seleção da PMMG', 91)
on conflict (slug) do nothing;

-- Tentativa idempotente: a mesma confirmação (mesma chave) nunca conta duas vezes.
alter table public.bank_attempts add column if not exists attempt_key uuid;
create unique index if not exists bank_attempts_user_attempt_key on public.bank_attempts (user_id, attempt_key) where attempt_key is not null;

-- O administrador pode validar (aprovar) o gabarito de questões que ele mesmo cadastrou;
-- para os demais revisores continua valendo a regra de quatro olhos (quem cria não aprova).
do $$
declare d text := pg_get_functiondef('public.bank_questions_guard()'::regprocedure);
begin
  if position('if new.approved_by = new.created_by then' in d) > 0 then
    execute replace(d, 'if new.approved_by = new.created_by then',
      'if new.approved_by = new.created_by and not exists (select 1 from public.admin_roles r where r.user_id = new.approved_by and r.role = ''admin'') then');
  end if;
end $$;

-- Correção da resposta: só no servidor (service_role), só para questão publicada.
-- O gabarito e o comentário saem daqui apenas depois de uma resposta válida.
create or replace function public.bank_answer_question(
  p_user uuid, p_question uuid, p_notebook uuid, p_option uuid, p_bool boolean, p_attempt uuid, p_ms int)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  q record;
  prev record;
  chosen record;
  ok boolean;
  dup boolean := false;
  opts jsonb;
begin
  if p_user is null or p_question is null or p_attempt is null then
    raise exception 'Resposta inválida.' using errcode = '22023';
  end if;
  select id, question_type, correct_answer_true, justification, legal_basis, current_version, status
    into q from public.bank_questions where id = p_question;
  if not found or q.status <> 'publicada' then
    raise exception 'Questão indisponível.' using errcode = 'P0002';
  end if;
  if p_notebook is not null and not exists (select 1 from public.question_notebooks n where n.id = p_notebook and n.user_id = p_user) then
    raise exception 'Caderno não encontrado.' using errcode = 'P0002';
  end if;

  -- Mesma confirmação enviada de novo (clique duplo, rede instável): devolve o resultado já gravado.
  select a.is_correct, a.selected_label, a.answer_bool into prev
    from public.bank_attempts a where a.user_id = p_user and a.attempt_key = p_attempt and a.question_id = p_question;

  if found then
    dup := true;
    ok := prev.is_correct;
  else
    if q.question_type = 'certo_errado' then
      if p_bool is null then raise exception 'Resposta inválida.' using errcode = '22023'; end if;
      ok := p_bool = q.correct_answer_true;
    else
      select o.id, o.label, o.is_correct into chosen from public.bank_question_options o where o.id = p_option and o.question_id = p_question;
      if not found then raise exception 'Resposta inválida.' using errcode = '22023'; end if;
      ok := chosen.is_correct;
    end if;
    begin
      insert into public.bank_attempts (question_id, version, user_id, context, notebook_id, selected_label, answer_bool, is_correct, duration_ms, attempt_key)
      values (q.id, q.current_version, p_user, 'treino', p_notebook,
              case when q.question_type = 'multipla_escolha' then chosen.label end,
              case when q.question_type = 'certo_errado' then p_bool end,
              ok, least(greatest(coalesce(p_ms, 0), 0), 3600000), p_attempt);
    exception when unique_violation then
      dup := true;
      select a.is_correct into ok from public.bank_attempts a where a.user_id = p_user and a.attempt_key = p_attempt;
    end;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'isCorrect', o.is_correct, 'explanation', coalesce(o.explanation, '')) order by o.sort_order), '[]'::jsonb)
    into opts from public.bank_question_options o where o.question_id = q.id;

  return jsonb_build_object(
    'correct', ok,
    'justification', nullif(concat_ws(E'\n\n', q.justification, case when q.legal_basis is not null then 'Fundamentação: ' || q.legal_basis end), ''),
    'correctAnswerTrue', case when q.question_type = 'certo_errado' then q.correct_answer_true end,
    'options', opts,
    'duplicate', dup);
end $$;
revoke all on function public.bank_answer_question(uuid, uuid, uuid, uuid, boolean, uuid, int) from public, anon, authenticated;
grant execute on function public.bank_answer_question(uuid, uuid, uuid, uuid, boolean, uuid, int) to service_role;
