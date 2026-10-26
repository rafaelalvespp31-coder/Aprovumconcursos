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
export function exportTopicText(t: ExportableTopic): string {
  const byKey = new Map(t.nodes.map((n) => [n.key, n]));
  const item = (k: string) => byKey.get(k)?.path ?? k;
  const out: string[] = [];
  out.push(
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
  for (const s of t.lesson.sections) {
    const m = s.module?.trim() || "Aula";
    if (m !== currentModule) {
      out.push(`=== MÓDULO: ${m} ===`, "");
      currentModule = m;
    }
    out.push(`--- SEÇÃO: ${KIND_LABEL[s.kind] ?? s.kind} | ${s.title} ---`);
    if (s.nodeKeys.length) out.push(`Itens: ${s.nodeKeys.map(item).join("; ")}`);
    out.push(s.bodyMarkdown.trim(), "");
  }
  if (t.lesson.references.length) {
    out.push("=== REFERÊNCIAS ===", ...t.lesson.references.map((r) => `${REF_LABEL[r.kind] ?? "Outro"}: ${r.citation}`), "");
  }
  if (t.lesson.unverifiedClaims.length) out.push("=== A CONFERIR ===", ...t.lesson.unverifiedClaims, "");
  for (const lv of ["facil", "medio", "dificil"] as const) {
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
