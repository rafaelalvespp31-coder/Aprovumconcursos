import { CentralMissoesView } from "./central-missoes";
import { loadCentralMissoes } from "@/server/services/central-missoes";
import { selecionarMissaoAction } from "@/app/(app)/painel/central-actions";

/** Carrega os editais do aluno e renderiza a Central. Falha de dados não derruba o Painel. */
export async function CentralMissoes({ userId }: { userId: string }) {
  const data = await loadCentralMissoes(userId).catch(() => null);
  if (!data) return null;
  return <CentralMissoesView {...data} action={selecionarMissaoAction} />;
}
