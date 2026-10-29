/**
 * Comando do ChatGPT para UM subtópico do plano de tópicos (ex.: 4.1 Causas de exclusão da
 * ilicitude). Padrão único para qualquer subtópico, de qualquer matéria, com a mesma lógica da
 * aula de Homicídio do catálogo: visão geral e base (lei seca ou regras), um módulo por item do
 * edital, aprofundamento, combinações e crimes/temas próximos, casos e pegadinhas, doutrina,
 * jurisprudência e bancas, revisão final e questões em três níveis.
 * Inclui a regra de atualização até 2026 e a revisão do próprio comando e da resposta antes de
 * entregar. Cada comando tem no máximo {@link SUBTOPIC_PROMPT_MAX} caracteres. Puro.
 */
import { disciplineLabel, isLegalMode, type DisciplineMode } from "@/ai/pedagogy";
import { visualRulesCompact } from "./export";
import { groupHeaderLines, type OutlineItem, type OutlineSubtopic } from "./topic-group";

/** Limite de tamanho de cada comando (caracteres). */
export const SUBTOPIC_PROMPT_MAX = 12_000;
/** O painel aceita até 30 seções por aula. */
const MAX_SECTIONS = 30;

const label = (x: OutlineItem) => `${x.code ? `${x.code} ` : ""}${x.title}`;

/** Atualização: tudo vigente em 2026, sem inventar o que não se sabe. */
function updatesBlock(legal: boolean, year: number): string {
  const examples = legal
    ? "Pacote Anticrime (Lei 13.964/2019); feminicídio autônomo, art. 121-A do CP (Lei 14.994/2024); vicaricídio, art. 121-B do CP (Lei 15.384/2026); fraude eletrônica (Lei 14.155/2021); arts. 147-A e 147-B do CP (Leis 14.132/2021 e 14.188/2021); injúria racial na Lei 7.716 (Lei 14.532/2023); Lei 14.133/2021 (Lei 8.666/1993 revogada desde o fim de 2023); improbidade (Lei 14.230/2021)"
    : "Novo Acordo Ortográfico (obrigatório desde 2016); versões atuais de programas e sistemas; nomenclatura atual";
  return `ATUALIZAÇÃO ATÉ ${year} (obrigatória)
- Ensine só o que está VIGENTE em ${year}: ${legal ? "texto compilado da lei com todas as alterações (leis, emendas, revogações, vetos derrubados), súmulas, teses de repercussão geral e repetitivos, entendimento atual do STF e do STJ" : "regras, normas e versões atuais"}. Se mudou, diga a regra atual e o que mudou numa caixa "> **Atualização (${legal ? "Lei nº …/ano" : "fonte/ano"}):** …".
- Exemplos do que não pode faltar quando tocar o assunto: ${examples}. Mesmo cuidado com QUALQUER outra alteração.
- Sem certeza da redação ou do entendimento em ${year} (ou seu conhecimento não chega lá)? Não presuma: ensine o que é certo, avise no texto e registre em "=== A CONFERIR ===".`;
}

/** Revisão do próprio comando e da resposta, antes de entregar. */
function reviewBlock(legal: boolean): string {
  const confusions = legal
    ? "crime × contravenção, desistência × arrependimento eficaz, dolo eventual × culpa consciente, súmula × súmula vinculante × tese, STF × STJ, prescrição × decadência, ação pública × privada, nulidade absoluta × relativa"
    : "termos parecidos, regra × exceção, nome antigo × atual";
  return `REVISÃO OBRIGATÓRIA (em silêncio, antes de responder)
1. Revise ESTE COMANDO: o que estiver ambíguo, desatualizado ou contra a ${legal ? "lei/jurisprudência" : "norma"} vigente, siga a regra vigente e anote em "=== A CONFERIR ===".
2. Revise a SUA AULA: termos sem troca (ex.: ${confusions}); ${legal ? "artigos, penas, prazos e frações iguais ao texto vigente, nada revogado como vigente" : "regras e contas refeitas uma a uma"}; nada inventado (${legal ? "súmula, tese, julgado, " : ""}autor, dado); nada leviano (sem "sempre/nunca" com exceção, sem simplificação que vire erro, divergência com a posição majoritária e a da banca); exemplos que resolvem exatamente o que a regra diz; questões com uma só resposta certa e gabarito igual à justificativa; todos os itens cobertos e formato exato.
3. Corrija tudo e só então responda. Não mostre a revisão.`;
}

