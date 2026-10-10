/**
 * Conversão domínio → payload das funções SQL atômicas (e linhas → domínio).
 * Puro: usado pelo repositório Supabase e pelos testes de banco.
 */
import type { ExtractedNode } from "@/domain/content/extract";
import type { NodeKind } from "@/domain/content/types";
import type { FinalizedPlan } from "../pipeline/types";
import type { LessonOutput, QuestionsOutput } from "@/ai/schemas";
import { VERIFICATION_SENSITIVE } from "@/ai/pedagogy";
import type { LessonStatus } from "../pipeline/generate-lesson";

export function nodesPayload(nodes: ExtractedNode[]) {
  return nodes.map((n, ord) => ({
    key: n.key,
    kind: n.kind,
    marker: n.marker,
    title: n.title,
    source_text: n.sourceText,
    span_start: n.span.start,
    span_end: n.span.end,
    depth: n.depth,
    ord,
    path: n.path,
    parent_key: n.parentKey,
    requires_direct_coverage: n.requiresDirectCoverage,
  }));
}

export interface NodeRow {
  id: string;
  parent_id: string | null;
  key: string;
  kind: string;
  marker: string | null;
  title: string;
  source_text: string;
  span_start: number;
  span_end: number;
  depth: number;
  sort_order: number;
  path: string;
  requires_direct_coverage: boolean;
}

export const NODE_COLUMNS =
  "id, parent_id, key, kind, marker, title, source_text, span_start, span_end, depth, sort_order, path, requires_direct_coverage";

/** Reconstrói os nós de domínio a partir das linhas (ordem entre irmãos recalculada). */
export function rowsToNodes(rows: NodeRow[]): ExtractedNode[] {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const keyById = new Map(rows.map((r) => [r.id, r.key]));
  const siblingCount = new Map<string | null, number>();
  return sorted.map((r) => {
    const parentKey = r.parent_id ? (keyById.get(r.parent_id) ?? null) : null;
    const order = siblingCount.get(parentKey) ?? 0;
    siblingCount.set(parentKey, order + 1);
    return {
      key: r.key,
      kind: r.kind as NodeKind,
      marker: r.marker,
      title: r.title,
      sourceText: r.source_text,
      span: { start: r.span_start, end: r.span_end },
      parentKey,
      depth: r.depth,
      order,
      path: r.path,
      requiresDirectCoverage: r.requires_direct_coverage,
    };
  });
}

export function planPayload(r: FinalizedPlan) {
  return {
    modules: r.plan.modules.map((m) => ({
      key: m.key,
      title: m.title,
      lessons: m.lessons.map((l) => ({
        key: l.key,
        title: l.title,
        objective: l.objective,
        estimatedMinutes: l.estimatedMinutes,
        supplementary: l.supplementary,
        nodeKeys: l.nodeKeys,
        prerequisiteLessonKeys: l.prerequisiteLessonKeys,
      })),
    })),
    analysis: r.analysis.map((a) => ({
      key: a.key,
      relevance: a.relevance,
      needs_verification: a.needsExternalVerification,
      prerequisite_keys: a.prerequisiteKeys,
    })),
    audit: { ...r.audit, repairs: r.repairs, ambiguities: r.ambiguities },
    disciplineMode: r.disciplineMode,
  };
}

export function lessonPayload(out: LessonOutput & { verificationPending: boolean }, status: LessonStatus) {
  return {
    title: out.title,
    status,
    verificationPending: out.verificationPending,
    unverifiedClaims: out.unverifiedClaims,
    taughtNodeKeys: out.taughtNodeKeys,
    references: out.references,
    sections: out.sections.map((s, ord) => ({
      kind: s.kind,
      title: s.title,
      body_markdown: s.bodyMarkdown,
      ord,
      node_keys: s.nodeKeys,
      verification_status: VERIFICATION_SENSITIVE.has(s.kind) && s.kind !== "referencias" ? "pendente" : "nao_aplicavel",
    })),
  };
}

export function questionsPayload(q: QuestionsOutput) {
  return q.questions;
}
