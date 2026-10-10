-- Catálogos iniciais. Limites provisórios; ajuste após análise de custos.
insert into public.exam_boards (slug, name, hint, sort_order) values
  ('fgv', 'FGV', 'Fundação Getulio Vargas', 1),
  ('cebraspe', 'CEBRASPE', 'Historicamente conhecida como CESPE', 2),
  ('aocp', 'AOCP', 'Instituto AOCP', 3),
  ('vunesp', 'VUNESP', 'Fundação VUNESP', 4),
  ('ibfc', 'IBFC', 'Instituto Brasileiro de Formação e Capacitação', 5),
  ('ibade', 'IBADE', 'Instituto Brasileiro de Apoio e Desenvolvimento Executivo', 6),
  ('selecon', 'SELECON', 'Instituto SELECON', 7),
  ('outra', 'Outra banca', 'Informe o nome', 99)
on conflict (slug) do update set name = excluded.name, hint = excluded.hint, sort_order = excluded.sort_order;

insert into public.plans (id, name, max_active_trails, max_trail_builds_per_month, max_lesson_generations_per_month, max_content_chars, features) values
  ('free',    'Gratuito', 1,  2,   15,   15000, '{"advanced_review": false, "simulados": false}'),
  ('pro',     'Pro',      5,  15,  200,  60000, '{"advanced_review": true,  "simulados": false}'),
  ('premium', 'Premium',  20, 50,  800,  60000, '{"advanced_review": true,  "simulados": true}')
on conflict (id) do update set
  name = excluded.name,
  max_active_trails = excluded.max_active_trails,
  max_trail_builds_per_month = excluded.max_trail_builds_per_month,
  max_lesson_generations_per_month = excluded.max_lesson_generations_per_month,
  max_content_chars = excluded.max_content_chars,
  features = excluded.features;
