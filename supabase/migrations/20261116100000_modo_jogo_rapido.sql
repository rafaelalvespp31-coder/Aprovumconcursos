-- Modo Jogo: Desafio rápido (questões curtas de todas as matérias do catálogo).
-- Rollback:
--   drop function if exists public.game_round(uuid, text, uuid, text, text, int);
--   drop function if exists public.game_overview(uuid);
--   drop table if exists public.game_items;
--   alter table public.quiz_attempts drop constraint quiz_attempts_node_key_check;
--   alter table public.quiz_attempts add constraint quiz_attempts_node_key_check check (node_key ~ '^N[0-9]{4}$');
--   (apague antes as linhas de quiz_attempts com node_key 'G......').

-- 1) quiz_attempts passa a aceitar chaves do Desafio rápido (G + 6 dígitos), além das lacunas (N + 4).
alter table public.quiz_attempts drop constraint if exists quiz_attempts_node_key_check;
alter table public.quiz_attempts add constraint quiz_attempts_node_key_check check (node_key ~ '^(N[0-9]{4}|G[0-9]{6})$');

-- 2) Itens do Desafio rápido: curtos, classificados e com a resposta só no servidor.
create table if not exists public.game_items (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  key text generated always as ('G' || lpad(seq::text, 6, '0')) stored,
  topic_id uuid not null references public.catalog_topics(id) on delete cascade,
  discipline text not null,
  subject text not null,
  kind text not null check (kind in ('escolha', 'vf')),
  difficulty smallint not null check (difficulty between 1 and 3),
  prompt text not null check (length(prompt) between 10 and 200),
  options jsonb not null default '[]'::jsonb,
  answer_true boolean,
  explanation text not null check (length(explanation) between 5 and 300),
  source text not null check (source in ('catalogo', 'pegadinha')),
  source_id text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (source, source_id),
  unique (key),
  check ((kind = 'vf' and answer_true is not null) or (kind = 'escolha' and jsonb_array_length(options) between 3 and 5))
);
create index if not exists game_items_discipline_idx on public.game_items (discipline) where active;
create index if not exists game_items_topic_idx on public.game_items (topic_id) where active;

alter table public.game_items enable row level security;
revoke all on public.game_items from anon, authenticated;
grant select on public.game_items to service_role;

-- 3) Carga: questões curtas já curadas do catálogo (certo/errado e múltipla escolha).
insert into public.game_items (topic_id, discipline, subject, kind, difficulty, prompt, options, answer_true, explanation, source, source_id)
select q.topic_id, t.discipline_mode, t.title, 'vf',
       case q.level when 'facil' then 1 when 'medio' then 2 else 3 end,
       q.statement, '[]'::jsonb, q.correct_answer_true,
       regexp_replace(regexp_replace(q.justification, '^\s*Certo\.?\s*', 'Verdadeiro. '), '^\s*Errado\.?\s*', 'Falso. '),
       'catalogo', q.id::text
from public.catalog_questions q
join public.catalog_topics t on t.id = q.topic_id and t.status = 'publicado'
where q.active and not coalesce(q.depends_on_external_source, false)
  and q.type = 'certo_errado' and q.correct_answer_true is not null
  and length(q.statement) between 10 and 170
  and length(q.justification) between 5 and 300
on conflict do nothing;

insert into public.game_items (topic_id, discipline, subject, kind, difficulty, prompt, options, answer_true, explanation, source, source_id)
select q.topic_id, t.discipline_mode, t.title, 'escolha',
       case q.level when 'facil' then 1 when 'medio' then 2 else 3 end,
       q.statement, q.options, null, q.justification, 'catalogo', q.id::text
from public.catalog_questions q
join public.catalog_topics t on t.id = q.topic_id and t.status = 'publicado'
where q.active and not coalesce(q.depends_on_external_source, false)
  and q.type = 'multipla_escolha'
  and length(q.statement) between 10 and 170
  and length(q.justification) between 5 and 300
  and jsonb_array_length(q.options) between 3 and 5
  and (select count(*) from jsonb_array_elements(q.options) o where (o->>'correct')::boolean) = 1
  and (select max(length(o->>'text')) from jsonb_array_elements(q.options) o) <= 90
  and (select min(length(o->>'text')) from jsonb_array_elements(q.options) o) >= 2
  -- alternativas que dependem de outras ("todas as anteriores", "I e II") não funcionam embaralhadas.
  and not exists (
    select 1 from jsonb_array_elements(q.options) o
    where (o->>'text') ~* '(todas as (alternativas|anteriores|afirmativas|assertivas)|nenhuma d[aeo]s?|ambas|apenas (as|os) (itens|alternativas|afirmativas|assertivas)|alternativa|afirmativas? (i|ii|iii)\M|itens? (i|ii|iii)\M)'
       or (o->>'text') ~ '\m(I|II|III|IV)\M\s*(e|,|ou|-)'
  )
  and q.statement !~* '(alternativa|assinale a opção|texto (acima|abaixo)|trecho (acima|abaixo)|figura|imagem|tabela abaixo)'
