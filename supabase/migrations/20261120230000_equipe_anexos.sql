-- Anexos (foto/print) no chat com a Equipe. Bucket PRIVADO; só o servidor lê e grava (URLs assinadas curtas).
-- Rollback: alter table public.team_messages drop column if exists attachment_path; (e apague o bucket equipe-anexos)
alter table public.team_messages add column if not exists attachment_path text check (attachment_path is null or attachment_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$');
alter table public.team_messages drop constraint if exists team_messages_body_check;
alter table public.team_messages add constraint team_messages_body_check check (length(body) <= 2000 and (length(body) >= 1 or attachment_path is not null));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipe-anexos', 'equipe-anexos', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
