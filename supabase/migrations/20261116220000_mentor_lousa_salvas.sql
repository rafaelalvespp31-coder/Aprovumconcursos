-- Lousas que o aluno já viu (ficam nas Ferramentas da aula para rever na hora). O conteúdo mora em mentor_lousas_cache.
create table if not exists public.mentor_lousa_salvas (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lousa_id uuid not null references public.mentor_lousas_cache(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lousa_id)
);
alter table public.mentor_lousa_salvas enable row level security;
create policy "dono le" on public.mentor_lousa_salvas for select using (user_id = (select auth.uid()));
create index if not exists mentor_lousa_salvas_user on public.mentor_lousa_salvas (user_id, created_at desc);
