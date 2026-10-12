-- =============================================================================
-- Banco de questões (Fase 3): funções atômicas usadas pelo servidor
-- Somente ADITIVA. Executáveis apenas pelo service_role; cada função confere o
-- papel de quem age (autor/revisor/admin) também no banco.
-- =============================================================================

-- Cadastro/edição atômica: questão + alternativas + referências legais.
create or replace function public.bank_save_question(p_actor uuid, p_id uuid, p jsonb)
returns uuid
language plpgsql set search_path = '' as $$
declare
  qid uuid;
  o jsonb;
  r jsonb;
  i int := 0;
begin
  if p_id is null then
    if not public.has_bank_role(p_actor, 'autor') then
      raise exception 'Somente autores podem cadastrar questões.' using errcode = 'insufficient_privilege';
    end if;
    insert into public.bank_questions (
      subject_id, topic_id, source_id, exam_id, origin, question_type, statement, case_context,
      board_slug, board_style, year, original_number, initial_difficulty, correct_answer_true,
      justification, legal_basis, usage_rights, verified_at, generation_batch_id, created_by, status)
    values (
      (p ->> 'subject_id')::uuid, nullif(p ->> 'topic_id', '')::uuid, nullif(p ->> 'source_id', '')::uuid,
      nullif(p ->> 'exam_id', '')::uuid, p ->> 'origin', p ->> 'question_type', p ->> 'statement',
      nullif(p ->> 'case_context', ''), nullif(p ->> 'board_slug', ''), nullif(p ->> 'board_style', ''),
      nullif(p ->> 'year', '')::int, nullif(p ->> 'original_number', ''), p ->> 'initial_difficulty',
      (p ->> 'correct_answer_true')::boolean, nullif(p ->> 'justification', ''), nullif(p ->> 'legal_basis', ''),
      coalesce(p ->> 'usage_rights', 'nao_verificado'), nullif(p ->> 'verified_at', '')::date,
      nullif(p ->> 'generation_batch_id', '')::uuid, p_actor, coalesce(p ->> 'status', 'rascunho'))
    returning id into qid;
  else
    if not (public.has_bank_role(p_actor, 'autor') or public.has_bank_role(p_actor, 'revisor')) then
      raise exception 'Sem permissão para editar questões.' using errcode = 'insufficient_privilege';
    end if;
    update public.bank_questions set
      subject_id = (p ->> 'subject_id')::uuid,
      topic_id = nullif(p ->> 'topic_id', '')::uuid,
      source_id = nullif(p ->> 'source_id', '')::uuid,
      exam_id = nullif(p ->> 'exam_id', '')::uuid,
      origin = p ->> 'origin',
      question_type = p ->> 'question_type',
      statement = p ->> 'statement',
      case_context = nullif(p ->> 'case_context', ''),
      board_slug = nullif(p ->> 'board_slug', ''),
      board_style = nullif(p ->> 'board_style', ''),
      year = nullif(p ->> 'year', '')::int,
      original_number = nullif(p ->> 'original_number', ''),
      initial_difficulty = p ->> 'initial_difficulty',
      correct_answer_true = (p ->> 'correct_answer_true')::boolean,
      justification = nullif(p ->> 'justification', ''),
      legal_basis = nullif(p ->> 'legal_basis', ''),
      usage_rights = coalesce(p ->> 'usage_rights', 'nao_verificado'),
      verified_at = nullif(p ->> 'verified_at', '')::date
    where id = p_id
    returning id into qid;
    if qid is null then
      raise exception 'Questão não encontrada.' using errcode = 'no_data_found';
    end if;
  end if;

  delete from public.bank_question_options where question_id = qid;
  for o in select * from jsonb_array_elements(coalesce(p -> 'options', '[]'::jsonb)) loop
    insert into public.bank_question_options (question_id, label, text, sort_order, is_correct, explanation)
    values (qid, o ->> 'label', o ->> 'text', i, coalesce((o ->> 'is_correct')::boolean, false), nullif(o ->> 'explanation', ''));
    i := i + 1;
  end loop;

  delete from public.bank_question_legal_refs where question_id = qid;
  for r in select * from jsonb_array_elements(coalesce(p -> 'legal_refs', '[]'::jsonb)) loop
    insert into public.bank_question_legal_refs (
      question_id, norm_name, norm_number, norm_year, article, paragraph, item, letter, official_url,
      consulted_on, norm_version, amendment_note, case_law_court, case_law_id, case_law_thesis, last_reviewed_on)
    values (
      qid, r ->> 'norm_name', nullif(r ->> 'norm_number', ''), nullif(r ->> 'norm_year', '')::int,
      nullif(r ->> 'article', ''), nullif(r ->> 'paragraph', ''), nullif(r ->> 'item', ''), nullif(r ->> 'letter', ''),
      nullif(r ->> 'official_url', ''), (r ->> 'consulted_on')::date, nullif(r ->> 'norm_version', ''),
      nullif(r ->> 'amendment_note', ''), nullif(r ->> 'case_law_court', ''), nullif(r ->> 'case_law_id', ''),
      nullif(r ->> 'case_law_thesis', ''), nullif(r ->> 'last_reviewed_on', '')::date);
  end loop;
  return qid;
