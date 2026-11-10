-- Programa de indicação: cada aluno novo tem um código; se o indicado comprar anual/vitalício, os dois ganham copo e camisa.
alter table public.profiles add column if not exists referral_code text;
create unique index if not exists profiles_referral_code_uq on public.profiles (referral_code) where referral_code is not null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null,
  qualifying_payment_id uuid references public.mp_payments(id) on delete set null,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_id <> referred_id)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id, created_at desc);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('indicador','indicado')),
  item text not null default 'Copo + Camisa APROVUM',
  status text not null default 'pendente' check (status in ('pendente','enviado','cancelado')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (referral_id, role)
);
create index if not exists referral_rewards_status_idx on public.referral_rewards (status, created_at desc);

alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
revoke all on public.referrals, public.referral_rewards from anon, authenticated;
grant all on public.referrals, public.referral_rewards to service_role;
