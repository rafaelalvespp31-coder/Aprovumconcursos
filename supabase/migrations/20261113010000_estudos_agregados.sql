-- Página de Estudos mais rápida: o banco agrega em vez de mandar dezenas de milhares de linhas para o servidor.

-- Quantas questões ativas cada tema do catálogo tem (só o servidor usa).
create or replace function public.catalog_question_counts()
returns table (topic_id uuid, n integer)
language sql stable security invoker set search_path = public
as $$ select topic_id, count(*)::int from public.catalog_questions where active group by topic_id $$;
revoke all on function public.catalog_question_counts() from public, anon, authenticated;
grant execute on function public.catalog_question_counts() to service_role;

-- Resumo das tentativas do próprio aluno: uma linha por questão (última tentativa e tempo somado).
create or replace function public.my_attempts_compact()
returns table (question_id uuid, created_at timestamptz, time_spent_seconds integer)
language sql stable security invoker set search_path = public
as $$
  select a.question_id, max(a.created_at), coalesce(sum(a.time_spent_seconds), 0)::int
  from public.answer_attempts a
  where a.user_id = auth.uid()
  group by a.question_id
$$;
revoke all on function public.my_attempts_compact() from public, anon;
grant execute on function public.my_attempts_compact() to authenticated;
