-- Caderno de questões: guarda a última questão em que o aluno estava, para continuar de onde
-- parou ao voltar. Só uma coluna nova; a RLS do caderno (o dono lê e altera) continua a mesma.
alter table public.question_notebooks
  add column if not exists last_question_id uuid references public.bank_questions(id) on delete set null;

comment on column public.question_notebooks.last_question_id is
  'Última questão aberta pelo aluno neste caderno (retomada). Nula: começa pela primeira não respondida.';
