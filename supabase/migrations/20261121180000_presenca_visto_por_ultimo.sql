-- "Visto por último" para o chat da Equipe: a batida de presença passa a guardar também o horário real da última atividade.
-- Motivo: ao sair, a presença empurra seen_at 1 h para trás (some da lista de online); last_seen_at não é alterado por isso.
-- Aditiva e sem dados a migrar: linhas antigas ficam nulas até a próxima visita do aluno. Rollback: alter table public.tatico_presence drop column if exists last_seen_at;
alter table public.tatico_presence add column if not exists last_seen_at timestamptz;