/** Seções de cada item do edital: duas por item quando cabe, uma quando não, e itens agrupados se forem muitos. */
function itemModules(items: Array<{ key: string; title: string; code: string | null }>, slots: number): string {
  const groups: Array<typeof items> = [];
  const per = Math.max(1, Math.ceil(items.length / slots));
  for (let i = 0; i < items.length; i += per) groups.push(items.slice(i, i + per));
  const two = items.length * 2 <= slots;
  return groups
    .map((g) => {
      const name = g.length === 1 ? label(g[0]!) : `${g[0]!.key} a ${g[g.length - 1]!.key}`;
      const title = g.map((x) => x.title).join("; ");
      const keys = g.map((x) => x.key).join("; ");
      const traps = two ? `\n--- SEÇÃO: pegadinhas | Pegadinhas: ${title} ---\nItens: ${keys}` : "";
      return `=== MÓDULO: ${name} ===\n--- SEÇÃO: explicação | ${title} ---\nItens: ${keys}${traps}`;
    })
    .join("\n\n");
}

type SubtopicInput = { disciplineMode: string; group: OutlineItem; sub: OutlineSubtopic; year?: number };

/** Partes do comando de um subtópico (usadas no comando inteiro e no dividido em 2). */
function pieces(input: SubtopicInput) {
  const { group, sub } = input;
  const mode = input.disciplineMode as DisciplineMode;
  const subject = disciplineLabel(mode) ?? "";
  const legal = disciplineLabel(mode) ? isLegalMode(mode) : false;
  const year = input.year ?? 2026;
  const raw = sub.items.length ? sub.items : [{ code: sub.code ? `${sub.code}.1` : null, title: sub.title }];
  const items = raw.map((it, i) => ({ key: it.code ?? `${i + 1}`, title: it.title, code: it.code ?? `${i + 1}` }));
  const numbered = items.map((it) => `${it.key} ${it.title}`);
  // Visão geral e mapa cobrem todos os itens (com muitos itens, a lista fica só no TEXTO-BASE).
  const allKeysLine = items.length <= 14 ? `\nItens: ${items.map((it) => it.key).join("; ")}` : "";

  // Seções fixas (mesma lógica da aula de Homicídio). Com muitos itens, as opcionais saem para caber em 30.
  const full = items.length <= 14;
  const base = legal ? "texto legal | Lei seca vigente" : "conceitos fundamentais | Regras e definições-base";
  const fixedTop = `=== MÓDULO: Visão geral e ${legal ? "lei seca" : "base"} ===
--- SEÇÃO: introdução | Visão geral: ${sub.title} ---${allKeysLine}
--- SEÇÃO: esquema | Mapa do subtópico ---${allKeysLine}
--- SEÇÃO: ${base} ---`;
  const fixedDeep = full
    ? `=== MÓDULO: Aprofundamento e temas ligados ===
--- SEÇÃO: aprofundamento | Temas ligados que caem junto ---
--- SEÇÃO: exceções | Exceções e particularidades ---

`
    : "";
  const fixedRest = `${fixedDeep}=== MÓDULO: Combinações, ${legal ? "figuras próximas e consequências" : "temas próximos e aplicação"} ===
${full ? `--- SEÇÃO: comparação | O que mais confunde ---\n` : ""}--- SEÇÃO: quadro comparativo | Quadro comparativo ---
--- SEÇÃO: aplicação | ${legal ? "Consequências práticas" : "Como aplicar na prova"} ---

=== MÓDULO: Casos práticos e pegadinhas ===
--- SEÇÃO: exemplos | Casos práticos resolvidos ---
--- SEÇÃO: pegadinhas | Pegadinhas que misturam os itens ---

=== MÓDULO: Doutrina, ${legal ? "jurisprudência" : "fontes"} e bancas ===
${full ? `--- SEÇÃO: doutrina | ${legal ? "Como a doutrina explica" : "Como os autores de referência explicam"} ---\n` : ""}${legal ? "--- SEÇÃO: jurisprudência | O que os tribunais decidem ---\n" : ""}--- SEÇÃO: interpretação da banca | Como as bancas cobram ---

=== MÓDULO: Revisão final ===
--- SEÇÃO: resumo | Resumo para revisão ---
--- SEÇÃO: checklist | Checklist: você consegue… ---
--- SEÇÃO: flashcards | Flashcards de revisão ---`;
  const fixedCount = (s: string) => (s.match(/^--- SEÇÃO:/gm) ?? []).length;
  const slots = MAX_SECTIONS - fixedCount(fixedTop) - fixedCount(fixedRest);

  const sectionRules = `CONTEÚDO DE CADA SEÇÃO (escreva logo abaixo da linha "--- SEÇÃO" ou "Itens:")
- introdução: o que é, onde fica em "${group.title}", por que cai e "Nesta aula você vai estudar: …" (lista numerada).
- esquema: tabela | Item | O que é | Regra-chave | Como cai |.
- ${legal ? 'texto legal: texto LITERAL e VIGENTE dos dispositivos, cada linha com "> "; revogado: "(revogado pela Lei nº …)".' : "conceitos fundamentais: regras, definições e fórmulas atuais, em lista ou tabela."}
- explicação (um por item): conceito completo, **negrito** nos termos-chave, requisitos em tabela, um EXEMPLO ÓBVIO do dia a dia e depois um caso de prova resolvido, "> **Por que isso importa na prova:** …"${legal ? ", base legal (art., §, inciso)" : ""}. Sem seção de pegadinhas do item, feche com "> **Pegadinha:** …".
- pegadinhas: lista numerada "**\"afirmação falsa\"** Errado: explicação.".
- aprofundamento, exceções, comparação, quadro comparativo: diferenças entre os itens e figuras próximas, em tabela. aplicação: ${legal ? "competência, ação, processo, pena e benefícios, o que couber" : "passo a passo de resolução"}.
- exemplos: 4 a 6 "**Caso 1 — Título.** situação" e, na linha seguinte, "→ resposta".
- doutrina${legal ? "/jurisprudência" : ""}: só o majoritário${legal ? " e súmulas/teses com tribunal e número que você sabe que existem" : ""}. banca: como Cebraspe, FGV e Vunesp cobram + "Roteiro para resolver qualquer questão:".
- resumo: tabela | Pergunta | Resposta | (10 a 14 linhas). checklist: 10 a 15 "- [ ] …?", última linha "Marcou tudo? Passe para as questões de fixação: são três níveis (fácil, médio e difícil), e cada um exige 90% de acertos.". flashcards: 12 a 15 "**Pergunta?**" + linha "→ resposta", separados por linha em branco.`;

  const refs = `=== REFERÊNCIAS ===
${legal ? "Lei: (cada lei usada e cada lei que a alterou, com número e ano)\nJurisprudência: (súmulas e teses citadas, ex.: STJ, Súmula 18)" : "Outro: (normas, manuais ou documentos oficiais usados)"}

=== A CONFERIR ===
(Uma linha por ponto a conferir na fonte oficial antes de publicar: alterações recentes, entendimentos novos, divergências deste comando.)`;
  const qs = `=== QUESTÕES: FÁCIL ===
(12: 6 múltipla escolha e 6 certo ou errado; Dificuldade: 1; ${legal ? "letra da lei" : "regras"} e conceitos; 6 essenciais.)

--- QUESTÃO ---
Tipo: múltipla escolha
Item: (item do TEXTO-BASE, ex.: ${items[0]!.key})
Essencial: sim
Dificuldade: 1
Enunciado: (texto)
A) (alternativa)
Comentário: (por que certa ou errada)
(B a E: cada alternativa numa linha, com "Comentário:" abaixo)
Gabarito: (letra)
Justificativa: (curta)

--- QUESTÃO ---
Tipo: certo ou errado
Item: (…)
Essencial: não
Dificuldade: 1
Enunciado: (afirmação)
Gabarito: (Certo ou Errado)
Justificativa: (começa com "Certo." ou "Errado.")

=== QUESTÕES: MÉDIO ===
(12: 9 múltipla escolha e 3 certo ou errado; Dificuldade: 3; casos curtos; 5 essenciais.)

=== QUESTÕES: DIFÍCIL ===
(12: 7 múltipla escolha e 5 certo ou errado; Dificuldade: 4 ou 5; casos longos estilo FGV${legal ? ", figuras próximas e jurisprudência" : ""}; 2 essenciais.)

REGRAS DAS QUESTÕES: autorais (sem banca ou concurso real); 5 alternativas plausíveis com comentário; gabaritos espalhados de A a E; "Item:" que exista no TEXTO-BASE; sem repetir.`;

  const head = `Escreva uma aula completa para concursos públicos no PADRÃO APROVUM, com a profundidade da aula-modelo de Homicídio do catálogo.

ESTA AULA É UM SUBTÓPICO DO EDITAL
- Matéria: ${subject}
- Tópico: ${group.code ? `${group.code}. ` : ""}${group.title}
- Subtópico (esta aula): ${label(sub)}
- Itens do edital: os do TEXTO-BASE, todos, nesta ordem (cada um tem seu módulo).
Não ensine os outros subtópicos do tópico (terão aulas próprias); cite-os só para diferenciar.

FORMATO OBRIGATÓRIO
- SOMENTE o texto no formato abaixo, em UM bloco de código, nada antes ou depois; marcadores (=== / ---) e campos exatamente iguais.
- Markdown: parágrafos curtos, **negrito**, listas "-", tabelas "|", caixas ">". Sem === ou --- no conteúdo; até 10.000 caracteres por seção.
- Cortou? Eu peço "continue": siga de onde parou, sem repetir.`;

  const lesson = (mods: string) => `=== AULA ===
Título: ${sub.title}
Matéria: ${subject}
${groupHeaderLines(group, sub).join("\n")}
Tipo: tema
Lei:
Artigos:
Sinônimos: (outros nomes do assunto, separados por ;)
Tempo estimado: (minutos, entre 40 e 120)
Objetivo: (uma frase: "Dominar ${sub.title.toLowerCase()}: …")
Resumo: (duas ou três frases)

=== TEXTO-BASE ===
${legal ? "(Antes dos itens, se a aula depender de lei: o texto LITERAL e VIGENTE dos dispositivos, um por linha.)\n" : ""}${numbered.join("\n")}

${fixedTop}

${mods}

${fixedRest}`;

  return { head, updates: updatesBlock(legal, year), review: reviewBlock(legal), sectionRules, lesson, refs, qs, items, slots, legal, sub, group };
}

