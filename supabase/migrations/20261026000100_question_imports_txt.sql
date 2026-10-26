-- Upload de questões por arquivo de texto (.txt / bloco de notas) no /banco/importar.
alter table public.question_imports drop constraint if exists question_imports_kind_check;
alter table public.question_imports
  add constraint question_imports_kind_check check (kind in ('pdf_prova', 'pdf_gabarito', 'csv', 'json', 'txt'));
