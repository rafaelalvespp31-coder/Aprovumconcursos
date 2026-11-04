-- Memória do Mentor por voz: o que o aluno perguntou em cada conversa (texto), para o Mentor retomar depois.
-- Só o servidor lê e grava. Apagado junto com o usuário.
-- Rollback: drop table if exists public.mentor_voice_notes;
create table if not exists public.mentor_voice_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  day          date not null,
  student_text text not null default '' check (char_length(student_text) <= 2000),
  mentor_text  text not null default '' check (char_length(mentor_text) <= 2000),
  created_at   timestamptz not null default now()
);
create index if not exists mentor_voice_notes_user_idx on public.mentor_voice_notes (user_id, created_at desc);
alter table public.mentor_voice_notes enable row level security;
revoke all on public.mentor_voice_notes from anon, authenticated;
grant all on public.mentor_voice_notes to service_role;
