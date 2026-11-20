-- APROVUM PARCEIROS: parceiros, cupons e utilizações. Escrita e leitura só pelo servidor (service role); sem políticas para o aluno.
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  commission_pct numeric(5, 2) not null default 0 check (commission_pct >= 0 and commission_pct <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists partners_slug_uq on public.partners (slug);
create unique index if not exists partners_display_name_uq on public.partners (lower(btrim(display_name)));

create table if not exists public.partner_coupons (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9]{3,40}$'),
  discount_pct numeric(5, 2) not null check (discount_pct > 0 and discount_pct <= 100),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  max_uses integer check (max_uses is null or max_uses > 0),           -- null = ilimitado
  starts_at timestamptz,
  expires_at timestamptz,                                              -- null = sem expiração (até alteração administrativa)
  stackable boolean not null default false,                            -- acumula com outros cupons?
  eligible_offers text[] not null default array['mensal', 'semestral', 'anual', 'vitalicio'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists partner_coupons_code_uq on public.partner_coupons (code);
create index if not exists partner_coupons_partner_idx on public.partner_coupons (partner_id);

create table if not exists public.partner_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.partner_coupons (id) on delete restrict,
  partner_id uuid not null references public.partners (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  payment_id uuid not null references public.mp_payments (id) on delete cascade,
  offer text not null,
  original_cents integer not null check (original_cents > 0),
  discount_cents integer not null check (discount_cents >= 0),
  final_cents integer not null check (final_cents > 0),
  commission_pct numeric(5, 2) not null default 0,
  commission_cents integer not null default 0,
  status text not null default 'iniciado' check (status in ('iniciado', 'aprovado', 'recusado', 'cancelado', 'reembolsado')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists partner_redemptions_payment_uq on public.partner_coupon_redemptions (payment_id);
create index if not exists partner_redemptions_coupon_idx on public.partner_coupon_redemptions (coupon_id, status);
create index if not exists partner_redemptions_partner_idx on public.partner_coupon_redemptions (partner_id, created_at desc);

alter table public.mp_payments add column if not exists coupon_id uuid references public.partner_coupons (id);
alter table public.mp_payments add column if not exists list_amount_cents integer;
alter table public.mp_payments add column if not exists discount_cents integer not null default 0;

alter table public.partners enable row level security;
alter table public.partner_coupons enable row level security;
alter table public.partner_coupon_redemptions enable row level security;
comment on table public.partners is 'APROVUM PARCEIROS: parceiros oficiais. Só o servidor (service role) lê e grava.';
comment on table public.partner_coupons is 'Cupom de desconto de cada parceiro (código único). Só o servidor lê e grava.';
comment on table public.partner_coupon_redemptions is 'Cada uso de cupom no checkout, com o pagamento, valores e status. Só o servidor lê e grava.';
