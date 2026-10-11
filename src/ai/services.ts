/**
 * Serviços de IA (análise, planejamento, aula, questões).
 * Cada serviço: monta o prompt com dados isolados → chama o provedor → valida o
 * resultado de forma determinística contra o mapa de cobertura.
 *
 * Recebem o provedor por parâmetro (injeção de dependência) para serem testáveis.
 */
import type { ExtractedNode } from "@/domain/content/extract";
import type { LessonPlan, PlannedLesson } from "@/domain/content/plan";
import type { AIProvider, AIUsage } from "./provider";
import { z } from "zod";
import {
  analysisSchema,
  lessonSchema,
  planSchema,
  questionsSchema,
  clarificationSchema,
  type ClarificationOutput,
  type AnalysisOutput,
  type LessonOutput,
  type QuestionsOutput,
} from "./schemas";
import { UNTRUSTED_RULES, wrapUntrusted } from "./untrusted";
import {
  DISCIPLINE_LABELS,
  LESSON_SECTION_KINDS,
  REQUIRED_QUESTION_LEVELS,
  SECTION_LABELS,
  VERIFICATION_SENSITIVE,
  disciplineGuide,
  isLegalMode,
  requiredSectionKinds,
  type DisciplineMode,
  type LessonSectionKind,
} from "./pedagogy";

export const AI_LIMITS = {
  /** Máximo de nós por chamada de análise/planejamento (o edital é fatiado). */
  maxNodesPerChunk: 120,
  maxOutputTokens: {
    analyze_content: 8_000,
    plan_lessons: 8_000,
    generate_lesson: 16_000,
    generate_questions: 12_000,
    clarify: 2_500,
  },
} as const;

const BASE_SYSTEM = `Você integra o APROVUM, plataforma de estudos para concursos públicos brasileiros.
Escreva em português do Brasil, com rigor técnico e linguagem clara.
Nunca invente fatos, normas, números, datas, autores, julgados ou estatísticas de bancas.
Quando algo depender de fonte externa que você não pode confirmar, declare isso.
${UNTRUSTED_RULES}`;

export interface Warning {
  code: string;
  message: string;
}

export interface ServiceResult<T> {
  data: T;
  usage: AIUsage;
  model: string;
  provider: string;
  warnings: Warning[];
}

// ---------------------------------------------------------------------------
// Fatiamento: nunca enviar o edital inteiro numa só chamada
// ---------------------------------------------------------------------------

export function chunkNodes(nodes: ExtractedNode[], maxNodes: number = AI_LIMITS.maxNodesPerChunk): ExtractedNode[][] {
  const children = new Map<string | null, ExtractedNode[]>();
  for (const n of nodes) {
    const l = children.get(n.parentKey) ?? [];
    l.push(n);
    children.set(n.parentKey, l);
  }
  const subtree = (n: ExtractedNode): ExtractedNode[] => [n, ...(children.get(n.key) ?? []).flatMap(subtree)];

  const chunks: ExtractedNode[][] = [];
  let current: ExtractedNode[] = [];
  const flush = () => {
    if (current.length) chunks.push(current);
    current = [];
  };
  const place = (n: ExtractedNode) => {
    const tree = subtree(n);
    if (tree.length > maxNodes) {
      // Subárvore grande: o nó vai sozinho (com contexto de caminho) e os filhos são fatiados.
      if (current.length + 1 > maxNodes) flush();
      current.push(n);
      for (const c of children.get(n.key) ?? []) place(c);
      return;
    }
    if (current.length + tree.length > maxNodes) flush();
    current.push(...tree);
  };
  for (const root of children.get(null) ?? []) place(root);
  flush();
  return chunks;
}

