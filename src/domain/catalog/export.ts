/**
 * Exporta uma aula do catálogo no MESMO formato de texto que o painel lê (Catalogar aula),
 * e monta o comando do ChatGPT usando essa aula inteira como MODELO OFICIAL — puro.
 * Ida e volta: exportar → colar → ler devolve a mesma estrutura (módulos, seções, itens, questões).
 */
import { DISCIPLINE_LABELS, type DisciplineMode } from "@/ai/pedagogy";
import type { ExtractedNode } from "@/domain/content/extract";

export interface ExportableTopic {
  title: string;
  disciplineMode: string;
  kind: "tema" | "dispositivo";
  lawCode: string | null;
  articles: string[];
  aliases: string[];
  estimatedMinutes: number;
  summary: string | null;
  sourceText: string;
  nodes: ExtractedNode[];
  lesson: {
    objective: string;
    sections: Array<{ kind: string; title: string; bodyMarkdown: string; nodeKeys: string[]; module?: string }>;
    references: Array<{ kind: string; citation: string }>;
    unverifiedClaims: string[];
  };
  questions: Array<{
    level: "facil" | "medio" | "dificil";
    type: string;
    statement: string;
    options: Array<{ label: string; text: string; correct: boolean; explanation: string }>;
    correctAnswerTrue?: boolean | null;
    justification: string;
    nodeKey: string;
    difficulty: number;
    essential: boolean;
  }>;
}

const KIND_LABEL: Record<string, string> = {
  objetivo: "objetivo",
  conhecimentos_previos: "conhecimentos prévios",
  introducao: "introdução",
  explicacao: "explicação",
  conceitos_fundamentais: "conceitos fundamentais",
  aprofundamento: "aprofundamento",
  exemplos: "exemplos",
  comparacao: "comparação",
  aplicacao: "aplicação",
  pegadinhas: "pegadinhas",
  excecoes: "exceções",
  quadro_comparativo: "quadro comparativo",
  esquema: "esquema",
  resumo: "resumo",
  checklist: "checklist",
  referencias: "referências",
  proxima_etapa: "próxima etapa",
  texto_legal: "texto legal",
  doutrina: "doutrina",
  jurisprudencia: "jurisprudência",
  interpretacao_banca: "interpretação da banca",
  flashcards: "flashcards",
};
const REF_LABEL: Record<string, string> = { lei: "Lei", doutrina: "Doutrina", jurisprudencia: "Jurisprudência", texto_informado: "Texto informado", outro: "Outro" };
const LEVEL_TITLE = { facil: "FÁCIL", medio: "MÉDIO", dificil: "DIFÍCIL" } as const;

