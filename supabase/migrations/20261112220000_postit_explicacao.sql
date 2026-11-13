-- Explicação (modo Explicar) guardada junto do post-it do mesmo trecho, para sair no PDF de revisão.
-- Escrita só pelo servidor (service role) a partir da explicação já gerada; o aluno apenas lê.
alter table public.lesson_postits
  add column if not exists explanation text not null default '' check (char_length(explanation) <= 1500);
