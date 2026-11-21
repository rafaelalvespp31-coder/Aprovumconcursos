import { isAdmin, requireUser } from "@/server/auth";
import { getShellSummary } from "@/server/queries";
import { PastelShell } from "@/components/pastel/shell";
import { DisciplinesSync } from "@/components/disciplines-sync";
import { ensureDisciplines } from "@/server/services/disciplines";
import { signOut } from "../(auth)/actions";
import { LogoutButton } from "./logout-button";
import { Suspense } from "react";
import { DailyPlanReminder } from "@/components/mentor/daily-plan-reminder";
import { MentorFloat } from "@/components/mentor/mentor-float";
import { ensurePromo } from "@/server/services/promo";
import { CaveiraPopup } from "@/components/promo/caveira-popup";
import { markPopupSeenAction } from "./promo-actions";
import { logEvent } from "@/server/observability";
import { getEstadoTutoriais } from "@/server/services/tutorial";
import { BoasVindas } from "@/components/plano/boas-vindas";
import { DesafioWatcher } from "@/components/tatico/desafio-watcher";
import { InstalarAppCard } from "@/components/push/instalar-app-card";
import { TutorialProvider } from "@/components/tutorial/tutorial-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  // Tudo em paralelo (antes: resumo, depois administrador, depois promoção, um esperando o outro).
  // Degustação global: concede (idempotente, no banco) e decide a popup. Nunca para administradores.
  const [summary, disciplines, promo, tutoriais] = await Promise.all([
    getShellSummary(user.email ?? null),
    ensureDisciplines(),
    isAdmin().then((adm) =>
      adm ? null : ensurePromo(user.id).catch(async (e) => {
        await logEvent("promo.ensure_failed", { error: (e as Error).message });
        return null;
      }),
    ),
    getEstadoTutoriais(user.id).catch(() => null),
  ]);
  return (
    <DisciplinesSync list={disciplines}>
      <TutorialProvider estado={tutoriais} loginId={user.signedInAt ?? "s"}>
      <PastelShell
        floating={
          <Suspense fallback={null}>
            <MentorFloat loginId={user.signedInAt ?? "s"} />
            <DailyPlanReminder />
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
      <DesafioWatcher />
      <BoasVindas />
      <InstalarAppCard />
      {promo && !promo.popupSeenAt && (
        <CaveiraPopup campaignId={promo.campaignId} days={Math.max(1, Math.round((new Date(promo.expiresAt).getTime() - new Date(promo.startsAt).getTime()) / 86_400_000))} markSeen={markPopupSeenAction} />
      )}
      </TutorialProvider>
    </DisciplinesSync>
  );
}
