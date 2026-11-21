-- Recibos do chat com a Equipe: recebida (chegou ao app/painel do destinatário) e lida (conversa aberta).
-- Rollback: alter table public.team_messages drop column if exists delivered_at, drop column if exists read_at;
alter table public.team_messages add column if not exists delivered_at timestamptz, add column if not exists read_at timestamptz;
update public.team_messages set delivered_at = coalesce(delivered_at, created_at), read_at = coalesce(read_at, created_at) where status = 'lido';
