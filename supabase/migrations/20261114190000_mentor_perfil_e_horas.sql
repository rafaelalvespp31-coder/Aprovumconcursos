-- Mentor que conhece o aluno: data de nascimento (idade) e horas de estudo por dia no servidor.
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles drop constraint if exists profiles_birth_date_check;
alter table public.profiles add constraint profiles_birth_date_check check (birth_date is null or (birth_date > date '1900-01-01' and birth_date < current_date));

create table if not exists public.study_time_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  seconds integer not null default 0 check (seconds >= 0 and seconds <= 86400),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.study_time_days enable row level security;
drop policy if exists study_time_days_select on public.study_time_days;
create policy study_time_days_select on public.study_time_days for select to authenticated using (user_id = auth.uid());
drop policy if exists study_time_days_insert on public.study_time_days;
create policy study_time_days_insert on public.study_time_days for insert to authenticated with check (user_id = auth.uid());
drop policy if exists study_time_days_update on public.study_time_days;
create policy study_time_days_update on public.study_time_days for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.study_time_days to authenticated;
grant update (birth_date) on public.profiles to authenticated;
