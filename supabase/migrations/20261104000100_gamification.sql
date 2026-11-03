-- Gamificação real da Home: XP com histórico (transações idempotentes), níveis, missões diárias,
-- dias de estudo (streak), conquistas, ranking por XP e catálogo de concursos.
--
-- Auditoria (o que já existia e é reutilizado como FONTE dos dados):
--   answer_attempts (questões das aulas: contexto fixacao/revisao/simulado, tempo registrado),
--   bank_attempts (banco de questões), quiz_attempts (Modo Jogo), learning_progress e
--   mastery_records (conclusão real das aulas), review_schedules (revisão espaçada),
--   ranked_matches (simulados), mentor_recommendations (Mentor APROVUM).
-- Não existia: XP persistido, missões, conquistas persistidas, ranking por XP, catálogo de concursos
-- com datas/vagas. A tabela "exams" só guarda órgão/cargo/banca das questões (sem datas): não serve.
--
-- Regras de integridade:
--   * O navegador NÃO grava nada aqui (sem insert/update/delete para authenticated).
--   * Toda concessão acontece em gamification_sync(), executável só pelo servidor (service_role),
--     com o id do aluno vindo da sessão verificada no servidor.
--   * Cada recompensa tem uma chave única (user_id, event_key): repetir ou disparar em paralelo
--     nunca duplica XP. A função também serializa por aluno (advisory lock).
--   * O nível é calculado do XP histórico, numa única função (gamification_level_info).
--
-- Rollback:
--   drop function if exists public.gamification_sync(uuid), public.gamification_performance(uuid),
--     public.gamification_ack_levels(uuid), public.gamification_level_info(bigint, jsonb);
--   drop table if exists public.gamification_rank_snapshots, public.gamification_level_ups,
--     public.student_achievements, public.achievement_definitions, public.gamification_activity_days,
--     public.gamification_xp_transactions, public.gamification_settings, public.contest_catalog;

