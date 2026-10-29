-- Planos: gratuito com limites diários, pagos (Pro/Premium) ilimitados, com vencimento.
-- * subscriptions: período cobrado (mensal/semestral/anual) e data do último pagamento.
-- * subscription_payments: histórico de pagamentos marcados pela equipe (auditoria).
-- * daily_lesson_access: aulas usadas por dia (limite de 1 aula/dia do gratuito).
-- Escrita só pelo servidor (service_role) depois de conferir a sessão/admin.
-- Rollback:
--   drop table if exists public.daily_lesson_access;
--   drop table if exists public.subscription_payments;
--   alter table public.subscriptions drop column if exists billing_period, drop column if exists paid_at;

alter table public.subscriptions
  add column if not exists billing_period text check (billing_period in ('mensal', 'semestral', 'anual')),
  add column if not exists paid_at timestamptz;

create table if not exists public.subscription_payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  plan_id     text not null references public.plans (id),
  period      text not null check (period in ('mensal', 'semestral', 'anual')),
  amount_cents integer check (amount_cents is null or amount_cents between 0 and 100000000),
  paid_at     timestamptz not null default now(),
  period_end  timestamptz not null,
  note        text check (note is null or char_length(note) <= 300),
  recorded_by uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists subscription_payments_user on public.subscription_payments (user_id, paid_at desc);
alter table public.subscription_payments enable row level security;
create policy "dono le" on public.subscription_payments for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.subscription_payments from anon, authenticated;
grant select on public.subscription_payments to authenticated;

create table if not exists public.daily_lesson_access (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  lesson_id  uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, lesson_id)
);
alter table public.daily_lesson_access enable row level security;
revoke all on public.daily_lesson_access from anon, authenticated;
