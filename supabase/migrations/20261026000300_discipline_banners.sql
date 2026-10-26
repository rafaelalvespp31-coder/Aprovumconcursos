-- Banner de cada matéria (topo de todas as aulas daquela matéria). Anexado no painel do admin.
-- A imagem fica no próprio banco (já reduzida pelo servidor) e é servida por /banner/<matéria>,
-- então não depende de bucket externo nem afrouxa a política de imagens do site.
create table if not exists public.discipline_banners (
  discipline_mode text primary key check (discipline_mode ~ '^[a-z_]{2,40}$'),
  mime text not null check (mime in ('image/webp', 'image/jpeg', 'image/png')),
  data bytea not null check (octet_length(data) between 1 and 2000000),
  width int,
  height int,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
alter table public.discipline_banners enable row level security;
-- Sem políticas: só o servidor (service_role) lê e grava.
revoke all on public.discipline_banners from anon, authenticated;
