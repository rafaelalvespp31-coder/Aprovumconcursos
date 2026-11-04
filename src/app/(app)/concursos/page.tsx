import { requireUser } from "@/server/auth";
import { loadAllContests, loadContestPrefs } from "@/server/services/gamification";
import { ConcursosView } from "@/components/concursos/concursos-view";
import { toggleAlertAction, toggleFavoriteAction } from "./actions";

export const metadata = { title: "Concursos" };
export const dynamic = "force-dynamic";

export default async function ConcursosPage() {
  const user = await requireUser("/concursos");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [contests, prefs] = await Promise.all([loadAllContests().catch(() => []), loadContestPrefs(user.id).catch(() => ({ favorites: [], alerts: [] }))]);
  return <ConcursosView contests={contests} today={today} favorites={prefs.favorites} alerts={prefs.alerts} toggleFavorite={toggleFavoriteAction} toggleAlert={toggleAlertAction} />;
}
