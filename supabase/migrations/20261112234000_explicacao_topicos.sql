-- Explicações em tópicos (um item por linha) e de trechos longos: limites maiores.
do $$
declare c record;
begin
  for c in
    select conrelid::regclass as t, conname from pg_constraint
    where contype = 'c'
      and ((conrelid = 'public.selection_explanations'::regclass and (pg_get_constraintdef(oid) like '%char_length(meaning)%' or pg_get_constraintdef(oid) like '%char_length(selection)%'))
        or (conrelid = 'public.lesson_postits'::regclass and pg_get_constraintdef(oid) like '%char_length(explanation)%'))
  loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
  end loop;
end $$;
alter table public.selection_explanations add constraint selection_explanations_meaning_len check (char_length(meaning) between 3 and 2500);
alter table public.selection_explanations add constraint selection_explanations_selection_len check (char_length(selection) between 2 and 600);
alter table public.lesson_postits add constraint lesson_postits_explanation_len check (char_length(explanation) <= 3500);
