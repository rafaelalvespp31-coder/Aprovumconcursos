-- Símbolo do órgão (brasão/logo tirado do cabeçalho do edital) e marcador de "extras já procurados"
-- (símbolo + cargo), para não reabrir o PDF a cada carregamento de Meu Concurso.
-- Rollback: alter table public.edital_preparations drop column org_logo, drop column extras_checked;
alter table public.edital_preparations
  add column if not exists org_logo text check (org_logo is null or length(org_logo) <= 100000),
  add column if not exists extras_checked boolean not null default false;
