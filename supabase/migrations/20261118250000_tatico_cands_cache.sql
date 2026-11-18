-- Cache das questões candidatas (a consulta ao vivo levava ~43 s).
alter function public.tatico_cands() rename to tatico_cands_live;

create table if not exists public.tatico_cand_cache (
  source text not null, qid uuid not null, subject text not null, stmt_md5 text not null,
  primary key (source, qid)
);
create index if not exists tatico_cand_cache_subject on public.tatico_cand_cache (subject);
alter table public.tatico_cand_cache enable row level security;

create or replace function public.tatico_cands()
returns table (source text, qid uuid, subject text, stmt_md5 text)
language sql stable security definer set search_path = '' as $$
  select c.source, c.qid, c.subject, c.stmt_md5 from public.tatico_cand_cache c;
$$;

create or replace function public.tatico_cands_refresh()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  create temp table _tc on commit drop as select * from public.tatico_cands_live();
  delete from public.tatico_cand_cache;
  insert into public.tatico_cand_cache select * from _tc;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.tatico_cands_live() from public, anon, authenticated;
revoke all on function public.tatico_cands_refresh() from public, anon, authenticated;
revoke all on function public.tatico_cands() from public, anon, authenticated;
grant execute on function public.tatico_cands_live(), public.tatico_cands_refresh(), public.tatico_cands() to service_role;
-- Depois de cadastrar questões novas: select public.tatico_cands_refresh();
