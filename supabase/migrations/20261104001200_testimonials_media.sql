-- Depoimentos: vídeo por link OU arquivo enviado pela equipe, e/ou foto. Bucket público "depoimentos"
-- (escrita só por URL assinada gerada no servidor para administradores).
-- Rollback: drop column photo_url, storage_paths; restaurar NOT NULL em video_url; delete bucket 'depoimentos'.
alter table public.testimonials alter column video_url drop not null;
alter table public.testimonials add column if not exists photo_url text check (photo_url is null or photo_url ~ '^https://');
alter table public.testimonials add column if not exists storage_paths text[] not null default '{}';
alter table public.testimonials drop constraint if exists testimonials_media_check;
alter table public.testimonials add constraint testimonials_media_check check (video_url is not null or photo_url is not null);

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('depoimentos', 'depoimentos', true, 52428800, array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
