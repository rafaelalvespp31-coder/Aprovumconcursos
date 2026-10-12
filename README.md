# APROVUM

PWA de estudos para concursos públicos: transforma o conteúdo programático informado pelo aluno numa trilha de aulas e questões com **cobertura verificável item a item** e **progressão por domínio demonstrado**.

> Sua preparação. Seu próximo cargo.

## Estado atual (entrega 4 — 12/10/2026)

Núcleo pedagógico, banco com RLS, pipeline de IA, PWA, a camada de design/UX, o **estudo por conteúdo específico** (sem edital obrigatório: escopo, aula completa, três níveis com 90%, recuperação e PDF por conteúdo) e o painel com nível e conquistas reais (painel, mapa da trilha, aula interativa, modo de questões, simulado e desempenho) implementados e testados localmente. **Não foi publicado** e **não foi testado contra um Supabase real nem contra a API de IA real** (não havia credenciais neste ambiente). Veja [Critérios do MVP](#critérios-do-mvp) para o status de cada item.

## Stack

Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript strict (+ `noUncheckedIndexedAccess`), Tailwind CSS 4, Supabase (Auth + Postgres + RLS), Zod 4, SDK Anthropic (atrás de uma camada trocável), Vitest, Playwright. Fontes auto-hospedadas (`@fontsource`): sem requisições a terceiros.

## Arquitetura

```
src/
  domain/            Regras puras e determinísticas (sem I/O) — 100% testáveis
    content/         normalização → extração hierárquica → mapa de cobertura → auditoria
    progress/        máquina de estados de domínio, revisão espaçada
    trail-input.ts   bancas e validação da solicitação (cliente e servidor)
  ai/                Camada de IA independente do fornecedor
    provider.ts      interface AIProvider + erros classificados
    anthropic.ts     adaptador (saída estruturada via tool_choice + validação Zod + 1 retentativa)
    services.ts      análise, planejamento, aula, questões + VALIDAÇÃO DETERMINÍSTICA
    untrusted.ts     isolamento do conteúdo do aluno (anti prompt injection)
  server/            Somente servidor (`server-only`)
    pipeline/        jobs em passos curtos e retomáveis (construção da trilha, geração de aula)
    repos/           persistência Supabase (escritas via funções SQL atômicas)
    services/        casos de uso: criar trilha, cotas, rate limit, responder, progresso
  app/               Rotas (App Router)
supabase/migrations/ Schema, RLS, funções e catálogos (versionados)
tests/               fixtures, testes de banco (Postgres real), provedor de IA falso (só testes)
e2e/                 Playwright
```

### Motor de decomposição (núcleo)

1. **Normalização** — preserva hierarquia; o texto original é guardado para auditoria.
2. **Extração determinística** — reconhece disciplinas, numeração decimal (inclusive colada em linha única, padrão comum em editais), marcadores, subtópicos separados por `;`, e estrutura jurídica (título, capítulo, seção, artigo, parágrafo, inciso, alínea). Cada nó guarda o trecho exato (span) do texto de origem.
3. **Mapa de cobertura** — calcula trechos do texto **não atribuídos a nenhum nó** (nada some em silêncio) e **lacunas de numeração** (ex.: incisos I, II, IV → falta o III).
4. **Análise e planejamento por IA, em blocos** (≤120 nós por chamada; o edital nunca vai inteiro numa chamada). Toda chave de tópico devolvida é conferida contra o mapa; inexistentes são descartadas; ciclos de pré-requisito são removidos.
5. **Auditoria** — todo nó com conteúdo próprio precisa de referência **direta** numa aula (referenciar o pai não cobre os filhos). Correção automática só do que é inequívoco (órfão → aula dos irmãos; referência inválida → removida), sempre registrada e mostrada ao aluno.

### Garantias contra conteúdo inventado

- Seção "texto legal" só é aceita se o texto for **transcrição literal** do conteúdo colado.
- Citações de súmulas, julgados e processos detectadas no texto marcam a aula como **não verificada**.
- "Ensinado" exige uma seção que efetivamente trate o item.
- Questões: exatamente uma alternativa correta, sem duplicatas, tópico dentro da aula; **origem sempre "original"** (restrição no banco).

### Processamento assíncrono

Jobs persistidos (`ai_generation_jobs`) executados **um passo por requisição** (`POST /api/jobs/:id/advance`), com *lease* no banco contra execução duplicada. Falhas temporárias de IA são retentadas; esgotadas as tentativas, o job fica `failed` — **nunca** concluído artificialmente — e pode ser retomado do estágio que falhou, sem refazer o que já foi feito. O processamento avança enquanto a tela de progresso estiver aberta; sair e voltar retoma de onde parou.

### Progressão

Estados: não iniciada → disponível → em andamento → aula concluída → (em revisão) → aguardando domínio → dominada (+ necessita atualização, pendente de validação). Passar nas questões **libera a próxima aula**, mas "dominada" exige uma revisão bem-sucedida após o intervalo mínimo de retenção. Critérios configuráveis por trilha (`study_trails.mastery_criteria`).

## Estudo por conteúdo específico

O edital **nunca** é obrigatório. Cada conteúdo informado pelo aluno — um tema ("Prisão em flagrante"), um artigo ou trecho de lei ("Arts. 121 a 129 do Código Penal"), um capítulo ou uma matéria — é um **estudo independente** (`study_trails`), com mapa de cobertura, unidades, progresso, níveis e PDF próprios. O progresso de um estudo nunca é somado ao de uma disciplina inteira. O edital continua aceito como forma opcional de organizar vários temas.

1. **Entrada.** Texto livre (a partir de 4 caracteres) com título opcional, tipo sugerido automaticamente e banca de referência.
2. **Escopo.** Pedidos breves passam pela etapa `scope`: a IA identifica o assunto, delimita o que entra e o que fica de fora e organiza os subtemas necessários, sem expandir para assuntos alheios. Texto colado por inteiro (lei, capítulo, edital) segue direto para a extração determinística, que identifica artigos, parágrafos, incisos e alíneas. Havendo ambiguidade relevante, o estudo fica em `clarification` e pergunta ao aluno; com a resposta, retoma de onde parou.
3. **Aula.** Completa e em blocos curtos: uma seção de cada forma de ensino aplicável, do básico ao avançado (seções ausentes são geradas à parte, sem reescrever a aula). "Concluí a leitura" só habilita depois de percorrer todas as seções.
4. **Três níveis.** Fácil → médio → difícil, cada um com questões próprias cobrindo todos os itens. Cada nível exige **todas as questões respondidas, ≥ 90% de acerto e as essenciais corretas** (`evaluateQuiz`, `lesson_level_outcome`). O nível seguinte só abre após a aprovação do anterior.
5. **Recuperação.** Reprovado num nível, o aluno gera exercícios novos **só para as questões erradas** (mesmo item, mesmo nível). A resposta mais recente da cadeia vale pela questão original; o nível não é reiniciado.
6. **PDF do conteúdo.** Liberado quando todas as unidades do estudo passaram nos três níveis. Reúne teoria no escopo, dispositivos e fontes, exemplos, esquemas e pegadinhas, as questões efetivamente respondidas com alternativas, gabaritos e comentários, os erros explicados e pontos de revisão, referências, datas e versão. Cada geração é uma nova versão (`study_pdfs`), vinculada ao aluno, ao conteúdo, às questões e à versão da fonte; as anteriores continuam disponíveis.

## Catálogo revisado (modelo híbrido)

Temas e dispositivos de lei preparados e revisados pela equipe, em `/admin/catalogo` (só administradores). Quando o pedido do aluno é coberto pelo catálogo, o estudo é **montado na hora, sem IA e sem consumir cota**; o que não estiver no catálogo continua sendo gerado pela IA.

- **Reconhecimento sem IA** (`src/domain/catalog/match.ts`): referências de lei viram chaves — "art. 5º da CF", "arts. 121 a 129 do Código Penal", "Lei 11.340, arts. 1º a 7º", "CP, art. 121-A" — e temas são achados por título e sinônimos. O catálogo só é usado com **cobertura total** do pedido; cobertura parcial segue para a IA (e o aluno vê o motivo). O aluno pode marcar "prefiro que a IA gere uma aula nova".
- **Um tema por artigo**: pedidos de intervalo juntam os temas sozinhos (`composeStudy`), com mapa, unidades e chaves renumeradas.
- **Cópias por aluno**: o estudo recebe cópia da aula e **10 questões por nível sorteadas do banco** (ordem diferente para cada aluno). A recuperação usa questões do banco que o aluno ainda não recebeu; só se o banco acabar a IA é chamada.
- **Versões**: publicar de novo cria nova versão; quem estudou a anterior vê o aviso "conteúdo atualizado no catálogo".
- **Edição**: dados e sinônimos, texto-fonte (cole a lei oficial), rascunho com IA em passos (estrutura → aula → banco de 15 questões por nível, repetível), edição de cada seção e questão, remoção, publicação (exige estrutura, aula e ao menos 10 questões por nível), despublicação e arquivo.
- **Fila da IA** (`/admin/fila`): pedidos atendidos pela IA, agrupados e ordenados por número de alunos, sem identificar quem pediu. "Promover" cria um rascunho com a aula e as questões geradas.
- **Banco** (`…0800_catalog`): `catalog_topics`, `catalog_questions` (leitura só para administradores, gravação só pelo servidor), `lessons.catalog_topic_id/version/key_map` e `catalog_topic_versions()` (o aluno vê só id e versão de temas publicados).

**Tornar-se administrador:** no SQL Editor do Supabase, `insert into public.admin_roles (user_id, role) values ('<seu user id>', 'admin');` (o id está em *Authentication → Users*).

## Design e experiência

**Identidade APROVUM.** Preto, branco e vermelho, a partir da logo (`public/icons/aprovum-*.png`, ícones do PWA gerados dela). Fundo branco, texto preto, vermelho `#E10600` para ações e destaque (`#C80500` quando é texto, para manter contraste AA) e preto nos elementos de marca (barra lateral, botões escuros). Camadas de aprendizagem: estudado (cinza) → praticado (vermelho) → dominado (preto); "não verificado" usa listras. Acerto = preto com ✓; erro = vermelho com ícone e texto.


**Design system** (`src/app/globals.css`, `src/components/`): tokens de cor, tipografia (Public Sans na interface; Source Serif 4 na leitura), raios e estados; ícones próprios consistentes; componentes reutilizáveis (botões, campos, avisos, cards, confirmação de ações destrutivas, indicador de salvamento, cronômetro, teclas de atalho, estados vazio/carregando/erro).

**Camadas de aprendizagem** — nunca uma barra genérica: *estudado* (leu a aula), *praticado* (respondeu questões), *dominado* (passou e manteve o acerto numa revisão). Cores validadas para daltonismo e contraste (`--color-estudado/praticado/dominado`), as mesmas na régua de cobertura e no medidor de progresso.

| Tela | O que faz |
|---|---|
| Painel ("Leveza Pastel") | porte do design criado pelo aluno, mantendo estrutura, cores, cards e microinterações (inclinação 3D, brilho, ondulação, anéis animados, barras com mola). Tema atual com etapa (Ensino/Fixação/Revisão) e posição na trilha; anéis de meta diária de questões e semanal de aulas; revisão mais atrasada; questões sem resposta por dificuldade; últimos 14 dias com dica por dia; trilhas com matérias e detalhe em diálogo; modo foco com cronômetro real de 25+5 min. Todos os números vêm do banco. |
| Casco | barra lateral de vidro com destaque deslizante, contadores reais, sequência de estudo dos últimos 7 dias, recolher (lembrado no navegador), sino → revisões, busca ⌘K em trilhas, temas e revisões do aluno, atalhos 1–6 (desligados nas telas com questões, onde 1–5 escolhem alternativas), barra flutuante no celular. |
| Perfil | nível, sequência e conquistas com regras explícitas e progresso; metas; dados, plano e sessão. |
| Mapa da trilha | módulos expansíveis, aulas por nível, estado de cada aula, pré-requisitos visíveis, questões por aula, revisão pendente, conteúdo incompleto/não verificado, régua de cobertura. |
| Aula | índice navegável (lateral no desktop, folha inferior no celular), progresso de leitura, seções com quadros comparativos, exemplos expansíveis, pegadinhas e exceções destacadas, texto legal com fonte, "Esclarecer" (resposta da IA sem sair da aula), "Revisar depois", anotações pessoais, dúvidas, perguntas rápidas intercaladas, conclusão de leitura e resultado da unidade. |
| Questões | filtros (trilha, banca, matéria, assunto, dificuldade, situação), lista navegável com acerto/erro/"para depois", marcar para resolver depois, cronômetro opcional, histórico de tentativas, rever explicação, autoavaliação de confiança, atalhos (A–E, C/E, Enter, J/K). |
| Simulado | quantidade escolhida, tempo corrido, gabarito só no final, análise dos erros por assunto, erros com certeza, gabarito comentado. |
| Desempenho | acerto atual (última tentativa) × atividade (todas), 30 dias, por matéria, assunto, dificuldade e estilo de banca, erros recorrentes, calibração da confiança. |

**Nível e conquistas (sem XP).** Nível = 1 + temas vencidos ÷ 3. Sequência = dias seguidos com ao menos uma resposta (continua viva até o fim do dia seguinte). Conquistas: primeiro tema vencido, 7 dias seguidos, 80% de acerto com ≥ 50 respostas, 20 questões num dia, 100 respostas, domínio confirmado, matéria fechada, 25 temas. Regras puras em `src/domain/progress/gamification.ts`; dados de `my_study_stats()` (security invoker, filtrado por `auth.uid()`). Textos secundários do pastel foram escurecidos o mínimo necessário para contraste legível (WCAG AA).

Confiança declarada é registrada e exibida como calibração ("errou com certeza", "acertou no chute"), **nunca** como prova de domínio. Questões são sempre identificadas como originais de treino.

### Galeria de design (`/dev/galeria`)

Renderiza as telas autenticadas com **dados de exemplo identificados como tal**, usando uma implementação em memória das ações (`src/app/dev/galeria/demo-api.tsx`) injetada pelo contexto `StudyApi`. Em produção a galeria responde **404**, a menos que `ENABLE_DESIGN_GALLERY=1` (definido apenas no servidor de testes E2E). Nunca defina essa variável na Vercel.

## Segurança

- **RLS em todas as tabelas de aluno**; o cliente (navegador) só **lê** os próprios dados. Toda escrita de conteúdo, progresso, respostas e cotas passa pelo servidor, que verifica a sessão (`auth.getUser()`) e sempre filtra por `user_id`.
- FKs compostas `(id, user_id)` impedem no banco que um registro aponte para dados de outro usuário.
- **Gabarito oculto**: `question_options.is_correct/explanation` não são legíveis pelo cliente; a correção ocorre na função `submit_answer`.
- Cotas (`consume_quota`, com lock por usuário), limite de taxa (`check_rate_limit`) e lease de jobs são funções `SECURITY DEFINER` executáveis **apenas** pelo papel de servidor. O plano nunca vem do cliente.
- Chave secreta do Supabase e da IA só em módulos `server-only`; verificado que não aparecem no bundle do navegador.
- CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy`; rotas POST de API exigem mesma origem; Server Actions têm proteção nativa de origem.
- Conteúdo gerado renderizado com `react-markdown` sem HTML bruto; links restritos a http(s)/relativos.
- Logs estruturados sem senhas, tokens nem conteúdo do aluno.
- Redirecionamentos pós-login aceitam apenas caminhos internos.

**Riscos conhecidos / não implementados:** exclusão de conta e exportação de dados (LGPD) ainda sem tela; política de retenção não automatizada; CSP usa `'unsafe-inline'` para scripts (exigência do Next sem nonce); cache offline de aulas guarda HTML no aparelho (apagado no logout via service worker); backups dependem da configuração do projeto Supabase.

## Configuração

1. `npm ci`
2. Crie um projeto no Supabase e aplique as **8 migrações** de `supabase/migrations/`, em ordem (`supabase db push` com a CLI, ou cole cada arquivo no SQL Editor): `…0100_schema`, `…0200_security`, `…0300_seed`, `…0400_functions`, `…0500_study_tools`, `…0600_theme_flow`, `…0700_content_units`, `…0800_catalog`. Quem já aplicou as anteriores aplica só as que faltam, em ordem. A `…0700` não apaga dados: questões existentes recebem o nível pela dificuldade e unidades já aprovadas contam como os três níveis concluídos.
3. Em *Authentication → URL Configuration*, adicione `https://SEU-DOMINIO/auth/callback` (e `http://localhost:3000/auth/callback`) às URLs de redirecionamento.
4. Copie `.env.example` para `.env.local` e preencha (veja os comentários no arquivo).
5. `npm run dev`

Para tornar alguém administrador (área admin ainda não implementada, mas a permissão já existe):
```sql
insert into public.admin_roles (user_id, role) values ('<uuid do usuário>', 'admin');
```

### Variáveis de ambiente

| Variável | Onde | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | sim |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `_ANON_KEY`) | público | sim |
| `NEXT_PUBLIC_SITE_URL` | público | sim em produção |
| `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`) | servidor | sim |
| `AI_PROVIDER` | servidor | não (padrão `anthropic`) |
| `AI_PROVIDER` | servidor | `anthropic` (padrão, pago), `gemini` (camada gratuita do Google AI Studio), `groq`, `openrouter` ou `openai_compat` (ex.: Ollama local) |
| `AI_MODEL` + a chave do provedor (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` ou `OPENROUTER_API_KEY`) | servidor | sim para gerar estudos e aulas |
| `AI_BASE_URL`, `AI_API_KEY` | servidor | só para `openai_compat` |
| `AI_REASONING_EFFORT`, `AI_JSON_MODE` | servidor | opcionais (`low` economiza cota em modelos que pensam; `object` para modelos sem JSON Schema) |
| `AI_PRICE_INPUT_PER_MTOK`, `AI_PRICE_OUTPUT_PER_MTOK` | servidor | não (sem elas, custo = desconhecido) |

Sem IA configurada, o app funciona e a construção falha com a mensagem "IA não configurada" — não há conteúdo fictício de reserva.

## Testes

```bash
npm run typecheck
npm run lint
npm test                 # unitários + banco (precisa de TEST_DATABASE_URL)
npm run build
npm run test:e2e         # sobe `next start` na porta 3100
```

Os testes de banco aplicam as **migrações de produção** num Postgres real com um shim mínimo do ambiente Supabase (`tests/db/supabase-shim.sql`). Sem Postgres disponível, são **pulados com aviso**, nunca contados como aprovados.

### Resultados desta entrega (executados em 10/10/2026)

| Suíte | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | sem erros |
| ESLint (`--max-warnings=0`) | sem erros |
| Unitários (123) | 123 aprovados |
| Banco — RLS, integridade, cotas, persistência, níveis, recuperação, PDF, catálogo (44) | 44 aprovados (PostgreSQL 16) |
| Build de produção | sucesso |
| E2E públicos + interações da galeria, celular e desktop (83) | 83 aprovados (3 testes só de desktop pulados no perfil celular) |
| E2E autenticados (4) | **pulados** — sem Supabase/IA/conta de teste |
| Galeria em produção sem a variável | 404 (verificado) |
| Segredos no bundle do navegador | nenhum (verificado) |
| `npm audit --omit=dev` | 0 vulnerabilidades |

Os E2E de interação clicam em cada controle e verificam o efeito: responder e ver a explicação de cada alternativa, atalhos de teclado, marcar para depois, navegar pela lista, simulado com gabarito só no final, índice da aula (nav no desktop, folha no celular), revisar depois, anotar, esclarecer sem sair da aula, pergunta rápida, leitura só conclui após percorrer todas as seções, links do painel, detalhe da trilha, modo foco (contagem, pausa, retomada após recarregar), busca ⌘K, navegação lateral e atalhos, recolher persistente, barra flutuante do celular, conquistas, módulo expansível, desempenho.

Cobertura dos testes inclui: extração de editais em linha e em lista, texto de lei, PDF quebrado, entrada grande (800 tópicos) e malformada; lacunas de numeração; auditoria (omissão, pai≠filhos, chaves inventadas, pré-requisito fora de ordem, aula gerada incompleta); correção automática; agregação de cobertura; máquina de estados; revisão espaçada; isolamento de prompt injection; validação de aula/questões; pipeline com falha temporária, falha definitiva, retomada, IA não configurada; acesso cruzado entre contas; cliente sem permissão de escrita; gabarito oculto; cotas e rate limit.

## Implantação (Vercel)

Importe o repositório na Vercel, defina as variáveis de ambiente e faça o deploy. A rota `/api/jobs/[id]/advance` declara `maxDuration = 300`; confirme o limite do seu plano Vercel. **Nada foi publicado nesta entrega.**

## Critérios do MVP

| # | Critério | Status |
|---|---|---|
| 1 | Criar conta e entrar | Implementado (cadastro, login, recuperação, callback). **Não testado contra Supabase real.** |
| 2 | Banca obrigatória antes de gerar | Implementado e testado (schema, UI, servidor) |
| 3 | Informar conteúdo | Implementado e testado (validação e limites) |
| 4 | Conteúdo analisado e organizado | Extração testada; análise por IA testada com provedor falso. **IA real não testada.** |
| 5 | Trilha estruturada | Implementado (prévia com módulos, aulas, itens, apoio pedagógico separado) |
| 6 | Mapa de cobertura persistido | Testado no Postgres |
| 7 | Aulas geradas por unidade | Implementado; persistência testada; geração com IA real **não testada** |
| 8 | Questões vinculadas ao conteúdo | Testado no Postgres |
| 9 | Gabarito e comentários | Testado (`submit_answer`) e UI implementada |
| 10 | Progresso salvo no banco | Implementado; regras testadas; gravação via Supabase **não testada em ambiente real** |
| 11 | Sair e retomar | Implementado (estado e jobs persistentes); E2E pendente |
| 12 | Auditoria detecta tópicos sem correspondência | Testado |
| 13 | Sinaliza falhas e informação não verificada | Testado |
| 14 | Dados isolados por usuário | Testado (RLS) |
| 15 | Chaves privadas não expostas | Verificado (bundle + `server-only`) |
| 16 | Testes executados e documentados | Sim (acima) |
| 17 | Mobile e desktop | Públicas e autenticadas verificadas (autenticadas via galeria com dados de exemplo), sem rolagem horizontal |
| 18 | Instalação PWA | Manifest, ícones, service worker e página offline verificados; instalação em aparelho **não testada** |
| 19 | Limites de consumo no servidor | Testado |
| 20 | Documentação | Este README |

**O MVP não está integralmente concluído**: faltam a validação ponta a ponta com Supabase e IA reais e os itens abaixo.

## Pendências

- Validação ponta a ponta com Supabase e IA reais (fluxo autenticado).
- Área administrativa (usuários, planos, falhas, custos) — permissões e políticas já existem.
- Interatividade "progressiva" ainda não feita: flashcards, completar lacunas, desafios de aplicação e conquistas.
- Calendário de estudos.
- Fila offline de respostas e anotações com sincronização posterior (hoje: leitura offline de aulas já abertas e aviso claro do que exige internet).
- Questões discursivas com correção.
- Verificação de fontes oficiais (RAG) para marcar conteúdo como "verificado".
- Importação de PDF (arquitetura preparada: `source_documents.kind/storage_path`).
- Troca de banca após a criação; edição dos critérios de domínio pela interface.
- LGPD: exclusão de conta e exportação de dados pela interface.
- Pagamentos (planos e cotas já modelados; nenhum gateway integrado).
- A cota de esclarecimento é consumida antes da chamada à IA; se a IA falhar, a unidade não é devolvida.
