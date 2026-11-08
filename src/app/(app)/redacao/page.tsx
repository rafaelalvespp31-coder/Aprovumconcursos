import { requireUser } from "@/server/auth";
import { aiIsConfigured } from "@/ai";
import { getEvaluation, listHistory } from "@/server/services/redacao";
import { RedacaoHomeElite } from "@/components/redacao/home-elite";

export const metadata = { title: "Redação Elite" };
export const dynamic = "force-dynamic";

export default async function RedacaoHome() {
  const user = await requireUser("/redacao");
  const hist = await listHistory(user.id, 30);
  const ultima = hist.find((h) => h.score !== null && h.max);
  const av = ultima ? await getEvaluation(user.id, ultima.id) : null;
  return <RedacaoHomeElite hist={hist} competencias={av?.status === "concluida" ? av.competencies : []} iaAtiva={aiIsConfigured("redacao")} />;
}