function describeNodes(nodes: ExtractedNode[], withText: boolean): string {
  return nodes
    .map((n) => {
      const head = `${n.key} | ${n.kind} | ${n.path}${n.requiresDirectCoverage ? "" : " | (agrupador)"}`;
      return withText ? `${head}\n${n.sourceText}` : head;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Análise de conteúdo
// ---------------------------------------------------------------------------

export async function analyzeChunk(
  provider: AIProvider,
  chunk: ExtractedNode[],
  ctx: { board: string; contentType: string },
): Promise<ServiceResult<AnalysisOutput>> {
  const wrapped = wrapUntrusted(describeNodes(chunk, true));
  const res = await provider.generateStructured({
    task: "analyze_content",
    schemaName: "registrar_analise",
    system: BASE_SYSTEM,
    maxOutputTokens: AI_LIMITS.maxOutputTokens.analyze_content,
    schema: analysisSchema,
    prompt: `Analise os itens extraídos do conteúdo de estudo abaixo (banca: ${ctx.board}; tipo: ${ctx.contentType}).
Para CADA item com chave, informe: relevância relativa dentro deste conteúdo (alta/media/baixa — julgamento pedagógico, não estatística de prova), quais outros itens desta lista são pré-requisitos dele (somente chaves existentes na lista) e se exige verificação em fonte externa (legislação, jurisprudência, versões de software, dados).
Classifique a disciplina predominante. Liste ambiguidades reais de estrutura (ex.: item que parece cortado).
Formato de cada linha: CHAVE | tipo | caminho, seguido do texto original.

${wrapped.text}`,
  });

  const keys = new Set(chunk.map((n) => n.key));
  const warnings: Warning[] = [];
  if (wrapped.suspicious) warnings.push({ code: "prompt_injection_suspect", message: "Conteúdo contém padrões de instrução; tratado como dado." });
  const seen = new Set<string>();
  const nodes = res.data.nodes.filter((n) => {
    if (!keys.has(n.key) || seen.has(n.key)) {
      warnings.push({ code: "unknown_key", message: `Chave ${n.key} ignorada na análise.` });
      return false;
    }
    seen.add(n.key);
    n.prerequisiteKeys = n.prerequisiteKeys.filter((k) => keys.has(k) && k !== n.key);
    return true;
  });
  const missing = chunk.filter((n) => !seen.has(n.key));
  if (missing.length) {
    warnings.push({ code: "analysis_incomplete", message: `${missing.length} item(ns) sem análise; usando valores neutros.` });
  }
  return {
    data: { ...res.data, nodes: removeCycles(nodes) },
    usage: res.usage,
    model: res.model,
    provider: res.provider,
    warnings,
  };
}

/** Remove arestas de pré-requisito que formam ciclos (A→B→A). */
export function removeCycles<T extends { key: string; prerequisiteKeys: string[] }>(items: T[]): T[] {
  const graph = new Map(items.map((i) => [i.key, i]));
  const state = new Map<string, 1 | 2>();
  const visit = (k: string) => {
    state.set(k, 1);
    const item = graph.get(k);
    if (item) {
      item.prerequisiteKeys = item.prerequisiteKeys.filter((p) => {
        if (state.get(p) === 1) return false; // aresta de retorno = ciclo
        if (!state.has(p)) visit(p);
        return true;
      });
    }
    state.set(k, 2);
  };
  for (const i of items) if (!state.has(i.key)) visit(i.key);
  return items;
}

// ---------------------------------------------------------------------------
// Planejamento de aulas
// ---------------------------------------------------------------------------

export async function planChunk(
  provider: AIProvider,
  chunk: ExtractedNode[],
  ctx: { board: string; chunkIndex: number; analysis?: AnalysisOutput },
): Promise<ServiceResult<LessonPlan>> {
  const required = chunk.filter((n) => n.requiresDirectCoverage).map((n) => n.key);
  const prereqInfo = ctx.analysis
    ? ctx.analysis.nodes
        .filter((n) => n.prerequisiteKeys.length)
        .map((n) => `${n.key} depende de ${n.prerequisiteKeys.join(", ")}`)
        .join("\n")
    : "";
  const wrapped = wrapUntrusted(describeNodes(chunk, false));
  const res = await provider.generateStructured({
    task: "plan_lessons",
    schemaName: "registrar_plano",
    system: BASE_SYSTEM,
    maxOutputTokens: AI_LIMITS.maxOutputTokens.plan_lessons,
    schema: planSchema,
    prompt: `Planeje módulos e aulas para os itens abaixo (banca: ${ctx.board}).
Regras obrigatórias:
1. TODAS estas chaves devem aparecer em "nodeKeys" de pelo menos uma aula: ${required.join(", ")}.
2. Referenciar um item pai NÃO cobre os filhos: liste cada chave explicitamente.
3. Ordene do básico ao avançado, respeitando pré-requisitos; use "prerequisiteRefs" com os "ref" de aulas anteriores.
4. Agrupe subtópicos relacionados numa mesma aula; divida tópicos extensos em várias aulas.
5. Assuntos fora da lista só podem entrar em "supplementary", com justificativa pedagógica.
6. "estimatedMinutes" é uma estimativa de estudo da aula.
${prereqInfo ? `Pré-requisitos identificados:\n${prereqInfo}\n` : ""}
${wrapped.text}`,
  });

  const keys = new Set(chunk.map((n) => n.key));
  const warnings: Warning[] = [];
  const prefix = `C${ctx.chunkIndex}`;
  const refMap = new Map<string, string>();
  let li = 0;
  res.data.modules.forEach((m) => m.lessons.forEach((l) => refMap.set(l.ref, `${prefix}-L${++li}`)));

  const plan: LessonPlan = {
    modules: res.data.modules.map((m, mi) => ({
      key: `${prefix}-M${mi + 1}`,
      title: m.title,
      lessons: m.lessons.map<PlannedLesson>((l) => {
        const nodeKeys = [...new Set(l.nodeKeys)].filter((k) => {
          if (keys.has(k)) return true;
          warnings.push({ code: "unknown_key", message: `Aula "${l.title}" citava chave inexistente ${k}; removida.` });
          return false;
        });
        return {
          key: refMap.get(l.ref)!,
          title: l.title,
          objective: l.objective,
          nodeKeys,
          supplementary: l.supplementary,
          prerequisiteLessonKeys: l.prerequisiteRefs.map((r) => refMap.get(r)).filter((k): k is string => !!k),
          estimatedMinutes: l.estimatedMinutes,
        };
      }),
    })),
  };
  return { data: plan, usage: res.usage, model: res.model, provider: res.provider, warnings };
}

// ---------------------------------------------------------------------------
// Geração de aula
// ---------------------------------------------------------------------------

export interface LessonContext {
  board: string;
  disciplineMode: DisciplineMode;
  lesson: PlannedLesson;
  nodes: ExtractedNode[];
  /** Títulos das aulas anteriores, para não repetir conteúdo. */
  previousLessonTitles: string[];
}

/** Ordem canônica das seções: do básico ao avançado, terminando em síntese e checagem. */
const CANONICAL_ORDER: readonly LessonSectionKind[] = [
  "objetivo", "conhecimentos_previos", "introducao", "texto_legal", "explicacao", "conceitos_fundamentais",
  "aprofundamento", "exemplos", "comparacao", "quadro_comparativo", "esquema", "aplicacao", "doutrina",
  "jurisprudencia", "interpretacao_banca", "pegadinhas", "excecoes", "resumo", "checklist", "referencias", "proxima_etapa",
];

/** Requisitos de ensino do tema: modo jurídico e seções obrigatórias. */
export function lessonRequirements(ctx: Pick<LessonContext, "disciplineMode" | "lesson" | "nodes">) {
  const scope = ctx.nodes.filter((n) => ctx.lesson.nodeKeys.includes(n.key));
  const hasLegalSourceText = scope.some((n) => ["artigo", "paragrafo", "inciso", "alinea", "item_legal"].includes(n.kind));
  const legal = isLegalMode(ctx.disciplineMode) || hasLegalSourceText;
  return { scope, legal, required: requiredSectionKinds({ legal, hasLegalSourceText }) };
}

function describeRequired(kinds: readonly LessonSectionKind[]): string {
  return kinds.map((k, i) => `${i + 1}. ${k} (${SECTION_LABELS[k]})`).join("\n");
}

export async function generateLesson(
  provider: AIProvider,
  ctx: LessonContext,
): Promise<ServiceResult<LessonOutput & { verificationPending: boolean; missingKinds: LessonSectionKind[] }>> {
  const { scope, legal, required } = lessonRequirements(ctx);
  const wrapped = wrapUntrusted(describeNodes(scope, true));
  const res = await provider.generateStructured({
    task: "generate_lesson",
    schemaName: "registrar_aula",
    system: `${BASE_SYSTEM}\n\n${legal ? disciplineGuide("direito_constitucional") : ""}`,
    maxOutputTokens: AI_LIMITS.maxOutputTokens.generate_lesson,
    temperature: 0.3,
    schema: lessonSchema,
    prompt: `Escreva a aula "${ctx.lesson.title}" (objetivo: ${ctx.lesson.objective}).
Disciplina: ${DISCIPLINE_LABELS[ctx.disciplineMode]}. Banca de referência: ${ctx.board} (não atribua à banca padrões que você não possa comprovar; se descrever estilo, deixe claro que é orientação geral).
Diretrizes da disciplina: ${disciplineGuide(ctx.disciplineMode)}
${ctx.lesson.supplementary.length ? `Apoio pedagógico a incluir (identifique como complementar): ${ctx.lesson.supplementary.map((s) => s.title).join("; ")}.` : ""}
${ctx.previousLessonTitles.length ? `Aulas anteriores (não repita): ${ctx.previousLessonTitles.slice(-8).join("; ")}.` : ""}
Escopo obrigatório — ensine TODOS estes itens e liste-os em "taughtNodeKeys" (somente os que de fato ensinou): ${ctx.lesson.nodeKeys.join(", ")}.
O aluno só avança para o próximo tema depois de esgotar este. Por isso a aula deve trazer UMA seção de CADA tipo abaixo, nesta ordem, do nível básico ao avançado, cada uma com conteúdo próprio (sem repetir outra seção):
${describeRequired(required)}
Você pode acrescentar "quadro_comparativo" ou "esquema" quando ajudarem. Cada seção informa em "nodeKeys" quais itens trata; todo item do escopo deve aparecer em ao menos uma seção de explicação ou aprofundamento.
Liste em "unverifiedClaims" afirmações que dependem de fonte externa que você não pode confirmar.

${wrapped.text}`,
  });

  const out = validateLesson(res.data, { ...ctx, required });
  return { ...out, usage: res.usage, model: res.model, provider: res.provider };
}

const sectionsOnlySchema = z.object({ sections: lessonSchema.shape.sections.element.array().min(1).max(20) });

/**
 * Gera SOMENTE as seções obrigatórias que faltaram e as encaixa na ordem canônica.
 * Nunca reescreve a aula inteira.
 */
export async function completeLessonSections(
  provider: AIProvider,
  ctx: LessonContext,
  current: LessonOutput,
  missing: LessonSectionKind[],
): Promise<ServiceResult<LessonOutput & { verificationPending: boolean; missingKinds: LessonSectionKind[] }>> {
  const { scope, legal, required } = lessonRequirements(ctx);
  const wrapped = wrapUntrusted(describeNodes(scope, true));
  const res = await provider.generateStructured({
    task: "generate_lesson",
    schemaName: "registrar_secoes",
    system: `${BASE_SYSTEM}\n\n${legal ? disciplineGuide("direito_constitucional") : ""}`,
    maxOutputTokens: AI_LIMITS.maxOutputTokens.generate_lesson,
    temperature: 0.3,
    schema: sectionsOnlySchema,
    prompt: `A aula "${ctx.lesson.title}" já tem estas seções: ${current.sections.map((s) => `${s.kind} ("${s.title}")`).join("; ")}.
Escreva APENAS as seções que faltam, uma de cada tipo, sem repetir o conteúdo existente:
${describeRequired(missing)}
Itens do escopo: ${ctx.lesson.nodeKeys.join(", ")}. Cada seção informa em "nodeKeys" quais itens trata.

${wrapped.text}`,
  });
  const wanted = new Set(missing);
  const added = res.data.sections.filter((s) => wanted.has(s.kind));
  const merged: LessonOutput = { ...current, sections: [...current.sections, ...added] };
  const out = validateLesson(merged, { ...ctx, required });
  return { ...out, usage: res.usage, model: res.model, provider: res.provider };
}

const CITATION_LIKE = /\b(S[úu]mula(?:\s+Vinculante)?\s+n?º?\s*\d+|(?:RE|REsp|HC|ADI|ADPF|AgRg|RHC|MS)\s*n?º?\s*[\d.]+|Tema\s+\d+|\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/i;

/** Validação determinística da aula gerada. Exportada para testes. */
export function validateLesson(
  data: LessonOutput,
  ctx: Pick<LessonContext, "lesson" | "nodes"> & { required?: readonly LessonSectionKind[] },
): { data: LessonOutput & { verificationPending: boolean; missingKinds: LessonSectionKind[] }; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const scope = new Set(ctx.lesson.nodeKeys);
  const byKey = new Map(ctx.nodes.map((n) => [n.key, n]));
  const squash = (s: string) => s.replace(/[\s"“”'‘’]+/g, " ").trim().toLowerCase();

  const seenKinds = new Set<LessonSectionKind>();
  const sections = data.sections.filter((s) => {
    s.nodeKeys = s.nodeKeys.filter((k) => scope.has(k));
    // Uma seção por tipo obrigatório: duplicatas do mesmo tipo são repetição.
    if (ctx.required?.includes(s.kind) && seenKinds.has(s.kind)) {
      warnings.push({ code: "duplicate_section", message: `Seção "${s.kind}" repetida; mantida apenas a primeira.` });
      return false;
    }
    seenKinds.add(s.kind);
    if (s.kind !== "texto_legal") return true;
    // Texto legal só é aceito se for transcrição literal do conteúdo informado.
    const source = s.sourceKey ? byKey.get(s.sourceKey) : undefined;
    const body = squash(s.bodyMarkdown.replace(/^>\s?/gm, "").replace(/[*_`]/g, ""));
    const literal =
      !!source && scope.has(source.key) && body.length >= 10 && squash(source.sourceText).includes(body);
    if (!literal) {
      warnings.push({
        code: "legal_text_not_literal",
        message: `Seção de texto legal descartada: não corresponde literalmente ao conteúdo informado.`,
      });
    }
    return literal;
  });

  const taught = [...new Set(data.taughtNodeKeys)].filter((k) => {
    if (scope.has(k)) return true;
    warnings.push({ code: "out_of_scope_claim", message: `Aula declarou ensinar ${k}, fora do escopo; ignorado.` });
    return false;
  });
  // "Ensinado" exige que alguma seção efetivamente trate o item.
  const treated = new Set(sections.flatMap((s) => s.nodeKeys));
  const taughtVerified = taught.filter((k) => {
    if (treated.has(k)) return true;
    warnings.push({ code: "taught_without_section", message: `Item ${k} declarado como ensinado sem seção correspondente.` });
    return false;
  });

  const unverified = [...data.unverifiedClaims];
  for (const s of sections) {
    const m = s.bodyMarkdown.match(CITATION_LIKE);
    if (m) unverified.push(`Citação "${m[0]}" na seção "${s.title}" precisa ser conferida na fonte oficial.`);
  }
  const verificationPending =
    unverified.length > 0 ||
    sections.some((s) => VERIFICATION_SENSITIVE.has(s.kind) && s.kind !== "referencias") ||
    data.references.some((r) => r.kind !== "texto_informado");

  const order = (k: LessonSectionKind) => {
    const i = CANONICAL_ORDER.indexOf(k);
    return i < 0 ? LESSON_SECTION_KINDS.indexOf(k) + CANONICAL_ORDER.length : i;
  };
  const ordered = ctx.required ? [...sections].sort((a, b) => order(a.kind) - order(b.kind)) : sections;
  const present = new Set(ordered.map((s) => s.kind));
  const missingKinds = (ctx.required ?? []).filter((k) => !present.has(k));
  if (missingKinds.length) {
    warnings.push({ code: "missing_sections", message: `Faltam formas de ensino obrigatórias: ${missingKinds.join(", ")}.` });
  }

  return {
    data: { ...data, sections: ordered, taughtNodeKeys: taughtVerified, unverifiedClaims: unverified, verificationPending, missingKinds },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Questões
// ---------------------------------------------------------------------------

/** Quantas questões de fixação gerar para um tema: no mínimo 10, uma por item, no máximo 15. */
export function questionCountFor(scopeSize: number): number {
  return Math.min(15, Math.max(10, scopeSize));
}

export interface QuestionGaps {
  missingLevels: number[];
  uncoveredNodeKeys: string[];
}

/** O que falta para a fixação esgotar o tema: todos os níveis 1–5 e todos os itens. */
export function questionGaps(questions: QuestionsOutput["questions"], scopeKeys: readonly string[]): QuestionGaps {
  const levels = new Set(questions.map((q) => q.difficulty));
  const nodes = new Set(questions.map((q) => q.nodeKey));
  return {
    missingLevels: REQUIRED_QUESTION_LEVELS.filter((l) => !levels.has(l)),
    uncoveredNodeKeys: scopeKeys.filter((k) => !nodes.has(k)),
  };
}

const LEVEL_LABELS: Record<number, string> = {
  1: "1 — memorização/reconhecimento do conceito",
  2: "2 — compreensão (explicar com outras palavras)",
  3: "3 — aplicação em caso simples",
  4: "4 — análise (comparar, distinguir exceções e pegadinhas)",
  5: "5 — avançada (caso complexo, várias regras combinadas)",
};

export async function generateQuestions(
  provider: AIProvider,
  ctx: {
    board: string;
    lesson: PlannedLesson;
    lessonMarkdown: string;
    nodes: ExtractedNode[];
    count: number;
    /** Rodada complementar: só os níveis/itens que faltaram, sem repetir enunciados. */
    focus?: QuestionGaps & { existingStatements: string[] };
  },
): Promise<ServiceResult<QuestionsOutput> & { gaps: QuestionGaps }> {
  const scope = ctx.nodes.filter((n) => ctx.lesson.nodeKeys.includes(n.key) && n.requiresDirectCoverage);
  const scopeKeys = scope.map((n) => n.key);
  const wrapped = wrapUntrusted(ctx.lessonMarkdown.slice(0, 30_000), "aula_de_referencia");
  const describe = (keys: readonly string[]) =>
    scope.filter((n) => keys.includes(n.key)).map((n) => `${n.key} (${n.title.slice(0, 60)})`).join("; ");
  const focus = ctx.focus;
  const distribution = focus
    ? `Esta é uma rodada COMPLEMENTAR. Gere ${ctx.count} questões que cubram exatamente o que faltou:
${focus.missingLevels.length ? `- níveis de dificuldade ausentes (ao menos uma questão de cada): ${focus.missingLevels.map((l) => LEVEL_LABELS[l]).join("; ")}` : ""}
${focus.uncoveredNodeKeys.length ? `- itens ainda sem questão (ao menos uma por item): ${describe(focus.uncoveredNodeKeys)}` : ""}
Não repita nem parafraseie estes enunciados já existentes: ${focus.existingStatements.map((t) => `"${t.slice(0, 80)}"`).join("; ")}.`
    : `Cubra TODOS os itens (ao menos uma questão por item): ${describe(scopeKeys)}.
Use TODOS os níveis de dificuldade, ao menos uma questão de cada, em progressão:
${REQUIRED_QUESTION_LEVELS.map((l) => `- ${LEVEL_LABELS[l]}`).join("\n")}`;
  const res = await provider.generateStructured({
    task: "generate_questions",
    schemaName: "registrar_questoes",
    system: BASE_SYSTEM,
    maxOutputTokens: AI_LIMITS.maxOutputTokens.generate_questions,
    temperature: 0.4,
    schema: questionsSchema,
    prompt: `Elabore ${ctx.count} questões ORIGINAIS de fixação sobre a aula abaixo, no estilo geral de provas da banca ${ctx.board}.
São questões de treinamento elaboradas pela plataforma: nunca as apresente como questões oficiais nem cite prova/ano.
O aluno só avança para o próximo tema depois de responder todas elas, então juntas devem esgotar o tema.
${distribution}
Marque "essential" nas que verificam o conceito central de cada item.
- multipla_escolha/situacional: 4 ou 5 alternativas, exatamente UMA correta, todas com explicação.
- certo_errado: sem alternativas, informe "correctAnswerTrue".
Cada questão deve ser respondível com base na aula. Marque "dependsOnExternalSource" quando depender de lei/jurisprudência.

${wrapped.text}`,
  });
  const v = validateQuestions(res.data, new Set(scopeKeys), focus?.existingStatements);
  const gaps = questionGaps(v.data.questions, scopeKeys);
  const warnings = [...v.warnings];
  if (!focus && (gaps.missingLevels.length || gaps.uncoveredNodeKeys.length)) {
    warnings.push({
      code: "questions_incomplete",
      message: `Faltaram níveis [${gaps.missingLevels.join(", ")}] e itens [${gaps.uncoveredNodeKeys.join(", ")}] nas questões.`,
    });
  }
  return { data: v.data, warnings, gaps, usage: res.usage, model: res.model, provider: res.provider };
}

/** Validação determinística das questões. Exportada para testes. */
export function validateQuestions(
  data: QuestionsOutput,
  scope: ReadonlySet<string>,
  existingStatements: readonly string[] = [],
): { data: QuestionsOutput; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const normalize = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
  const seen = new Set<string>(existingStatements.map(normalize));
  const questions = data.questions.filter((q, i) => {
    const reject = (why: string) => {
      warnings.push({ code: "question_rejected", message: `Questão ${i + 1} descartada: ${why}` });
      return false;
    };
    if (!scope.has(q.nodeKey)) return reject("tópico fora do escopo da aula.");
    const norm = normalize(q.statement);
    if (seen.has(norm)) return reject("enunciado repetido.");
    seen.add(norm);
    if (q.type === "certo_errado") {
      if (typeof q.correctAnswerTrue !== "boolean") return reject("item certo/errado sem gabarito.");
      q.options = [];
      return true;
    }
    if (q.options.length < 4) return reject("menos de 4 alternativas.");
    if (q.options.filter((o) => o.correct).length !== 1) return reject("não há exatamente uma alternativa correta.");
    const texts = new Set(q.options.map((o) => o.text.trim().toLowerCase()));
    if (texts.size !== q.options.length) return reject("alternativas duplicadas.");
    q.options = q.options.map((o, idx) => ({ ...o, label: String.fromCharCode(65 + idx) }));
    delete q.correctAnswerTrue;
    return true;
  });
  return { data: { questions }, warnings };
}

// ---------------------------------------------------------------------------
// Esclarecimento de conceito (sem sair da aula)
// ---------------------------------------------------------------------------

export async function clarifyConcept(
  provider: AIProvider,
  ctx: { board: string; lessonTitle: string; sectionTitle: string | null; sectionMarkdown: string; sourceText: string; question: string },
): Promise<ServiceResult<ClarificationOutput & { verificationPending: boolean }>> {
  const q = wrapUntrusted(ctx.question.slice(0, 500), "pergunta_do_aluno");
  const material = wrapUntrusted(`${ctx.sourceText.slice(0, 6000)}\n\n---\n\n${ctx.sectionMarkdown.slice(0, 12000)}`, "material_da_aula");
  const res = await provider.generateStructured({
    task: "review_content",
    schemaName: "registrar_esclarecimento",
    system: `${BASE_SYSTEM}\nVocê responde dúvidas pontuais de um aluno durante a aula, de forma curta, didática e precisa.`,
    maxOutputTokens: AI_LIMITS.maxOutputTokens.clarify,
    temperature: 0.3,
    schema: clarificationSchema,
    prompt: `Aula: "${ctx.lessonTitle}"${ctx.sectionTitle ? `, seção "${ctx.sectionTitle}"` : ""}. Banca de referência: ${ctx.board}.
Responda à pergunta do aluno em até ~250 palavras, com um exemplo concreto quando ajudar.
Use o material da aula como base. Se a pergunta fugir do assunto da aula, diga isso em uma frase e oriente o aluno.
Não invente normas, números de artigos, súmulas ou julgados; liste em "unverifiedClaims" o que depende de fonte externa.

${material.text}

${q.text}`,
  });
  const m = res.data.answerMarkdown.match(CITATION_LIKE);
  const unverified = [...res.data.unverifiedClaims];
  if (m) unverified.push(`Citação "${m[0]}" precisa ser conferida na fonte oficial.`);
  const warnings: Warning[] = q.suspicious ? [{ code: "prompt_injection_suspect", message: "Pergunta contém padrões de instrução; tratada como dado." }] : [];
  return {
    data: { ...res.data, unverifiedClaims: unverified, verificationPending: unverified.length > 0 },
    usage: res.usage,
    model: res.model,
    provider: res.provider,
    warnings,
  };
}
