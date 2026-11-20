-- Painel da equipe: quando cada área foi vista pela última vez. Só conta como "novo" o que chegou depois.
create table if not exists public.admin_visto (
  feature text primary key check (feature in ('pagamentos', 'feedbacks', 'parceiros')),
  seen_at timestamptz not null default now()
);
alter table public.admin_visto enable row level security;
comment on table public.admin_visto is 'Última vez que a equipe abriu cada área do admin (para avisos de novidades). Só o servidor lê e grava.';
