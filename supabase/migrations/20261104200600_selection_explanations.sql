-- Cache global das explicações do balão "Explicar" (mesmo trecho + mesmo contexto = mesma explicação).
-- Só o servidor lê e grava (sem política para clientes).
-- Rollback: drop table if exists public.selection_explanations;
create table if not exists public.selection_explanations (
  key          text primary key check (char_length(key) = 64),
  selection    text not null check (char_length(selection) between 2 and 600),
  meaning      text not null check (char_length(meaning) between 3 and 900),
  hits         integer not null default 0,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
alter table public.selection_explanations enable row level security;
revoke all on public.selection_explanations from anon, authenticated;
grant all on public.selection_explanations to service_role;
