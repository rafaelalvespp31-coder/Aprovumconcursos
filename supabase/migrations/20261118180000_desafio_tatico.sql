-- =============================================================================
-- DESAFIO TÁTICO — APROVUM (Modo Jogo 1v1)
-- Aditiva: não altera tabelas existentes (exceto quiz_ranking, que passa a somar o ledger do desafio).
-- O servidor é a autoridade: o cliente não tem NENHUM privilégio nestas tabelas nem nas funções;
-- tudo passa por funções SECURITY DEFINER executáveis só pelo service_role, com o id da sessão
-- verificado no servidor Next.js. Gabarito fica só em tatico_match_questions.snapshot (nunca enviado
-- antes do fim da rodada). Rollback: drop das tabelas/funções tatico_* e recriar quiz_ranking da 20261118160000.
-- =============================================================================

create table if not exists public.tatico_matches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'aguardando_adversario' check (status in
    ('aguardando_adversario','aguardando_inicio','em_andamento','aguardando_respostas','desempate','finalizada','cancelada')),
  p1 uuid not null references auth.users (id) on delete cascade,
  p2 uuid references auth.users (id) on delete cascade,
  idx int not null default 0 check (idx between 0 and 80),
  phase text not null default 'contagem' check (phase in ('contagem','responder','revelar','fim')),
  phase_until timestamptz,
  q_seconds int not null default 30 check (q_seconds between 10 and 120),
  p1_hits int not null default 0, p1_miss int not null default 0,
  p2_hits int not null default 0, p2_miss int not null default 0,
  p1_seen timestamptz not null default now(), p2_seen timestamptz not null default now(),
  winner uuid references auth.users (id) on delete set null,
  decided_by text check (decided_by in ('acertos','morte_subita','abandono')),
  day date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  created_at timestamptz not null default now(),
  started_at timestamptz, finished_at timestamptz,
  check (p2 is null or p1 <> p2)
);
create index if not exists tatico_matches_p1 on public.tatico_matches (p1, created_at desc);
create index if not exists tatico_matches_p2 on public.tatico_matches (p2, created_at desc);
create index if not exists tatico_matches_open on public.tatico_matches (status) where status not in ('finalizada','cancelada');

create table if not exists public.tatico_match_questions (
  match_id uuid not null references public.tatico_matches (id) on delete cascade,
  pos int not null check (pos >= 1),
  source text not null check (source in ('catalogo','banco')),
  question_id uuid not null,
  is_tiebreak boolean not null default false,
  snapshot jsonb not null,
  primary key (match_id, pos)
);

create table if not exists public.tatico_answers (
  match_id uuid not null references public.tatico_matches (id) on delete cascade,
  pos int not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  choice text check (choice in ('A','B','C','D')),
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (match_id, pos, user_id)   -- impede resposta dupla
);

create table if not exists public.tatico_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now()
);

create table if not exists public.tatico_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  used int not null default 0 check (used between 0 and 3),
  primary key (user_id, day)
);

create table if not exists public.tatico_ledger (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.tatico_matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta int not null check (delta between -100 and 200),
  reason text not null check (reason in ('vitoria','derrota')),
  created_at timestamptz not null default now(),
  unique (match_id, user_id)               -- impede aplicação duplicada
);
create index if not exists tatico_ledger_user on public.tatico_ledger (user_id, created_at desc);

do $$ declare t text; begin
  foreach t in array array['tatico_matches','tatico_match_questions','tatico_answers','tatico_queue','tatico_daily','tatico_ledger'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)', 'tatico: sem acesso direto', t);
  end loop;
end $$;

