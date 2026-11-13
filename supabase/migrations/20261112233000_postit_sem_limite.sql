-- Post-it sem limite prático de tamanho do trecho (até 200 mil caracteres) e estrutura gravável pelo aluno.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.lesson_postits'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) like '%char_length(quote)%' or pg_get_constraintdef(oid) like '%quote_structure%')
  loop
    execute format('alter table public.lesson_postits drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.lesson_postits add constraint lesson_postits_quote_len check (char_length(quote) between 2 and 200000);
alter table public.lesson_postits add constraint lesson_postits_quote_structure_ok check (quote_structure is null or (jsonb_typeof(quote_structure) = 'array' and pg_column_size(quote_structure) <= 800000));
grant insert (quote_structure) on public.lesson_postits to authenticated;
