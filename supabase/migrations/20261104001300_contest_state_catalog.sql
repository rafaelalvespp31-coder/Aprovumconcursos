-- Concursos por estado: a equipe cataloga UF, órgão, banca, escolaridade, local, datas e descrição.
-- Favoritos e alertas dos alunos (só o dono lê e grava).
--
-- Rollback:
--   drop table if exists public.contest_favorites, public.contest_alerts;
--   alter table public.contest_catalog drop column if exists uf, drop column if exists orgao, drop column if exists banca,
--     drop column if exists education, drop column if exists city, drop column if exists location,
--     drop column if exists description, drop column if exists registration_start, drop column if exists registration_end,
--     drop column if exists detail_url, drop column if exists featured, drop column if exists forecast;

alter table public.contest_catalog
  add column if not exists uf text check (uf is null or uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  add column if not exists orgao text check (orgao is null or length(orgao) <= 160),
  add column if not exists banca text check (banca is null or length(banca) <= 120),
  add column if not exists education text check (education is null or length(education) <= 80),
  add column if not exists city text check (city is null or length(city) <= 120),
  add column if not exists location text check (location is null or length(location) <= 200),
  add column if not exists description text check (description is null or length(description) <= 2000),
  add column if not exists registration_start date,
  add column if not exists registration_end date,
  add column if not exists detail_url text check (detail_url is null or detail_url ~ '^https?://'),
  add column if not exists featured boolean not null default false,
  add column if not exists forecast boolean not null default false;

create index if not exists contest_catalog_uf_idx on public.contest_catalog (uf) where active;

create table if not exists public.contest_favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  contest_id uuid not null references public.contest_catalog (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, contest_id)
);
alter table public.contest_favorites enable row level security;
create policy "contest_favorites: dono" on public.contest_favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Alerta de novos concursos: por UF ("*" = todos os estados).
create table if not exists public.contest_alerts (
  user_id    uuid not null references auth.users (id) on delete cascade,
  scope      text not null check (scope = '*' or scope ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, scope)
);
alter table public.contest_alerts enable row level security;
create policy "contest_alerts: dono" on public.contest_alerts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
