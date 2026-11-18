import { requireUser } from "@/server/auth";
import { taticoEstado, taticoNivel } from "@/server/services/tatico";
import { TaticoView } from "./tatico-view";

export const metadata = { title: "Desafio Tático" };
export const dynamic = "force-dynamic";

/** Só o essencial no servidor (2 consultas leves em paralelo); histórico/estatísticas chegam depois, no cliente. */
export default async function TaticoPage({ searchParams }: { searchParams: Promise<{ jogo?: string }> }) {
  const sp = await searchParams;
  await requireUser("/quiz/tatico");
  const [est, nivel] = await Promise.all([taticoEstado(), taticoNivel()]);
  return <TaticoView inicial={est} nivel={nivel} retomar={sp.jogo === "1"} />;
}
