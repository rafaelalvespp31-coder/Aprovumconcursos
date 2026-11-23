-- Análise estratégica de cada concurso (modelo "Análise completa do edital"): estrutura da prova, matérias com questões/prioridade/focos/estratégia,
-- distribuição, grupos de dificuldade, organização do estudo e conclusão. Importada pelo admin; só o servidor grava.
alter table public.contest_catalog
  add column if not exists analise jsonb,
  add column if not exists analise_em timestamptz;

comment on column public.contest_catalog.analise is 'Análise estratégica do concurso (JSON versionado, gerado por src/domain/edital/analise.ts). Só o servidor grava.';
