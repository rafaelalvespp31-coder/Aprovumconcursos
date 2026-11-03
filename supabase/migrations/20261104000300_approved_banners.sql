-- Banners de aprovados enviados pela equipe (Admin → Aprovados), que entram no carrossel do painel
-- depois das artes fixas. Arquivos num bucket PÚBLICO só de leitura; só o servidor grava.
--
-- Rollback:
--   drop table if exists public.approved_banners;

create table if not exists public.approved_banners (
  id          uuid primary key default gen_random_uuid(),
  image_path  text not null check (image_path ~ '^[a-z0-9/_.-]{5,300}$'),
  image_sm    text not null check (image_sm ~ '^[a-z0-9/_.-]{5,300}$'),
  alt         text not null check (length(alt) between 3 and 400),
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists approved_banners_active_idx on public.approved_banners (active, sort_order, created_at);
alter table public.approved_banners enable row level security;
create policy "approved_banners: leitura dos ativos" on public.approved_banners for select to authenticated using (active);
revoke all on public.approved_banners from anon;
revoke insert, update, delete on public.approved_banners from authenticated;
grant select on public.approved_banners to authenticated;
grant all on public.approved_banners to service_role;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('aprovados', 'aprovados', true, 10485760, array['image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
