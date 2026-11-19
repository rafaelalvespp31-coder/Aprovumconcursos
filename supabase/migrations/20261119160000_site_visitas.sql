-- Visitantes do site: um registro por visitante anônimo por dia (hash sem dado pessoal).
create table if not exists public.site_visitas (
  visitante text not null,
  dia date not null,
  paginas int not null default 1,
  primeira_em timestamptz not null default now(),
  primary key (dia, visitante)
);
alter table public.site_visitas enable row level security;
revoke all on public.site_visitas from public, anon, authenticated;

create or replace function public.registrar_visita(p_visitante text, p_dia date)
returns void language sql security definer set search_path = '' as $$
  insert into public.site_visitas (visitante, dia) values (p_visitante, p_dia)
  on conflict (dia, visitante) do update set paginas = public.site_visitas.paginas + 1;
$$;
revoke all on function public.registrar_visita(text, date) from public, anon, authenticated;
grant execute on function public.registrar_visita(text, date) to service_role;

create or replace function public.resumo_visitas(p_hoje date)
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'hoje', (select count(*) from public.site_visitas where dia = p_hoje),
    'sete_dias', (select count(*) from public.site_visitas where dia > p_hoje - 7 and dia <= p_hoje),
    'total', (select count(*) from public.site_visitas),
    'desde', (select min(dia) from public.site_visitas)
  );
$$;
revoke all on function public.resumo_visitas(date) from public, anon, authenticated;
grant execute on function public.resumo_visitas(date) to service_role;
