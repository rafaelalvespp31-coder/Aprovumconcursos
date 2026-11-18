import { requireUser } from "@/server/auth";
import { getMyPlan } from "@/server/services/plans";
import { taticoEstado, taticoNivel } from "@/server/services/tatico";
import { TaticoView } from "./tatico-view";

export const metadata = { title: "Desafio Tático" };
export const dynamic = "force-dynamic";

/** Só o essencial no servidor (3 consultas leves em paralelo); histórico/estatísticas chegam depois, no cliente. */
export default async function TaticoPage({ searchParams }: { searchParams: Promise<{ jogo?: string }> }) {
  const sp = await searchParams;
  const me = await requireUser("/quiz/tatico");
  const [est, nivel, plan] = await Promise.all([taticoEstado(), taticoNivel(), getMyPlan(me.id)]);
  return <TaticoView inicial={est} nivel={nivel} admin={plan.admin} retomar={sp.jogo === "1"} />;
}
