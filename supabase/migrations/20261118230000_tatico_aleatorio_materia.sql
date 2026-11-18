-- Desafio Tático: alternativas embaralhadas, sem questões repetidas, matéria escolhida pelo desafiante
alter table public.tatico_matches add column if not exists materia text;
alter table public.tatico_challenges add column if not exists materia text;

-- embaralha as alternativas (A..D são reatribuídas) e acompanha o gabarito; não mexe em questões que citam outras alternativas
create or replace function public.tatico_embaralhar(snap jsonb)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare arr jsonb; novo text; txt text;
begin
  select string_agg(o->>'text', ' | ') into txt from jsonb_array_elements(snap->'options') o;
  if txt ~* '(anteriores|nenhuma das (alternativas|opções)|todas as (alternativas|opções)|nenhuma alternativa|(altern\w*|item|itens|letra|letras|assertiv\w*) +[A-D]\y|\y[A-D] e [A-D]\y|\y[A-D] ou [A-D]\y)' then return snap; end if;
  select jsonb_agg(jsonb_build_object('label', chr(64 + x.rn::int), 'text', x.t, 'explanation', x.e) order by x.rn),
         max(case when x.old = snap->>'correct' then chr(64 + x.rn::int) end)
    into arr, novo
    from (select row_number() over (order by random()) rn, o->>'label' old, o->>'text' t, o->>'explanation' e from jsonb_array_elements(snap->'options') o) x;
  return jsonb_set(jsonb_set(snap, '{options}', arr), '{correct}', to_jsonb(novo));
end $$;

create or replace function public.tatico_pool_raw()
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

-- pool com alternativas embaralhadas a cada leitura (cada partida grava o próprio snapshot já embaralhado)
create or replace function public.tatico_pool()
returns table (source text, qid uuid, snap jsonb)
language sql volatile security definer set search_path = '' as $$
  select r.source, r.qid, public.tatico_embaralhar(r.snap) from public.tatico_pool_raw() r;
$$;

-- sorteio: enunciados distintos, preferindo o que nenhum dos dois alunos viu em partidas anteriores; opcionalmente de uma matéria
create or replace function public.tatico_sortear(p_p1 uuid, p_p2 uuid, p_n int, p_materia text default null)
returns table (source text, qid uuid, snap jsonb)
language sql volatile security definer set search_path = '' as $$
  select d.source, d.qid, d.snap from (
    select distinct on (md5(p.snap->>'statement')) p.source, p.qid, p.snap,
           (select count(*) from public.tatico_match_questions mq join public.tatico_matches mm on mm.id = mq.match_id
             where mq.question_id = p.qid and (mm.p1 in (p_p1, p_p2) or mm.p2 in (p_p1, p_p2))) as vistas, random() as r
    from public.tatico_pool() p
    where p_materia is null or p.snap->>'subject' = p_materia
    order by md5(p.snap->>'statement'), random()
  ) d order by d.vistas, d.r limit p_n;
$$;

-- matérias disponíveis para desafiar (com questões suficientes para uma partida)
create or replace function public.tatico_materias()
returns table (materia text, n bigint)
language sql volatile security definer set search_path = '' as $$
  select p.snap->>'subject', count(distinct md5(p.snap->>'statement')) from public.tatico_pool() p
  where coalesce(p.snap->>'subject', '') <> ''
  group by 1 having count(distinct md5(p.snap->>'statement')) >= 11
  order by 2 desc, 1;
$$;

