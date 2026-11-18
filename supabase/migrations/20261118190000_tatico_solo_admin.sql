-- Admin: treino solo no estande (sem adversário, sem XP, sem limite diário, fora de histórico/ranking)
alter table public.tatico_matches add column if not exists solo boolean not null default false;

create or replace function public.tatico_avancar(p_match uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.tatico_matches%rowtype; n1 int; n2 int; c1 boolean; c2 boolean;
        ausente1 boolean; ausente2 boolean; q record; loops int := 0;
begin
  select * into m from public.tatico_matches where id = p_match for update;
  if not found or m.status in ('finalizada','cancelada','aguardando_adversario') then return; end if;
  if m.solo then m.p2_seen := m.p1_seen; end if;
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
      if m.solo then m.p2_seen := m.p1_seen; end if;

    elsif m.phase = 'responder' then
      select count(*) filter (where user_id = m.p1), count(*) filter (where user_id = m.p2) into n1, n2
        from public.tatico_answers where match_id = p_match and pos = m.idx;
      -- fecha a rodada: tempo esgotado, ou os dois responderam, ou quem respondeu aguarda alguém que sumiu
      exit when not ((n1 > 0 and (n2 > 0 or m.solo)) or now() >= m.phase_until or (n1 > 0 and ausente2) or (n2 > 0 and ausente1));
      if n1 = 0 then insert into public.tatico_answers (match_id, pos, user_id, choice, correct) values (p_match, m.idx, m.p1, null, false); end if;
      if n2 = 0 and not m.solo then insert into public.tatico_answers (match_id, pos, user_id, choice, correct) values (p_match, m.idx, m.p2, null, false); end if;
      select coalesce(bool_or(correct) filter (where user_id = m.p1), false), coalesce(bool_or(correct) filter (where user_id = m.p2), false)
        into c1, c2 from public.tatico_answers where match_id = p_match and pos = m.idx;
      update public.tatico_matches set
        p1_hits = p1_hits + (case when c1 then 1 else 0 end), p1_miss = p1_miss + (case when c1 then 0 else 1 end),
        p2_hits = p2_hits + (case when c2 then 1 else 0 end), p2_miss = p2_miss + (case when c2 then 0 else 1 end),
        phase = 'revelar', phase_until = now() + interval '5 seconds',
        status = case when m.idx > 10 then 'desempate' else 'em_andamento' end
      where id = p_match returning * into m;
      if m.solo then m.p2_seen := m.p1_seen; end if;

    elsif m.phase = 'revelar' then
      exit when now() < m.phase_until;
      if m.solo and m.idx >= 10 then
        update public.tatico_matches set status = 'finalizada', phase = 'fim', phase_until = null, winner = case when m.p1_hits >= 6 then m.p1 else null end, decided_by = 'acertos', finished_at = now() where id = p_match;
        return;
      end if;
      if m.idx < 10 then
        update public.tatico_matches set idx = m.idx + 1, phase = 'responder', phase_until = now() + make_interval(secs => m.q_seconds),
               status = 'aguardando_respostas' where id = p_match returning * into m;
        if m.solo then m.p2_seen := m.p1_seen; end if;
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
  if not found or (p_user is distinct from m.p1 and p_user is distinct from m.p2) then return jsonb_build_object('estado', 'ocioso', 'usados', usados, 'limite', 3); end if;
  update public.tatico_matches set p1_seen = case when p1 = p_user then now() else p1_seen end,
                                   p2_seen = case when p2 = p_user then now() else p2_seen end where id = mid;
  perform public.tatico_avancar(mid);
  select * into m from public.tatico_matches where id = mid;
  opp := case when m.p1 = p_user then m.p2 else m.p1 end;
  select coalesce(nullif(split_part(btrim(p.display_name), ' ', 1), '') || coalesce(' ' || left(nullif(split_part(btrim(p.display_name), ' ', 2), ''), 1) || '.', ''), 'Aluno APROVUM')
    into nome_opp from public.profiles p where p.id = opp;
  nome_opp := case when m.solo then 'Treino (admin)' else coalesce(nome_opp, 'Aluno APROVUM') end;
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
    'solo', m.solo,
    'xp', (select delta from public.tatico_ledger where match_id = mid and user_id = p_user),
    'usados', usados, 'limite', 3);
