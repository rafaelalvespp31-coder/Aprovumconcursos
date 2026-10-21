-- Importação idempotente: 3 questões de concursos (Direito Penal — crimes contra a vida).
-- Pode ser executada mais de uma vez: concursos, provas, assuntos e questões já existentes são reaproveitados
-- (questão identificada pelo hash do enunciado, gerado pelo próprio banco).
-- Entram como "aguardando_conferencia", sem comentário: o gabarito foi INFORMADO e precisa ser conferido
-- e validado pelo administrador em /banco antes de publicar (só questões publicadas chegam aos alunos).
-- Não há URL nem endereço de onde as questões foram obtidas; a "prova" registrada é a prova oficial de origem
-- (exigência do banco para questões de prova anterior), sem link.

do $$
declare
  actor uuid := (select r.user_id from public.admin_roles r where r.role = 'admin' order by r.user_id limit 1);
  penal uuid := (select id from public.subjects where slug = 'direito-penal');
  t_hom uuid;
  t_dim uuid;
  t_aum uuid;
  t_vida uuid;
  ex record;
  src uuid;
  exam uuid;
  q jsonb;
  n_new int := 0;
  n_skip int := 0;
begin
  if actor is null or penal is null then
    raise exception 'Administrador ou matéria Direito Penal não encontrados.';
  end if;

  -- Assuntos (reaproveita "Homicídio"; cria os subassuntos que faltarem)
  select id into t_hom from public.subject_topics where subject_id = penal and parent_id is null and slug = 'homicidio';
  if t_hom is null then
    select id into t_hom from public.subject_topics where subject_id = penal and parent_id is null and lower(name) = 'homicídio';
  end if;
  if t_hom is null then
    insert into public.subject_topics (subject_id, slug, name) values (penal, 'homicidio', 'Homicídio') returning id into t_hom;
  end if;
  insert into public.subject_topics (subject_id, parent_id, slug, name) values (penal, t_hom, 'causas-de-diminuicao-e-qualificadoras', 'Causas de diminuição e qualificadoras')
    on conflict (subject_id, parent_id, slug) do nothing;
  insert into public.subject_topics (subject_id, parent_id, slug, name) values (penal, t_hom, 'causas-de-aumento-de-pena', 'Causas de aumento de pena')
    on conflict (subject_id, parent_id, slug) do nothing;
  insert into public.subject_topics (subject_id, parent_id, slug, name) values (penal, null, 'crimes-contra-a-vida', 'Crimes contra a vida')
    on conflict (subject_id, parent_id, slug) do nothing;
  select id into t_dim from public.subject_topics where subject_id = penal and parent_id = t_hom and slug = 'causas-de-diminuicao-e-qualificadoras';
  select id into t_aum from public.subject_topics where subject_id = penal and parent_id = t_hom and slug = 'causas-de-aumento-de-pena';
  select id into t_vida from public.subject_topics where subject_id = penal and parent_id is null and slug = 'crimes-contra-a-vida';

  for q in select * from jsonb_array_elements($json$[
    {
      "board": "fundatec", "year": 2026,
      "exam": {"name": "Curso Técnico de Segurança Pública", "organ": "BM RS", "role": "Curso Técnico de Segurança Pública"},
      "prova": "Prova FUNDATEC 2026 — Curso Técnico de Segurança Pública (BM RS)",
      "topic": "dim",
      "statement": "Sobre o delito de homicídio, analise as assertivas abaixo:\n\nI. Se o agente comete o homicídio impelido por motivo de relevante valor social ou moral, ou sob o domínio de violenta emoção, logo em seguida de injusta provocação da vítima, o juiz pode reduzir a pena de um sexto a um terço.\n\nII. A motivação fútil qualifica o crime de homicídio.\n\nIII. Matar mulher por razões da condição do sexo feminino qualifica o delito de homicídio, impondo uma pena máxima de até 30 anos de reclusão.\n\nQuais estão corretas?",
      "options": [
        {"label": "A", "text": "Apenas II."},
        {"label": "B", "text": "Apenas I e II."},
        {"label": "C", "text": "Apenas I e III."},
        {"label": "D", "text": "Apenas II e III."}
      ],
      "answer": "B"
    },
    {
      "board": "crs_pmmg", "year": 2026,
      "exam": {"name": "Oficial (PM MG) — Cadete — CFO 2026", "organ": "PM MG", "role": "Cadete (CFO)"},
      "prova": "Prova CRS (PM MG) 2026 — Oficial — Cadete — CFO 2026",
      "topic": "vida",
      "statement": "De acordo com o Decreto-Lei nº 2.848/40 — Código Penal, marque a alternativa CORRETA.",
      "options": [
        {"label": "A", "text": "O Código Penal considera feminicídio a conduta do agente que mata mulher, por razões de menosprezo ou discriminação à condição de mulher, prevendo majorante, na hipótese de o crime ser praticado na presença física ou virtual de descendente ou de ascendente da vítima."},
        {"label": "B", "text": "Embora o Código Penal criminalize a conduta da gestante que provoca aborto em si própria, via de regra, é atípica a conduta da agente, maior de idade, que meramente consente que outrem lhe provoque."},
        {"label": "C", "text": "Mévio, maior de idade, instigou Prízio, adolescente de treze anos, à automutilação. Caso a automutilação resulte na morte de Prízio, Mévio responderá pelo crime de induzimento, instigação ou auxílio a suicídio ou pelo crime de automutilação na modalidade qualificada."},
        {"label": "D", "text": "O Código Penal dispõe que o homicídio cometido contra membro do Poder Judiciário, do Ministério Público, da Defensoria Pública, da Advocacia Pública ou contra oficial de justiça, quando praticado no exercício da função ou em razão dela, bem como contra seu cônjuge, companheiro ou parente consanguíneo até o terceiro grau, em decorrência dessa condição, será qualificado. Tal previsão, entretanto, não se estende ao parentesco por afinidade, sob pena de violação ao princípio da legalidade que orienta o Direito Penal pátrio."}
      ],
      "answer": "A"
    },
    {
      "board": "fgv", "year": 2026,
      "exam": {"name": "Analista Judiciário — Área Fim", "organ": "TJ MS", "role": "Analista Judiciário — Área Fim"},
      "prova": "Prova FGV 2026 — Analista Judiciário (TJ MS) — Área Fim",
      "topic": "aum",
      "statement": "José foi condenado definitivamente pela prática do crime de homicídio simples, com a incidência de uma causa de aumento de pena. Registre-se que os fatos ocorreram em dezembro de 2025.\n\nNesse cenário, considerando as disposições do Código Penal, é correto afirmar que o homicídio foi cometido:",
      "options": [
        {"label": "A", "text": "mediante recurso que tornou impossível a defesa do ofendido."},
        {"label": "B", "text": "com emprego de arma de fogo de uso restrito."},
        {"label": "C", "text": "contra menor de quatorze anos."},
        {"label": "D", "text": "com emprego de veneno."},
        {"label": "E", "text": "por grupo de extermínio."}
      ],
      "answer": "E"
    }
  ]$json$::jsonb) loop
    -- Já cadastrada? (mesmo enunciado normalizado)
    if exists (select 1 from public.bank_questions b
               where b.content_hash = md5(lower(regexp_replace(btrim(q ->> 'statement'), '\s+', ' ', 'g')))) then
      n_skip := n_skip + 1;
      continue;
    end if;

    select id into exam from public.exams
      where name = q -> 'exam' ->> 'name' and board_slug = q ->> 'board' and year = (q ->> 'year')::int limit 1;
    if exam is null then
      insert into public.exams (name, organ, role_name, board_slug, year, created_by)
      values (q -> 'exam' ->> 'name', q -> 'exam' ->> 'organ', q -> 'exam' ->> 'role', q ->> 'board', (q ->> 'year')::int, actor)
      returning id into exam;
    end if;

    select id into src from public.question_sources where name = q ->> 'prova' and kind = 'prova_oficial' limit 1;
    if src is null then
      insert into public.question_sources (name, kind, author_institution, created_by)
      values (q ->> 'prova', 'prova_oficial', upper(q ->> 'board'), actor)
      returning id into src;
    end if;

    perform public.bank_save_question(actor, null, jsonb_build_object(
      'subject_id', penal,
      'topic_id', case q ->> 'topic' when 'dim' then t_dim when 'aum' then t_aum else t_vida end,
      'source_id', src,
      'exam_id', exam,
      'origin', 'prova_anterior',
      'question_type', 'multipla_escolha',
      'statement', q ->> 'statement',
      'board_slug', q ->> 'board',
      'year', (q ->> 'year')::int,
      'initial_difficulty', 'dificil',
      'usage_rights', 'nao_verificado',
      'status', 'aguardando_conferencia',
      'options', (select jsonb_agg(jsonb_build_object('label', o ->> 'label', 'text', o ->> 'text', 'is_correct', (o ->> 'label') = (q ->> 'answer')))
                  from jsonb_array_elements(q -> 'options') o)
    ));
    exam := null; src := null;
    n_new := n_new + 1;
  end loop;
  raise notice 'Questões novas: %, já existentes (ignoradas): %', n_new, n_skip;
end $$;
