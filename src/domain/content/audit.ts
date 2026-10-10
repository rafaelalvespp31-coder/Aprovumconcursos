/**
 * Etapa 6 — Auditoria determinística de cobertura.
 *
 * Compara texto original ↔ mapa de cobertura ↔ plano de aulas (↔ aulas geradas).
 * Nenhuma resposta de IA é aceita sem passar por aqui.
 */
import { detectNumberingGaps } from "./numbering";
import { orderedLessons, type LessonPlan, type PlannedLesson } from "./plan";
import { CONTAINER_KINDS, LEGAL_KINDS, type SourceSpan } from "./types";
import type { ExtractedNode } from "./extract";

export type AuditSeverity = "error" | "warning" | "info";

export type AuditCode =
  | "unassigned_source_text"
  | "numbering_gap"
  | "numbering_out_of_order"
  | "node_not_planned"
  | "empty_container"
  | "unknown_node_reference"
  | "unknown_prerequisite"
  | "prerequisite_after_lesson"
  | "lesson_without_content"
  | "supplementary_without_justification"
  | "duplicate_planning"
  | "needs_external_verification"
  | "planned_not_generated"
  | "generated_out_of_scope"
  | "lesson_without_questions";

export interface AuditIssue {
  code: AuditCode;
  severity: AuditSeverity;
  message: string;
  nodeKeys: string[];
  lessonKeys: string[];
  span?: SourceSpan;
}

export interface GeneratedLessonFacts {
  lessonKey: string;
  /** Nós efetivamente ensinados pela aula gerada (declarados e validados). */
  taughtNodeKeys: string[];
  questionCount: number;
}

export interface AuditInput {
  normalizedText: string;
  nodes: ExtractedNode[];
  unassigned: SourceSpan[];
  plan?: LessonPlan;
  generated?: GeneratedLessonFacts[];
}

export interface AuditReport {
  issues: AuditIssue[];
  summary: {
    totalNodes: number;
    nodesRequiringCoverage: number;
    plannedNodes: number;
    errors: number;
    warnings: number;
    infos: number;
    /** Verdadeiro apenas se não houver nenhum erro estrutural. */
    structurallyComplete: boolean;
  };
}

const LEGAL_REFERENCE = /\b(Lei|Decreto|Decreto-Lei|Lei Complementar|Medida Provisória|Súmula|Constituição|Emenda Constitucional|Resolução|Portaria|Instrução Normativa|C[óo]digo)\b/i;

