-- Anotações pessoais do aluno em questões do banco de concursos (só o dono lê e escreve).
create table if not exists public.bank_question_notes (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id uuid not null references public.bank_questions (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
alter table public.bank_question_notes enable row level security;
drop policy if exists "dono le" on public.bank_question_notes;
drop policy if exists "dono cria" on public.bank_question_notes;
drop policy if exists "dono altera" on public.bank_question_notes;
drop policy if exists "dono apaga" on public.bank_question_notes;
create policy "dono le" on public.bank_question_notes for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.bank_question_notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono altera" on public.bank_question_notes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.bank_question_notes for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, update, delete on public.bank_question_notes to authenticated;
