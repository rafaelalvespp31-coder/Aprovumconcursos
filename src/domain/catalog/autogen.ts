/**
 * Geração automática de uma aula do plano de tópicos, em partes controladas (sem depender de uma
 * única resposta gigante): cabeçalho + TEXTO-BASE, um módulo por chamada, referências e as questões
 * de cada nível, uma chamada por nível. Puro: o serviço faz as chamadas à IA e guarda o progresso.
 */
import { itemModules, pieces, type SubtopicInput } from "./subtopic-prompt";
import { visualRulesCompact } from "./export";
import { MIN_VALID_PER_LEVEL, QUESTIONS_PER_LEVEL } from "./delivery";

export type PartKind = "cabecalho" | "modulo" | "referencias" | "questoes";
export type Level = "FÁCIL" | "MÉDIO" | "DIFÍCIL";

export interface GenPart {
  key: string;
  label: string;
  kind: PartKind;
  /** Esqueleto da parte (o que ela deve escrever, nos marcadores exatos). */
  skeleton: string;
  level?: Level;
  /** Mínimos verificáveis da parte. */
  expect: { sections?: number; questions?: number; flashcards?: number };
}

export interface GenPlan {
  /** Regras fixas, iguais em todas as chamadas. */
  rules: string;
  /** Lista numerada de itens do edital (TEXTO-BASE). */
  textoBase: string;
  parts: GenPart[];
}

const LEVELS: Array<{ level: Level; mc: number; ce: number; dif: string; essential: number; style: string }> = [
  { level: "FÁCIL", mc: 6, ce: 6, dif: "1", essential: 6, style: "letra da lei/regras e conceitos diretos" },
  { level: "MÉDIO", mc: 9, ce: 3, dif: "3", essential: 5, style: "casos curtos, aplicação da regra" },
  { level: "DIFÍCIL", mc: 7, ce: 5, dif: "4 ou 5", essential: 2, style: "casos longos estilo FGV, figuras próximas e jurisprudência" },
];

const count = (re: RegExp, s: string) => (s.match(re) ?? []).length;
export const countSections = (t: string) => count(/^---\s*SE[ÇC][ÃA]O\s*:/gim, t);
export const countQuestions = (t: string) => count(/^---\s*QUEST[ÃA]O\s*---\s*$/gim, t);
export const countFlashLines = (t: string) => count(/^\s*(?:→|->)\s*\S/gm, t);

/** Divide o esqueleto completo em: cabeçalho, módulos (um por chamada). */
export function planGeneration(input: SubtopicInput): GenPlan {
  const p = pieces(input);
  const skeleton = p.lesson(itemModules(p.items, p.slots));
  const firstMod = skeleton.search(/^=== MÓDULO:/m);
  const head = skeleton.slice(0, firstMod).trimEnd();
  const mods = skeleton.slice(firstMod).split(/(?=^=== MÓDULO:)/m).map((m) => m.trim()).filter(Boolean);

  const parts: GenPart[] = [{ key: "cabecalho", label: "Cabeçalho e texto-base", kind: "cabecalho", skeleton: head, expect: {} }];
  mods.forEach((m, i) => {
    const title = (m.match(/^=== MÓDULO:\s*(.+?)\s*===/m)?.[1] ?? `Módulo ${i + 1}`).slice(0, 80);
    const isFinal = /Revisão final/i.test(title);
    parts.push({ key: `modulo-${i + 1}`, label: title, kind: "modulo", skeleton: m, expect: { sections: countSections(m), ...(isFinal ? { flashcards: 12 } : {}) } });
  });
  parts.push({ key: "referencias", label: "Referências e itens a conferir", kind: "referencias", skeleton: p.refs, expect: {} });
  for (const L of LEVELS) {
    parts.push({ key: `questoes-${L.level}`, label: `Questões ${L.level.toLowerCase()}`, kind: "questoes", level: L.level, skeleton: `=== QUESTÕES: ${L.level} ===`, expect: { questions: QUESTIONS_PER_LEVEL } });
  }

  const rules = [
    p.head.split("FORMATO OBRIGATÓRIO")[0]!.trim(),
    p.updates,
    p.review,
    visualRulesCompact(),
    p.sectionRules,
    `FORMATO: markdown com parágrafos curtos, **negrito**, listas "-", tabelas "|", caixas ">". Nunca use === ou --- dentro do conteúdo. Cada seção tem no máximo uns 6.000 caracteres: se o assunto for extenso, abra outra seção do mesmo tipo ("… — parte 2") em vez de resumir ou cortar. Nada de resumo para caber: a aula é aprofundada, com toda pegadinha de concurso, toda exceção, todo exemplo e toda didática do assunto.`,
  ].join("\n\n");
  return { rules, textoBase: p.items.map((it) => `${it.key} ${it.title}`).join("\n"), parts };
}

