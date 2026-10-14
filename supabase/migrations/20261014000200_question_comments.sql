-- Comentários dos alunos nas questões, visíveis para todos os alunos que respondem a mesma questão.
--
-- Cada aluno tem a própria cópia das questões (tabela questions, por usuário). Questões vindas
-- do catálogo têm o mesmo enunciado para todos; por isso o "tópico" do comentário é uma chave
-- calculada a partir do tipo + enunciado normalizado. Questões geradas só para um aluno têm
-- enunciado único, e o tópico delas fica, na prática, restrito a quem as tem.
--
-- Acesso só por funções (security definer). O aluno precisa ter a questão e já tê-la respondido
-- para ler ou escrever (os comentários costumam revelar o gabarito). Nunca expõe e-mail ou id.

create or replace function public.question_thread_key(p_type text, p_statement text)
returns text language sql immutable set search_path = '' as $$
  select md5(p_type || '|' || regexp_replace(lower(btrim(p_statement)), '\s+', ' ', 'g'));
$$;

create table if not exists public.question_comments (
  id          uuid primary key default gen_random_uuid(),
  thread_key  text not null check (length(thread_key) = 32),
  user_id     uuid not null references auth.users (id) on delete cascade,
  author_name text not null check (length(author_name) between 1 and 60),
  body        text not null check (length(body) between 2 and 1000),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists question_comments_thread on public.question_comments (thread_key, created_at) where not hidden;
create index if not exists question_comments_user on public.question_comments (user_id, created_at);

create table if not exists public.question_comment_reports (
  comment_id uuid not null references public.question_comments (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.question_comments enable row level security;
alter table public.question_comments force row level security;
alter table public.question_comment_reports enable row level security;
alter table public.question_comment_reports force row level security;
revoke all on public.question_comments, public.question_comment_reports from anon, authenticated;

-- Tópico da questão para o aluno atual; erro se ele não tem a questão ou ainda não respondeu.
create or replace function public.my_question_thread(p_question uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_key text;
begin
  select public.question_thread_key(q.type, q.statement) into v_key
  from public.questions q
  where q.id = p_question and q.user_id = (select auth.uid());
  if v_key is null then
    raise exception 'questão não encontrada' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.answer_attempts a where a.question_id = p_question and a.user_id = (select auth.uid())) then
    raise exception 'responda a questão para ver os comentários' using errcode = '42501';
  end if;
  return v_key;
end $$;
revoke all on function public.my_question_thread(uuid) from public, anon, authenticated;

create or replace function public.list_question_comments(p_question uuid)
returns table (id uuid, author text, body text, created_at timestamptz, is_mine boolean, reported boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_key text := public.my_question_thread(p_question);
begin
  return query
  select c.id, c.author_name, c.body, c.created_at,
         c.user_id = (select auth.uid()),
         exists (select 1 from public.question_comment_reports r where r.comment_id = c.id and r.user_id = (select auth.uid()))
  from public.question_comments c
  where c.thread_key = v_key and not c.hidden
  order by c.created_at
  limit 300;
end $$;
revoke all on function public.list_question_comments(uuid) from public, anon;
grant execute on function public.list_question_comments(uuid) to authenticated;

create or replace function public.add_question_comment(p_question uuid, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_key text := public.my_question_thread(p_question);
  v_body text := btrim(regexp_replace(coalesce(p_body, ''), '\n{3,}', E'\n\n', 'g'));
  v_name text;
  v_id uuid;
begin
  if length(v_body) < 2 then
    raise exception 'Escreva o comentário.' using errcode = '22023';
  end if;
  if length(v_body) > 1000 then
    raise exception 'Use no máximo 1.000 caracteres.' using errcode = '22023';
  end if;
  if (select count(*) from public.question_comments c where c.user_id = v_uid and c.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Muitos comentários em pouco tempo. Tente mais tarde.' using errcode = '54000';
  end if;
  select coalesce(
           nullif(split_part(btrim(p.display_name), ' ', 1), '')
             || coalesce(' ' || left(nullif(split_part(btrim(p.display_name), ' ', 2), ''), 1) || '.', ''),
           'Aluno APROVUM')
    into v_name
  from public.profiles p where p.id = v_uid;
  insert into public.question_comments (thread_key, user_id, author_name, body)
  values (v_key, v_uid, left(coalesce(v_name, 'Aluno APROVUM'), 60), v_body)
  returning question_comments.id into v_id;
  return v_id;
end $$;
revoke all on function public.add_question_comment(uuid, text) from public, anon;
grant execute on function public.add_question_comment(uuid, text) to authenticated;

-- Apaga: o autor apaga o próprio; administradores apagam qualquer um.
create or replace function public.delete_question_comment(p_comment uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.question_comments c
  where c.id = p_comment and (c.user_id = (select auth.uid()) or (select public.is_admin()));
  return found;
end $$;
revoke all on function public.delete_question_comment(uuid) from public, anon;
grant execute on function public.delete_question_comment(uuid) to authenticated;

-- Denúncia: só quem participa do tópico e não é o autor. Com 3 denúncias, o comentário some.
create or replace function public.report_question_comment(p_question uuid, p_comment uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_key text := public.my_question_thread(p_question);
begin
  if not exists (select 1 from public.question_comments c where c.id = p_comment and c.thread_key = v_key and c.user_id <> v_uid) then
    return false;
  end if;
  insert into public.question_comment_reports (comment_id, user_id) values (p_comment, v_uid) on conflict do nothing;
  update public.question_comments c set hidden = true
  where c.id = p_comment and (select count(*) from public.question_comment_reports r where r.comment_id = p_comment) >= 3;
  return true;
end $$;
revoke all on function public.report_question_comment(uuid, uuid) from public, anon;
grant execute on function public.report_question_comment(uuid, uuid) to authenticated;
