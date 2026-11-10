-- Auditoria (rodada 2): desempenho e endurecimento, sem mudar comportamento.
--  1) search_path fixo nas funções auxiliares (aviso function_search_path_mutable);
--  2) políticas de leitura das tabelas writing_* avaliam auth.uid() uma vez por consulta, não por linha;
--  3) soma do gasto diário de IA feita no banco (antes: até 20 mil linhas somadas no servidor a cada chamada);
--  4) índices nas chaves estrangeiras das tabelas quentes (apagar trilha/aula/aluno em cascata varria a tabela inteira).

-- 1) search_path fixo -------------------------------------------------------------------------
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public._rx(text) set search_path = public, pg_temp;
alter function public._tex_array(text) set search_path = public, pg_temp;
alter function public._tex_display(text) set search_path = public, pg_temp;
alter function public._tex_json(jsonb) set search_path = public, pg_temp;
alter function public._tex_inline(text, boolean) set search_path = public, pg_temp;
alter function public._tex_text(text) set search_path = public, pg_temp;

-- 2) RLS sem reavaliar auth.uid() por linha ----------------------------------------------------
alter policy writing_competencies_own on public.writing_competencies using (user_id = (select auth.uid()));
alter policy writing_errors_own on public.writing_errors using (user_id = (select auth.uid()));
alter policy writing_evaluations_own on public.writing_evaluations using (user_id = (select auth.uid()));
alter policy writing_revisions_own on public.writing_revisions using (user_id = (select auth.uid()));
alter policy writing_submissions_own on public.writing_submissions using (user_id = (select auth.uid()));
alter policy writing_themes_read on public.writing_themes using (user_id is null or user_id = (select auth.uid()));

-- 3) gasto diário de IA somado no banco (só o servidor chama) -----------------------------------
create or replace function public.redacao_gasto_dia(p_start timestamptz)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(sum(cost_usd), 0)::numeric from public.writing_usage where created_at >= p_start
$$;
revoke all on function public.redacao_gasto_dia(timestamptz) from public, anon, authenticated;
grant execute on function public.redacao_gasto_dia(timestamptz) to service_role;

-- 4) índices nas chaves estrangeiras das tabelas quentes ---------------------------------------
create index if not exists answer_attempts_question_user_idx on public.answer_attempts (question_id, user_id);
create index if not exists answer_attempts_option_user_idx on public.answer_attempts (selected_option_id, user_id);
create index if not exists edital_disciplines_user_idx on public.edital_disciplines (user_id);
create index if not exists edital_topics_discipline_idx on public.edital_topics (discipline_id);
create index if not exists edital_topics_user_idx on public.edital_topics (user_id);
create index if not exists lesson_sections_lesson_user_idx on public.lesson_sections (lesson_id, user_id);
create index if not exists lessons_trail_user_idx on public.lessons (trail_id, user_id);
create index if not exists lessons_module_user_idx on public.lessons (module_id, user_id);
create index if not exists learning_progress_lesson_user_idx on public.learning_progress (lesson_id, user_id);
create index if not exists learning_progress_trail_user_idx on public.learning_progress (trail_id, user_id);
create index if not exists mastery_records_lesson_user_idx on public.mastery_records (lesson_id, user_id);
create index if not exists review_schedules_lesson_user_idx on public.review_schedules (lesson_id, user_id);
create index if not exists review_schedules_trail_user_idx on public.review_schedules (trail_id, user_id);
create index if not exists study_trails_folder_user_idx on public.study_trails (folder_id, user_id);
create index if not exists quiz_attempts_topic_idx on public.quiz_attempts (topic_id);
create index if not exists question_marks_question_user_idx on public.question_marks (question_id, user_id);
