-- Desafio Tático: o cache de candidatas (tatico_cand_cache) só é atualizado à mão e pode apontar para uma questão que já
-- foi apagada/desativada. A questão sorteada virava um snapshot vazio (options = null) e tatico_estado quebrava
-- ("cannot extract elements from a scalar"), travando a partida e a página para os dois jogadores.
-- 1) tatico_snap devolve null se a questão não existe; 2) tatico_sortear só sorteia questões que ainda existem e estão ativas.

create or replace function public.tatico_snap(p_source text, p_qid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
  if not found or opts is null then return null; end if;
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

create or replace function public.tatico_sortear(p_p1 uuid, p_p2 uuid, p_n integer, p_materia text default null)
returns table (source text, qid uuid, snap jsonb)
language sql security definer set search_path = '' as $$
  select y.source, y.qid, public.tatico_snap(y.source, y.qid) from (
    select z.source, z.qid, z.vistas, z.r from (
      select distinct on (c.stmt_md5) c.source, c.qid, coalesce(v.n, 0) as vistas, random() as r
      from public.tatico_cands() c
      left join (select mq.question_id, count(*) n from public.tatico_match_questions mq join public.tatico_matches mm on mm.id = mq.match_id
                  where mm.p1 in (p_p1, p_p2) or mm.p2 in (p_p1, p_p2) group by 1) v on v.question_id = c.qid
      where (p_materia is null or c.subject = p_materia)
        and ((c.source = 'catalogo' and exists (select 1 from public.catalog_questions cq join public.catalog_topics ct on ct.id = cq.topic_id where cq.id = c.qid and cq.active))
          or (c.source = 'banco' and exists (select 1 from public.bank_questions bq where bq.id = c.qid and bq.status = 'publicada')))
      order by c.stmt_md5, random()
    ) z order by z.vistas, z.r limit p_n
  ) y;
$$;
