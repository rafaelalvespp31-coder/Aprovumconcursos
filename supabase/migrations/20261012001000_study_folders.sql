-- Pastas do aluno (ex.: uma por matéria) para organizar os estudos.
create table if not exists public.study_folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  color      text not null default 'vermelho' check (color in ('vermelho', 'preto', 'cinza', 'verde', 'azul', 'amarelo')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index if not exists study_folders_user on public.study_folders (user_id, sort_order, created_at);

alter table public.study_trails add column if not exists folder_id uuid;
alter table public.study_trails add column if not exists folder_order int not null default 0;
alter table public.study_trails
  add constraint study_trails_folder_fk foreign key (folder_id, user_id)
  references public.study_folders (id, user_id) on delete set null (folder_id);
create index if not exists study_trails_folder on public.study_trails (folder_id, folder_order, created_at) where folder_id is not null;

alter table public.study_folders enable row level security;
alter table public.study_folders force row level security;
grant select on public.study_folders to authenticated;
create policy "dono le" on public.study_folders for select to authenticated using (user_id = (select auth.uid()));
