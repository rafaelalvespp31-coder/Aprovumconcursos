-- APROVUM PARCEIROS v2 (aditiva, sem apagar nada): indicações por link, janela de atribuição, origem da venda e comissão por etapas.
create table if not exists public.partner_program_settings (
  singleton boolean primary key default true check (singleton),
  attribution_window_days integer not null default 30 check (attribution_window_days between 1 and 365),
  updated_at timestamptz not null default now()
);
insert into public.partner_program_settings (singleton) values (true) on conflict do nothing;

create table if not exists public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete restrict,
  coupon_id uuid references public.partner_coupons (id) on delete set null,
  code text not null,
  visitor_id text not null check (char_length(visitor_id) between 16 and 64),
  user_id uuid references auth.users (id) on delete set null,   -- preenchido no primeiro acesso logado; nunca sobrescrito
  landing_path text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  linked_at timestamptz,
  visits integer not null default 1
);
create unique index if not exists partner_referrals_visitor_uq on public.partner_referrals (partner_id, visitor_id);
create index if not exists partner_referrals_partner_idx on public.partner_referrals (partner_id, first_seen_at desc);
create index if not exists partner_referrals_user_idx on public.partner_referrals (user_id) where user_id is not null;

alter table public.partner_coupon_redemptions
  add column if not exists source text not null default 'cupom_digitado' check (source in ('cupom_digitado', 'link')),
  add column if not exists referral_id uuid references public.partner_referrals (id) on delete set null,
  add column if not exists commission_status text not null default 'nenhuma' check (commission_status in ('nenhuma', 'calculada', 'aprovada', 'paga', 'cancelada')),
  add column if not exists refunded_at timestamptz;

alter table public.partner_program_settings enable row level security;
alter table public.partner_referrals enable row level security;
comment on table public.partner_referrals is 'Indicações pelo link ?ref=. Uma por parceiro e visitante; só o servidor lê e grava.';
comment on table public.partner_program_settings is 'Configuração do programa (janela de atribuição). Só o servidor lê e grava.';
