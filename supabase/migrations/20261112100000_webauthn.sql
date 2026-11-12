-- Login por biometria (WebAuthn / passkeys): credenciais por aparelho e desafios de uso único.
-- Acesso só pelo servidor (service_role); RLS ligada e sem políticas = nenhum acesso pelo navegador.
create table if not exists public.webauthn_credentials (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_label text not null default 'Este aparelho',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists webauthn_credentials_user_idx on public.webauthn_credentials(user_id);
alter table public.webauthn_credentials enable row level security;

create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  kind text not null check (kind in ('register','login')),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists webauthn_challenges_created_idx on public.webauthn_challenges(created_at);
alter table public.webauthn_challenges enable row level security;
