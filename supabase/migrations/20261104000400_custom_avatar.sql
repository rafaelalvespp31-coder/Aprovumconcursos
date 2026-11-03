-- Avatar personalizado: a equipe anexa a arte pronta do aluno (Admin → Avatares) e ela passa a ser
-- o personagem dele, com a mesma animação (piscadas e respiração). Arquivos em bucket PRIVADO
-- (links temporários gerados pelo servidor); quem grava é só o servidor.
--
-- custom_portrait: { art, lids, aspect, centerX, neckY, shoulderY, chestY, waistY, eyes[2], requestId, at }
--
-- Rollback:
--   alter table public.avatar_profiles drop column if exists custom_portrait;

alter table public.avatar_profiles add column if not exists custom_portrait jsonb
  check (custom_portrait is null or (jsonb_typeof(custom_portrait) = 'object' and custom_portrait ? 'art' and custom_portrait ? 'lids'));

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatar-personalizado', 'avatar-personalizado', false, 8388608, array['image/webp', 'image/png'])
    on conflict (id) do nothing;
  end if;
end $$;
