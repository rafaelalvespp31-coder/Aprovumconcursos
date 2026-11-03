-- Imagem de cada concurso (cadastrada pela equipe em Admin → Concursos) mostrada na Home.
-- Bucket PÚBLICO só de leitura (arte de divulgação); quem grava é o servidor (service_role).
--
-- Rollback:
--   alter table public.contest_catalog drop column if exists image_path;

alter table public.contest_catalog add column if not exists image_path text
  check (image_path is null or (length(image_path) between 5 and 300 and image_path ~ '^[a-z0-9/_.-]+$'));

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('concursos', 'concursos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
