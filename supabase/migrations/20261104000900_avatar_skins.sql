-- Skins do avatar: até 3 avatares personalizados por aluno; custom_portrait continua sendo o ATIVO.
-- custom_skins: [ { art, lids, aspect, centerX, neckY, shoulderY, chestY, waistY, eyes[2], requestId, at } ] (máx. 3)
--
-- Rollback:
--   alter table public.avatar_profiles drop column if exists custom_skins;

alter table public.avatar_profiles add column if not exists custom_skins jsonb not null default '[]'::jsonb
  check (jsonb_typeof(custom_skins) = 'array' and jsonb_array_length(custom_skins) <= 3);

update public.avatar_profiles
   set custom_skins = jsonb_build_array(custom_portrait)
 where custom_portrait is not null and custom_skins = '[]'::jsonb;