end $$;

-- Decisão de fluxo: checklist (opcional) + mudança de status, com papel conferido.
create or replace function public.bank_decide(p_actor uuid, p_id uuid, p_to text, p_reason text, p_checks jsonb)
returns text
language plpgsql set search_path = '' as $$
declare
  cur record;
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
  is_rev boolean := public.has_bank_role(p_actor, 'revisor');
  is_aut boolean := public.has_bank_role(p_actor, 'autor');
begin
  select q.status into cur from public.bank_questions q where q.id = p_id for update;
  if not found then
    raise exception 'Questão não encontrada.' using errcode = 'no_data_found';
  end if;

  if p_checks is not null then
    if not is_rev then
      raise exception 'Somente revisores marcam o checklist.' using errcode = 'insufficient_privilege';
    end if;
    if cur.status <> 'em_revisao' then
      raise exception 'O checklist só pode ser marcado durante a revisão.' using errcode = 'check_violation';
    end if;
    update public.bank_questions set
      content_checked = coalesce((p_checks ->> 'content')::boolean, false),
      answer_checked = coalesce((p_checks ->> 'answer')::boolean, false),
      source_checked = coalesce((p_checks ->> 'source')::boolean, false),
      rights_checked = coalesce((p_checks ->> 'rights')::boolean, false)
    where id = p_id;
  end if;

  if p_to is null then
    return cur.status;
  end if;

  if p_to in ('aprovada', 'correcao_necessaria', 'publicada', 'suspensa') or cur.status in ('aprovada', 'publicada', 'suspensa') then
    if not is_rev then
      raise exception 'Somente revisores podem tomar esta decisão.' using errcode = 'insufficient_privilege';
    end if;
  elsif not (is_rev or is_aut) then
    raise exception 'Sem permissão.' using errcode = 'insufficient_privilege';
  end if;

  if (p_to in ('correcao_necessaria', 'suspensa', 'arquivada') or (cur.status in ('aprovada', 'publicada', 'suspensa') and p_to <> 'publicada'))
     and coalesce(char_length(reason), 0) < 5 then
    raise exception 'Informe o motivo da decisão (mínimo 5 caracteres).' using errcode = 'check_violation';
  end if;

  update public.bank_questions set
    status = p_to,
    status_changed_by = p_actor,
    change_reason = reason,
    approved_by = case when p_to = 'aprovada' then p_actor else approved_by end
  where id = p_id;
  return p_to;
end $$;

