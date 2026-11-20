-- Avisos automáticos no celular: a cada hora um aviso, alternando frases motivacionais com avisos do APROVUM (pg_cron chama o app).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.push_agenda_config (
  singleton boolean primary key default true check (singleton),
  ativo boolean not null default true,
  intervalo_horas integer not null default 1 check (intervalo_horas between 1 and 6),
  hora_ini integer not null default 9 check (hora_ini between 0 and 23),
  hora_fim integer not null default 20 check (hora_fim between 1 and 23),
  updated_at timestamptz not null default now(),
  check (hora_fim > hora_ini)
);
insert into public.push_agenda_config (singleton) values (true) on conflict do nothing;

create table if not exists public.push_agenda (
  day date not null,
  slot integer not null check (slot between 1 and 24),
  kind text not null check (kind in ('motivacao', 'concursos', 'revisoes', 'planos', 'mentor', 'novidades')),
  hour integer not null check (hour between 0 and 23),
  variant integer not null default 0,
  done_at timestamptz,
  sent integer,
  result text,
  primary key (day, slot)
);

create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);
insert into public.app_secrets (key, value)
values ('cron_avisos', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

alter table public.push_agenda_config enable row level security;
alter table public.push_agenda enable row level security;
alter table public.app_secrets enable row level security;
comment on table public.push_agenda is 'Agenda sorteada dos avisos automáticos (um dia = um aviso por hora, alternando motivação e informação). Só o servidor lê e grava.';
comment on table public.app_secrets is 'Segredos internos (ex.: chave do agendador). Só o servidor lê; nunca expor.';

do $$
begin
  if exists (select 1 from cron.job where jobname = 'aprovum-avisos') then perform cron.unschedule('aprovum-avisos'); end if;
  perform cron.schedule(
    'aprovum-avisos', '5 * * * *',
    $job$ select net.http_get(
      url := 'https://aprovumconcursos.com.br/api/cron/avisos',
      headers := jsonb_build_object('Authorization', 'Bearer ' || (select value from public.app_secrets where key = 'cron_avisos'))
    ) $job$
  );
end $$;
