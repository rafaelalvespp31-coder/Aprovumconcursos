# Aula de catálogo — Direitos e Garantias Fundamentais (CF, arts. 5º a 17)

A aula foi dividida em quatro temas do catálogo (Direito Constitucional), porque cada tema aceita no máximo 30 seções e 100 itens:

| Parte | Pasta | `catalog_topics.slug` | Artigos |
|---|---|---|---|
| I — Teoria geral e art. 5º | `conteudo-catalogo-cf-art5-direitos-fundamentais` | `cf-art-5-direitos-garantias-fundamentais` | 5 |
| II — Direitos sociais | `conteudo-catalogo-cf-direitos-sociais` | `cf-arts-6-a-11-direitos-sociais` | 6 a 11 |
| III — Nacionalidade, direitos políticos e partidos | `conteudo-catalogo-cf-nacionalidade-direitos-politicos` | `cf-arts-12-a-17-nacionalidade-direitos-politicos-partidos` | 12 a 17 |
| IV — Remédios constitucionais e tutela coletiva (com simulado final) | `conteudo-catalogo-cf-remedios-constitucionais` | `cf-art-5-remedios-constitucionais` | 5 |

Um pedido como "arts. 5º a 17 da CF" monta um único estudo com as quatro partes; "art. 5º da CF" traz as Partes I e IV (`src/domain/catalog/match.ts`).

Em cada pasta:
- `source.txt` — roteiro numerado dos subtemas; `extrair-nodes.script.ts` gera `nodes.json`.
- `aula*.py` + `build.py` → `lesson.json` e `topic.json` (o build confere limites de seção e cobertura de todos os itens).
- `questoes.py` → `questoes.json` (questões autorais A–E e certo/errado, comentadas).
- `pgmd5.py` — confere a integridade com `md5(jsonb::text)` do Postgres.

Pendências de conferência: ver `unverifiedClaims` em cada `lesson.json`.
