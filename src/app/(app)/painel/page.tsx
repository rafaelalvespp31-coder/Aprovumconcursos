import { redirect } from "next/navigation";
import { getDashboard, listTrails } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { getMyAvatarRequest, loadMyAvatar } from "@/server/services/avatar";
import { loadHome } from "@/server/services/gamification";
import { HomeOperacao } from "@/components/home/home-operacao";
import { HeroBanner } from "./hero-banner";
import { listActiveApprovedBanners } from "@/server/services/approved-banners";
import { ackLevelUpsAction, requestAvatarAction } from "./avatar-actions";
import { logEvent } from "@/server/observability";

export const metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

/** Painel (Home): avatar no centro e a gamificação real do aluno ao redor. */
export default async function DashboardPage() {
  const me = await requireUser("/painel");
  const [trails, dash, avatar, request, home, approved] = await Promise.all([
    listTrails(),
    getDashboard(),
    loadMyAvatar(me.id).catch(async (e) => {
      await logEvent("avatar.load_failed", { error: (e as Error).message });
      return null;
    }),
    getMyAvatarRequest(me.id).catch(() => null),
    loadHome(me.id),
    listActiveApprovedBanners().catch(() => []),
  ]);
  if (trails.length === 0 && !dash.profile?.onboarding_completed)
    redirect("/nova-trilha");
  const name = dash.profile?.display_name ?? null;
  return (
    <>
      <HomeOperacao
        name={name}
        data={home}
        avatar={avatar ? { config: avatar.config, items: avatar.items, portrait: avatar.portrait } : null}
        request={request}
        requestAction={requestAvatarAction}
        ackLevels={ackLevelUpsAction}
      />
      {/* Banner das aprovações: no fim da página */}
      <div className="cl-banner">
        <HeroBanner name={name?.split(" ")[0] ?? null} extra={approved} />
      </div>
    </>
  );
}