const questionRules = (L: (typeof LEVELS)[number]) =>
  `Escreva EXATAMENTE ${QUESTIONS_PER_LEVEL} questões do nível ${L.level}: ${L.mc} de múltipla escolha e ${L.ce} de certo ou errado; Dificuldade: ${L.dif}; ${L.style}; ${L.essential} marcadas "Essencial: sim". Autorais (sem banca ou concurso real), uma só resposta certa, gabarito igual à justificativa, gabaritos espalhados de A a E, "Item:" existente no TEXTO-BASE, sem repetir as de outros níveis.
Formato de cada questão (múltipla escolha):
--- QUESTÃO ---
Tipo: múltipla escolha
Item: (número do TEXTO-BASE)
Essencial: sim|não
Dificuldade: ${L.dif.split(" ")[0]}
Enunciado: (texto)
A) (alternativa)
Comentário: (por que certa ou errada, uma linha)
(B a E do mesmo jeito)
Gabarito: (letra)
Justificativa: (curta)
Certo ou errado:
--- QUESTÃO ---
Tipo: certo ou errado
Item: (…)
Essencial: sim|não
Dificuldade: ${L.dif.split(" ")[0]}
Enunciado: (afirmação)
Gabarito: Certo|Errado
Justificativa: (começa com "Certo." ou "Errado.")`;

/** Instrução específica de uma parte. `done` = títulos já escritos; `tail` = final do que veio antes. */
export function partPrompt(plan: GenPlan, part: GenPart, done: string[], tail: string): { system: string; prompt: string } {
  const system = `Você é o redator de aulas do APROVUM para concursos públicos. Responda SOMENTE com o texto da parte pedida, no formato exato dos marcadores, sem cerca de código e sem comentários fora do formato.\n\n${plan.rules}`;
  const ctx = `TEXTO-BASE (itens do edital, só use estes números em "Itens:" e "Item:"):\n${plan.textoBase}\n\nJÁ ESCRITO (não repita): ${done.length ? done.join(" | ") : "nada ainda"}\n${tail ? `FINAL DA PARTE ANTERIOR (continue a partir daqui, sem repetir):\n${tail}\n` : ""}`;
  let task: string;
  if (part.kind === "cabecalho") task = `ESCREVA a parte "${part.label}": preencha o cabeçalho "=== AULA ===" (todos os campos, tempo entre 40 e 120 minutos) e o bloco "=== TEXTO-BASE ===" (se for matéria jurídica, antes dos itens o texto LITERAL e VIGENTE dos dispositivos, um por linha; depois a lista numerada de itens EXATAMENTE como no TEXTO-BASE acima). Termine aí; os módulos virão depois. Esqueleto:\n${part.skeleton}`;
  else if (part.kind === "modulo") task = `ESCREVA o módulo "${part.label}" inteiro, completo e aprofundado, mantendo a linha "=== MÓDULO: … ===" e cada "--- SEÇÃO: tipo | Título ---" do esqueleto (pode abrir seções extras "parte 2" se o conteúdo pedir). ${part.expect.flashcards ? 'Neste módulo a seção de flashcards tem 12 a 15 cartões ("**Pergunta?**" e, na linha seguinte, "→ resposta"), a de resumo tem 10 a 14 linhas e o checklist 10 a 15 itens. ' : ""}Esqueleto:\n${part.skeleton}`;
  else if (part.kind === "referencias") task = `ESCREVA as seções de referências e itens a conferir, conforme o esqueleto, listando as leis, súmulas e teses realmente usadas nas partes anteriores e tudo o que merece conferência na fonte oficial:\n${part.skeleton}`;
  else task = `Escreva a linha "=== QUESTÕES: ${part.level} ===" e, depois dela, as questões.\n${questionRules(LEVELS.find((l) => l.level === part.level)!)}`;
  return { system, prompt: `${ctx}\nTAREFA\n${task}` };
}

