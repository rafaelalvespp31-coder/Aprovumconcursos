-- =============================================================================
-- Estudo por conteúdo específico (correção de escopo)
--
-- O modelo já suporta conteúdos independentes: cada study_trails é um conteúdo
-- colado pelo aluno, com nós, aulas, questões e progresso próprios. Esta migração
-- só acrescenta o que faltava, sem apagar nem reescrever dados existentes:
--   1. Delimitação de escopo pela IA (subtemas) e pedido de esclarecimento.
--   2. Origem dos nós do mapa de cobertura (texto do aluno × organizado pela IA).
--   3. Avaliação em três níveis (fácil, médio, difícil) com exercícios de recuperação.
--   4. PDF individual por conteúdo, vinculado ao aluno, às questões e à versão da fonte.
-- =============================================================================

-- 1. Escopo e esclarecimento --------------------------------------------------
alter table public.study_trails drop constraint if exists study_trails_status_check;
alter table public.study_trails add constraint study_trails_status_check
  check (status in ('pending', 'processing', 'clarification', 'review', 'active', 'failed'));

alter table public.study_trails
  add column if not exists scope_summary  jsonb,
  add column if not exists scope_outline  text check (char_length(scope_outline) <= 20000),
  add column if not exists scope_question jsonb,
  add column if not exists scope_answer   text check (char_length(scope_answer) <= 1000);

comment on column public.study_trails.scope_outline is
  'Subtemas organizados pela IA para um tema/artigo informado de forma breve. Nunca contém texto legal: apenas a estrutura a ensinar.';