/** Texto da aula no formato do painel (o mesmo que o ChatGPT deve devolver). */
export function exportTopicText(t: ExportableTopic, part: "tudo" | "aula" | "questoes" = "tudo"): string {
  const byKey = new Map(t.nodes.map((n) => [n.key, n]));
  const item = (k: string) => byKey.get(k)?.path ?? k;
  const out: string[] = [];
  if (part !== "questoes") out.push(
    "=== AULA ===",
    `Título: ${t.title}`,
    `Matéria: ${DISCIPLINE_LABELS[t.disciplineMode as DisciplineMode] ?? t.disciplineMode}`,
    `Tipo: ${t.kind}`,
    `Lei: ${t.kind === "dispositivo" ? (t.lawCode ?? "") : ""}`,
    `Artigos: ${t.kind === "dispositivo" ? t.articles.join(", ") : ""}`,
    `Sinônimos: ${t.aliases.join("; ")}`,
    `Tempo estimado: ${t.estimatedMinutes}`,
    `Objetivo: ${t.lesson.objective.replace(/\s+/g, " ")}`,
    `Resumo: ${(t.summary ?? "").replace(/\s+/g, " ")}`,
    "",
    "=== TEXTO-BASE ===",
    t.sourceText.trim(),
    "",
  );
  let currentModule: string | null = null;
  for (const s of part === "questoes" ? [] : t.lesson.sections) {
    const m = s.module?.trim() || "Aula";
    if (m !== currentModule) {
      out.push(`=== MÓDULO: ${m} ===`, "");
      currentModule = m;
    }
    out.push(`--- SEÇÃO: ${KIND_LABEL[s.kind] ?? s.kind} | ${s.title} ---`);
    if (s.nodeKeys.length) out.push(`Itens: ${s.nodeKeys.map(item).join("; ")}`);
    out.push(s.bodyMarkdown.trim(), "");
  }
  if (part !== "questoes" && t.lesson.references.length) {
    out.push("=== REFERÊNCIAS ===", ...t.lesson.references.map((r) => `${REF_LABEL[r.kind] ?? "Outro"}: ${r.citation}`), "");
  }
  if (part !== "questoes" && t.lesson.unverifiedClaims.length) out.push("=== A CONFERIR ===", ...t.lesson.unverifiedClaims, "");
  for (const lv of part === "aula" ? [] : (["facil", "medio", "dificil"] as const)) {
    const qs = t.questions.filter((q) => q.level === lv);
    if (!qs.length) continue;
    out.push(`=== QUESTÕES: ${LEVEL_TITLE[lv]} ===`, "");
    for (const q of qs) {
      const ce = q.type === "certo_errado";
      out.push("--- QUESTÃO ---", `Tipo: ${ce ? "certo ou errado" : "múltipla escolha"}`, `Item: ${item(q.nodeKey)}`, `Essencial: ${q.essential ? "sim" : "não"}`, `Dificuldade: ${q.difficulty}`, `Enunciado: ${q.statement.trim()}`);
      if (!ce) for (const o of q.options) out.push(`${o.label}) ${o.text.replace(/\s+/g, " ").trim()}`, `Comentário: ${o.explanation.replace(/\s+/g, " ").trim()}`);
      out.push(`Gabarito: ${ce ? (q.correctAnswerTrue ? "Certo" : "Errado") : (q.options.find((o) => o.correct)?.label ?? "")}`, `Justificativa: ${q.justification.trim()}`, "");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Raio-x do modelo, para o comando dizer exatamente o que reproduzir. */
export function modelOutline(t: ExportableTopic) {
  const modules: Array<{ name: string; sections: Array<{ kind: string; title: string }> }> = [];
  for (const s of t.lesson.sections) {
    const name = s.module?.trim() || "Aula";
    let m = modules[modules.length - 1];
    if (!m || m.name !== name) modules.push((m = { name, sections: [] }));
    m.sections.push({ kind: KIND_LABEL[s.kind] ?? s.kind, title: s.title });
  }
  const count = (lv: "facil" | "medio" | "dificil") => {
    const qs = t.questions.filter((q) => q.level === lv);
    return { total: qs.length, me: qs.filter((q) => q.type !== "certo_errado").length, ce: qs.filter((q) => q.type === "certo_errado").length, essential: qs.filter((q) => q.essential).length };
  };
  return { modules, levels: { facil: count("facil"), medio: count("medio"), dificil: count("dificil") }, sections: t.lesson.sections.length };
}

/** Comando para o ChatGPT: a aula-modelo inteira + a ordem de reproduzir a mesma forma no novo tema. */
export function buildModelPrompt(t: ExportableTopic): string {
  const o = modelOutline(t);
  const lv = (k: "facil" | "medio" | "dificil", name: string) =>
    `- ${name}: ${o.levels[k].total} questões (${o.levels[k].me} de múltipla escolha e ${o.levels[k].ce} de certo ou errado; ${o.levels[k].essential} marcadas como essenciais)`;
  const skeleton = o.modules
    .map((m, i) => `${i + 1}. MÓDULO "${m.name}"\n${m.sections.map((s) => `   - SEÇÃO ${s.kind} | ${s.title}`).join("\n")}`)
    .join("\n");
  return `Você vai escrever uma aula completa para concursos públicos (carreiras policiais e jurídicas) no PADRÃO APROVUM.

TEMA DA NOVA AULA: [ESCREVA AQUI O TEMA, A LEI E OS ARTIGOS — ex.: Furto, Código Penal, art. 155]

REGRA PRINCIPAL
Abaixo está a aula "${t.title}", que é o MODELO OFICIAL da plataforma. A nova aula deve ser EXATAMENTE IGUAL a ela na forma:
- os mesmos ${o.modules.length} módulos, na mesma ordem, com os mesmos nomes (troque só o nome do crime/artigo quando aparecer);
- as mesmas ${o.sections} seções, na mesma ordem, do mesmo tipo e com títulos equivalentes (ex.: "Visão geral: o que o art. 121 protege" vira "Visão geral: o que o art. 155 protege");
- o mesmo jeito de escrever: tabelas onde o modelo tem tabelas (com as mesmas colunas), caixas ">" onde o modelo tem caixas (com os mesmos rótulos: "Por que isso importa na prova", "Pegadinha", "A campeã de prova"…), listas, listas numeradas, **negrito** nos termos-chave, checklist com "- [ ]";
- tamanho parecido em cada seção (nem mais curta, nem mais longa que a do modelo);
- o mesmo bloco TEXTO-BASE: o texto LITERAL e VIGENTE dos artigos (um dispositivo por linha) e, em seguida, um sumário numerado de subtemas, como no modelo;
- REFERÊNCIAS e A CONFERIR no mesmo formato;
- as mesmas quantidades de questões:
${lv("facil", "Fácil")}
${lv("medio", "Médio")}
${lv("dificil", "Difícil")}
  com os mesmos campos (Tipo, Item, Essencial, Dificuldade, Enunciado, alternativas A a E com "Comentário:", Gabarito, Justificativa).
- Se o novo tema não tiver alguma parte do modelo (ex.: crime sem forma culposa), mantenha a seção e explique por que o tema não tem aquilo, com o que for equivalente.

ESQUELETO OBRIGATÓRIO (do modelo)
${skeleton}

REGRAS DE CONTEÚDO
- Não copie o conteúdo do modelo: escreva tudo sobre o NOVO tema. Copie só a forma.
- Questões autorais: não atribua a banca nem a concurso real. Gabarito sempre coerente com a justificativa; distribua as letras corretas entre A e E; cada "Item:" deve existir no TEXTO-BASE da nova aula.
- Só cite súmulas, teses e julgados que você tem certeza que existem, com tribunal e número. Nunca invente número de processo, tese ou súmula. O que precisar de conferência vai em "=== A CONFERIR ===".

FORMATO DA RESPOSTA
- Responda SOMENTE com a nova aula, dentro de UM único bloco de código, sem nada antes ou depois.
- Use exatamente os mesmos marcadores do modelo (=== … === e --- … ---) e os mesmos nomes de campos.
- Não use === nem --- dentro do conteúdo. Cada seção com no máximo 10.000 caracteres.
- Se a resposta for cortada por tamanho, eu vou pedir "continue": continue exatamente de onde parou, sem repetir nada e sem explicações.

<<<INÍCIO DO MODELO OFICIAL: ${t.title}>>>
${exportTopicText(t)}<<<FIM DO MODELO OFICIAL>>>`;
}

/**
 * Comando em 2 partes (para quando o comando inteiro fica grande demais para o ChatGPT):
 * parte 1 = a aula (teoria) com o modelo sem questões; parte 2, na MESMA conversa = as questões,
 * com as questões do modelo. No painel, as duas respostas são coladas e publicadas juntas.
 */
export function buildModelPromptParts(t: ExportableTopic): { part1: string; part2: string } {
  const o = modelOutline(t);
  const skeleton = o.modules
    .map((m, i) => `${i + 1}. MÓDULO "${m.name}"\n${m.sections.map((s) => `   - SEÇÃO ${s.kind} | ${s.title}`).join("\n")}`)
    .join("\n");
  const lv = (k: "facil" | "medio" | "dificil", name: string) =>
    `- ${name}: ${o.levels[k].total} questões (${o.levels[k].me} de múltipla escolha e ${o.levels[k].ce} de certo ou errado; ${o.levels[k].essential} marcadas como essenciais)`;
  const part1 = `Você vai escrever uma aula completa para concursos públicos (carreiras policiais e jurídicas) no PADRÃO APROVUM. Vamos fazer em DUAS PARTES nesta mesma conversa: agora a PARTE 1 (a aula, sem questões); depois eu peço a PARTE 2 (as questões).

TEMA DA NOVA AULA: [ESCREVA AQUI O TEMA, A LEI E OS ARTIGOS — ex.: Furto, Código Penal, art. 155]

REGRA PRINCIPAL
Abaixo está a aula "${t.title}" (sem as questões), que é o MODELO OFICIAL da plataforma. A nova aula deve ser EXATAMENTE IGUAL a ela na forma:
- os mesmos ${o.modules.length} módulos, na mesma ordem, com os mesmos nomes (troque só o nome do crime/artigo quando aparecer);
- as mesmas ${o.sections} seções, na mesma ordem, do mesmo tipo e com títulos equivalentes;
- o mesmo jeito de escrever: tabelas onde o modelo tem tabelas (com as mesmas colunas), caixas ">" com os mesmos rótulos, listas, listas numeradas, **negrito** nos termos-chave, checklist com "- [ ]";
- tamanho parecido em cada seção;
- o mesmo bloco TEXTO-BASE: o texto LITERAL e VIGENTE dos artigos (um dispositivo por linha) e, em seguida, um sumário numerado de subtemas;
- REFERÊNCIAS e A CONFERIR no mesmo formato;
- Se o novo tema não tiver alguma parte do modelo, mantenha a seção e explique por que, com o que for equivalente.
- NÃO escreva questões agora (elas vêm na parte 2).

ESQUELETO OBRIGATÓRIO (do modelo)
${skeleton}

REGRAS DE CONTEÚDO
- Não copie o conteúdo do modelo: escreva tudo sobre o NOVO tema. Copie só a forma.
- Só cite súmulas, teses e julgados que você tem certeza que existem, com tribunal e número. Nunca invente. O que precisar de conferência vai em "=== A CONFERIR ===".

FORMATO DA RESPOSTA
- Responda SOMENTE com a parte 1 da nova aula, dentro de UM único bloco de código, sem nada antes ou depois.
- Use exatamente os mesmos marcadores do modelo (=== … === e --- … ---) e os mesmos nomes de campos.
- Não use === nem --- dentro do conteúdo. Cada seção com no máximo 10.000 caracteres.
- Se a resposta for cortada por tamanho, eu vou pedir "continue": continue exatamente de onde parou, sem repetir nada.

<<<INÍCIO DO MODELO OFICIAL (PARTE 1): ${t.title}>>>
${exportTopicText(t, "aula")}<<<FIM DO MODELO OFICIAL (PARTE 1)>>>`;
  const part2 = `PARTE 2: agora escreva as QUESTÕES DE FIXAÇÃO da aula que você acabou de fazer na parte 1 (o mesmo tema), no PADRÃO APROVUM.

REGRA PRINCIPAL
Abaixo estão as questões da aula-modelo "${t.title}". As novas questões devem seguir EXATAMENTE a mesma forma e as mesmas quantidades:
${lv("facil", "Fácil")}
${lv("medio", "Médio")}
${lv("dificil", "Difícil")}
com os mesmos campos (Tipo, Item, Essencial, Dificuldade, Enunciado, alternativas A a E com "Comentário:", Gabarito, Justificativa) e o mesmo estilo e dificuldade de cada nível.

REGRAS
- Cada "Item:" deve existir no TEXTO-BASE da aula que você escreveu na parte 1 (um dispositivo, ex.: § 1º, ou um número do sumário, ex.: 3).
- Questões autorais: não atribua a banca nem a concurso real. Gabarito sempre coerente com a justificativa; distribua as letras corretas entre A e E; não repita questões.
- Não copie as questões do modelo: escreva questões novas sobre o novo tema.

FORMATO DA RESPOSTA
- Responda SOMENTE com as questões, dentro de UM único bloco de código, começando por "=== QUESTÕES: FÁCIL ===", depois "=== QUESTÕES: MÉDIO ===" e "=== QUESTÕES: DIFÍCIL ===", cada questão começando com "--- QUESTÃO ---".
- Se a resposta for cortada por tamanho, eu vou pedir "continue": continue exatamente de onde parou, sem repetir nada.

<<<INÍCIO DAS QUESTÕES DO MODELO: ${t.title}>>>
${exportTopicText(t, "questoes")}<<<FIM DAS QUESTÕES DO MODELO>>>`;
  return { part1, part2 };
}

/** Começo de uma seção, mostrando o estilo (tabela, caixa, lista) sem o texto inteiro. */
export function sectionExcerpt(md: string, max = 160): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let size = 0;
  let table = 0;
  let quote = false;
  for (const raw of lines) {
    const l = raw.length > 120 ? `${raw.slice(0, 117).trimEnd()}…` : raw;
    const isTable = /^\s*\|/.test(l);
    const isQuote = /^\s*>/.test(l);
    // Sempre mostra o começo da primeira tabela (cabeçalho, separador e 1 linha) e a primeira caixa.
    const must = (isTable && table < 3) || (isQuote && !quote);
    if (size >= max && !must) continue;
    if (isTable && table >= 3) continue;
    out.push(l);
    size += l.length;
    if (isTable) table++;
    if (isQuote) quote = true;
  }
  return `${out.join("\n").trim()}\n(…)`;
}

/**
 * Comando COMPACTO (cabe no ChatGPT): esqueleto com o tamanho de cada seção, o começo de cada
 * seção do modelo (mostra tabelas, caixas e listas), um exemplo de cada tipo de questão por nível
 * e as quantidades. A resposta vem inteira (aula + questões), num bloco só.
 */
export function buildCompactPrompt(t: ExportableTopic): string {
  const o = modelOutline(t);
  const byKey = new Map(t.nodes.map((n) => [n.key, n]));
  const item = (k: string) => byKey.get(k)?.path ?? k;
  const round = (n: number) => (n < 1000 ? Math.round(n / 100) * 100 : Math.round(n / 500) * 500);
  const srcLines = t.sourceText.trim().split("\n");
  const law = srcLines.filter((l) => !/^\d+(\.\d+)*\s/.test(l));
  const topics = srcLines.filter((l) => /^\d+(\.\d+)*\s/.test(l));
  const sample: string[] = [];
  sample.push(
    "=== AULA ===",
    `Título: ${t.title}`,
    `Matéria: ${DISCIPLINE_LABELS[t.disciplineMode as DisciplineMode] ?? t.disciplineMode}`,
    `Tipo: ${t.kind}`,
    `Lei: ${t.kind === "dispositivo" ? (t.lawCode ?? "") : ""}`,
    `Artigos: ${t.kind === "dispositivo" ? t.articles.join(", ") : ""}`,
    `Sinônimos: ${t.aliases.slice(0, 4).join("; ")}`,
    `Tempo estimado: ${t.estimatedMinutes}`,
    `Objetivo: ${t.lesson.objective.replace(/\s+/g, " ")}`,
    `Resumo: ${(t.summary ?? "").replace(/\s+/g, " ").slice(0, 240)}`,
    "",
    "=== TEXTO-BASE ===",
    ...law.slice(0, 5),
    law.length > 5 ? "(… o texto literal continua, um dispositivo por linha …)" : "",
    ...topics,
    "",
  );
  let currentModule: string | null = null;
  for (const s of t.lesson.sections) {
    const m = s.module?.trim() || "Aula";
    if (m !== currentModule) {
      sample.push(`=== MÓDULO: ${m} ===`, "");
      currentModule = m;
    }
    sample.push(`--- SEÇÃO: ${KIND_LABEL[s.kind] ?? s.kind} | ${s.title} ---`);
    if (s.nodeKeys.length) sample.push(`Itens: ${s.nodeKeys.slice(0, 4).map(item).join("; ")}${s.nodeKeys.length > 4 ? "; …" : ""}`);
    sample.push(sectionExcerpt(s.bodyMarkdown), "");
  }
  if (t.lesson.references.length) sample.push("=== REFERÊNCIAS ===", ...t.lesson.references.slice(0, 3).map((r) => `${REF_LABEL[r.kind] ?? "Outro"}: ${r.citation}`), "");
  if (t.lesson.unverifiedClaims.length) sample.push("=== A CONFERIR ===", t.lesson.unverifiedClaims[0]!, "");

  const qSample: string[] = [];
  for (const lv of ["facil", "medio", "dificil"] as const) {
    const qs = t.questions.filter((q) => q.level === lv);
    // Um exemplo por nível: certo ou errado no fácil; múltipla escolha no médio e no difícil.
    const want = lv === "facil" ? "certo_errado" : "multipla_escolha";
    const picks = [qs.find((q) => (want === "certo_errado" ? q.type === "certo_errado" : q.type !== "certo_errado")) ?? qs[0]].filter(Boolean) as ExportableTopic["questions"];
    if (!picks.length) continue;
    qSample.push(`=== QUESTÕES: ${LEVEL_TITLE[lv]} ===`, "");
    for (const q of picks) {
      const ce = q.type === "certo_errado";
      qSample.push("--- QUESTÃO ---", `Tipo: ${ce ? "certo ou errado" : "múltipla escolha"}`, `Item: ${item(q.nodeKey)}`, `Essencial: ${q.essential ? "sim" : "não"}`, `Dificuldade: ${q.difficulty}`, `Enunciado: ${q.statement.trim()}`);
      if (!ce) for (const op of q.options) qSample.push(`${op.label}) ${op.text.replace(/\s+/g, " ").trim()}`, `Comentário: ${op.explanation.replace(/\s+/g, " ").trim()}`);
      qSample.push(`Gabarito: ${ce ? (q.correctAnswerTrue ? "Certo" : "Errado") : (q.options.find((x) => x.correct)?.label ?? "")}`, `Justificativa: ${q.justification.trim()}`, "");
    }
    qSample.push(`(… mais questões até completar ${o.levels[lv].total} no nível …)`, "");
  }
  const sizes = new Map(t.lesson.sections.map((s) => [s.title, s.bodyMarkdown.length]));
  const skeleton = o.modules
    .map((m, i) => `${i + 1}. MÓDULO "${m.name}"\n${m.sections.map((s) => `   - ${s.kind} | ${s.title} (~${round(sizes.get(s.title) ?? 1000).toLocaleString("pt-BR")} caracteres)`).join("\n")}`)
    .join("\n");
  const lv = (k: "facil" | "medio" | "dificil", name: string) =>
    `${name}: ${o.levels[k].total} (${o.levels[k].me} múltipla escolha, ${o.levels[k].ce} certo ou errado, ${o.levels[k].essential} essenciais)`;

  return `Escreva uma aula completa para concursos públicos no PADRÃO APROVUM.

TEMA: [ESCREVA AQUI O TEMA, A LEI E OS ARTIGOS — ex.: Furto, Código Penal, art. 155]

Siga EXATAMENTE a forma da aula-modelo "${t.title}" (resumida no fim): os mesmos ${o.modules.length} módulos e as mesmas ${o.sections} seções, na mesma ordem e do mesmo tipo, com títulos equivalentes para o novo tema; tabelas onde o modelo tem tabelas (mesmas colunas), caixas ">" com os mesmos rótulos, listas, **negrito** nos termos-chave, checklist "- [ ]". Cada seção COMPLETA, no tamanho indicado (o modelo mostra só o começo de cada uma, marcado com "(…)"). Não copie o conteúdo do modelo, só a forma. Se o tema não tiver alguma parte, mantenha a seção e explique.

ESQUELETO
${skeleton}

TEXTO-BASE: texto LITERAL e VIGENTE dos artigos, um dispositivo por linha, e depois o sumário numerado dos subtemas.
QUESTÕES (12 por nível): ${lv("facil", "Fácil")}; ${lv("medio", "Médio")}; ${lv("dificil", "Difícil")}. Múltipla escolha com A a E, cada alternativa com "Comentário:". Todas com Item (existente no TEXTO-BASE), Essencial, Dificuldade, Gabarito e Justificativa. Questões autorais, sem banca ou concurso real; gabaritos coerentes e distribuídos entre A e E.
Nunca invente súmula, tese ou julgado; o que precisar de conferência vai em "=== A CONFERIR ===".

COMO RESPONDER
Responda com a aula COMPLETA — da "=== AULA ===" até o fim das questões do nível difícil — num único bloco de código, sem nada fora dele. Se cortar por tamanho, eu escrevo "continue" e você segue exatamente de onde parou, sem repetir nada. Use exatamente os marcadores e campos do modelo; não use === nem --- dentro do conteúdo.

<<<MODELO RESUMIDO: ${t.title}>>>
${sample.join("\n").replace(/\n{3,}/g, "\n\n").trim()}

${qSample.join("\n").replace(/\n{3,}/g, "\n\n").trim()}
<<<FIM DO MODELO>>>`;
}
