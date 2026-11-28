-- Redação: dupla avaliação independente + auditoria, e correção linha a linha mais completa.
-- Apenas colunas novas e anuláveis (aditivo; não altera dados existentes).
alter table public.writing_evaluations
  add column if not exists audit jsonb,
  add column if not exists human_review boolean not null default false;

alter table public.writing_errors
  add column if not exists corrected text,
  add column if not exists avoid_tip text;

comment on column public.writing_evaluations.audit is 'Notas dos dois avaliadores, divergências e decisões da auditoria (rastreabilidade).';
comment on column public.writing_evaluations.human_review is 'true quando houve divergência relevante entre os avaliadores: revisão humana recomendada.';
comment on column public.writing_errors.corrected is 'Versão corrigida do trecho apontado.';
comment on column public.writing_errors.avoid_tip is 'Como evitar o mesmo erro em outra redação.';
