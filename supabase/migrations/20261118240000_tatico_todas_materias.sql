-- Desafio Tático: usa TODAS as matérias/questões cadastradas (4 ou 5 alternativas; as de 5 perdem 1 errada ao acaso), alternativas embaralhadas
create or replace function public.tatico_refs(p_opts jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce((select string_agg(o->>'text', ' | ') from jsonb_array_elements(p_opts) o)
    ~* '(anteriores|nenhuma das (alternativas|opções)|todas as (alternativas|opções)|nenhuma alternativa|(altern\w*|item|itens|letra|letras|assertiv\w*) +[A-D]\y|\y[A-D] e [A-D]\y|\y[A-D] ou [A-D]\y)', false);
$$;

-- lista leve de questões elegíveis (sem montar JSON): serve para sortear, contar e listar matérias
create or replace function public.tatico_cands()
returns table (source text, qid uuid, subject text, stmt_md5 text)
language sql stable security definer set search_path = '' as $$
  select 'catalogo'::text, c.id, public.tatico_materia(t.discipline_mode), md5(c.statement)
  from public.catalog_questions c
  join public.catalog_topics t on t.id = c.topic_id
  where c.active and c.type in ('multipla_escolha','situacional')
    and jsonb_typeof(c.options) = 'array' and jsonb_array_length(c.options) in (4, 5)
    and (select count(*) from jsonb_array_elements(c.options) o where (o->>'correct')::boolean) = 1
    and (jsonb_array_length(c.options) = 4 or not public.tatico_refs(c.options))
    and coalesce(public.tatico_materia(t.discipline_mode), '') <> ''
  union all
  select 'banco'::text, q.id, coalesce(s.name, ''), md5(coalesce(q.case_context || E'\n\n', '') || q.statement)
  from public.bank_questions q
  join public.subjects s on s.id = q.subject_id
  where q.status = 'publicada' and q.question_type = 'multipla_escolha'
    and (select count(*) from public.bank_question_options o where o.question_id = q.id) = 4
    and (select count(*) from public.bank_question_options o where o.question_id = q.id and o.is_correct) = 1;
$$;

-- monta o snapshot de UMA questão: reduz 5 -> 4 alternativas (tira uma errada ao acaso) e embaralha A..D com o gabarito acompanhando
create or replace function public.tatico_snap(p_source text, p_qid uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare st text; tp text; sb text; lv jsonb; just text; opts jsonb; drop_i int; refs boolean; arr jsonb; novo text;
begin
  if p_source = 'catalogo' then
    select c.statement, t.title, public.tatico_materia(t.discipline_mode), to_jsonb(c.level), c.justification, c.options
      into st, tp, sb, lv, just, opts
      from public.catalog_questions c join public.catalog_topics t on t.id = c.topic_id where c.id = p_qid;
  else
    select coalesce(q.case_context || E'\n\n', '') || q.statement, coalesce(stp.name, ''), coalesce(s.name, ''),
           to_jsonb(coalesce(q.calibrated_difficulty, q.initial_difficulty)), q.justification,
           (select jsonb_agg(jsonb_build_object('label', o.label, 'text', o.text, 'explanation', o.explanation, 'correct', o.is_correct) order by o.label)
              from public.bank_question_options o where o.question_id = q.id)
      into st, tp, sb, lv, just, opts
      from public.bank_questions q join public.subjects s on s.id = q.subject_id left join public.subject_topics stp on stp.id = q.topic_id where q.id = p_qid;
  end if;
  refs := public.tatico_refs(opts);
  if jsonb_array_length(opts) = 5 then
    select t.ord - 1 into drop_i from jsonb_array_elements(opts) with ordinality t(o, ord) where not coalesce((t.o->>'correct')::boolean, false) order by random() limit 1;
    select jsonb_agg(t.o order by t.ord) into opts from jsonb_array_elements(opts) with ordinality t(o, ord) where t.ord - 1 <> drop_i;
  end if;
  select jsonb_agg(jsonb_build_object('label', chr(64 + x.rn::int), 'text', x.t, 'explanation', x.e) order by x.rn),
         max(case when x.ok then chr(64 + x.rn::int) end)
    into arr, novo
    from (select row_number() over (order by case when refs then o->>'label' end, random()) rn, o->>'text' t, o->>'explanation' e, coalesce((o->>'correct')::boolean, false) ok
            from jsonb_array_elements(opts) o) x;
  return jsonb_build_object('statement', st, 'topic', tp, 'subject', sb, 'level', lv, 'options', arr, 'correct', novo, 'justification', just);
end $$;

-- compatibilidade (contagens): leve, sem snapshot
create or replace function public.tatico_pool()
returns table (source text, qid uuid, snap jsonb)
language sql stable security definer set search_path = '' as $$
  select c.source, c.qid, jsonb_build_object('subject', c.subject) from public.tatico_cands() c;
$$;

create or replace function public.tatico_sortear(p_p1 uuid, p_p2 uuid, p_n int, p_materia text default null)
returns table (source text, qid uuid, snap jsonb)
language sql volatile security definer set search_path = '' as $$
  select y.source, y.qid, public.tatico_snap(y.source, y.qid) from (
    select z.source, z.qid, z.vistas, z.r from (
      select distinct on (c.stmt_md5) c.source, c.qid, coalesce(v.n, 0) as vistas, random() as r
      from public.tatico_cands() c
      left join (select mq.question_id, count(*) n from public.tatico_match_questions mq join public.tatico_matches mm on mm.id = mq.match_id
                  where mm.p1 in (p_p1, p_p2) or mm.p2 in (p_p1, p_p2) group by 1) v on v.question_id = c.qid
      where p_materia is null or c.subject = p_materia
      order by c.stmt_md5, random()
    ) z order by z.vistas, z.r limit p_n
  ) y;
$$;

create or replace function public.tatico_materias()
returns table (materia text, n bigint)
language sql stable security definer set search_path = '' as $$
  select c.subject, count(distinct c.stmt_md5) from public.tatico_cands() c
  where c.subject <> '' group by 1 having count(distinct c.stmt_md5) >= 11
  order by 2 desc, 1;
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
        -- desempate: nunca repete questão (nem enunciado igual) já usada na partida; prefere a matéria escolhida e, se ela acabar, outra matéria
        -- desempate: nunca repete questão (nem enunciado igual) já usada na partida; prefere a matéria escolhida e, se ela acabar, outra matéria
        select c.source, c.qid into q from public.tatico_cands() c
          where not exists (select 1 from public.tatico_match_questions x where x.match_id = p_match and (x.question_id = c.qid or md5(x.snapshot->>'statement') = c.stmt_md5))
          order by (c.subject is not distinct from m.materia) desc, random() limit 1;
        if q is null then
          select c.source, c.qid into q from public.tatico_cands() c order by random() limit 1;
        end if;
        insert into public.tatico_match_questions (match_id, pos, source, question_id, is_tiebreak, snapshot)
          values (p_match, m.idx + 1, q.source, q.qid, true, public.tatico_snap(q.source, q.qid));
        update public.tatico_matches set idx = m.idx + 1, phase = 'responder', phase_until = now() + make_interval(secs => m.q_seconds),
               status = 'desempate' where id = p_match returning * into m;
      end if;
    else
      exit;
    end if;
  end loop;
end $$;

drop function if exists public.tatico_pool_raw();
drop function if exists public.tatico_embaralhar(jsonb);

do $$ declare f text; begin
  foreach f in array array['tatico_refs(jsonb)','tatico_cands()','tatico_snap(text,uuid)','tatico_pool()','tatico_sortear(uuid,uuid,int,text)','tatico_materias()','tatico_avancar(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
