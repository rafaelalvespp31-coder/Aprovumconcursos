# Aula de catálogo — Furto (CP, art. 155)

Fonte da aula publicada no catálogo (`catalog_topics.slug = cp-art-155-furto`, Direito Penal).

- `law.txt` — redação do art. 155 montada a partir das leis alteradoras (conferida em 19/10/2026).
- `nodes.json` — estrutura extraída (38 dispositivos, N0001–N0038); `extrair-nodes.script.ts` gera.
- `aula1.py`…`aula5.py` + `build.py` → `lesson.json` (29 seções, 9 cards) e `topic.json`.
- `questoes.py` → `questoes.json` (40 questões inéditas: 10 fáceis, 15 médias, 15 difíceis).
- `pgmd5.py` — confere a integridade com `md5(jsonb::text)` do Postgres.

Pendências jurídicas: ver `unverifiedClaims` em `lesson.json`.