-- ---------------------------------------------------------------------------
-- Configuração central (valores ajustáveis sem mexer no código)
-- ---------------------------------------------------------------------------
create table if not exists public.gamification_settings (
  id         smallint primary key default 1 check (id = 1),
  config     jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.gamification_settings (id, config) values (1, jsonb_build_object(
  'timezone', 'America/Sao_Paulo',
  -- Primeiro dia em que missões geram XP (o sistema não credita dias anteriores ao lançamento).
  'start_date', '2026-11-03',
  -- Quantos dias para trás a sincronização confere (atividade feita sem abrir a Home).
  'lookback_days', 7,
  'missions', jsonb_build_object(
    'estudar',  jsonb_build_object('xp', 100, 'target', 1,  'label', 'Estudar uma aula completa'),
    'combater', jsonb_build_object('xp', 100, 'target', 20, 'label', 'Resolver 20 questões'),
    'revisar',  jsonb_build_object('xp', 100, 'target', 15, 'label', 'Revisar 15 questões')
  ),
  'bonus_xp', 300,
  -- Custo para sair do nível n: base + step * n  (nível 1→2 = 1.100 XP, 2→3 = 1.200 XP…).
  'level', jsonb_build_object('base', 1000, 'step', 100),
  -- Tempo de estudo: limite por resposta (evita contar tela parada aberta).
  'max_seconds_per_answer', 600,
  'streak_milestones', jsonb_build_array(7, 15, 30, 60)
)) on conflict (id) do nothing;
alter table public.gamification_settings enable row level security;
create policy "gamification_settings: leitura" on public.gamification_settings for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Histórico de XP (fonte de verdade do nível e do ranking)
-- ---------------------------------------------------------------------------
create table if not exists public.gamification_xp_transactions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  amount        integer not null check (amount > 0 and amount <= 10000),
  reason        text not null check (length(reason) between 3 and 200),
  activity_type text not null check (activity_type in ('missao_estudar', 'missao_combater', 'missao_revisar', 'bonus_operacao')),
  source_id     text,
  cycle_day     date,
  event_key     text not null check (length(event_key) between 3 and 120),
  created_at    timestamptz not null default now(),
  unique (user_id, event_key)
);
create index if not exists gamification_xp_user_idx on public.gamification_xp_transactions (user_id, created_at desc);
alter table public.gamification_xp_transactions enable row level security;
create policy "gamification_xp: dono lê" on public.gamification_xp_transactions for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Dias com atividade acadêmica válida (preserva o histórico do streak e do recorde)
-- ---------------------------------------------------------------------------
create table if not exists public.gamification_activity_days (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.gamification_activity_days enable row level security;
create policy "gamification_days: dono lê" on public.gamification_activity_days for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Conquistas
-- ---------------------------------------------------------------------------
create table if not exists public.achievement_definitions (
  id          text primary key check (id ~ '^[a-z0-9_]{3,40}$'),
  name        text not null,
  description text not null,
  icon        text not null,
  criterion   text not null,
  sort_order  integer not null default 0,
  active      boolean not null default true
);
insert into public.achievement_definitions (id, name, description, icon, criterion, sort_order) values
  ('primeiro_combate', 'Primeiro Combate', 'Respondeu a primeira questão.', 'caveira', 'Responder 1 questão válida', 10),
  ('atirador_elite', 'Atirador de Elite', 'Fez 90% ou mais de acertos em um simulado.', 'estrela', '≥ 90% de acertos em um simulado finalizado (mín. 10 questões)', 20),
  ('incansavel', 'Incansável', 'Estudou 30 dias seguidos.', 'louro30', '30 dias consecutivos de estudo', 30),
  ('especialista', 'Especialista', 'Concluiu uma matéria inteira.', 'estrela_prata', 'Todas as aulas de um estudo aprovadas nos 3 níveis', 40),
  ('caveira_elite', 'Caveira de Elite', 'Alcançou o nível 10.', 'caveira_coroa', 'Chegar ao nível 10', 50),
  ('disciplina_7', 'Disciplina 7 dias', 'Estudou 7 dias seguidos.', 'chama', '7 dias consecutivos', 60),
  ('disciplina_15', 'Disciplina 15 dias', 'Estudou 15 dias seguidos.', 'chama', '15 dias consecutivos', 61),
  ('disciplina_30', 'Disciplina 30 dias', 'Estudou 30 dias seguidos.', 'chama', '30 dias consecutivos', 62),
  ('disciplina_60', 'Disciplina 60 dias', 'Estudou 60 dias seguidos.', 'chama', '60 dias consecutivos', 63)
on conflict (id) do nothing;
alter table public.achievement_definitions enable row level security;
create policy "achievement_definitions: leitura" on public.achievement_definitions for select to authenticated using (true);

create table if not exists public.student_achievements (
  user_id        uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievement_definitions (id) on delete restrict,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
alter table public.student_achievements enable row level security;
create policy "student_achievements: dono lê" on public.student_achievements for select to authenticated using (user_id = (select auth.uid()));

-- Subidas de nível (registro + aviso de LEVEL UP ainda não visto).
create table if not exists public.gamification_level_ups (
  user_id    uuid not null references auth.users (id) on delete cascade,
  level      integer not null check (level between 2 and 1000),
  reached_at timestamptz not null default now(),
  seen_at    timestamptz,
  primary key (user_id, level)
);
alter table public.gamification_level_ups enable row level security;
create policy "gamification_level_ups: dono lê" on public.gamification_level_ups for select to authenticated using (user_id = (select auth.uid()));

-- Posição do dia no ranking (para mostrar a evolução da posição).
create table if not exists public.gamification_rank_snapshots (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  position integer not null check (position > 0),
  primary key (user_id, day)
);
alter table public.gamification_rank_snapshots enable row level security;
create policy "gamification_rank_snapshots: dono lê" on public.gamification_rank_snapshots for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Catálogo de concursos (cadastro da equipe; nada inventado)
-- ---------------------------------------------------------------------------
create table if not exists public.contest_catalog (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(name) between 2 and 120),
  institution         text not null check (length(institution) between 2 and 160),
  role_name           text check (role_name is null or length(role_name) <= 160),
  status              text not null default 'previsto' check (status in ('previsto', 'autorizado', 'edital_publicado', 'inscricoes_abertas', 'inscricoes_encerradas', 'prova_realizada', 'encerrado')),
  vacancies           integer check (vacancies is null or vacancies between 0 and 1000000),
  salary              text check (salary is null or length(salary) <= 80),
  exam_date           date,
  exam_date_confirmed boolean not null default false,
  info_confirmed      boolean not null default false,
  source_name         text not null check (length(source_name) between 2 and 160),
  source_url          text check (source_url is null or source_url ~ '^https?://'),
  info_updated_at     date not null default current_date,
  active              boolean not null default true,
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists contest_catalog_active_idx on public.contest_catalog (active, exam_date);
alter table public.contest_catalog enable row level security;
create policy "contest_catalog: leitura dos ativos" on public.contest_catalog for select to authenticated using (active);

-- ---------------------------------------------------------------------------
-- Nível a partir do XP (única fórmula do sistema)
-- ---------------------------------------------------------------------------
create or replace function public.gamification_level_info(p_xp bigint, p_cfg jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  base int := coalesce((p_cfg -> 'level' ->> 'base')::int, 1000);
  step int := coalesce((p_cfg -> 'level' ->> 'step')::int, 100);
  lvl int := 1;
  floor_xp bigint := 0;
  cost bigint;
begin
  loop
    cost := base + step * lvl;
    exit when p_xp < floor_xp + cost or lvl >= 999;
    floor_xp := floor_xp + cost;
    lvl := lvl + 1;
  end loop;
  return jsonb_build_object('level', lvl, 'floor', floor_xp, 'next', floor_xp + base + step * lvl);
end $$;

-- ---------------------------------------------------------------------------
-- Sincronização: confere a atividade real, concede o que for devido e devolve o estado da Home.
-- ---------------------------------------------------------------------------
create or replace function public.gamification_sync(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb;
  tz text;
  today date;
  start_day date;
  d date;
  n_estudar int; n_combater int; n_revisar int;
  t_combater int; t_revisar int;
  done int;
  xp_total bigint;
  info jsonb;
  lvl int;
  cur_streak int := 0;
  best_streak int := 0;
  last_active date;
  my_pos int;
  ranked int;
  prev_pos int;
  missions jsonb;
  result jsonb;
begin
  if p_user is null then raise exception 'usuário obrigatório' using errcode = '22023'; end if;
  -- Uma sincronização por aluno de cada vez: requisições simultâneas esperam a anterior.
  perform pg_advisory_xact_lock(hashtextextended('gamification:' || p_user::text, 0));

  select config into cfg from public.gamification_settings where id = 1;
  tz := coalesce(cfg ->> 'timezone', 'America/Sao_Paulo');
  today := (now() at time zone tz)::date;
  t_combater := (cfg -> 'missions' -> 'combater' ->> 'target')::int;
  t_revisar := (cfg -> 'missions' -> 'revisar' ->> 'target')::int;

  -- 1) Dias com atividade acadêmica válida (login sozinho não conta).
  insert into public.gamification_activity_days (user_id, day)
  select p_user, x.day from (
    select (created_at at time zone tz)::date as day from public.answer_attempts where user_id = p_user
    union select (created_at at time zone tz)::date from public.bank_attempts where user_id = p_user and not omitted
    union select (created_at at time zone tz)::date from public.quiz_attempts where user_id = p_user
    union select (recorded_at at time zone tz)::date from public.mastery_records
      where user_id = p_user and to_state in ('aula_concluida', 'aguardando_dominio', 'dominada', 'em_revisao')
    union select (reading_completed_at at time zone tz)::date from public.learning_progress
      where user_id = p_user and reading_completed_at is not null
  ) x where x.day <= today
  on conflict do nothing;

  -- 2) Missões dos últimos dias (a partir do lançamento). Cada uma rende uma vez por dia.
  start_day := greatest((cfg ->> 'start_date')::date, today - coalesce((cfg ->> 'lookback_days')::int, 7));
  d := start_day;
  while d <= today loop
    -- Estudar: uma aula efetivamente concluída no dia (leitura concluída ou aprovação registrada).
    select count(*) into n_estudar from (
      select lesson_id from public.learning_progress
        where user_id = p_user and ((reading_completed_at at time zone tz)::date = d or (passed_at at time zone tz)::date = d)
      union
      select lesson_id from public.mastery_records
        where user_id = p_user and to_state in ('aula_concluida', 'aguardando_dominio', 'dominada') and (recorded_at at time zone tz)::date = d
    ) s;
    -- Combater: questões DIFERENTES respondidas no dia (aulas, fora da revisão, e banco de questões).
    select count(*) into n_combater from (
      select 'a' || question_id::text from public.answer_attempts
        where user_id = p_user and context <> 'revisao' and (created_at at time zone tz)::date = d
      union
      select 'b' || question_id::text from public.bank_attempts
        where user_id = p_user and not omitted and (created_at at time zone tz)::date = d
    ) s;
    -- Revisar: questões diferentes respondidas na revisão espaçada de aulas que estão em revisão.
    select count(distinct a.question_id) into n_revisar
      from public.answer_attempts a
      join public.questions q on q.id = a.question_id
      where a.user_id = p_user and a.context = 'revisao' and (a.created_at at time zone tz)::date = d
        and exists (select 1 from public.review_schedules r where r.user_id = p_user and r.lesson_id = q.lesson_id);

    done := 0;
    if n_estudar >= 1 then
      done := done + 1;
      insert into public.gamification_xp_transactions (user_id, amount, reason, activity_type, cycle_day, event_key)
      values (p_user, (cfg -> 'missions' -> 'estudar' ->> 'xp')::int, 'Missão do dia: estudar uma aula completa', 'missao_estudar', d, 'missao:estudar:' || d)
      on conflict (user_id, event_key) do nothing;
    end if;
    if n_combater >= t_combater then
      done := done + 1;
      insert into public.gamification_xp_transactions (user_id, amount, reason, activity_type, cycle_day, event_key)
      values (p_user, (cfg -> 'missions' -> 'combater' ->> 'xp')::int, 'Missão do dia: resolver ' || t_combater || ' questões', 'missao_combater', d, 'missao:combater:' || d)
      on conflict (user_id, event_key) do nothing;
    end if;
    if n_revisar >= t_revisar then
      done := done + 1;
      insert into public.gamification_xp_transactions (user_id, amount, reason, activity_type, cycle_day, event_key)
      values (p_user, (cfg -> 'missions' -> 'revisar' ->> 'xp')::int, 'Missão do dia: revisar ' || t_revisar || ' questões', 'missao_revisar', d, 'missao:revisar:' || d)
      on conflict (user_id, event_key) do nothing;
    end if;
    if done = 3 then
      insert into public.gamification_xp_transactions (user_id, amount, reason, activity_type, cycle_day, event_key)
      values (p_user, (cfg ->> 'bonus_xp')::int, 'Bônus: Operação do Dia completa', 'bonus_operacao', d, 'bonus:' || d)
      on conflict (user_id, event_key) do nothing;
    end if;
    if d = today then
      missions := jsonb_build_object(
        'day', d,
        'estudar', jsonb_build_object('progress', least(n_estudar, 1), 'target', 1, 'done', n_estudar >= 1),
        'combater', jsonb_build_object('progress', least(n_combater, t_combater), 'target', t_combater, 'done', n_combater >= t_combater),
        'revisar', jsonb_build_object('progress', least(n_revisar, t_revisar), 'target', t_revisar, 'done', n_revisar >= t_revisar),
        'completed', done
      );
    end if;
    d := d + 1;
  end loop;

  -- 3) XP total e nível; registra cada nível alcançado.
  select coalesce(sum(amount), 0) into xp_total from public.gamification_xp_transactions where user_id = p_user;
  info := public.gamification_level_info(xp_total, cfg);
  lvl := (info ->> 'level')::int;
  if lvl >= 2 then
    insert into public.gamification_level_ups (user_id, level) select p_user, g from generate_series(2, lvl) g on conflict do nothing;
  end if;

  -- 4) Sequência (streak) e recorde a partir dos dias registrados.
  with days as (
    select day, day - (row_number() over (order by day))::int as grp from public.gamification_activity_days where user_id = p_user
  ), runs as (
    select min(day) as run_start, max(day) as run_end, count(*)::int as len from days group by grp
  )
  select coalesce(max(len), 0), coalesce((select len from runs where run_end >= today - 1 order by run_end desc limit 1), 0), max(run_end)
    into best_streak, cur_streak, last_active from runs;

  -- 5) Conquistas (verificadas aqui; o navegador nunca desbloqueia).
  insert into public.student_achievements (user_id, achievement_id)
  select p_user, a.id from public.achievement_definitions a where a.active and (
       (a.id = 'primeiro_combate' and (exists (select 1 from public.answer_attempts where user_id = p_user)
                                       or exists (select 1 from public.bank_attempts where user_id = p_user and not omitted)))
    or (a.id = 'atirador_elite' and exists (
          select 1 from public.ranked_matches m
          where m.user_id = p_user and m.status = 'finalizada'
            and (select count(*) from public.ranked_form_items i where i.form_id = m.form_id) >= 10
            and m.correct_count >= 0.9 * (select count(*) from public.ranked_form_items i where i.form_id = m.form_id)))
    or (a.id = 'incansavel' and best_streak >= 30)
    or (a.id = 'especialista' and exists (
          select 1 from public.study_trails t
          where t.user_id = p_user
            and exists (select 1 from public.lessons l where l.trail_id = t.id)
            and not exists (
              select 1 from public.lessons l
              left join public.learning_progress p on p.lesson_id = l.id and p.user_id = p_user
              where l.trail_id = t.id and coalesce(p.levels_passed, 0) < 3)))
    or (a.id = 'caveira_elite' and lvl >= 10)
    or (a.id = 'disciplina_7' and best_streak >= 7)
    or (a.id = 'disciplina_15' and best_streak >= 15)
    or (a.id = 'disciplina_30' and best_streak >= 30)
    or (a.id = 'disciplina_60' and best_streak >= 60)
  ) on conflict do nothing;

  -- 6) Ranking por XP (desempate: quem chegou primeiro ao total; depois o id).
  with totals as (
    select user_id, sum(amount) as xp, max(created_at) as reached from public.gamification_xp_transactions group by user_id
  ), ordered as (
    select user_id, row_number() over (order by xp desc, reached asc, user_id asc)::int as pos, count(*) over ()::int as n from totals
  )
  select pos, n into my_pos, ranked from ordered where user_id = p_user;
  if ranked is null then select count(distinct user_id)::int into ranked from public.gamification_xp_transactions; end if;
  if my_pos is not null then
    select position into prev_pos from public.gamification_rank_snapshots where user_id = p_user and day < today order by day desc limit 1;
    insert into public.gamification_rank_snapshots (user_id, day, position) values (p_user, today, my_pos)
    on conflict (user_id, day) do update set position = excluded.position;
  end if;

  result := jsonb_build_object(
    'today', today,
    'xp', xp_total,
    'level', lvl,
    'levelFloor', (info ->> 'floor')::bigint,
    'levelNext', (info ->> 'next')::bigint,
    'missions', missions,
    'missionXp', jsonb_build_object(
      'estudar', (cfg -> 'missions' -> 'estudar' ->> 'xp')::int,
      'combater', (cfg -> 'missions' -> 'combater' ->> 'xp')::int,
      'revisar', (cfg -> 'missions' -> 'revisar' ->> 'xp')::int,
      'bonus', (cfg ->> 'bonus_xp')::int),
    'xpToday', (select coalesce(sum(amount), 0) from public.gamification_xp_transactions where user_id = p_user and cycle_day = today),
    'streak', jsonb_build_object(
      'current', cur_streak,
      'best', best_streak,
      'lastDay', last_active,
      'week', (select coalesce(jsonb_agg(a.day order by a.day), '[]'::jsonb) from public.gamification_activity_days a
               where a.user_id = p_user and a.day >= date_trunc('week', today)::date and a.day <= today),
      'milestones', cfg -> 'streak_milestones'),
    'ranking', jsonb_build_object('position', my_pos, 'total', coalesce(ranked, 0), 'previous', prev_pos),
    'achievements', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'name', a.name, 'description', a.description, 'icon', a.icon, 'criterion', a.criterion,
        'unlockedAt', s.unlocked_at) order by a.sort_order), '[]'::jsonb)
      from public.achievement_definitions a
      left join public.student_achievements s on s.achievement_id = a.id and s.user_id = p_user
      where a.active),
    'levelUps', (select coalesce(jsonb_agg(level order by level), '[]'::jsonb) from public.gamification_level_ups where user_id = p_user and seen_at is null)
  );
  return result;
