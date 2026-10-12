-- Área de preparação para importar conteúdo grande do catálogo em partes (somente servidor).
create table if not exists public.catalog_import (
  id      bigserial primary key,
  batch   text not null,
  kind    text not null check (kind in ('node', 'section')),
  ord     int not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (batch, kind, ord)
);
alter table public.catalog_import enable row level security;
alter table public.catalog_import force row level security;
revoke all on public.catalog_import from anon, authenticated;
revoke all on sequence public.catalog_import_id_seq from anon, authenticated;
