import { requireUser } from "@/server/auth";
import { loadContests } from "@/server/services/gamification";
import { ConcursosView } from "@/components/concursos/concursos-view";

export const metadata = { title: "Concursos" };
export const dynamic = "force-dynamic";

export default async function ConcursosPage() {
  await requireUser("/concursos");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const contests = await loadContests(today, 100).catch(() => []);
  return <ConcursosView contests={contests} today={today} />;
}
