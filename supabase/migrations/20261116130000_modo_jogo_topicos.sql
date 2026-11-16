-- Temas do Modo Jogo que têm perguntas curtas (game_items): usados para listar Português, Matemática, CTB etc.
create or replace function public.game_topic_counts()
returns table (topic_id uuid, title text, discipline text, law_code text, n int)
language sql stable security definer set search_path = public as $$
  select t.id, t.title, t.discipline_mode::text, t.law_code, count(*)::int
  from public.game_items g
  join public.catalog_topics t on t.id = g.topic_id and t.status = 'publicado'
  where g.active
  group by t.id, t.title, t.discipline_mode, t.law_code
$$;
revoke all on function public.game_topic_counts() from public, anon, authenticated;
grant execute on function public.game_topic_counts() to service_role;
