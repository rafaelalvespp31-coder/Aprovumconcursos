-- Matérias cadastradas pela equipe no catálogo (além das fixas do código). Cada uma segue o estilo
-- pedagógico de uma matéria fixa ("base"). Só o servidor lê e grava (grava depois de confirmar
-- que é administrador).
-- Rollback: drop table if exists public.catalog_disciplines;  (as aulas guardam só o identificador)

create table if not exists public.catalog_disciplines (
  slug       text primary key check (slug ~ '^[a-z][a-z_]{1,39}$'),
  label      text not null check (char_length(btrim(label)) between 2 and 60),
  base_mode  text not null check (base_mode in ('lingua_portuguesa', 'matematica', 'raciocinio_logico', 'informatica', 'direito_constitucional', 'direito_administrativo', 'direito_penal', 'direito_processual_penal', 'legislacao_especial', 'conhecimentos_especificos', 'outra')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists catalog_disciplines_label on public.catalog_disciplines (lower(btrim(label)));

alter table public.catalog_disciplines enable row level security;
-- Sem políticas: só o servidor (service_role) lê e grava; o navegador recebe os nomes pela página.
revoke all on public.catalog_disciplines from anon, authenticated;

comment on table public.catalog_disciplines is 'Matérias cadastradas pela equipe (nome e estilo pedagógico base). Escrita só pelo servidor.';
