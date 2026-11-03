-- Solicitação de avatar personalizado: o aluno envia uma foto de corpo inteiro (local bem iluminado)
-- e a equipe produz o personagem. A foto fica num bucket PRIVADO; só o servidor grava e gera links
-- temporários para a equipe. O aluno lê só as próprias solicitações.
--
-- Rollback:
--   drop table if exists public.avatar_requests;

create table if not exists public.avatar_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  photo_path text not null check (length(photo_path) between 5 and 300),
  status     text not null default 'enviada' check (status in ('enviada','em_producao','concluida','recusada')),
  note       text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists avatar_requests_user_idx on public.avatar_requests (user_id, created_at desc);
alter table public.avatar_requests enable row level security;
create policy "avatar_requests: dono lê" on public.avatar_requests for select to authenticated using (user_id = (select auth.uid()));

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatar-solicitacoes', 'avatar-solicitacoes', false, 12582912, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
    on conflict (id) do nothing;
  end if;
end $$;

revoke all on public.avatar_requests from anon;
revoke insert, update, delete on public.avatar_requests from authenticated;
grant select on public.avatar_requests to authenticated;
