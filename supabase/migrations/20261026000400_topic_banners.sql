-- Banner próprio de uma aula do catálogo (substitui o da matéria só nessa aula).
-- Mesmo modelo de discipline_banners: imagem reduzida pelo servidor, servida por /banner/tema/<id>.
create table if not exists public.topic_banners (
  topic_id uuid primary key references public.catalog_topics (id) on delete cascade,
  mime text not null check (mime in ('image/webp', 'image/jpeg', 'image/png')),
  data bytea not null check (octet_length(data) between 1 and 2000000),
  width int,
  height int,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
alter table public.topic_banners enable row level security;
-- Sem políticas: só o servidor (service_role) lê e grava.
revoke all on public.topic_banners from anon, authenticated;
