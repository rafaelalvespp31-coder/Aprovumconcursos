import { requireUser } from "@/server/auth";
import { getQuizHome } from "@/server/services/quiz";
import { taticoEstado, taticoStats } from "@/server/services/tatico";
import { TaticoView } from "./tatico-view";

export const metadata = { title: "Desafio Tático" };
export const dynamic = "force-dynamic";

export default async function TaticoPage() {
  await requireUser("/quiz/tatico");
  const [home, est, stats] = await Promise.all([getQuizHome(), taticoEstado(), taticoStats()]);
  const answered = home.level.answered;
  const usados = "usados" in est && typeof est.usados === "number" ? est.usados : 0;
  return <TaticoView inicial={{ usados, limite: 3 }} nivel={{ level: home.level.level, into: answered % 10 }} stats={stats} />;
}
