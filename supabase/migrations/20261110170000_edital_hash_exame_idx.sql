-- Reaproveita a análise estratégica entre alunos que anexam o mesmo edital: busca por hash do PDF.
create index if not exists edital_prep_hash_exam_idx on public.edital_preparations (file_hash) where strategic_exam_id is not null;
