-- Recuperação de senha com conferência de dados: acha a conta pelo e-mail (só o servidor).
-- Rollback: drop function if exists public.auth_user_by_email(text);
create or replace function public.auth_user_by_email(p_email text)
returns table (id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select u.id, p.display_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(p_email))
  limit 1;
$$;
revoke all on function public.auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_by_email(text) to service_role;
