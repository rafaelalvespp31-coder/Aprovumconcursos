-- Onde o aluno parou na aula (módulo/página, seções lidas e rolagem): volta ao mesmo ponto em qualquer aparelho.
-- Rollback: alter table public.learning_progress drop column if exists reading_pos;
alter table public.learning_progress add column if not exists reading_pos jsonb;
