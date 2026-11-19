-- Desafio Tático: quem assiste vê o rival MIRANDO (antes do tiro) e atirando.
alter table public.tatico_matches
  add column if not exists aim_user uuid,
  add column if not exists aim_pos int,
  add column if not exists aim_letter text,
  add column if not exists aim_at timestamptz;

create or replace function public.tatico_mirar(p_user uuid, p_match uuid, p_letter text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_letter not in ('A','B','C','D') then return; end if;
  update public.tatico_matches
     set aim_user = p_user, aim_pos = idx, aim_letter = p_letter, aim_at = now()
   where id = p_match and (p1 = p_user or p2 = p_user) and phase = 'responder' and status not in ('finalizada','cancelada');
end $$;
revoke all on function public.tatico_mirar(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.tatico_mirar(uuid, uuid, text) to service_role;

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
      q := q || jsonb_build_object('oppChoice', (select choice from public.tatico_answers where match_id = mid and pos = m.idx and user_id = opp),
            'oppAim', case when m.aim_user = opp and m.aim_pos = m.idx and m.aim_at > now() - interval '4 seconds' then m.aim_letter else null end);
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
