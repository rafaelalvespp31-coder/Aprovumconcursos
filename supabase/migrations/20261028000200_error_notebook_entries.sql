-- Caderno de erros editável: o texto que o aluno ajustou para cada erro de um caderno dele.
-- Sem linha = o aluno vê a justificativa original. HTML já limpo pelo servidor (lista fechada
-- de marcações); o limite de tamanho também vale aqui.
-- Só o dono lê e escreve, e só em cadernos dele.
-- Rollback: drop table if exists public.error_notebook_entries;  (nada mais depende dela)

create table if not exists public.error_notebook_entries (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  notebook_id  uuid not null references public.question_notebooks (id) on delete cascade,
  question_id  uuid not null references public.bank_questions (id) on delete cascade,
  content_html text not null check (char_length(content_html) between 1 and 20000),
  updated_at   timestamptz not null default now(),
  primary key (user_id, notebook_id, question_id)
);
create index if not exists error_notebook_entries_notebook on public.error_notebook_entries (notebook_id);

alter table public.error_notebook_entries enable row level security;
create policy "dono le" on public.error_notebook_entries for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.error_notebook_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.question_notebooks n where n.id = notebook_id and n.user_id = (select auth.uid())));
create policy "dono altera" on public.error_notebook_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.question_notebooks n where n.id = notebook_id and n.user_id = (select auth.uid())));
create policy "dono apaga" on public.error_notebook_entries for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.error_notebook_entries from anon, authenticated;
grant select, insert, update, delete on public.error_notebook_entries to authenticated;

comment on table public.error_notebook_entries is 'Caderno de erros: texto editado pelo aluno para cada erro de um caderno dele (HTML limpo pelo servidor).';
