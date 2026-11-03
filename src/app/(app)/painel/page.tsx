import { redirect } from "next/navigation";
import { getDashboard, listTrails } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { loadMyAvatar } from "@/server/services/avatar";
import { PainelAvatar } from "@/components/avatar/painel-avatar";
import { saveAvatarAction } from "./avatar-actions";
import { logEvent } from "@/server/observability";

export const metadata = { title: "Painel" };

/** Painel = avatar do aluno (layout oficial). As demais informações ficam nas páginas próprias. */
export default async function DashboardPage() {
  const me = await requireUser("/painel");
  const [trails, dash, avatar] = await Promise.all([
    listTrails(),
    getDashboard(),
    loadMyAvatar(me.id).catch(async (e) => {
      await logEvent("avatar.load_failed", { error: (e as Error).message });
      return null;
    }),
  ]);
  if (trails.length === 0 && !dash.profile?.onboarding_completed) redirect("/nova-trilha");
  return avatar ? (
    <PainelAvatar name={dash.profile?.display_name ?? null} initial={avatar.config} saved={avatar.saved} items={avatar.items} progress={avatar.progress} save={saveAvatarAction} />
  ) : (
    <p role="alert" className="text-white/80">
      Não foi possível carregar seu avatar agora. Recarregue a página.
    </p>
  );
}
