import { isAdmin, requireUser } from "@/server/auth";
import { getShellSummary } from "@/server/queries";
import { PastelShell } from "@/components/pastel/shell";
import { DisciplinesSync } from "@/components/disciplines-sync";
import { ensureDisciplines } from "@/server/services/disciplines";
import { signOut } from "../(auth)/actions";
import { LogoutButton } from "./logout-button";
import { Suspense } from "react";
import { MentorFloat } from "@/components/mentor/mentor-float";
import { ensurePromo } from "@/server/services/promo";
import { CaveiraPopup } from "@/components/promo/caveira-popup";
import { markPopupSeenAction } from "./promo-actions";
import { logEvent } from "@/server/observability";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  // Tudo em paralelo (antes: resumo, depois administrador, depois promoção, um esperando o outro).
  // Degustação global: concede (idempotente, no banco) e decide a popup. Nunca para administradores.
  const [summary, disciplines, promo] = await Promise.all([
    getShellSummary(user.email ?? null),
    ensureDisciplines(),
    isAdmin().then((adm) =>
      adm ? null : ensurePromo(user.id).catch(async (e) => {
        await logEvent("promo.ensure_failed", { error: (e as Error).message });
        return null;
      }),
    ),
  ]);
  return (
    <DisciplinesSync list={disciplines}>
      <PastelShell
        floating={
          <Suspense fallback={null}>
            <MentorFloat />
          </Suspense>
        }
        summary={summary}
        logout={
          <form action={signOut}>
            <LogoutButton variant="icone" />
          </form>
        }
      >
        {children}
      </PastelShell>
      {promo && !promo.popupSeenAt && (
        <CaveiraPopup campaignId={promo.campaignId} days={Math.max(1, Math.round((new Date(promo.expiresAt).getTime() - new Date(promo.startsAt).getTime()) / 86_400_000))} markSeen={markPopupSeenAction} />
      )}
    </DisciplinesSync>
  );
}