drop function if exists public.tatico_criar_partida(uuid, uuid);
create or replace function public.tatico_criar_partida(p_p1 uuid, p_p2 uuid, p_materia text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare mid uuid; dia date := public.tatico_dia();
begin
  delete from public.tatico_queue where user_id in (p_p1, p_p2);
  insert into public.tatico_matches (p1, p2, status, phase, phase_until, day, materia)
    values (p_p1, p_p2, 'aguardando_inicio', 'contagem', now() + interval '9 seconds', dia, p_materia) returning id into mid;
  insert into public.tatico_match_questions (match_id, pos, source, question_id, snapshot)
    select mid, (row_number() over (order by random()))::int, s.source, s.qid, s.snap
    from public.tatico_sortear(p_p1, p_p2, 10, p_materia) s;
  insert into public.tatico_daily (user_id, day, used) values (p_p1, dia, 1), (p_p2, dia, 1)
    on conflict (user_id, day) do update set used = least(3, public.tatico_daily.used + 1);
  return mid;
end $$;

drop function if exists public.tatico_desafiar(uuid, uuid);
create or replace function public.tatico_desafiar(p_user uuid, p_target uuid, p_materia text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare dia date := public.tatico_dia(); u1 int; u2 int; id uuid; n int; mat text := nullif(btrim(coalesce(p_materia, '')), '');
begin
  perform pg_advisory_xact_lock(hashtext('tatico_fila'));
  update public.tatico_challenges set status = 'expirado' where status = 'pendente' and expires_at < now();
  if p_target is null or p_target = p_user or not exists (select 1 from public.profiles where profiles.id = p_target) then
    return jsonb_build_object('ok', false, 'erro', 'aluno_invalido'); end if;
  if mat is not null and not exists (select 1 from public.tatico_materias() m where m.materia = mat) then
    return jsonb_build_object('ok', false, 'erro', 'materia_invalida'); end if;
  select coalesce(used, 0) into u1 from public.tatico_daily where user_id = p_user and day = dia;
  select coalesce(used, 0) into u2 from public.tatico_daily where user_id = p_target and day = dia;
  if coalesce(u1, 0) >= 3 then return jsonb_build_object('ok', false, 'erro', 'seu_limite'); end if;
  if coalesce(u2, 0) >= 3 then return jsonb_build_object('ok', false, 'erro', 'limite_dele'); end if;
  if exists (select 1 from public.tatico_matches where status not in ('finalizada','cancelada') and p_user in (p1, p2)) then
    return jsonb_build_object('ok', false, 'erro', 'voce_em_partida'); end if;
  if exists (select 1 from public.tatico_matches where status not in ('finalizada','cancelada') and p_target in (p1, p2)) then
    return jsonb_build_object('ok', false, 'erro', 'ele_em_partida'); end if;
  if exists (select 1 from public.tatico_challenges where from_user = p_user and status = 'pendente') then
    return jsonb_build_object('ok', false, 'erro', 'ja_pendente'); end if;
  select count(*) into n from public.tatico_challenges where from_user = p_user and created_at > now() - interval '1 hour';
  if n >= 10 then return jsonb_build_object('ok', false, 'erro', 'muitos_desafios'); end if;
  if (select count(*) from public.tatico_sortear(p_user, p_target, 10, mat)) < 10 then return jsonb_build_object('ok', false, 'erro', 'sem_questoes'); end if;
  insert into public.tatico_challenges (from_user, to_user, materia) values (p_user, p_target, mat) returning tatico_challenges.id into id;
  return jsonb_build_object('ok', true, 'id', id, 'para', public.tatico_nome(p_target), 'materia', mat);
end $$;

create or replace function public.tatico_desafios(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare ent record; sai record; ativa boolean; r_ent jsonb := null; r_sai jsonb := null;
begin
  insert into public.tatico_presence (user_id, seen_at) values (p_user, now())
    on conflict (user_id) do update set seen_at = now();
  update public.tatico_challenges set status = 'expirado', responded_at = now() where status = 'pendente' and expires_at < now() and (from_user = p_user or to_user = p_user);
  ativa := exists (select 1 from public.tatico_matches where status not in ('finalizada','cancelada') and p_user in (p1, p2));
  if not ativa then
    select c.id, c.from_user, c.expires_at, c.materia into ent from public.tatico_challenges c
      where c.to_user = p_user and c.status = 'pendente' order by c.created_at desc limit 1;
    if found then r_ent := jsonb_build_object('id', ent.id, 'de', public.tatico_nome(ent.from_user), 'materia', ent.materia,
      'ms', greatest(0, (extract(epoch from (ent.expires_at - now())) * 1000)::int)); end if;
  end if;
  select c.id, c.to_user, c.status, c.reason, c.match_id, c.expires_at, c.seen_by_sender, c.materia into sai from public.tatico_challenges c
    where c.from_user = p_user and c.created_at > now() - interval '10 minutes'
      and (c.status = 'pendente' or not c.seen_by_sender) order by c.created_at desc limit 1;
  if found then
    r_sai := jsonb_build_object('id', sai.id, 'para', public.tatico_nome(sai.to_user), 'materia', sai.materia, 'status', sai.status, 'reason', sai.reason, 'match', sai.match_id,
      'ms', greatest(0, (extract(epoch from (sai.expires_at - now())) * 1000)::int));
    if sai.status <> 'pendente' then update public.tatico_challenges set seen_by_sender = true where id = sai.id; end if;
  end if;
  return jsonb_build_object('entrada', r_ent, 'saida', r_sai);
end $$;

create or replace function public.tatico_responder_desafio(p_user uuid, p_id uuid, p_aceitar boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.tatico_challenges%rowtype; dia date := public.tatico_dia(); u1 int; u2 int; mid uuid;
begin
  perform pg_advisory_xact_lock(hashtext('tatico_fila'));
  select * into c from public.tatico_challenges where id = p_id for update;
  if not found or c.to_user <> p_user then return jsonb_build_object('ok', false, 'erro', 'sem_acesso'); end if;
  if c.status <> 'pendente' or c.expires_at < now() then
    if c.status = 'pendente' then update public.tatico_challenges set status = 'expirado', responded_at = now() where id = p_id; end if;
    return jsonb_build_object('ok', false, 'erro', 'expirado');
  end if;
  if not p_aceitar then
    update public.tatico_challenges set status = 'recusado', reason = 'recusou', responded_at = now() where id = p_id;
    return jsonb_build_object('ok', true, 'estado', 'recusado');
  end if;
  select coalesce(used, 0) into u1 from public.tatico_daily where user_id = c.from_user and day = dia;
  select coalesce(used, 0) into u2 from public.tatico_daily where user_id = c.to_user and day = dia;
  if coalesce(u1, 0) >= 3 or coalesce(u2, 0) >= 3
     or exists (select 1 from public.tatico_matches where status not in ('finalizada','cancelada') and (c.from_user in (p1, p2) or c.to_user in (p1, p2))) then
    update public.tatico_challenges set status = 'recusado', reason = 'indisponivel', responded_at = now() where id = p_id;
    return jsonb_build_object('ok', false, 'erro', 'indisponivel');
  end if;
  mid := public.tatico_criar_partida(c.from_user, c.to_user, c.materia);
  update public.tatico_challenges set status = 'aceito', match_id = mid, responded_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'estado', 'aceito', 'match', mid);
end $$;

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
        -- desempate: nunca repete questão (nem enunciado igual) já usada na partida; prefere a matéria escolhida e, se ela acabar, outra matéria
        select p.source, p.qid, p.snap into q from public.tatico_pool() p
          where not exists (select 1 from public.tatico_match_questions x where x.match_id = p_match and (x.question_id = p.qid or x.snapshot->>'statement' = p.snap->>'statement'))
          order by (p.snap->>'subject' is not distinct from m.materia) desc, random() limit 1;
        if q is null then
          select p.source, p.qid, p.snap into q from public.tatico_pool() p
            where not exists (select 1 from public.tatico_match_questions x where x.match_id = p_match and not x.is_tiebreak and x.question_id = p.qid)
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
    from public.tatico_sortear(par, p_user, 10, null) s;
  -- a tentativa é contada AGORA (início da partida); recarregar/abandonar não devolve
  insert into public.tatico_daily (user_id, day, used) values (par, dia, 1), (p_user, dia, 1)
    on conflict (user_id, day) do update set used = least(3, public.tatico_daily.used + 1);
  return jsonb_build_object('estado', 'partida', 'match', mid);
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
  select count(*) into n from public.tatico_sortear(p_user, null, 10, null);
  if n < 10 then return jsonb_build_object('estado', 'sem_questoes'); end if;
  delete from public.tatico_queue where user_id = p_user;
  insert into public.tatico_matches (p1, p2, solo, status, phase, phase_until)
    values (p_user, null, true, 'aguardando_inicio', 'contagem', now() + interval '6 seconds') returning id into mid;
  insert into public.tatico_match_questions (match_id, pos, source, question_id, snapshot)
    select mid, (row_number() over (order by random()))::int, s.source, s.qid, s.snap from public.tatico_sortear(p_user, null, 10, null) s;
  return jsonb_build_object('estado', 'partida', 'match', mid);
end $$;

do $$ declare f text; begin
  foreach f in array array['tatico_embaralhar(jsonb)','tatico_pool_raw()','tatico_pool()','tatico_sortear(uuid,uuid,int,text)','tatico_materias()','tatico_criar_partida(uuid,uuid,text)','tatico_desafiar(uuid,uuid,text)','tatico_desafios(uuid)','tatico_responder_desafio(uuid,uuid,boolean)','tatico_avancar(uuid)','tatico_entrar(uuid)','tatico_entrar_solo(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
