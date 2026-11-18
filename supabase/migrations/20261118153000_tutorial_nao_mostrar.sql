-- "Não mostrar mais": o aluno desliga a janela de boas-vindas que abre a cada login.
alter table public.student_tutorial_progress add column if not exists hide_welcome boolean not null default false;
