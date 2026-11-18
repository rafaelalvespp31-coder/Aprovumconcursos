-- Desafio Tático: um aluno responde por vez (alternado), quem assiste vê a escolha em tempo real; lista de desafio só com alunos online; matéria legível
create or replace function public.tatico_materia(p text)
returns text language sql immutable set search_path = '' as $$
  select case p
    when 'direito_penal' then 'Direito Penal' when 'direito_processual_penal' then 'Direito Processual Penal'
    when 'direito_constitucional' then 'Direito Constitucional' when 'direito_administrativo' then 'Direito Administrativo'
    when 'legislacao_especial' then 'Legislação Especial' when 'ctb_codigo_de_transito_brasileiro' then 'Código de Trânsito Brasileiro'
    when 'lingua_portuguesa' then 'Língua Portuguesa' when 'raciocinio_logico' then 'Raciocínio Lógico'
    when 'matematica' then 'Matemática' when 'informatica' then 'Informática'
    else coalesce(initcap(replace(p, '_', ' ')), '') end;
$$;

-- só quem está online agora na plataforma (presença vista nos últimos 90 s)
create or replace function public.tatico_buscar(p_user uuid, p_q text default '')
returns table (id uuid, name text, online boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, public.tatico_nome(p.id), true as online
  from public.profiles p
  where p.id <> p_user and nullif(btrim(p.display_name), '') is not null
    and exists (select 1 from public.tatico_presence pr where pr.user_id = p.id and pr.seen_at > now() - interval '90 seconds')
    and (length(btrim(coalesce(p_q, ''))) < 2 or p.display_name ilike '%' || btrim(p_q) || '%')
  order by 2 asc
  limit 40;
$$;

create or replace function public.tatico_pool()
returns table (source text, qid uuid, snap jsonb)
language sql stable security definer set search_path = '' as $$
  select 'catalogo'::text, c.id,
         jsonb_build_object(
           'statement', c.statement,
           'topic', t.title,
           'subject', public.tatico_materia(t.discipline_mode),
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

create or replace function public.tatico_avancar(p_match uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.tatico_matches%rowtype; n1 int; n2 int; c1 boolean; c2 boolean;
        ausente1 boolean; ausente2 boolean; q record; loops int := 0; resp uuid; nr int; cr boolean; ausr boolean;
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
      -- um aluno por vez: questões ímpares são do desafiante (p1), pares do desafiado (p2); no treino é sempre o admin
      resp := case when m.solo or m.idx % 2 = 1 then m.p1 else m.p2 end;
      select count(*) into nr from public.tatico_answers where match_id = p_match and pos = m.idx and user_id = resp;
      ausr := case when resp = m.p1 then ausente1 else ausente2 end;
      exit when not (nr > 0 or now() >= m.phase_until or ausr);
      if nr = 0 then insert into public.tatico_answers (match_id, pos, user_id, choice, correct) values (p_match, m.idx, resp, null, false); end if;
      select correct into cr from public.tatico_answers where match_id = p_match and pos = m.idx and user_id = resp;
      update public.tatico_matches set
        p1_hits = p1_hits + (case when resp = m.p1 and cr then 1 else 0 end), p1_miss = p1_miss + (case when resp = m.p1 and not cr then 1 else 0 end),
        p2_hits = p2_hits + (case when resp = m.p2 and cr then 1 else 0 end), p2_miss = p2_miss + (case when resp = m.p2 and not cr then 1 else 0 end),
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
        if m.idx = 10 then
          if m.p1_hits <> m.p2_hits then
            perform public.tatico_finalizar(p_match, case when m.p1_hits > m.p2_hits then m.p1 else m.p2 end, 'acertos'); return;
          end if;
        elsif m.idx % 2 = 0 then
          -- morte súbita em pares: p1 atira na questão ímpar, p2 na par; só decide quando os dois já atiraram
          select coalesce(bool_or(correct) filter (where user_id = m.p1 and pos = m.idx - 1), false), coalesce(bool_or(correct) filter (where user_id = m.p2 and pos = m.idx), false)
            into c1, c2 from public.tatico_answers where match_id = p_match and pos in (m.idx - 1, m.idx);
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
    elsif m.phase = 'responder' then
      -- quem assiste vê em tempo real a alternativa escolhida por quem está atirando (o gabarito segue oculto)
      q := q || jsonb_build_object('oppChoice', (select choice from public.tatico_answers where match_id = mid and pos = m.idx and user_id = opp));
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
    'meuTurno', (m.solo or p_user = case when m.idx % 2 = 1 then m.p1 else m.p2 end),
    'xp', (select delta from public.tatico_ledger where match_id = mid and user_id = p_user),
    'usados', usados, 'limite', 3);
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
  if p_user is distinct from (case when m.solo or m.idx % 2 = 1 then m.p1 else m.p2 end) then
    return jsonb_build_object('ok', false, 'erro', 'nao_e_sua_vez');   -- um aluno por vez
  end if;
  if exists (select 1 from public.tatico_answers where match_id = p_match and pos = m.idx and user_id = p_user) then
    return jsonb_build_object('ok', false, 'erro', 'ja_respondeu');
  end if;
  select * into qs from public.tatico_match_questions where match_id = p_match and pos = m.idx;
  ok := (qs.snapshot->>'correct') = p_choice;
  insert into public.tatico_answers (match_id, pos, user_id, choice, correct) values (p_match, m.idx, p_user, p_choice, ok);
  perform public.tatico_avancar(p_match);   -- quem tinha a vez já atirou: revela na hora
  return jsonb_build_object('ok', true, 'acertou', ok, 'pos', m.idx);
end $$;

revoke all on function public.tatico_materia(text) from public, anon, authenticated;
grant execute on function public.tatico_materia(text) to service_role;
revoke all on function public.tatico_buscar(uuid, text), public.tatico_pool(), public.tatico_avancar(uuid), public.tatico_estado(uuid, uuid), public.tatico_responder(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.tatico_buscar(uuid, text), public.tatico_pool(), public.tatico_avancar(uuid), public.tatico_estado(uuid, uuid), public.tatico_responder(uuid, uuid, text) to service_role;