/** Limpa a resposta: sem cercas de código e sem texto antes do primeiro marcador. */
export function cleanPart(raw: string, kind: PartKind): string {
  let t = raw.replace(/\r\n?/g, "\n").split("\n").filter((l) => !/^\s*```[\w-]*\s*$/.test(l)).join("\n").trim();
  const re = kind === "cabecalho" ? /^=== AULA ===/m : kind === "modulo" ? /^=== MÓDULO:/m : kind === "questoes" ? /^=== QUESTÕES:/m : /^=== (?:REFERÊNCIAS|A CONFERIR) ===/m;
  const i = t.search(re);
  if (i > 0) t = t.slice(i);
  return t.trim();
}

/** Confere o mínimo da parte; devolve o que faltou (vazio = ok). */
export function checkPart(part: GenPart, text: string): string[] {
  const out: string[] = [];
  if (part.kind === "cabecalho" && !/=== TEXTO-BASE ===/.test(text)) out.push("faltou o bloco TEXTO-BASE");
  if (part.kind === "modulo" && !/^=== MÓDULO:/m.test(text)) out.push("faltou a linha do módulo");
  if (part.expect.sections && countSections(text) < part.expect.sections) out.push(`vieram ${countSections(text)} de ${part.expect.sections} seções`);
  if (part.expect.flashcards && countFlashLines(text) < part.expect.flashcards) out.push(`vieram ${countFlashLines(text)} de ${part.expect.flashcards} flashcards`);
  if (part.expect.questions && countQuestions(text) < part.expect.questions) out.push(`vieram ${countQuestions(text)} de ${part.expect.questions} questões`);
  if (part.kind === "referencias" && !/=== A CONFERIR ===/.test(text)) out.push("faltou A CONFERIR");
  return out;
}

export const assemble = (texts: string[]) => texts.map((t) => t.trim()).filter(Boolean).join("\n\n") + "\n";

/** Quanto já foi entregue, a partir do que está salvo (nunca de contagem de chamadas). */
export function progressOf(parts: GenPart[], texts: Array<string | null>) {
  const done = texts.filter((t) => t).length;
  const all = texts.filter((t): t is string => !!t).join("\n");
  const q = (lv: Level) => {
    const i = parts.findIndex((p) => p.level === lv);
    return i >= 0 && texts[i] ? countQuestions(texts[i]!) : 0;
  };
  return {
    done,
    total: parts.length,
    percent: Math.min(99, Math.round((done / parts.length) * 100)),
    modules: { done: parts.filter((p, i) => p.kind === "modulo" && texts[i]).length, total: parts.filter((p) => p.kind === "modulo").length },
    flashcards: countFlashLines(all),
    questions: { FÁCIL: q("FÁCIL"), MÉDIO: q("MÉDIO"), DIFÍCIL: q("DIFÍCIL") },
    minPerLevel: MIN_VALID_PER_LEVEL,
  };
}