-- ---------- pool de questões REAIS (4 alternativas A–D, gabarito oficial cadastrado) ----------
create or replace function public.tatico_pool()
returns table (source text, qid uuid, snap jsonb)
language sql stable security definer set search_path = '' as $$
  select 'catalogo'::text, c.id,
         jsonb_build_object(
           'statement', c.statement,
           'topic', t.title,
           'subject', coalesce(t.discipline_mode, ''),
           'level', c.level,
           'options', (select jsonb_agg(jsonb_build_object('label', o->>'label', 'text', o->>'text', 'explanation', o->>'explanation') order by o->>'label') from jsonb_array_elements(c.options) o),
           'correct', (select o->>'label' from jsonb_array_elements(c.options) o where (o->>'correct')::boolean limit 1),
           'justification', c.justification)
  from public.catalog_questions c
  join public.catalog_topics t on t.id = c.topic_id
  where c.active and c.type in ('multipla_escolha','situacional')
    and jsonb_typeof(c.options) = 'array' and jsonb_array_length(c.options) = 4
    and (select count(*) from jsonb_array_elements(c.options) o where (o->>'correct')::boolean) = 1
  union all
  select 'banco'::text, q.id,
         jsonb_build_object(
           'statement', coalesce(q.case_context || E'\n\n', '') || q.statement,
           'topic', coalesce(st.name, ''), 'subject', coalesce(s.name, ''),
           'level', coalesce(q.calibrated_difficulty, q.initial_difficulty),
           'options', (select jsonb_agg(jsonb_build_object('label', o.label, 'text', o.text, 'explanation', o.explanation) order by o.label) from public.bank_question_options o where o.question_id = q.id),
           'correct', (select o.label from public.bank_question_options o where o.question_id = q.id and o.is_correct limit 1),
           'justification', q.justification)
  from public.bank_questions q
  join public.subjects s on s.id = q.subject_id
  left join public.subject_topics st on st.id = q.topic_id
  where q.status = 'publicada' and q.question_type = 'multipla_escolha'
    and (select count(*) from public.bank_question_options o where o.question_id = q.id) = 4
    and (select count(*) from public.bank_question_options o where o.question_id = q.id and o.is_correct) = 1;
$$;

-- XP total do aluno no Modo Jogo (quiz + desafio), nunca negativo.
create or replace function public.tatico_xp_total(p_user uuid)
returns int language sql stable security definer set search_path = '' as $$
  select greatest(0, coalesce((select sum(xp) from public.quiz_attempts where user_id = p_user), 0)
                   + coalesce((select sum(delta) from public.tatico_ledger where user_id = p_user), 0))::int;
$$;

