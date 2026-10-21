-- Cadernos com filtros múltiplos (matérias, assuntos, bancas, concursos, anos, dificuldade,
-- favoritas e aba) e questões favoritas do banco de concursos.

alter table public.question_notebooks
  add column if not exists filters jsonb not null default '{}'::jsonb,
  add column if not exists show_full_statement boolean not null default true;

do $$ begin
  alter table public.question_notebooks add constraint question_notebooks_filters_check
    check (jsonb_typeof(filters) = 'object' and pg_column_size(filters) < 16000);
exception when duplicate_object then null; end $$;

-- Cadernos criados antes (colunas de valor único): o app lê essas colunas quando filters está
-- vazio, sem precisar reescrever as linhas existentes. As colunas antigas não são apagadas.

create table if not exists public.bank_question_favorites (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id uuid not null references public.bank_questions (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
alter table public.bank_question_favorites enable row level security;
drop policy if exists "dono le" on public.bank_question_favorites;
drop policy if exists "dono cria" on public.bank_question_favorites;
drop policy if exists "dono apaga" on public.bank_question_favorites;
create policy "dono le" on public.bank_question_favorites for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.bank_question_favorites for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.bank_question_favorites for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.bank_question_favorites to authenticated;
