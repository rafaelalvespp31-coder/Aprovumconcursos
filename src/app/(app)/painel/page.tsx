import { redirect } from "next/navigation";
import { getDashboard, listTrails } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { getMyAvatarRequest, loadMyAvatar } from "@/server/services/avatar";
import { loadHome } from "@/server/services/gamification";
import { HomeOperacao } from "@/components/home/home-operacao";
import { ackLevelUpsAction, requestAvatarAction } from "./avatar-actions";
import { logEvent } from "@/server/observability";

export const metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

/** Painel (Home): avatar no centro e a gamificação real do aluno ao redor. */
export default async function DashboardPage() {
  const me = await requireUser("/painel");
  const [trails, dash, avatar, request, home] = await Promise.all([
    listTrails(),
    getDashboard(),
    loadMyAvatar(me.id).catch(async (e) => {
      await logEvent("avatar.load_failed", { error: (e as Error).message });
      return null;
    }),
    getMyAvatarRequest(me.id).catch(() => null),
    loadHome(me.id),
  ]);
  if (trails.length === 0 && !dash.profile?.onboarding_completed) redirect("/nova-trilha");
  return (
    <HomeOperacao
      name={dash.profile?.display_name ?? null}
      data={home}
      avatar={avatar ? { config: avatar.config, items: avatar.items } : null}
      request={request}
      requestAction={requestAvatarAction}
      ackLevels={ackLevelUpsAction}
    />
  );
}
