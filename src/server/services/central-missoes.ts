import "server-only";
import { createAdminClient } from "../supabase";
import { getEditaisOverview } from "./edital-overview";
import { missaoVisual, MISSOES_LIMITE } from "@/domain/edital/missao";
import { UserFacingError } from "./trails";

export interface MissaoCard {
  id: string;
  sigla: string;
  nome: string;
  foto: string | null;
  /** Progresso real do edital (0–100) ou null quando ainda não há análise. */
  pct: number | null;
  href: string;
  pronto: boolean;
}
export interface CentralMissoes {
  cards: MissaoCard[];
  selecionado: string | null;
  limite: number;
}

/** Editais do aluno com progresso real + o edital selecionado (persistido). */
export async function loadCentralMissoes(userId: string): Promise<CentralMissoes> {
  const db = createAdminClient();
  const [ov, sel] = await Promise.all([
    getEditaisOverview(userId),
    db.from("central_missoes_selecao").select("preparation_id").eq("user_id", userId).maybeSingle(),
  ]);
  const cards: MissaoCard[] = ov.cards.map((c) => {
    const v = missaoVisual(c.contestName, c.roleName, c.title);
    const p = c.progress;
    const pronto = c.status === "concluido";
    // "Vamos estudar" abre todas as matérias do edital, organizadas, para o aluno escolher por onde começar.
    const href = pronto ? `/meu-concurso/${c.id}?aba=aulas` : `/aprovum-ai/${c.id}`;
    return { id: c.id, sigla: v.sigla, nome: c.contestName ?? c.title, foto: v.foto, pct: pronto && p ? Math.round(p.pct) : null, href, pronto };
  });
  const id = (sel.data?.preparation_id as string | undefined) ?? null;
  return { cards, selecionado: id && cards.some((c) => c.id === id) ? id : null, limite: MISSOES_LIMITE };
}

/** Seleciona (ou limpa, com null) o edital da Central. Só aceita edital do próprio aluno. */
export async function setMissaoSelecionada(userId: string, prepId: string | null): Promise<void> {
  const db = createAdminClient();
  if (!prepId) {
    const r = await db.from("central_missoes_selecao").delete().eq("user_id", userId);
    if (r.error) throw new Error(r.error.message);
    return;
  }
  const own = await db.from("edital_preparations").select("id").eq("id", prepId).eq("user_id", userId).maybeSingle();
  if (!own.data) throw new UserFacingError("Edital não encontrado.", "not_found");
  const r = await db.from("central_missoes_selecao").upsert({ user_id: userId, preparation_id: prepId, selected_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (r.error) throw new Error(r.error.message);
}