create or replace function public.tatico_dia() returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- ---------- finalização (idempotente; chamada sempre com a linha da partida travada) ----------
create or replace function public.tatico_finalizar(p_match uuid, p_winner uuid, p_by text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.tatico_matches%rowtype; loser uuid; perda int;
begin
  select * into m from public.tatico_matches where id = p_match for update;
  if m.status in ('finalizada','cancelada') then return; end if;
  loser := case when p_winner = m.p1 then m.p2 else m.p1 end;
  update public.tatico_matches set status = 'finalizada', phase = 'fim', phase_until = null,
         winner = p_winner, decided_by = p_by, finished_at = now() where id = p_match;
  insert into public.tatico_ledger (match_id, user_id, delta, reason) values (p_match, p_winner, 200, 'vitoria')
    on conflict (match_id, user_id) do nothing;
  perda := least(100, public.tatico_xp_total(loser));   -- XP nunca fica abaixo de zero
  insert into public.tatico_ledger (match_id, user_id, delta, reason) values (p_match, loser, -perda, 'derrota')
    on conflict (match_id, user_id) do nothing;
end $$;

-- ---------- avanço da máquina de estados (lazy: roda em toda leitura/resposta, sob trava) ----------
create or replace function public.tatico_avancar(p_match uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.tatico_matches%rowtype; n1 int; n2 int; c1 boolean; c2 boolean;
        ausente1 boolean; ausente2 boolean; q record; loops int := 0; novo public.tatico_match_questions%rowtype;
begin
  select * into m from public.tatico_matches where id = p_match for update;
  if not found or m.status in ('finalizada','cancelada','aguardando_adversario') then return; end if;
  loop
    loops := loops + 1; exit when loops > 6;
    ausente1 := m.p1_seen < now() - interval '25 seconds'; ausente2 := m.p2_seen < now() - interval '25 seconds';
    -- as duas pontas sumiram: encerra sem vencedor (a tentativa já foi consumida e não volta)
    if ausente1 and ausente2 and m.p1_seen < now() - interval '120 seconds' and m.p2_seen < now() - interval '120 seconds' then
      update public.tatico_matches set status = 'cancelada', phase = 'fim', finished_at = now() where id = p_match;
      return;
    end if;

    if m.phase = 'contagem' then
      exit when now() < m.phase_until;
      update public.tatico_matches set idx = 1, phase = 'responder', phase_until = now() + make_interval(secs => m.q_seconds),
             status = 'aguardando_respostas', started_at = now() where id = p_match returning * into m;

    elsif m.phase = 'responder' then
      select count(*) filter (where user_id = m.p1), count(*) filter (where user_id = m.p2) into n1, n2
        from public.tatico_answers where match_id = p_match and pos = m.idx;
      -- fecha a rodada: tempo esgotado, ou os dois responderam, ou quem respondeu aguarda alguém que sumiu
      exit when not ((n1 > 0 and n2 > 0) or now() >= m.phase_until or (n1 > 0 and ausente2) or (n2 > 0 and ausente1));
      if n1 = 0 then insert into public.tatico_answers (match_id, pos, user_id, choice, correct) values (p_match, m.idx, m.p1, null, false); end if;
      if n2 = 0 then insert into public.tatico_answers (match_id, pos, user_id, choice, correct) values (p_match, m.idx, m.p2, null, false); end if;
      select coalesce(bool_or(correct) filter (where user_id = m.p1), false), coalesce(bool_or(correct) filter (where user_id = m.p2), false)
        into c1, c2 from public.tatico_answers where match_id = p_match and pos = m.idx;
      update public.tatico_matches set
        p1_hits = p1_hits + (case when c1 then 1 else 0 end), p1_miss = p1_miss + (case when c1 then 0 else 1 end),
        p2_hits = p2_hits + (case when c2 then 1 else 0 end), p2_miss = p2_miss + (case when c2 then 0 else 1 end),
        phase = 'revelar', phase_until = now() + interval '5 seconds',
        status = case when m.idx > 10 then 'desempate' else 'em_andamento' end
      where id = p_match returning * into m;

    elsif m.phase = 'revelar' then
      exit when now() < m.phase_until;
      if m.idx < 10 then
        update public.tatico_matches set idx = m.idx + 1, phase = 'responder', phase_until = now() + make_interval(secs => m.q_seconds),
               status = 'aguardando_respostas' where id = p_match returning * into m;
      else
        select coalesce(bool_or(correct) filter (where user_id = m.p1), false), coalesce(bool_or(correct) filter (where user_id = m.p2), false)
          into c1, c2 from public.tatico_answers where match_id = p_match and pos = m.idx;
        if m.idx = 10 then
          if m.p1_hits <> m.p2_hits then
            perform public.tatico_finalizar(p_match, case when m.p1_hits > m.p2_hits then m.p1 else m.p2 end, 'acertos'); return;
          end if;
        else
          if c1 <> c2 then
            perform public.tatico_finalizar(p_match, case when c1 then m.p1 else m.p2 end, 'morte_subita'); return;
          end if;
        end if;
        -- empate: nova questão de desempate, diferente das já usadas (se o banco acabar, só repete as de desempate)
        select p.source, p.qid, p.snap into q from public.tatico_pool() p
          where not exists (select 1 from public.tatico_match_questions x where x.match_id = p_match and x.source = p.source and x.question_id = p.qid)
          order by random() limit 1;
        if q is null then
          select p.source, p.qid, p.snap into q from public.tatico_pool() p
            where not exists (select 1 from public.tatico_match_questions x where x.match_id = p_match and not x.is_tiebreak and x.source = p.source and x.question_id = p.qid)
            order by random() limit 1;
        end if;
        insert into public.tatico_match_questions (match_id, pos, source, question_id, is_tiebreak, snapshot)
          values (p_match, m.idx + 1, q.source, q.qid, true, q.snap);
        update public.tatico_matches set idx = m.idx + 1, phase = 'responder', phase_until = now() + make_interval(secs => m.q_seconds),
               status = 'desempate' where id = p_match returning * into m;
      end if;
    else
      exit;
    end if;
  end loop;
end $$;

-- ---------- entrar na fila / formar partida ----------
create or replace function public.tatico_entrar(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare dia date := public.tatico_dia(); usados int; ativa uuid; par uuid; mid uuid; n int;
begin
  perform pg_advisory_xact_lock(hashtext('tatico_fila'));          -- serializa o pareamento (sem corrida)
  select id into ativa from public.tatico_matches
    where (p1 = p_user or p2 = p_user) and status not in ('finalizada','cancelada') order by created_at desc limit 1;
  if ativa is not null then return jsonb_build_object('estado', 'partida', 'match', ativa); end if;

  select coalesce(used, 0) into usados from public.tatico_daily where user_id = p_user and day = dia;
  if coalesce(usados, 0) >= 3 then return jsonb_build_object('estado', 'limite', 'usados', usados); end if;

  delete from public.tatico_queue where joined_at < now() - interval '90 seconds';
  select count(*) into n from public.tatico_pool();
  if n < 11 then return jsonb_build_object('estado', 'sem_questoes'); end if;

  select qq.user_id into par from public.tatico_queue qq
    where qq.user_id <> p_user
      and coalesce((select used from public.tatico_daily d where d.user_id = qq.user_id and d.day = dia), 0) < 3
    order by qq.joined_at limit 1 for update skip locked;

  if par is null then
    insert into public.tatico_queue (user_id) values (p_user) on conflict (user_id) do update set joined_at = now();
    return jsonb_build_object('estado', 'fila', 'usados', coalesce(usados, 0));
  end if;

  delete from public.tatico_queue where user_id in (par, p_user);
  insert into public.tatico_matches (p1, p2, status, phase, phase_until, day)
    values (par, p_user, 'aguardando_inicio', 'contagem', now() + interval '9 seconds', dia) returning id into mid;
  insert into public.tatico_match_questions (match_id, pos, source, question_id, snapshot)
    select mid, (row_number() over (order by random()))::int, s.source, s.qid, s.snap
    from (select * from public.tatico_pool() order by random() limit 10) s;
  -- a tentativa é contada AGORA (início da partida); recarregar/abandonar não devolve
  insert into public.tatico_daily (user_id, day, used) values (par, dia, 1), (p_user, dia, 1)
    on conflict (user_id, day) do update set used = least(3, public.tatico_daily.used + 1);
  return jsonb_build_object('estado', 'partida', 'match', mid);
end $$;

create or replace function public.tatico_sair_fila(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.tatico_queue where user_id = p_user;
$$;

-- ---------- responder (validado aqui; o cliente só manda a letra) ----------
create or replace function public.tatico_responder(p_user uuid, p_match uuid, p_choice text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.tatico_matches%rowtype; qs public.tatico_match_questions%rowtype; ok boolean;
begin
  if p_choice not in ('A','B','C','D') then return jsonb_build_object('ok', false, 'erro', 'alternativa_invalida'); end if;
  perform public.tatico_avancar(p_match);
  select * into m from public.tatico_matches where id = p_match for update;
  if not found or p_user not in (m.p1, m.p2) then return jsonb_build_object('ok', false, 'erro', 'sem_acesso'); end if;
  if m.phase <> 'responder' or now() >= m.phase_until then return jsonb_build_object('ok', false, 'erro', 'fora_do_tempo'); end if;
  if exists (select 1 from public.tatico_answers where match_id = p_match and pos = m.idx and user_id = p_user) then
    return jsonb_build_object('ok', false, 'erro', 'ja_respondeu');
  end if;
  select * into qs from public.tatico_match_questions where match_id = p_match and pos = m.idx;
  ok := (qs.snapshot->>'correct') = p_choice;
  insert into public.tatico_answers (match_id, pos, user_id, choice, correct) values (p_match, m.idx, p_user, p_choice, ok);
  perform public.tatico_avancar(p_match);   -- se os dois já responderam, revela na hora
  return jsonb_build_object('ok', true, 'acertou', ok, 'pos', m.idx);
end $$;

-- ---------- estado para a tela (sem vazar gabarito nem a escolha do adversário antes da hora) ----------
create or replace function public.tatico_estado(p_user uuid, p_match uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.tatico_matches%rowtype; mid uuid := p_match; opp uuid; qs public.tatico_match_questions%rowtype;
        mine record; theirs record; rev boolean; q jsonb; seq int := 0; melhor int := 0; ult record;
        nome_opp text; qtd int; dia date := public.tatico_dia(); usados int;
begin
  select coalesce(used, 0) into usados from public.tatico_daily where user_id = p_user and day = dia;
  usados := coalesce(usados, 0);
  if mid is null then
    select id into mid from public.tatico_matches where (p1 = p_user or p2 = p_user) and status not in ('finalizada','cancelada')
      order by created_at desc limit 1;
  end if;
  if mid is null then
    return jsonb_build_object('estado', case when exists (select 1 from public.tatico_queue where user_id = p_user) then 'fila' else 'ocioso' end,
                              'usados', usados, 'limite', 3);
  end if;
  select * into m from public.tatico_matches where id = mid;
  if not found or p_user not in (m.p1, m.p2) then return jsonb_build_object('estado', 'ocioso', 'usados', usados, 'limite', 3); end if;
  update public.tatico_matches set p1_seen = case when p1 = p_user then now() else p1_seen end,
                                   p2_seen = case when p2 = p_user then now() else p2_seen end where id = mid;
  perform public.tatico_avancar(mid);
  select * into m from public.tatico_matches where id = mid;
  opp := case when m.p1 = p_user then m.p2 else m.p1 end;
  select coalesce(nullif(split_part(btrim(p.display_name), ' ', 1), '') || coalesce(' ' || left(nullif(split_part(btrim(p.display_name), ' ', 2), ''), 1) || '.', ''), 'Aluno APROVUM')
    into nome_opp from public.profiles p where p.id = opp;
  nome_opp := coalesce(nome_opp, 'Aluno APROVUM');
  rev := m.phase in ('revelar','fim');
  select choice, correct, answered_at into mine from public.tatico_answers where match_id = mid and pos = m.idx and user_id = p_user;
  select (count(*) > 0) as respondeu into theirs from public.tatico_answers where match_id = mid and pos = m.idx and user_id = opp;
  -- sequência atual e melhor sequência do jogador (rodadas já reveladas)
  for ult in select correct from public.tatico_answers a where a.match_id = mid and a.user_id = p_user
             and (a.pos < m.idx or rev) order by a.pos loop
    if ult.correct then seq := seq + 1; melhor := greatest(melhor, seq); else seq := 0; end if;
  end loop;

  q := null;
  if m.idx >= 1 and m.phase in ('responder','revelar') then
    select * into qs from public.tatico_match_questions where match_id = mid and pos = m.idx;
    q := jsonb_build_object('pos', qs.pos, 'tiebreak', qs.is_tiebreak, 'statement', qs.snapshot->>'statement',
          'topic', qs.snapshot->>'topic', 'subject', qs.snapshot->>'subject', 'level', qs.snapshot->>'level',
          'options', (select jsonb_agg(jsonb_build_object('label', o->>'label', 'text', o->>'text') order by o->>'label') from jsonb_array_elements(qs.snapshot->'options') o));
    if m.phase = 'revelar' or m.status = 'finalizada' then
      q := q || jsonb_build_object('correct', qs.snapshot->>'correct', 'justification', qs.snapshot->>'justification',
            'explanations', (select jsonb_object_agg(o->>'label', o->>'explanation') from jsonb_array_elements(qs.snapshot->'options') o),
            'oppChoice', (select choice from public.tatico_answers where match_id = mid and pos = m.idx and user_id = opp));
    end if;
  end if;
  select count(*) into qtd from public.tatico_match_questions where match_id = mid and not is_tiebreak;

  return jsonb_build_object(
    'estado', 'partida', 'match', mid, 'status', m.status, 'phase', m.phase, 'idx', m.idx, 'total', qtd,
    'msRestantes', greatest(0, (extract(epoch from (m.phase_until - now())) * 1000)::int),
    'questionSeconds', m.q_seconds,
    'me', jsonb_build_object('hits', case when p_user = m.p1 then m.p1_hits else m.p2_hits end,
                             'miss', case when p_user = m.p1 then m.p1_miss else m.p2_miss end,
                             'streak', seq, 'bestStreak', melhor,
                             'answered', mine.correct is not null,
                             'choice', mine.choice, 'correct', mine.correct),
    'opp', jsonb_build_object('name', nome_opp, 'hits', case when p_user = m.p1 then m.p2_hits else m.p1_hits end,
                              'miss', case when p_user = m.p1 then m.p2_miss else m.p1_miss end,
                              'answered', coalesce(theirs.respondeu, false)),
    'question', q,
    'winner', case when m.status = 'finalizada' then (m.winner = p_user) else null end,
    'decidedBy', m.decided_by,
    'xp', (select delta from public.tatico_ledger where match_id = mid and user_id = p_user),
    'usados', usados, 'limite', 3);
end $$;

-- ---------- revisão, histórico e estatísticas ----------
create or replace function public.tatico_revisao(p_user uuid, p_match uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare m public.tatico_matches%rowtype;
begin
  select * into m from public.tatico_matches where id = p_match and status = 'finalizada' and p_user in (p1, p2);
  if not found then return null; end if;
  return jsonb_build_object('match', p_match, 'winner', m.winner = p_user, 'decidedBy', m.decided_by, 'itens',
    (select coalesce(jsonb_agg(jsonb_build_object(
        'pos', q.pos, 'tiebreak', q.is_tiebreak, 'statement', q.snapshot->>'statement', 'topic', q.snapshot->>'topic',
        'subject', q.snapshot->>'subject', 'options', q.snapshot->'options', 'correct', q.snapshot->>'correct',
        'justification', q.snapshot->>'justification', 'choice', a.choice, 'acertou', coalesce(a.correct, false)) order by q.pos), '[]'::jsonb)
     from public.tatico_match_questions q
     left join public.tatico_answers a on a.match_id = q.match_id and a.pos = q.pos and a.user_id = p_user
     where q.match_id = p_match));
end $$;

create or replace function public.tatico_stats(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; melhor int := 0; seq int := 0; ult record;
begin
  for ult in select a.correct from public.tatico_answers a join public.tatico_matches m on m.id = a.match_id
             where a.user_id = p_user and m.status = 'finalizada' order by m.finished_at, a.pos loop
    if ult.correct then seq := seq + 1; melhor := greatest(melhor, seq); else seq := 0; end if;
  end loop;
  select jsonb_build_object(
    'partidas', count(*), 'vitorias', count(*) filter (where m.winner = p_user), 'derrotas', count(*) filter (where m.winner <> p_user),
    'vitoriasDesempate', count(*) filter (where m.winner = p_user and m.decided_by = 'morte_subita'),
    'acertos', coalesce(sum(case when m.p1 = p_user then m.p1_hits else m.p2_hits end), 0),
    'erros', coalesce(sum(case when m.p1 = p_user then m.p1_miss else m.p2_miss end), 0),
    'xpGanho', coalesce((select sum(delta) from public.tatico_ledger where user_id = p_user and delta > 0), 0),
    'xpPerdido', coalesce(-(select sum(delta) from public.tatico_ledger where user_id = p_user and delta < 0), 0),
    'melhorSequencia', melhor,
    'recentes', coalesce((select jsonb_agg(x order by x->>'quando' desc) from (
        select jsonb_build_object('match', mm.id, 'quando', mm.finished_at, 'venceu', mm.winner = p_user,
               'acertos', case when mm.p1 = p_user then mm.p1_hits else mm.p2_hits end,
               'erros', case when mm.p1 = p_user then mm.p1_miss else mm.p2_miss end,
               'desempate', mm.decided_by = 'morte_subita') x
        from public.tatico_matches mm where p_user in (mm.p1, mm.p2) and mm.status = 'finalizada' order by mm.finished_at desc limit 10) z), '[]'::jsonb),
    'assuntos', coalesce((select jsonb_agg(jsonb_build_object('assunto', t, 'acertos', ac, 'total', tot, 'taxa', round(100.0 * ac / tot)) order by (1.0 * ac / tot), tot desc)
        from (select q.snapshot->>'topic' t, count(*) filter (where a.correct) ac, count(*) tot
              from public.tatico_answers a join public.tatico_match_questions q on q.match_id = a.match_id and q.pos = a.pos
              join public.tatico_matches m2 on m2.id = a.match_id and m2.status = 'finalizada'
              where a.user_id = p_user group by 1 order by 1.0 * count(*) filter (where a.correct) / count(*), count(*) desc limit 8) w), '[]'::jsonb)
  ) into r
  from public.tatico_matches m where p_user in (m.p1, m.p2) and m.status = 'finalizada';
  return r;
end $$;

do $$ declare f text; begin
  foreach f in array array['tatico_pool()','tatico_xp_total(uuid)','tatico_dia()','tatico_finalizar(uuid,uuid,text)','tatico_avancar(uuid)',
      'tatico_entrar(uuid)','tatico_sair_fila(uuid)','tatico_responder(uuid,uuid,text)','tatico_estado(uuid,uuid)','tatico_revisao(uuid,uuid)','tatico_stats(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- ---------- ranking: o XP do desafio entra no mesmo ranking (sem duplicar sistema) ----------
drop function if exists public.quiz_ranking(int, text);
create or replace function public.quiz_ranking(p_limit int default 20, p_period text default 'geral')
returns table (pos int, name text, xp int, answered int, hits int, is_me boolean, motto text, total int)
language sql stable security definer set search_path = '' as $$
  with ini as (
    select case p_period
      when 'hoje' then (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo'
      when 'semana' then (date_trunc('week', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo'
      else '-infinity'::timestamptz end as t
  ), ev as (
    select a.user_id, a.xp, 1 as ans, (case when a.correct then 1 else 0 end) as hit, a.created_at
      from public.quiz_attempts a, ini where a.created_at >= ini.t
    union all
    select l.user_id, l.delta, 0, 0, l.created_at from public.tatico_ledger l, ini where l.created_at >= ini.t
  ), s as (
    select user_id, sum(xp)::int as xp, sum(ans)::int as answered, sum(hit)::int as hits, min(created_at) as first_at
    from ev group by user_id having sum(xp) > 0
  ), r as (
    select s.*, (row_number() over (order by s.xp desc, s.hits desc, s.answered asc, s.first_at asc, s.user_id))::int as pos,
           (count(*) over ())::int as total
    from s
  )
  select r.pos,
         coalesce(nullif(split_part(btrim(p.display_name), ' ', 1), '')
           || coalesce(' ' || left(nullif(split_part(btrim(p.display_name), ' ', 2), ''), 1) || '.', ''), 'Aluno APROVUM') as name,
         r.xp, r.answered, r.hits, r.user_id = (select auth.uid()) as is_me, nullif(btrim(p.motto), '') as motto, r.total
  from r left join public.profiles p on p.id = r.user_id
  where r.pos <= least(greatest(p_limit, 1), 100) or r.user_id = (select auth.uid())
  order by r.pos;
$$;
revoke all on function public.quiz_ranking(int, text) from public, anon;
grant execute on function public.quiz_ranking(int, text) to authenticated;
