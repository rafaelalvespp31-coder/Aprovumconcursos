-- Favoritos e alertas de concursos: o aluno logado (authenticated) precisava de permissão na tabela
-- (só havia service_role); a RLS "dono" continua limitando cada um às próprias linhas.
-- Rollback: revoke all on public.contest_favorites, public.contest_alerts from authenticated;
grant select, insert, update, delete on public.contest_favorites to authenticated;
grant select, insert, update, delete on public.contest_alerts to authenticated;
