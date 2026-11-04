-- Depoimentos e Histórias: categoria, concurso/cargo/estado, thumbnail, duração, selo APROVADO, destaque;
-- e configuração editável (idealizadores, indicadores, citação).
--
-- Rollback:
--   drop table if exists public.depoimentos_config;
--   alter table public.testimonials drop column if exists category, drop column if exists concurso, drop column if exists cargo,
--     drop column if exists estado, drop column if exists description, drop column if exists thumb_url, drop column if exists captions_url,
--     drop column if exists duration_seconds, drop column if exists published_at, drop column if exists approved, drop column if exists featured;

alter table public.testimonials
  add column if not exists category text not null default 'aprovados' check (category in ('aprovados','superacao','transformacao','comunidade')),
  add column if not exists concurso text check (concurso is null or char_length(concurso) <= 120),
  add column if not exists cargo text check (cargo is null or char_length(cargo) <= 120),
  add column if not exists estado text check (estado is null or estado ~ '^[A-Z]{2}$'),
  add column if not exists description text check (description is null or char_length(description) <= 1000),
  add column if not exists thumb_url text check (thumb_url is null or thumb_url ~ '^https://'),
  add column if not exists captions_url text check (captions_url is null or captions_url ~ '^https://'),
  add column if not exists duration_seconds int check (duration_seconds is null or duration_seconds between 1 and 86400),
  add column if not exists published_at date not null default current_date,
  add column if not exists approved boolean not null default false,
  add column if not exists featured boolean not null default false;

create table if not exists public.depoimentos_config (
  key        text primary key check (key in ('founders','stats','quote')),
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.depoimentos_config enable row level security;
create policy "depoimentos_config: logado lê" on public.depoimentos_config for select to authenticated using (true);
revoke all on public.depoimentos_config from anon;
revoke insert, update, delete on public.depoimentos_config from authenticated;
grant select on public.depoimentos_config to authenticated;
grant all on public.depoimentos_config to service_role;
