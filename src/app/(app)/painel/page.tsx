import { redirect } from "next/navigation";
import { getDashboard, listTrails } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { getMyAvatarRequest, loadMyAvatar } from "@/server/services/avatar";
import { PainelAvatar } from "@/components/avatar/painel-avatar";
import { HeroBanner } from "./hero-banner";
import { requestAvatarAction, saveAvatarAction } from "./avatar-actions";
import { logEvent } from "@/server/observability";

export const metadata = { title: "Painel" };

/** Painel: banner com as aprovações, card do avatar e "Solicitar meu avatar". */
export default async function DashboardPage() {
  const me = await requireUser("/painel");
  const [trails, dash, avatar, request] = await Promise.all([
    listTrails(),
    getDashboard(),
    loadMyAvatar(me.id).catch(async (e) => {
      await logEvent("avatar.load_failed", { error: (e as Error).message });
      return null;
    }),
    getMyAvatarRequest(me.id).catch(() => null),
  ]);
  if (trails.length === 0 && !dash.profile?.onboarding_completed) redirect("/nova-trilha");
  const name = dash.profile?.display_name ?? null;
  return (
    <>
      <HeroBanner name={name?.split(" ")[0] ?? null} />
      {avatar ? (
        <PainelAvatar name={name} initial={avatar.config} saved={avatar.saved} items={avatar.items} progress={avatar.progress} save={saveAvatarAction} request={request} requestAction={requestAvatarAction} />
      ) : (
        <p role="alert" className="text-white/80">
          Não foi possível carregar seu avatar agora. Recarregue a página.
        </p>
      )}
    </>
  );
}
