-- Mentor APROVUM: histórico das recomendações apresentadas a cada aluno (sem IA externa).
--
-- Leitura: só o dono (RLS). Escrita: SÓ o servidor (service_role), depois de confirmar a sessão
-- do aluno — o navegador nunca grava, altera prioridade nem marca concluída.
-- Deduplicação: uma linha por (aluno, chave lógica = tipo + entidade, contexto). Recarregar a tela
-- ou chamadas concorrentes não duplicam (unique + upsert "do nothing" no servidor).
--
-- Rollback: drop table if exists public.mentor_recommendations;  (nada mais depende dela)

create table if not exists public.mentor_recommendations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  dedupe_key    text not null check (char_length(dedupe_key) between 3 and 200),
  context_hash  text not null check (char_length(context_hash) between 1 and 60),
  kind          text not null check (kind in ('aula_pendente', 'questoes_pendentes', 'reforco', 'revisao_vencida', 'caderno_pendente', 'consolidacao', 'praticar_mais', 'proxima_aula', 'manutencao')),
  rule          text not null check (rule in ('A', 'B', 'B2', 'C', 'D', 'E')),
  entity_type   text not null check (entity_type in ('aula', 'assunto', 'revisao', 'caderno')),
  entity_id     text not null check (char_length(entity_id) between 1 and 120),
  title         text not null check (char_length(title) between 1 and 300),
  reason        text not null check (char_length(reason) between 1 and 600),
  priority      integer not null check (priority between 0 and 1000),
  href          text not null check (href ~ '^/[a-z]' and char_length(href) <= 300),
  status        text not null default 'nova' check (status in ('nova', 'visualizada', 'concluida', 'dispensada')),
  rules_version text not null check (char_length(rules_version) <= 20),
  created_at    timestamptz not null default now(),
  seen_at       timestamptz,
  resolved_at   timestamptz,
  dismissed_at  timestamptz,
  unique (user_id, dedupe_key, context_hash)
);

-- Leitura do histórico recente do aluno (card, página do Mentor e conciliação).
create index if not exists mentor_recommendations_user_recent on public.mentor_recommendations (user_id, created_at desc);

alter table public.mentor_recommendations enable row level security;
drop policy if exists "dono le" on public.mentor_recommendations;
create policy "dono le" on public.mentor_recommendations for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.mentor_recommendations from anon, authenticated;
grant select on public.mentor_recommendations to authenticated;

comment on table public.mentor_recommendations is 'Mentor APROVUM: recomendações apresentadas ao aluno (histórico, estado e regra que gerou). Escrita só pelo servidor.';
