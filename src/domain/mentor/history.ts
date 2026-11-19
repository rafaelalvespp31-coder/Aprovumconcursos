/**
 * Histórico do Mentor — conciliação pura entre as recomendações calculadas agora e as já
 * gravadas (deduplicação, dispensa e conclusão confirmada).
 *
 *  - Mesma chave (tipo + entidade) e mesmo contexto já gravados: não grava de novo (refresh e
 *    chamadas concorrentes não duplicam; a constraint única no banco garante o mesmo).
 *  - Contexto mudou de verdade (ex.: aprovou um nível): grava uma nova linha; a anterior fica no
 *    histórico como concluída.
 *  - Dispensada: some para sempre (gravada no banco por chave, em qualquer contexto e sem prazo),
 *    mesmo saindo e entrando de novo no app. Só o aluno a traz de volta (não existe expiração).
 *  - Concluída: só quando a recomendação deixa de valer pelos dados reais (o motor não a gera
 *    mais) — nunca por um clique.
 */
import { DEFAULT_MENTOR_CONFIG, pickTop, type MentorConfig, type Recommendation } from "./engine";

export const RECOMMENDATION_STATUSES = ["nova", "visualizada", "concluida", "dispensada"] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export interface StoredRecommendation {
  id: string;
  key: string;
  contextHash: string;
  status: RecommendationStatus;
  createdAt: string;
  dismissedAt: string | null;
}

export type VisibleRecommendation = Recommendation & { storedId: string | null; status: RecommendationStatus };

export interface Reconciliation {
  /** Novas linhas para gravar: as apresentadas agora com chave + contexto inéditos. */
  toInsert: Recommendation[];
  /** Linhas ativas que deixaram de valer pelos dados reais → concluída. */
  toResolve: string[];
  /** Linhas apresentadas de novo (dispensa vencida ou pendência que reapareceu) → nova. */
  toReactivate: string[];
  /** O que mostrar agora (sem as dispensadas recentes), já limitado. */
  visible: VisibleRecommendation[];
}

const ACTIVE = new Set<RecommendationStatus>(["nova", "visualizada"]);

export function reconcile(all: readonly Recommendation[], stored: readonly StoredRecommendation[], now: Date, cfg: MentorConfig = DEFAULT_MENTOR_CONFIG): Reconciliation {
  const id = (key: string, hash: string) => `${key}\u0000${hash}`;
  // A linha mais recente de cada chave+contexto vale (dados repetidos não confundem).
  const latest = new Map<string, StoredRecommendation>();
  for (const r of [...stored].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) latest.set(id(r.key, r.contextHash), r);
  const current = new Set(all.map((r) => id(r.key, r.contextHash)));
  // Dispensada vale para a chave toda: mudar o contexto ou passar dias não a traz de volta.
  const dispensadas = new Set(stored.filter((r) => r.status === "dispensada").map((r) => r.key));

  const shown: VisibleRecommendation[] = [];
  const reactivate = new Set<string>();
  const seen = new Set<string>();
  for (const r of all) {
    const k = id(r.key, r.contextHash);
    if (seen.has(k)) continue; // duplicada na própria lista
    seen.add(k);
    if (dispensadas.has(r.key)) continue;
    const s = latest.get(k);
    if (!s) {
      shown.push({ ...r, storedId: null, status: "nova" });
      continue;
    }
    if (s.status === "concluida") {
      reactivate.add(s.id);
      shown.push({ ...r, storedId: s.id, status: "nova" });
      continue;
    }
    shown.push({ ...r, storedId: s.id, status: s.status });
  }
  // Ativas que o motor não gera mais (com o mesmo contexto): a pendência foi resolvida.
  const toResolve = [...latest.values()].filter((s) => ACTIVE.has(s.status) && !current.has(id(s.key, s.contextHash))).map((s) => s.id);
  // Só o que foi apresentado vai para o histórico (nada de gravar dezenas de linhas por visita).
  const visible = pickTop(shown, cfg);
  return {
    toInsert: visible.filter((v) => v.storedId === null),
    toResolve,
    toReactivate: visible.filter((v) => v.storedId !== null && reactivate.has(v.storedId)).map((v) => v.storedId!),
    visible,
  };
}