-- Equipe: só admin concede/remove papéis (por e-mail).
create or replace function public.bank_set_staff_role(p_admin uuid, p_email text, p_role text, p_grant boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
begin
  if not exists (select 1 from public.admin_roles r where r.user_id = p_admin and r.role = 'admin') then
    raise exception 'Somente administradores gerenciam a equipe.' using errcode = 'insufficient_privilege';
  end if;
  if p_role not in ('autor', 'revisor') then
    raise exception 'Papel inválido.' using errcode = 'check_violation';
  end if;
  select u.id into uid from auth.users u where lower(u.email) = lower(btrim(p_email));
  if uid is null then
    raise exception 'Nenhuma conta com esse e-mail.' using errcode = 'no_data_found';
  end if;
  if p_grant then
    insert into public.staff_roles (user_id, role, granted_by) values (uid, p_role, p_admin) on conflict do nothing;
  else
    delete from public.staff_roles s where s.user_id = uid and s.role = p_role;
  end if;
  return uid;
end $$;

create or replace function public.bank_staff_list()
returns table (user_id uuid, email text, roles text[], is_admin boolean)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email::text,
         coalesce(array_agg(s.role order by s.role) filter (where s.role is not null), '{}'),
         exists (select 1 from public.admin_roles a where a.user_id = u.id and a.role = 'admin')
  from auth.users u
  left join public.staff_roles s on s.user_id = u.id
  where s.user_id is not null or exists (select 1 from public.admin_roles a where a.user_id = u.id and a.role = 'admin')
  group by u.id, u.email
  order by u.email;
$$;

-- Painel: números agregados (sem dados pessoais).
create or replace function public.bank_dashboard()
returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.bank_questions group by status) s), '{}'::jsonb),
    'by_subject', coalesce((
      select jsonb_agg(jsonb_build_object('slug', su.slug, 'name', su.name, 'total', coalesce(x.total, 0), 'published', coalesce(x.published, 0)) order by su.sort_order)
      from public.subjects su
      left join (select subject_id, count(*) total, count(*) filter (where status = 'publicada') published from public.bank_questions group by subject_id) x
        on x.subject_id = su.id
      where su.status = 'ativa'), '[]'::jsonb),
    'by_difficulty', coalesce((select jsonb_object_agg(initial_difficulty, n) from (select initial_difficulty, count(*) n from public.bank_questions where status <> 'arquivada' group by initial_difficulty) d), '{}'::jsonb),
    'by_origin', coalesce((select jsonb_object_agg(origin, n) from (select origin, count(*) n from public.bank_questions where status <> 'arquivada' group by origin) o), '{}'::jsonb),
    'sources', (select count(*) from public.question_sources where status <> 'arquivada'),
    'sources_unverified', (select count(*) from public.question_sources where status <> 'arquivada' and not reuse_verified and kind in ('prova_oficial', 'gabarito_oficial')),
    'imports_processing', (select count(*) from public.question_imports where status in ('recebido', 'processando', 'aguardando_conferencia')),
    'flags_open', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from public.bank_question_flags where status in ('aberto', 'em_analise') group by kind) f), '{}'::jsonb),
    'attempts', (select count(*) from public.bank_attempts),
    'attempts_correct', (select count(*) from public.bank_attempts where is_correct),
    'ai_cost_usd', coalesce((select sum(cost_usd) from public.bank_generation_batches), 0) + coalesce((select sum(cost_usd) from public.bank_question_ai_reviews), 0),
    'ai_batches', (select count(*) from public.bank_generation_batches),
    'recent', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select r.created_at, r.from_status, r.to_status, r.notes, q.id question_id, q.public_code
        from public.bank_question_reviews r join public.bank_questions q on q.id = r.question_id
        order by r.created_at desc limit 12) x), '[]'::jsonb)
  );
$$;

revoke all on function public.bank_save_question(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.bank_decide(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.bank_set_staff_role(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.bank_staff_list() from public, anon, authenticated;
revoke all on function public.bank_dashboard() from public, anon, authenticated;
grant execute on function public.bank_save_question(uuid, uuid, jsonb) to service_role;
grant execute on function public.bank_decide(uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.bank_set_staff_role(uuid, text, text, boolean) to service_role;
grant execute on function public.bank_staff_list() to service_role;
grant execute on function public.bank_dashboard() to service_role;