export function buildSubtopicPrompt(input: SubtopicInput): string {
  const p = pieces(input);
  return fitPrompt(p.items.length, p.slots, (mods, vis) => [p.head, p.updates, p.review, vis, p.sectionRules, p.lesson(mods), p.refs, p.qs].join("\n\n"), itemModules(p.items, p.slots));
}

/**
 * O mesmo comando em DUAS PARTES, para aulas grandes: o comando 1 pede só a aula (teoria,
 * referências e pontos a conferir); o comando 2, na MESMA conversa, pede só as questões dos três
 * níveis. As duas respostas são coladas nos dois campos de "Catalogar aula" e viram uma aula só.
 * Cada parte tem no máximo {@link SUBTOPIC_PROMPT_MAX} caracteres.
 */
export function buildSubtopicPromptParts(input: SubtopicInput): { part1: string; part2: string } {
  const p = pieces(input);
  const intro = `VAMOS FAZER EM DUAS PARTES, NESTA MESMA CONVERSA: agora o COMANDO 1 (só a aula: teoria, referências e pontos a conferir, SEM questões). Depois eu envio o COMANDO 2, que pede as questões.`;
  const stop = `NÃO escreva questões agora: termine em "=== A CONFERIR ===". As questões vêm no comando 2.`;
  const part1 = fitPrompt(
    p.items.length,
    p.slots,
    (mods, vis) => [intro, p.head, p.updates, p.review, vis, p.sectionRules, p.lesson(mods), p.refs, stop].join("\n\n"),
    itemModules(p.items, p.slots),
  );
  const keys = p.items.map((it) => `${it.key} ${it.title}`).join("\n");
  const part2Text = `COMANDO 2: agora escreva SOMENTE as QUESTÕES DE FIXAÇÃO da aula que você acabou de escrever no comando 1 (subtópico ${label(p.sub)}), no PADRÃO APROVUM.

FORMATO DA RESPOSTA
- SOMENTE as questões, em UM bloco de código, nada antes ou depois. Comece exatamente em "=== QUESTÕES: FÁCIL ===" e não repita a aula, as referências nem o "=== AULA ===".
- Marcadores e campos exatamente iguais aos do modelo abaixo. Cortou? Eu peço "continue": siga de onde parou, sem repetir.

"Item:" DE CADA QUESTÃO = um destes itens do TEXTO-BASE (use o número):
${keys}

${p.qs}

REVISÃO (em silêncio, antes de responder): cada questão com uma só resposta certa; gabarito igual à justificativa; nada que contradiga a aula do comando 1${p.legal ? " nem a lei e a jurisprudência vigentes" : ""}; quantidades certas em cada nível; todos os itens cobrados ao longo dos três níveis.`;
  const part2 = part2Text.length <= SUBTOPIC_PROMPT_MAX ? part2Text : part2Text.replace(keys, keys.split("\n").map((l) => l.split(" ")[0]).join("; "));
  return { part1, part2 };
}

/**
 * Monta o comando e, se passar de {@link SUBTOPIC_PROMPT_MAX}, enxuga: primeiro o esqueleto de cada
 * item vira uma regra só; depois, as regras visuais ficam sem o bloco de exemplo.
 */
function fitPrompt(itemCount: number, slots: number, build: (mods: string, vis: string) => string, itemsMods?: string): string {
  const visual = visualRulesCompact();
  const full = itemsMods ?? "";
  let out = build(full, visual);
  if (out.length <= SUBTOPIC_PROMPT_MAX) return out;
  const per = Math.max(1, Math.ceil(itemCount / slots));
  const rule = `(Um módulo por item${per > 1 ? ` — ou por grupo de ${per} itens seguidos, para caber em 30 seções` : ""}, na ordem do TEXTO-BASE, assim:
=== MÓDULO: <número> <nome do item> ===
--- SEÇÃO: explicação | <nome do item> ---
Itens: <número>)`;
  out = build(rule, visual);
  if (out.length <= SUBTOPIC_PROMPT_MAX) return out;
  return build(rule, visual.slice(0, visual.indexOf(":::exemplo\nSituação")).trimEnd());
}
