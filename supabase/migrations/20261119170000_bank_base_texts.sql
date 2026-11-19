-- Textos-base compartilhados (ex.: "Texto CB2A1"): um texto, várias questões vinculadas.
create table if not exists public.bank_base_texts (
  id uuid primary key default gen_random_uuid(),
  code text not null check (char_length(code) between 1 and 60),
  body text not null check (char_length(body) between 10 and 60000),
  body_hash text generated always as (md5(btrim(body))) stored,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (code, body_hash)
);
alter table public.bank_base_texts enable row level security;
revoke all on public.bank_base_texts from public, anon, authenticated;
grant all on public.bank_base_texts to service_role;

alter table public.bank_questions add column if not exists base_text_id uuid references public.bank_base_texts (id) on delete set null;
create index if not exists bank_questions_base_text on public.bank_questions (base_text_id) where base_text_id is not null;
