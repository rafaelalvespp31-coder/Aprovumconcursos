-- Quanto tempo o quadro leva para mostrar o primeiro traço depois do pedido (medição de desempenho; sem conteúdo do aluno).
create table if not exists public.mentor_lousa_tempos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  modo text not null,
  largo boolean not null,
  ms_texto integer,
  ms_traco integer,
  ms_fim integer
);
alter table public.mentor_lousa_tempos enable row level security;
create index if not exists mentor_lousa_tempos_data on public.mentor_lousa_tempos (created_at desc);
