-- Feedback pós-aula. Gravações só pelo servidor (service role); alunos leem apenas o próprio; admin lê tudo.
create table if not exists public.lesson_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  student_name text,
  student_email text,
  lesson_id uuid references public.lessons(id) on delete set null,
  trail_id uuid,
  lesson_title text not null,
  subject text,
  status text not null check (status in ('enviado','dispensado')),
  rating smallint check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  skips smallint not null default 0,
  last_skipped_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_feedbacks_nota_ok check ((status = 'enviado' and rating is not null) or (status = 'dispensado' and rating is null))
);
create unique index if not exists lesson_feedbacks_user_lesson_uq on public.lesson_feedbacks (user_id, lesson_id) where user_id is not null and lesson_id is not null;
create index if not exists lesson_feedbacks_created_idx on public.lesson_feedbacks (created_at desc);
create index if not exists lesson_feedbacks_lesson_idx on public.lesson_feedbacks (lesson_id);

-- Avaliação enviada é imutável e não pode ser apagada (histórico preservado).
create or replace function public.lesson_feedbacks_guard() returns trigger language plpgsql as $f$
begin
  if tg_op = 'DELETE' then
    if old.status = 'enviado' then raise exception 'Avaliação enviada não pode ser apagada.'; end if;
    return old;
  end if;
  if old.status = 'enviado' then
    raise exception 'Avaliação enviada não pode ser alterada.';
  end if;
  new.updated_at := now();
  return new;
end $f$;
drop trigger if exists lesson_feedbacks_guard_trg on public.lesson_feedbacks;
create trigger lesson_feedbacks_guard_trg before update or delete on public.lesson_feedbacks for each row execute function public.lesson_feedbacks_guard();

alter table public.lesson_feedbacks enable row level security;
revoke all on public.lesson_feedbacks from anon, authenticated;
grant select on public.lesson_feedbacks to authenticated;
grant all on public.lesson_feedbacks to service_role;
drop policy if exists lesson_feedbacks_own on public.lesson_feedbacks;
create policy lesson_feedbacks_own on public.lesson_feedbacks for select to authenticated using (user_id = auth.uid());
drop policy if exists lesson_feedbacks_admin on public.lesson_feedbacks;
create policy lesson_feedbacks_admin on public.lesson_feedbacks for select to authenticated using (public.is_admin());
