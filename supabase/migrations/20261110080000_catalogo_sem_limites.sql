-- Catálogo sem tetos artificiais de tamanho: texto-base, enunciado e justificativa passam a aceitar
-- textos longos (o painel avisa/corta nada; aula grande vira mais módulos).
alter table public.catalog_topics drop constraint if exists catalog_topics_source_text_check;
alter table public.catalog_topics add constraint catalog_topics_source_text_check check (char_length(source_text) <= 3000000);

alter table public.catalog_questions drop constraint if exists catalog_questions_statement_check;
alter table public.catalog_questions add constraint catalog_questions_statement_check check (char_length(statement) between 10 and 50000);
alter table public.catalog_questions drop constraint if exists catalog_questions_justification_check;
alter table public.catalog_questions add constraint catalog_questions_justification_check check (char_length(justification) between 10 and 50000);
