-- Marcação manual de tópico/subtópico do edital como concluído (bolinha na página de matérias).
-- Rollback: alter table public.edital_topics drop column if exists manual_done;
alter table public.edital_topics add column if not exists manual_done boolean not null default false;
