-- Edital publicado pelo admin em cada concurso: o aluno escolhe o concurso e recebe a estrutura já lida (sem anexar PDF).
alter table public.contest_catalog
  add column if not exists edital_prep_id uuid references public.edital_preparations(id) on delete set null;

create index if not exists contest_catalog_edital_prep_idx on public.contest_catalog (edital_prep_id) where edital_prep_id is not null;

comment on column public.contest_catalog.edital_prep_id is 'Preparação de edital (do admin) lida e revisada que serve de base ao estudo deste concurso. Só o servidor grava.';
