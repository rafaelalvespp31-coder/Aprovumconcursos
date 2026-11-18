create or replace function public.tatico_encerrar_solo(p_user uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  -- só treino (solo) do próprio aluno; partidas 1x1 nunca são encerradas por aqui
  update public.tatico_matches set status = 'cancelada', phase = 'fim', phase_until = null, finished_at = now()
   where solo and p1 = p_user and status not in ('finalizada','cancelada');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.tatico_encerrar_solo(uuid) from public, anon, authenticated;
grant execute on function public.tatico_encerrar_solo(uuid) to service_role;
