-- Banner dos Idealizadores editável pelo admin (chave 'hero' em depoimentos_config).
-- Rollback: alter table public.depoimentos_config drop constraint depoimentos_config_key_check;
--   alter table public.depoimentos_config add constraint depoimentos_config_key_check check (key in ('founders','stats','quote'));
alter table public.depoimentos_config drop constraint if exists depoimentos_config_key_check;
alter table public.depoimentos_config add constraint depoimentos_config_key_check check (key in ('founders','stats','quote','hero'));
