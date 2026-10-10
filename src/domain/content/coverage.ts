/**
 * Controle de cobertura (seção 11): registros independentes por unidade, com
 * agregação hierárquica. Um nó só é "totalmente coberto" quando ele (se tiver
 * conteúdo próprio) e TODOS os descendentes foram ensinados.
 */
import type { ExtractedNode } from "./extract";

export type VerificationStatus = "nao_aplicavel" | "pendente" | "verificada" | "divergente";

export interface NodeFacts {
  planned: boolean;
  taught: boolean;
  questionsAvailable: number;
  questionsAnswered: number;
  mastered: boolean;
  verification: VerificationStatus;
  lastVerifiedAt: string | null;
}

export type CoverageStatus =
  | "pendente" // nada planejado
  | "planejado" // planejado, ainda não ensinado
  | "incompleto" // parte do escopo ensinada
  | "ensinado" // todo o escopo ensinado
  | "praticado" // ensinado e com exercícios respondidos
  | "dominado"; // domínio demonstrado em todo o escopo

export interface NodeCoverage extends NodeFacts {
  key: string;
  status: CoverageStatus;
  /** Descendentes (incluindo o próprio, se exigir cobertura) que precisam ser ensinados. */
  scopeSize: number;
  scopeTaught: number;
  scopeMastered: number;
  needsReview: boolean;
  reasons: string[];
}

const EMPTY: NodeFacts = {
  planned: false,
  taught: false,
  questionsAvailable: 0,
  questionsAnswered: 0,
  mastered: false,
  verification: "nao_aplicavel",
  lastVerifiedAt: null,
};

export function computeCoverage(
  nodes: ExtractedNode[],
  facts: ReadonlyMap<string, Partial<NodeFacts>>,
): Map<string, NodeCoverage> {
  const children = new Map<string, ExtractedNode[]>();
  for (const n of nodes) {
    if (!n.parentKey) continue;
    const l = children.get(n.parentKey) ?? [];
    l.push(n);
    children.set(n.parentKey, l);
  }
  const result = new Map<string, NodeCoverage>();

  const visit = (n: ExtractedNode): NodeCoverage => {
    const own: NodeFacts = { ...EMPTY, ...facts.get(n.key) };
    let scopeSize = 0;
    let scopeTaught = 0;
    let scopeMastered = 0;
    let scopePlanned = 0;
    let practiced = 0;
    let verificationIssue = false;
    let unverified = false;

    if (n.requiresDirectCoverage) {
      scopeSize++;
      if (own.planned) scopePlanned++;
      if (own.taught) scopeTaught++;
      if (own.mastered) scopeMastered++;
      if (own.questionsAnswered > 0) practiced++;
      if (own.verification === "divergente") verificationIssue = true;
      if (own.verification === "pendente") unverified = true;
    }
    for (const c of children.get(n.key) ?? []) {
      const cc = visit(c);
      scopeSize += cc.scopeSize;
      scopeTaught += cc.scopeTaught;
      scopeMastered += cc.scopeMastered;
      scopePlanned += cc.status === "pendente" ? 0 : cc.scopeSize;
      if (cc.status === "praticado" || cc.status === "dominado") practiced += cc.scopeSize;
      if (cc.verification === "divergente") verificationIssue = true;
      if (cc.verification === "pendente") unverified = true;
    }

    const reasons: string[] = [];
    let status: CoverageStatus;
    if (scopeSize === 0) {
      status = "pendente";
      reasons.push("Sem conteúdo a ensinar abaixo deste item.");
    } else if (scopeMastered === scopeSize) {
      status = "dominado";
    } else if (scopeTaught === scopeSize) {
      status = practiced >= scopeSize ? "praticado" : "ensinado";
    } else if (scopeTaught > 0) {
      status = "incompleto";
      reasons.push(`${scopeSize - scopeTaught} de ${scopeSize} item(ns) ainda não ensinados.`);
    } else if (scopePlanned > 0) {
      status = "planejado";
    } else {
      status = "pendente";
      reasons.push("Ainda não planejado.");
    }
    if (unverified) reasons.push("Contém informação ainda não verificada em fonte oficial.");
    if (verificationIssue) reasons.push("Divergência com a fonte oficial: conteúdo precisa de atualização.");

    const cov: NodeCoverage = {
      ...own,
      verification: verificationIssue ? "divergente" : unverified ? "pendente" : own.verification,
      key: n.key,
      status,
      scopeSize,
      scopeTaught,
      scopeMastered,
      needsReview: verificationIssue,
      reasons,
    };
    result.set(n.key, cov);
    return cov;
  };

  for (const n of nodes) if (!n.parentKey) visit(n);
  return result;
}