on conflict do nothing;

-- 4) Carga: "pegadinhas" das aulas (afirmações erradas com a explicação), como verdadeiro ou falso.
insert into public.game_items (topic_id, discipline, subject, kind, difficulty, prompt, options, answer_true, explanation, source, source_id)
select t.id, t.discipline_mode, t.title, 'vf', 2,
       upper(left(m[1], 1)) || substr(m[1], 2) || case when m[1] ~ '[.!?]$' then '' else '.' end,
       '[]'::jsonb, false,
       'Falso. ' || upper(left(m[2], 1)) || substr(m[2], 2) || case when m[2] ~ '[.!?]$' then '' else '.' end,
       'pegadinha', t.id::text || ':' || md5(m[1])
from public.catalog_topics t,
     jsonb_array_elements(t.lesson -> 'sections') s,
     lateral regexp_matches(s ->> 'bodyMarkdown', '^\s*\d+\.\s+\*\*[“"](.+?)[”"]\*\*\s*Errado[:.]?\s*(.+?)\s*$', 'gn') m
where t.status = 'publicado' and s ->> 'kind' = 'pegadinhas'
  and length(m[1]) between 10 and 170
  and length(m[2]) between 5 and 250
  and m[1] !~ '\*\*|\$'
  and m[2] !~ '\*\*\*'
on conflict do nothing;

-- 5) Sorteio da rodada: itens inéditos (ou os que o aluno errou), intercalando as matérias.
create or replace function public.game_round(
  p_user uuid, p_discipline text default null, p_topic uuid default null,
  p_mode text default 'novas', p_source text default null, p_n int default 10
) returns setof public.game_items
language sql security definer set search_path = public as $$
  with last as (
    select distinct on (node_key) node_key, correct
    from public.quiz_attempts
    where user_id = p_user and node_key like 'G%'
    order by node_key, created_at desc
  ), pool as (
    select g.*, row_number() over (partition by g.discipline order by random()) as rk
    from public.game_items g
    left join last l on l.node_key = g.key
    where g.active
      and (p_discipline is null or g.discipline = p_discipline)
      and (p_topic is null or g.topic_id = p_topic)
      and (p_source is null or g.source = p_source)
      and ((p_mode = 'erros' and l.correct is false) or (p_mode <> 'erros' and l.node_key is null))
  )
  select id, seq, key, topic_id, discipline, subject, kind, difficulty, prompt, options, answer_true, explanation, source, source_id, active, created_at
  from pool order by rk, random() limit greatest(1, least(p_n, 20));
$$;

-- 6) Panorama por matéria: total, respondidas e erradas (última tentativa).
create or replace function public.game_overview(p_user uuid)
returns table (discipline text, total int, done int, wrong int)
language sql security definer set search_path = public as $$
  with last as (
    select distinct on (node_key) node_key, correct
    from public.quiz_attempts
    where user_id = p_user and node_key like 'G%'
    order by node_key, created_at desc
  )
  select g.discipline, count(*)::int, count(l.node_key)::int, count(*) filter (where l.correct is false)::int
  from public.game_items g left join last l on l.node_key = g.key
  where g.active group by g.discipline order by 2 desc;
$$;

revoke all on function public.game_round(uuid, text, uuid, text, text, int) from public, anon, authenticated;
revoke all on function public.game_overview(uuid) from public, anon, authenticated;
grant execute on function public.game_round(uuid, text, uuid, text, text, int) to service_role;
grant execute on function public.game_overview(uuid) to service_role;

-- 7) Itens sem explicação útil ficam fora do jogo (o feedback precisa ensinar).
update public.game_items set active = false
where explanation ilike 'Veja o gabarito%' or explanation ilike '%releia o assunto%' or length(explanation) < 25;

-- 8) Ao acertar no "revisar erros", o servidor corrige a tentativa anterior (sem contar resposta nova).
grant update (correct) on public.quiz_attempts to service_role;
