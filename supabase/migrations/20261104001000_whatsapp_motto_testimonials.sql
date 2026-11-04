-- WhatsApp do aluno (contato; visível ao próprio aluno e à equipe), frase do ranking (pública, escrita só pelo dono)
-- e Depoimentos (vídeos de alunos aprovados, lidos por todos os logados, gravados só pela equipe/servidor).
--
-- Rollback:
--   alter table public.profiles drop column if exists whatsapp, drop column if exists motto;
--   drop table if exists public.testimonials;

alter table public.profiles
  add column if not exists whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),
  add column if not exists motto text check (motto is null or char_length(motto) <= 60);
grant update (whatsapp, motto) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare w text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'whatsapp', ''), '\D', '', 'g');
begin
  insert into public.profiles (id, display_name, whatsapp)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), case when w ~ '^[0-9]{10,15}$' then w else null end)
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop function if exists public.gamification_top(int);
create or replace function public.gamification_top(p_limit int default 10)
returns table (pos int, name text, level int, xp bigint, motto text) language sql stable security definer set search_path = '' as $$
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
         o.xp,
         nullif(trim(p.motto), '')
  from ordered o left join public.profiles p on p.id = o.user_id
  where o.pos <= least(greatest(p_limit, 1), 50)
  order by o.pos;
$$;
revoke all on function public.gamification_top(int) from public, anon, authenticated;
grant execute on function public.gamification_top(int) to service_role;

create table if not exists public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  headline   text check (headline is null or char_length(headline) <= 160),
  video_url  text not null check (video_url ~ '^https://'),
  sort       int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;
create policy "testimonials: logado lê ativos" on public.testimonials for select to authenticated using (active);
revoke all on public.testimonials from anon;
revoke insert, update, delete on public.testimonials from authenticated;
grant select on public.testimonials to authenticated;
grant all on public.testimonials to service_role;
