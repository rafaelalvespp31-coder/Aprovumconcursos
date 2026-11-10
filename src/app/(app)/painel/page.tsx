import { getDashboard } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { getMyAvatarRequest, loadMyAvatar } from "@/server/services/avatar";
import { loadHome } from "@/server/services/gamification";
import { HomeOperacao } from "@/components/home/home-operacao";
import { HeroBanner } from "./hero-banner";
import { listActiveApprovedBanners } from "@/server/services/approved-banners";
import { ackLevelUpsAction, requestAvatarAction, selectSkinAction } from "./avatar-actions";
import { getMyPlan } from "@/server/services/plans";
import { logEvent } from "@/server/observability";
import { getActivePromo } from "@/server/services/promo";
import { PremiumIndicador } from "@/components/promo/premium-indicador";

export const metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

/** Painel (Home): avatar no centro e a gamificação real do aluno ao redor. */
export default async function DashboardPage() {
  const me = await requireUser("/painel");
  const [dash, avatar, request, home, approved, plan, promo] = await Promise.all([
    getDashboard(),
    loadMyAvatar(me.id).catch(async (e) => {
      await logEvent("avatar.load_failed", { error: (e as Error).message });
      return null;
    }),
    getMyAvatarRequest(me.id).catch(() => null),
    loadHome(me.id),
    listActiveApprovedBanners().catch(() => []),
    getMyPlan(me.id).catch(() => null),
    getActivePromo(me.id).catch(() => null),
  ]);
  const name = dash.profile?.display_name ?? null;
  return (
    <>
      {/* Banner dos aprovados: no topo da página; o palco do avatar vem logo abaixo */}
      <div className="cl-banner">
        <HeroBanner name={name?.split(" ")[0] ?? null} extra={approved} />
      </div>
      {promo && (
        <div className="px-3 pt-3 sm:px-0"><PremiumIndicador expiresAt={promo.expiresAt} campaignName={promo.campaignName} /></div>
      )}
      <HomeOperacao
        name={name}
        data={home}
        avatar={avatar ? { config: avatar.config, items: avatar.items, portrait: avatar.portrait } : null}
        request={request}
        canCustomize={!!plan?.unlimited}
        requestAction={requestAvatarAction}
        skins={avatar?.skins ?? []}
        selectSkin={selectSkinAction}
        ackLevels={ackLevelUpsAction}
      />
    </>
  );
}
