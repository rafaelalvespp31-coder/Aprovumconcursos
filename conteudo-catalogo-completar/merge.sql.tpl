with f as (select content::jsonb j from extensions.http_get('https://raw.githubusercontent.com/rafaelalvespp31-coder/aprovumconcursos/main/conteudo-catalogo-completar/__F__.json'))
update catalog_topics c set
 lesson = jsonb_set(c.lesson,'{sections}', (
  select jsonb_agg(x.s order by x.o) from (
   select s, ord o from jsonb_array_elements(c.lesson->'sections') with ordinality t(s,ord) where s->>'kind'<>'flashcards'
   union all select s, 1000+o from jsonb_array_elements((select j->'sections' from f)) with ordinality n(s,o)
   union all select jsonb_set(jsonb_set(s,'{bodyMarkdown}', to_jsonb((s->>'bodyMarkdown') || E'\n\n' || (select j->>'flash' from f))),'{nodeKeys}', (s->'nodeKeys') || coalesce((select jsonb_agg(n->>'key') from jsonb_array_elements((select j->'nodes' from f)) n),'[]'::jsonb)), 5000 from jsonb_array_elements(c.lesson->'sections') s where s->>'kind'='flashcards'
  ) x)),
 nodes = c.nodes || (select j->'nodes' from f),
 version = c.version+1, updated_at = now()
where c.slug = (select j->>'slug' from f)
 and not exists (select 1 from jsonb_array_elements(c.lesson->'sections') s where s->>'module' = (select j->'sections'->0->>'module' from f))
returning c.title, jsonb_array_length(c.lesson->'sections') secoes, length(c.lesson::text) len, version
