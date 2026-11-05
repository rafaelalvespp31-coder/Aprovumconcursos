-- Complete a frase: registra o nível (1 Fácil … 4 Elite) e o tempo de resposta de cada tentativa.
-- Rollback: alter table public.quiz_attempts drop column tier, drop column response_ms;
alter table public.quiz_attempts
  add column if not exists tier smallint check (tier is null or tier between 1 and 4),
  add column if not exists response_ms int check (response_ms is null or response_ms between 0 and 3600000);
