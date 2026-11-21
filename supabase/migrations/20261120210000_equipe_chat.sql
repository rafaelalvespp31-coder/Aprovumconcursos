-- Chat do aluno com a Equipe APROVUM (dentro do Mentor). Uma conversa por aluno.
-- status 'novo' = ainda não lida pelo destinatário (equipe para sender='aluno'; aluno para sender='equipe').
-- Só o servidor (service_role) lê e escreve: RLS ligada, sem policies.
-- Rollback: drop table if exists public.team_messages;
create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sender text not null check (sender in ('aluno', 'equipe')),
  body text not null check (length(body) between 1 and 2000),
  status text not null default 'novo' check (status in ('novo', 'lido')),
  created_at timestamptz not null default now()
);
create index if not exists team_messages_user_idx on public.team_messages (user_id, created_at);
create index if not exists team_messages_novo_idx on public.team_messages (sender, created_at) where status = 'novo';
alter table public.team_messages enable row level security;
