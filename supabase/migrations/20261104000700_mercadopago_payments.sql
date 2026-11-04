-- Pagamentos pelo Mercado Pago (PIX e cartão) da tela "Meu Plano".
-- * mp_payments: cada tentativa de compra (preço do servidor), com o estado confirmado pelo Mercado Pago.
-- * mp_webhook_events: eventos de webhook já processados (evita processar duas vezes).
-- A liberação do plano grava em subscriptions e subscription_payments (tabelas existentes).
-- Só o servidor (service_role) lê e escreve: o aluno não consegue alterar status nem conceder acesso a si mesmo.
-- Rollback: drop table if exists public.mp_webhook_events; drop table if exists public.mp_payments;
create table if not exists public.mp_payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  offer            text not null check (offer in ('mensal', 'semestral', 'anual', 'vitalicio')),
  amount_cents     integer not null check (amount_cents > 0 and amount_cents <= 100000000),
  status           text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'cancelado', 'reembolsado')),
  mp_payment_id    bigint unique,
  mp_status        text,
  mp_status_detail text,
  method           text,
  installments     integer check (installments is null or installments between 1 and 12),
  total_paid_cents integer,
  pix_qr_code      text,
  pix_qr_base64    text,
  pix_expires_at   timestamptz,
  approved_at      timestamptz,
  applied_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists mp_payments_user on public.mp_payments (user_id, created_at desc);
alter table public.mp_payments enable row level security;
revoke all on public.mp_payments from anon, authenticated;

create table if not exists public.mp_webhook_events (
  event_key     text primary key,
  mp_payment_id bigint,
  received_at   timestamptz not null default now()
);
alter table public.mp_webhook_events enable row level security;
revoke all on public.mp_webhook_events from anon, authenticated;
