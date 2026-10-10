# Nível Aprovado

PWA de estudos para concursos públicos: transforma o conteúdo programático informado pelo aluno numa trilha de aulas e questões com **cobertura verificável item a item** e **progressão por domínio demonstrado**.

> Do edital à aprovação, um nível de cada vez.

## Estado atual (entrega 2 — 10/10/2026)

Núcleo pedagógico, banco com RLS, pipeline de IA, PWA e a camada de design/UX (painel, mapa da trilha, aula interativa, modo de questões, simulado e desempenho) implementados e testados localmente. **Não foi publicado** e **não foi testado contra um Supabase real nem contra a API de IA real** (não havia credenciais neste ambiente). Veja [Critérios do MVP](#critérios-do-mvp) para o status de cada item.

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

## Design e experiência

**Design system** (`src/app/globals.css`, `src/components/`): tokens de cor, tipografia (Public Sans na interface; Source Serif 4 na leitura), raios e estados; ícones próprios consistentes; componentes reutilizáveis (botões, campos, avisos, cards, confirmação de ações destrutivas, indicador de salvamento, cronômetro, teclas de atalho, estados vazio/carregando/erro).

**Camadas de aprendizagem** — nunca uma barra genérica: *estudado* (leu a aula), *praticado* (respondeu questões), *dominado* (passou e manteve o acerto numa revisão). Cores validadas para daltonismo e contraste (`--color-estudado/praticado/dominado`), as mesmas na régua de cobertura e no medidor de progresso.

| Tela | O que faz |
|---|---|
| Painel | saudação e metas (diária de questões, semanal de aulas), continuar última aula, revisões pendentes, questões a resolver, últimos 14 dias, trilhas com domínio por matéria. Todos os números vêm do banco; cada card leva à função correspondente. |
| Mapa da trilha | módulos expansíveis, aulas por nível, estado de cada aula, pré-requisitos visíveis, questões por aula, revisão pendente, conteúdo incompleto/não verificado, régua de cobertura. |
| Aula | índice navegável (lateral no desktop, folha inferior no celular), progresso de leitura, seções com quadros comparativos, exemplos expansíveis, pegadinhas e exceções destacadas, texto legal com fonte, "Esclarecer" (resposta da IA sem sair da aula), "Revisar depois", anotações pessoais, dúvidas, perguntas rápidas intercaladas, conclusão de leitura e resultado da unidade. |
| Questões | filtros (trilha, banca, matéria, assunto, dificuldade, situação), lista navegável com acerto/erro/"para depois", marcar para resolver depois, cronômetro opcional, histórico de tentativas, rever explicação, autoavaliação de confiança, atalhos (A–E, C/E, Enter, J/K). |
| Simulado | quantidade escolhida, tempo corrido, gabarito só no final, análise dos erros por assunto, erros com certeza, gabarito comentado. |
| Desempenho | acerto atual (última tentativa) × atividade (todas), 30 dias, por matéria, assunto, dificuldade e estilo de banca, erros recorrentes, calibração da confiança. |

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
2. Crie um projeto no Supabase e aplique as **5 migrações** de `supabase/migrations/`, em ordem (`supabase db push` com a CLI, ou cole cada arquivo no SQL Editor): `…0100_schema`, `…0200_security`, `…0300_seed`, `…0400_functions`, `…0500_study_tools`.
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
| `ANTHROPIC_API_KEY`, `AI_MODEL` | servidor | sim para gerar trilhas/aulas |
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
| Unitários (73) | 73 aprovados |
| Banco — RLS, integridade, cotas, persistência, ferramentas de estudo (34) | 34 aprovados (PostgreSQL 16) |
| Build de produção | sucesso |
| E2E públicos + interações da galeria, celular e desktop (50) | 50 aprovados |
| E2E autenticados (4) | **pulados** — sem Supabase/IA/conta de teste |
| Galeria em produção sem a variável | 404 (verificado) |
| Segredos no bundle do navegador | nenhum (verificado) |
| `npm audit --omit=dev` | 0 vulnerabilidades |

Os E2E de interação clicam em cada controle e verificam o efeito: responder e ver a explicação de cada alternativa, atalhos de teclado, marcar para depois, navegar pela lista, simulado com gabarito só no final, índice da aula (nav no desktop, folha no celular), revisar depois, anotar, esclarecer sem sair da aula, pergunta rápida, concluir leitura e resultado, links do painel, módulo expansível, desempenho.

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