end $$;

create or replace function public.tatico_stats(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; melhor int := 0; seq int := 0; ult record;
begin
  for ult in select a.correct from public.tatico_answers a join public.tatico_matches m on m.id = a.match_id
             where a.user_id = p_user and m.status = 'finalizada' and not m.solo order by m.finished_at, a.pos loop
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
        from public.tatico_matches mm where p_user in (mm.p1, mm.p2) and mm.status = 'finalizada' and not mm.solo order by mm.finished_at desc limit 10) z), '[]'::jsonb),
    'assuntos', coalesce((select jsonb_agg(jsonb_build_object('assunto', t, 'acertos', ac, 'total', tot, 'taxa', round(100.0 * ac / tot)) order by (1.0 * ac / tot), tot desc)
        from (select q.snapshot->>'topic' t, count(*) filter (where a.correct) ac, count(*) tot
              from public.tatico_answers a join public.tatico_match_questions q on q.match_id = a.match_id and q.pos = a.pos
              join public.tatico_matches m2 on m2.id = a.match_id and m2.status = 'finalizada' and not m2.solo
              where a.user_id = p_user group by 1 order by 1.0 * count(*) filter (where a.correct) / count(*), count(*) desc limit 8) w), '[]'::jsonb)
  ) into r
  from public.tatico_matches m where p_user in (m.p1, m.p2) and m.status = 'finalizada' and not m.solo;
  return r;
end $$;

create or replace function public.tatico_responder(p_user uuid, p_match uuid, p_choice text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.tatico_matches%rowtype; qs public.tatico_match_questions%rowtype; ok boolean;
begin
  if p_choice not in ('A','B','C','D') then return jsonb_build_object('ok', false, 'erro', 'alternativa_invalida'); end if;
  select * into m from public.tatico_matches where id = p_match;
  if not found or (p_user is distinct from m.p1 and p_user is distinct from m.p2) then return jsonb_build_object('ok', false, 'erro', 'sem_acesso'); end if;
  perform public.tatico_avancar(p_match);
  select * into m from public.tatico_matches where id = p_match for update;
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

create or replace function public.tatico_entrar_solo(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare ativa uuid; mid uuid; n int;
begin
  if not exists (select 1 from public.admin_roles where user_id = p_user and role = 'admin') then
    return jsonb_build_object('estado', 'negado');
  end if;
  select id into ativa from public.tatico_matches where (p1 = p_user or p2 = p_user) and status not in ('finalizada','cancelada') order by created_at desc limit 1;
  if ativa is not null then return jsonb_build_object('estado', 'partida', 'match', ativa); end if;
  select count(*) into n from public.tatico_pool();
  if n < 10 then return jsonb_build_object('estado', 'sem_questoes'); end if;
  delete from public.tatico_queue where user_id = p_user;
  insert into public.tatico_matches (p1, p2, solo, status, phase, phase_until)
    values (p_user, null, true, 'aguardando_inicio', 'contagem', now() + interval '6 seconds') returning id into mid;
  insert into public.tatico_match_questions (match_id, pos, source, question_id, snapshot)
    select mid, (row_number() over (order by random()))::int, s.source, s.qid, s.snap from (select * from public.tatico_pool() order by random() limit 10) s;
  return jsonb_build_object('estado', 'partida', 'match', mid);
end $$;
revoke all on function public.tatico_entrar_solo(uuid) from public, anon, authenticated;
grant execute on function public.tatico_entrar_solo(uuid) to service_role;
