-- Uso diário do Mentor por voz (3 minutos por aluno pagante, dia de Brasília).
-- Leitura e escrita só pelo servidor (service_role). Rollback: drop table if exists public.mentor_voice_usage;
create table if not exists public.mentor_voice_usage (
  user_id           uuid not null references auth.users (id) on delete cascade,
  day               date not null,
  used_seconds      int  not null default 0 check (used_seconds >= 0),
  -- Conversa em andamento: quando foi liberada e quantos segundos foram reservados.
  active_started_at timestamptz,
  active_reserved   int check (active_reserved is null or active_reserved >= 0),
  updated_at        timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.mentor_voice_usage enable row level security;
revoke all on public.mentor_voice_usage from anon, authenticated;