-- 2. Origem dos nós -----------------------------------------------------------
alter table public.content_nodes
  add column if not exists origin text not null default 'texto' check (origin in ('texto', 'ia'));

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
      depth int, ord int, path text, parent_key text, requires_direct_coverage boolean,
      origin text, verification_status text)
  ), ids as (
    select key, gen_random_uuid() as id from src
  )
  insert into public.content_nodes (
    id, trail_id, version_id, user_id, key, parent_id, kind, marker, title, source_text,
    span_start, span_end, depth, sort_order, path, requires_direct_coverage, origin, verification_status)
  select i.id, p_trail, p_version, p_user, s.key, p.id, s.kind, s.marker, s.title, s.source_text,
         s.span_start, s.span_end, s.depth, s.ord, s.path, s.requires_direct_coverage,
         coalesce(s.origin, 'texto'), coalesce(s.verification_status, 'nao_aplicavel')
  from src s
  join ids i on i.key = s.key
  left join ids p on p.key = s.parent_key;

  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.replace_trail_nodes(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_trail_nodes(uuid, uuid, uuid, jsonb) to service_role;

-- 3. Níveis e recuperação -----------------------------------------------------
alter table public.questions
  add column if not exists level text check (level in ('facil', 'medio', 'dificil')),
  add column if not exists recovery_of uuid;

-- Questões já existentes: nível derivado da dificuldade (1–2 fácil, 3 médio, 4–5 difícil).
update public.questions
   set level = case when difficulty <= 2 then 'facil' when difficulty = 3 then 'medio' else 'dificil' end
 where level is null;
alter table public.questions alter column level set not null;

-- Inserções que não informam o nível herdam o nível pela dificuldade.
create or replace function public.questions_default_level()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.level is null then
    new.level := case when new.difficulty <= 2 then 'facil' when new.difficulty = 3 then 'medio' else 'dificil' end;
  end if;
  return new;
end $$;
drop trigger if exists questions_default_level on public.questions;
create trigger questions_default_level before insert on public.questions
  for each row execute function public.questions_default_level();

alter table public.questions drop constraint if exists questions_recovery_fk;
alter table public.questions add constraint questions_recovery_fk
  foreign key (recovery_of, user_id) references public.questions (id, user_id) on delete cascade;
alter table public.questions add constraint questions_recovery_not_self check (recovery_of is null or recovery_of <> id);
create index if not exists questions_recovery on public.questions (recovery_of) where recovery_of is not null;
create index if not exists questions_lesson_level on public.questions (lesson_id, level) where active;

alter table public.learning_progress
  add column if not exists levels_passed smallint not null default 0 check (levels_passed between 0 and 3);
-- Unidades já aprovadas no modelo anterior contam como os três níveis concluídos.
update public.learning_progress
   set levels_passed = 3
 where levels_passed = 0 and (state in ('aguardando_dominio', 'dominada') or passed_at is not null);

-- Gravação das questões de um nível (a primeira chamada da aula substitui; as demais acrescentam).
drop function if exists public.save_lesson_questions(uuid, uuid, text, jsonb);
drop function if exists public.save_lesson_questions(uuid, uuid, text, jsonb, boolean);
create or replace function public.save_lesson_questions(
  p_lesson uuid, p_user uuid, p_board text, p_questions jsonb, p_append boolean default false, p_level text default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare q jsonb; v_q uuid; v_node uuid; v_count int := 0; v_trail uuid; v_level text;
begin
  select trail_id into v_trail from public.lessons where id = p_lesson and user_id = p_user;
  if v_trail is null then raise exception 'aula não encontrada' using errcode = 'P0002'; end if;
  if p_level is not null and p_level not in ('facil', 'medio', 'dificil') then
    raise exception 'nível inválido' using errcode = '22023';
  end if;
  if not p_append then
    update public.questions set active = false where lesson_id = p_lesson and active;
  end if;

  for q in select * from jsonb_array_elements(p_questions) loop
    select n.id into v_node from public.content_nodes n
     join public.lesson_nodes ln on ln.node_id = n.id and ln.lesson_id = p_lesson
     where n.key = q ->> 'nodeKey';
    continue when v_node is null; -- tópico fora da aula: descartado
    v_level := coalesce(p_level, q ->> 'level',
      case when (q ->> 'difficulty')::int <= 2 then 'facil' when (q ->> 'difficulty')::int = 3 then 'medio' else 'dificil' end);
    insert into public.questions (lesson_id, node_id, user_id, type, statement, justification, difficulty,
                                  essential, origin, board_style, depends_on_external_source, correct_answer_true, level)
    values (p_lesson, v_node, p_user, q ->> 'type', q ->> 'statement', q ->> 'justification',
            (q ->> 'difficulty')::int, coalesce((q ->> 'essential')::boolean, false), 'original', p_board,
            coalesce((q ->> 'dependsOnExternalSource')::boolean, false),
            case when q ->> 'type' = 'certo_errado' then (q ->> 'correctAnswerTrue')::boolean end, v_level)
    returning id into v_q;
    insert into public.question_options (question_id, user_id, label, text, is_correct, explanation, sort_order)
    select v_q, p_user, o ->> 'label', o ->> 'text', (o ->> 'correct')::boolean, o ->> 'explanation', ord - 1
    from jsonb_array_elements(coalesce(q -> 'options', '[]'::jsonb)) with ordinality as t(o, ord);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke all on function public.save_lesson_questions(uuid, uuid, text, jsonb, boolean, text) from public, anon, authenticated;
grant execute on function public.save_lesson_questions(uuid, uuid, text, jsonb, boolean, text) to service_role;

-- Exercícios de recuperação: cada um substitui uma questão oficial errada, no mesmo
-- item e nível. A cadeia aponta sempre para a questão oficial (raiz).
create or replace function public.save_recovery_questions(p_user uuid, p_lesson uuid, p_board text, p_questions jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare q jsonb; v_root public.questions; v_q uuid; v_count int := 0;
begin
  for q in select * from jsonb_array_elements(p_questions) loop
    select * into v_root from public.questions
     where id = (q ->> 'recoveryOf')::uuid and user_id = p_user and lesson_id = p_lesson
       and recovery_of is null and active;
    if not found then raise exception 'questão de origem inválida' using errcode = '22023'; end if;
    insert into public.questions (lesson_id, node_id, user_id, type, statement, justification, difficulty,
                                  essential, origin, board_style, depends_on_external_source, correct_answer_true,
                                  level, recovery_of)
    values (p_lesson, v_root.node_id, p_user, q ->> 'type', q ->> 'statement', q ->> 'justification',
            (q ->> 'difficulty')::int, v_root.essential, 'original', p_board,
            coalesce((q ->> 'dependsOnExternalSource')::boolean, false),
            case when q ->> 'type' = 'certo_errado' then (q ->> 'correctAnswerTrue')::boolean end,
            v_root.level, v_root.id)
    returning id into v_q;
    insert into public.question_options (question_id, user_id, label, text, is_correct, explanation, sort_order)
    select v_q, p_user, o ->> 'label', o ->> 'text', (o ->> 'correct')::boolean, o ->> 'explanation', ord - 1
    from jsonb_array_elements(coalesce(q -> 'options', '[]'::jsonb)) with ordinality as t(o, ord);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke all on function public.save_recovery_questions(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_recovery_questions(uuid, uuid, text, jsonb) to service_role;

-- Resultado de um nível. Cada questão oficial conta uma vez; vale a resposta mais
-- recente da cadeia (a própria questão ou qualquer recuperação dela).
create or replace function public.lesson_level_outcome(p_user uuid, p_lesson uuid, p_level text, p_context text default 'fixacao')
returns jsonb
language sql stable security definer set search_path = '' as $$
  with official as (
    select q.id, q.essential
    from public.questions q
    where q.lesson_id = p_lesson and q.user_id = p_user and q.active and q.level = p_level and q.recovery_of is null
  ), chain as (
    select o.id as root, o.essential, q.id as qid
    from official o
    join public.questions q on q.user_id = p_user and (q.id = o.id or q.recovery_of = o.id)
  ), latest as (
    select distinct on (c.root) c.root, c.essential, a.is_correct
    from chain c
    join public.answer_attempts a on a.question_id = c.qid and a.user_id = p_user
    where (p_context is null or a.context = p_context)
    order by c.root, a.created_at desc
  ), answered as (
    select distinct o.id
    from official o
    join public.answer_attempts a on a.question_id = o.id and a.user_id = p_user
    where (p_context is null or a.context = p_context)
  )
  select jsonb_build_object(
    'answered', (select count(*) from answered),
    'correct', (select count(*) from latest where is_correct),
    'essentialAnswered', (select count(*) from latest where essential),
    'essentialCorrect', (select count(*) from latest where essential and is_correct),
    'total', (select count(*) from official)
  );
$$;
revoke all on function public.lesson_level_outcome(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.lesson_level_outcome(uuid, uuid, text, text) to service_role;

-- 4. PDF por conteúdo ---------------------------------------------------------
create table if not exists public.study_pdfs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  trail_id      uuid not null,
  version_id    uuid not null,
  pdf_version   int  not null check (pdf_version >= 1),
  snapshot      jsonb not null,
  question_ids  uuid[] not null default '{}',
  content_hash  text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at    timestamptz not null default now(),
  unique (trail_id, pdf_version),
  unique (id, user_id),
  foreign key (trail_id, user_id) references public.study_trails (id, user_id) on delete cascade,
  foreign key (version_id, user_id) references public.source_document_versions (id, user_id) on delete cascade
);
create index if not exists study_pdfs_trail on public.study_pdfs (user_id, trail_id, created_at desc);

grant select on public.study_pdfs to authenticated;
alter table public.study_pdfs enable row level security;
alter table public.study_pdfs force row level security;
drop policy if exists "dono le" on public.study_pdfs;
create policy "dono le" on public.study_pdfs for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "admin le" on public.study_pdfs;
create policy "admin le" on public.study_pdfs for select to authenticated using ((select public.is_admin()));

-- Grava o PDF somente quando TODAS as unidades do conteúdo passaram nos três níveis.
create or replace function public.save_study_pdf(p_user uuid, p_trail uuid, p_snapshot jsonb, p_question_ids uuid[], p_hash text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_total int; v_done int; v_version uuid; v_next int; v_id uuid;
begin
  perform public.assert_trail_owner(p_trail, p_user);
  select count(*), count(*) filter (where coalesce(lp.levels_passed, 0) = 3)
    into v_total, v_done
    from public.lessons l
    left join public.learning_progress lp on lp.lesson_id = l.id and lp.user_id = p_user
   where l.trail_id = p_trail and l.user_id = p_user;
  if v_total = 0 or v_done < v_total then
    raise exception 'conteúdo ainda não concluído nos três níveis' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(p_question_ids) x(id)
    left join public.questions q on q.id = x.id and q.user_id = p_user
    left join public.lessons l on l.id = q.lesson_id and l.trail_id = p_trail
    where l.id is null
  ) then
    raise exception 'questão fora deste conteúdo' using errcode = '22023';
  end if;
  select v.id into v_version
    from public.source_document_versions v
    join public.source_documents d on d.id = v.document_id
   where d.trail_id = p_trail and v.user_id = p_user
   order by v.version desc limit 1;
  select coalesce(max(pdf_version), 0) + 1 into v_next from public.study_pdfs where trail_id = p_trail and user_id = p_user;
  insert into public.study_pdfs (user_id, trail_id, version_id, pdf_version, snapshot, question_ids, content_hash)
  values (p_user, p_trail, v_version, v_next, p_snapshot, p_question_ids, p_hash)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'pdfVersion', v_next);
end $$;
revoke all on function public.save_study_pdf(uuid, uuid, jsonb, uuid[], text) from public, anon, authenticated;
grant execute on function public.save_study_pdf(uuid, uuid, jsonb, uuid[], text) to service_role;