export function auditPlan(input: AuditInput): AuditReport {
  const { nodes, plan } = input;
  const issues: AuditIssue[] = [];
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.parentKey) {
      const list = childrenOf.get(n.parentKey) ?? [];
      list.push(n.key);
      childrenOf.set(n.parentKey, list);
    }
  }

  // 1. Texto de origem não atribuído a nenhum nó.
  for (const span of input.unassigned) {
    const excerpt = input.normalizedText.slice(span.start, span.end);
    issues.push({
      code: "unassigned_source_text",
      severity: "error",
      message: `Trecho do conteúdo informado não foi associado a nenhum tópico: "${truncate(excerpt, 80)}".`,
      nodeKeys: [],
      lessonKeys: [],
      span,
    });
  }

  // 2. Lacunas de numeração.
  for (const gap of detectNumberingGaps(nodes)) {
    const parent = gap.parentKey ? byKey.get(gap.parentKey) : undefined;
    const where = parent ? ` em "${parent.path}"` : "";
    if (gap.outOfOrder) {
      issues.push({
        code: "numbering_out_of_order",
        severity: "warning",
        message: `Numeração repetida ou fora de ordem${where}. Confira se o conteúdo foi colado corretamente.`,
        nodeKeys: [gap.afterKey, gap.beforeKey].filter((k): k is string => !!k),
        lessonKeys: [],
      });
    } else {
      issues.push({
        code: "numbering_gap",
        severity: "warning",
        message: `Possível omissão${where}: não encontramos ${gap.missing.join(", ")}. Se o item existe no texto oficial, ele não está no conteúdo informado e não será considerado coberto.`,
        nodeKeys: [gap.afterKey, gap.beforeKey].filter((k): k is string => !!k),
        lessonKeys: [],
      });
    }
  }

  // 3. Agrupadores sem conteúdo.
  for (const n of nodes) {
    if (CONTAINER_KINDS.has(n.kind) && !childrenOf.has(n.key)) {
      issues.push({
        code: "empty_container",
        severity: "warning",
        message: `"${n.title}" parece um título sem tópicos abaixo dele.`,
        nodeKeys: [n.key],
        lessonKeys: [],
      });
    }
  }

  // 4. Itens que exigem verificação em fonte oficial.
  const needsVerification = nodes.filter(
    (n) => LEGAL_KINDS.has(n.kind) || LEGAL_REFERENCE.test(n.title),
  );
  if (needsVerification.length) {
    issues.push({
      code: "needs_external_verification",
      severity: "info",
      message: `${needsVerification.length} item(ns) citam legislação ou normas. O conteúdo das aulas sobre eles fica marcado como "não verificado" até a conferência com a fonte oficial.`,
      nodeKeys: needsVerification.map((n) => n.key),
      lessonKeys: [],
    });
  }

  let plannedCount = 0;
  if (plan) {
    const lessons = orderedLessons(plan);
    const position = new Map(lessons.map((l, i) => [l.key, i]));
    const plannedIn = new Map<string, string[]>();

    for (const lesson of lessons) {
      if (lesson.nodeKeys.length === 0 && lesson.supplementary.length === 0) {
        issues.push({
          code: "lesson_without_content",
          severity: "error",
          message: `A aula "${lesson.title}" não está vinculada a nenhum tópico.`,
          nodeKeys: [],
          lessonKeys: [lesson.key],
        });
      }
      for (const s of lesson.supplementary) {
        if (s.justification.trim().length < 10) {
          issues.push({
            code: "supplementary_without_justification",
            severity: "warning",
            message: `O apoio pedagógico "${s.title}" na aula "${lesson.title}" não tem justificativa clara.`,
            nodeKeys: [],
            lessonKeys: [lesson.key],
          });
        }
      }
      for (const key of lesson.nodeKeys) {
        if (!byKey.has(key)) {
          issues.push({
            code: "unknown_node_reference",
            severity: "error",
            message: `A aula "${lesson.title}" referencia um tópico inexistente (${key}).`,
            nodeKeys: [key],
            lessonKeys: [lesson.key],
          });
          continue;
        }
        const list = plannedIn.get(key) ?? [];
        list.push(lesson.key);
        plannedIn.set(key, list);
      }
      for (const pre of lesson.prerequisiteLessonKeys) {
        const p = position.get(pre);
        if (p === undefined) {
          issues.push({
            code: "unknown_prerequisite",
            severity: "error",
            message: `A aula "${lesson.title}" depende de uma aula inexistente (${pre}).`,
            nodeKeys: [],
            lessonKeys: [lesson.key],
          });
        } else if (p >= position.get(lesson.key)!) {
          issues.push({
            code: "prerequisite_after_lesson",
            severity: "warning",
            message: `A aula "${lesson.title}" aparece antes de um de seus pré-requisitos.`,
            nodeKeys: [],
            lessonKeys: [lesson.key, pre],
          });
        }
      }
    }

    for (const n of nodes) {
      if (!n.requiresDirectCoverage) continue;
      if (plannedIn.has(n.key)) {
        plannedCount++;
        continue;
      }
      issues.push({
        code: "node_not_planned",
        severity: "error",
        message: `"${truncate(n.path, 100)}" não tem aula correspondente no planejamento.`,
        nodeKeys: [n.key],
        lessonKeys: [],
      });
    }

    for (const [key, lessonKeys] of plannedIn) {
      if (lessonKeys.length > 2) {
        issues.push({
          code: "duplicate_planning",
          severity: "warning",
          message: `"${truncate(byKey.get(key)!.path, 80)}" aparece em ${lessonKeys.length} aulas; pode haver repetição desnecessária.`,
          nodeKeys: [key],
          lessonKeys,
        });
      }
    }

    // 5. Aulas geradas vs planejadas.
    if (input.generated) {
      const planned = new Map(lessons.map((l) => [l.key, l]));
      for (const g of input.generated) {
        const lesson = planned.get(g.lessonKey);
        if (!lesson) continue;
        const taught = new Set(g.taughtNodeKeys);
        const missing = lesson.nodeKeys.filter((k) => byKey.has(k) && !taught.has(k));
        if (missing.length) {
          issues.push({
            code: "planned_not_generated",
            severity: "error",
            message: `A aula "${lesson.title}" foi gerada sem cobrir ${missing.length} tópico(s) planejado(s).`,
            nodeKeys: missing,
            lessonKeys: [lesson.key],
          });
        }
        const extra = g.taughtNodeKeys.filter((k) => !lesson.nodeKeys.includes(k));
        if (extra.length) {
          issues.push({
            code: "generated_out_of_scope",
            severity: "warning",
            message: `A aula "${lesson.title}" declara ensinar tópicos de outra aula.`,
            nodeKeys: extra,
            lessonKeys: [lesson.key],
          });
        }
        if (g.questionCount === 0) {
          issues.push({
            code: "lesson_without_questions",
            severity: "warning",
            message: `A aula "${lesson.title}" ainda não tem questões de fixação.`,
            nodeKeys: [],
            lessonKeys: [lesson.key],
          });
        }
      }
    }
  }

  const count = (s: AuditSeverity) => issues.filter((i) => i.severity === s).length;
  return {
    issues,
    summary: {
      totalNodes: nodes.length,
      nodesRequiringCoverage: nodes.filter((n) => n.requiresDirectCoverage).length,
      plannedNodes: plannedCount,
      errors: count("error"),
      warnings: count("warning"),
      infos: count("info"),
      structurallyComplete: count("error") === 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Correção automática segura
// ---------------------------------------------------------------------------

export interface Repair {
  action: "assigned_orphan" | "created_lesson" | "removed_unknown_reference" | "removed_unknown_prerequisite";
  nodeKey?: string;
  lessonKey: string;
  detail: string;
}

/**
 * Corrige apenas problemas estruturais inequívocos:
 *  - tópico órfão → aula que já ensina seus irmãos/pai (ou nova aula, se não houver);
 *  - referência a nó/aula inexistente → removida.
 * Nunca remove tópicos do mapa e nunca altera texto de origem.
 */
export function autoRepairPlan(
  plan: LessonPlan,
  nodes: ExtractedNode[],
): { plan: LessonPlan; repairs: Repair[] } {
  const next: LessonPlan = structuredClone(plan);
  const repairs: Repair[] = [];
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const lessons = () => orderedLessons(next);
  const lessonKeys = new Set(lessons().map((l) => l.key));

  for (const lesson of lessons()) {
    const valid = lesson.nodeKeys.filter((k) => byKey.has(k));
    for (const k of lesson.nodeKeys.filter((k) => !byKey.has(k))) {
      repairs.push({ action: "removed_unknown_reference", nodeKey: k, lessonKey: lesson.key, detail: `Referência inexistente ${k} removida.` });
    }
    lesson.nodeKeys = [...new Set(valid)];
    const pre = lesson.prerequisiteLessonKeys.filter((p) => lessonKeys.has(p) && p !== lesson.key);
    for (const p of lesson.prerequisiteLessonKeys.filter((p) => !pre.includes(p))) {
      repairs.push({ action: "removed_unknown_prerequisite", lessonKey: lesson.key, detail: `Pré-requisito inválido ${p} removido.` });
    }
    lesson.prerequisiteLessonKeys = pre;
  }

  const findLessonFor = (node: ExtractedNode): PlannedLesson | undefined => {
    const siblings = nodes.filter((n) => n.parentKey === node.parentKey && n.key !== node.key);
    // Prefere a aula com mais irmãos do nó; depois a que ensina o pai/ancestral mais próximo.
    let best: PlannedLesson | undefined;
    let bestScore = 0;
    for (const l of lessons()) {
      const score = siblings.filter((s) => l.nodeKeys.includes(s.key)).length;
      if (score > bestScore) {
        best = l;
        bestScore = score;
      }
    }
    if (best) return best;
    let anc = node.parentKey ? byKey.get(node.parentKey) : undefined;
    while (anc) {
      const a = anc;
      const hit = lessons().find((l) => l.nodeKeys.includes(a.key));
      if (hit) return hit;
      anc = anc.parentKey ? byKey.get(anc.parentKey) : undefined;
    }
    return undefined;
  };

  const planned = new Set(lessons().flatMap((l) => l.nodeKeys));
  let created = 0;
  for (const node of nodes) {
    if (!node.requiresDirectCoverage || planned.has(node.key)) continue;
    const target = findLessonFor(node);
    if (target) {
      target.nodeKeys.push(node.key);
      repairs.push({ action: "assigned_orphan", nodeKey: node.key, lessonKey: target.key, detail: `"${truncate(node.title, 60)}" incluído na aula "${target.title}".` });
    } else {
      const target = next.modules.at(-1) ?? { key: "M-auto", title: "Tópicos complementares do conteúdo", lessons: [] };
      if (!next.modules.includes(target)) next.modules.push(target);
      const key = `L-auto-${++created}`;
      target.lessons.push({
        key,
        title: node.title,
        objective: `Compreender "${node.title}".`,
        nodeKeys: [node.key],
        supplementary: [],
        prerequisiteLessonKeys: [],
        estimatedMinutes: 20,
      });
      repairs.push({ action: "created_lesson", nodeKey: node.key, lessonKey: key, detail: `Criada aula para "${truncate(node.title, 60)}", que não estava no planejamento.` });
    }
    planned.add(node.key);
  }

  return { plan: next, repairs };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
