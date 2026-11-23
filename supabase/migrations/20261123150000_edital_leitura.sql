-- Estado da leitura do edital pelo especialista (Gemini), que roda em várias chamadas: matérias, trechos já lidos e auditoria.
-- Só o servidor lê e grava (service_role). Aditiva: não altera nenhuma tabela existente.
-- Rollback: drop table public.edital_leitura;
create table if not exists public.edital_leitura (
  preparation_id uuid primary key references public.edital_preparations(id) on delete cascade,
  user_id uuid not null,
  estado jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.edital_leitura enable row level security;
revoke all on public.edital_leitura from anon, authenticated;
grant all on public.edital_leitura to service_role;
