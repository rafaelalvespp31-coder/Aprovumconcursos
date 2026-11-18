-- Erro no Modo Jogo tira XP (registrado como xp negativo na tentativa). Rollback: voltar o check para between 0 and 50 (apagar antes as linhas negativas).
alter table public.quiz_attempts drop constraint if exists quiz_attempts_xp_check;
alter table public.quiz_attempts add constraint quiz_attempts_xp_check check (xp between -50 and 50);
