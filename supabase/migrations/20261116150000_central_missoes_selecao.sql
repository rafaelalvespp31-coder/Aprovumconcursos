-- Central de Missões (Painel): qual edital o aluno selecionou para estudar. Uma linha por aluno.
create table if not exists public.central_missoes_selecao (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  preparation_id uuid not null references public.edital_preparations(id) on delete cascade,
  selected_at timestamptz not null default now(),
  primary key (user_id)
);
create index if not exists central_missoes_selecao_prep_idx on public.central_missoes_selecao(preparation_id);
alter table public.central_missoes_selecao enable row level security;
drop policy if exists "central_missoes_selecao: dono" on public.central_missoes_selecao;
create policy "central_missoes_selecao: dono" on public.central_missoes_selecao
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.edital_preparations p where p.id = preparation_id and p.user_id = (select auth.uid())));