end $$;

-- Marca os avisos de LEVEL UP como vistos (não altera nível nem XP).
create or replace function public.gamification_ack_levels(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.gamification_level_ups set seen_at = now() where user_id = p_user and seen_at is null;
$$;

-- Top do ranking: só primeiro nome + inicial, nível e XP (nada de e-mail ou dados privados).
create or replace function public.gamification_top(p_limit int default 10)
returns table (pos int, name text, level int, xp bigint) language sql stable security definer set search_path = '' as $$
  with cfg as (select config from public.gamification_settings where id = 1),
  totals as (
    select user_id, sum(amount)::bigint as xp, max(created_at) as reached from public.gamification_xp_transactions group by user_id
  ), ordered as (
    select user_id, xp, row_number() over (order by xp desc, reached asc, user_id asc)::int as pos from totals
  )
  select o.pos,
         coalesce(nullif(trim(split_part(p.display_name, ' ', 1) ||
           case when position(' ' in trim(coalesce(p.display_name, ''))) > 0
                then ' ' || left(reverse(split_part(reverse(trim(p.display_name)), ' ', 1)), 1) || '.' else '' end), ''), 'Operador'),
         (public.gamification_level_info(o.xp, (select config from cfg)) ->> 'level')::int,
         o.xp
  from ordered o left join public.profiles p on p.id = o.user_id
  where o.pos <= least(greatest(p_limit, 1), 50)
  order by o.pos;
$$;

-- Desempenho real: respostas de aulas e do banco, tempo registrado, semana x semana anterior, matérias.
create or replace function public.gamification_performance(p_user uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with cfg as (select config from public.gamification_settings where id = 1),
  tz as (select coalesce((select config ->> 'timezone' from cfg), 'America/Sao_Paulo') as v),
  cap as (select coalesce(((select config ->> 'max_seconds_per_answer' from cfg))::int, 600) as v),
  ans as (
    select a.is_correct as ok, a.created_at as at, least(coalesce(a.time_spent_seconds, 0), (select v from cap)) as secs,
           coalesce(t.title, 'Estudo') as subject
    from public.answer_attempts a
    left join public.questions q on q.id = a.question_id
    left join public.lessons l on l.id = q.lesson_id
    left join public.study_trails t on t.id = l.trail_id
    where a.user_id = p_user
    union all
    select b.is_correct, b.created_at, least(coalesce(b.duration_ms, 0) / 1000, (select v from cap)),
           coalesce(s.name, 'Banco de questões')
    from public.bank_attempts b
    left join public.bank_questions bq on bq.id = b.question_id
    left join public.subjects s on s.id = bq.subject_id
    where b.user_id = p_user and not b.omitted
  ),
  w as (
    select
      count(*) filter (where at >= now() - interval '7 days') as n1,
      count(*) filter (where at >= now() - interval '7 days' and ok) as c1,
      count(*) filter (where at < now() - interval '7 days' and at >= now() - interval '14 days') as n0,
      count(*) filter (where at < now() - interval '7 days' and at >= now() - interval '14 days' and ok) as c0
    from ans
  ),
  subj as (
    select subject, count(*) as n, count(*) filter (where ok) as c from ans group by subject having count(*) >= 5
  )
  select jsonb_build_object(
    'answered', (select count(*) from ans),
    'correct', (select count(*) from ans where ok),
    'wrong', (select count(*) from ans where not ok),
    'seconds', (select coalesce(sum(secs), 0) from ans),
    'week', (select jsonb_build_object('answered', n1, 'correct', c1, 'prevAnswered', n0, 'prevCorrect', c0) from w),
    'subjects', (select coalesce(jsonb_agg(jsonb_build_object('name', subject, 'answered', n, 'correct', c) order by (c::numeric / n) desc, n desc), '[]'::jsonb) from subj)
  );
$$;

revoke all on function public.gamification_sync(uuid) from public, anon, authenticated;
revoke all on function public.gamification_ack_levels(uuid) from public, anon, authenticated;
revoke all on function public.gamification_top(int) from public, anon, authenticated;
revoke all on function public.gamification_performance(uuid) from public, anon, authenticated;
revoke all on function public.gamification_level_info(bigint, jsonb) from public, anon;
grant execute on function public.gamification_sync(uuid) to service_role;
grant execute on function public.gamification_ack_levels(uuid) to service_role;
grant execute on function public.gamification_top(int) to service_role;
grant execute on function public.gamification_performance(uuid) to service_role;
grant execute on function public.gamification_level_info(bigint, jsonb) to authenticated, service_role;

revoke all on public.gamification_settings, public.gamification_xp_transactions, public.gamification_activity_days,
  public.achievement_definitions, public.student_achievements, public.gamification_level_ups,
  public.gamification_rank_snapshots, public.contest_catalog from anon;
revoke insert, update, delete on public.gamification_settings, public.gamification_xp_transactions, public.gamification_activity_days,
  public.achievement_definitions, public.student_achievements, public.gamification_level_ups,
  public.gamification_rank_snapshots, public.contest_catalog from authenticated;
grant select on public.gamification_settings, public.gamification_xp_transactions, public.gamification_activity_days,
  public.achievement_definitions, public.student_achievements, public.gamification_level_ups,
  public.gamification_rank_snapshots, public.contest_catalog to authenticated;
grant all on public.gamification_settings, public.gamification_xp_transactions, public.gamification_activity_days,
  public.achievement_definitions, public.student_achievements, public.gamification_level_ups,
  public.gamification_rank_snapshots, public.contest_catalog to service_role;
