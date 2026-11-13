-- Post-it: guarda a estrutura do trecho (tabela, lista, títulos) para o PDF sair igual ao texto da aula.
alter table public.lesson_postits
  add column if not exists quote_structure jsonb
  check (quote_structure is null or (jsonb_typeof(quote_structure) = 'array' and pg_column_size(quote_structure) <= 40000));
