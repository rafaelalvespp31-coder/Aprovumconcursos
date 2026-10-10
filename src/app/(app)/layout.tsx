import { requireUser } from "@/server/auth";
import { getShellSummary } from "@/server/queries";
import { PastelShell } from "@/components/pastel/shell";
import { signOut } from "../(auth)/actions";
import { LogoutButton } from "./logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const summary = await getShellSummary(user.email ?? null);
  return (
    <PastelShell
      summary={summary}
      logout={
        <form action={signOut}>
          <LogoutButton variant="icone" />
        </form>
      }
    >
      {children}
    </PastelShell>
  );
}
