import { requireUser } from "@/server/auth";
import { getShellSummary } from "@/server/queries";
import { PastelShell } from "@/components/pastel/shell";
import { DisciplinesSync } from "@/components/disciplines-sync";
import { ensureDisciplines } from "@/server/services/disciplines";
import { signOut } from "../(auth)/actions";
import { LogoutButton } from "./logout-button";
import { Suspense } from "react";
import { MentorFloat } from "@/components/mentor/mentor-float";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [summary, disciplines] = await Promise.all([
    getShellSummary(user.email ?? null),
    ensureDisciplines(),
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
    </DisciplinesSync>
  );
}
