-- Pedidos de assinatura feitos pelo aluno na tela "Meu Plano" (a equipe libera o plano depois do pagamento).
-- Escrita e leitura só pelo servidor (service_role). Rollback: drop table if exists public.plan_requests;
create table if not exists public.plan_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  plan       text not null check (plan in ('mensal', 'semestral', 'anual', 'vitalicio')),
  status     text not null default 'novo' check (status in ('novo', 'atendido')),
  created_at timestamptz not null default now()
);
create unique index if not exists plan_requests_um_aberto on public.plan_requests (user_id, plan) where status = 'novo';
create index if not exists plan_requests_status on public.plan_requests (status, created_at desc);
alter table public.plan_requests enable row level security;
revoke all on public.plan_requests from anon, authenticated;
