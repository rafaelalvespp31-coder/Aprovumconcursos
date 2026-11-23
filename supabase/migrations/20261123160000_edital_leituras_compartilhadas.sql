-- Leitura (matérias e tópicos) de um edital, gravada UMA vez por PDF (hash) e cargo e reaproveitada por todo aluno que anexar o mesmo edital:
-- todos recebem exatamente a mesma extração, sem nova chamada à IA. Só o conteúdo do edital (público); nada do aluno. Só o servidor lê e grava.
-- Aditiva. Rollback: drop table public.edital_leituras;
create table if not exists public.edital_leituras (
  file_hash text not null,
  cargo_key text not null default '',
  leitura_v integer not null,
  modelo text,
  info jsonb not null,
  parsed jsonb not null,
  leitura jsonb not null,
  created_at timestamptz not null default now(),
  primary key (file_hash, cargo_key)
);
alter table public.edital_leituras enable row level security;
revoke all on public.edital_leituras from anon, authenticated;
grant all on public.edital_leituras to service_role;
