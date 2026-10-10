import { requireUser } from "@/server/auth";
import { AppShell } from "@/components/app-shell";
import { signOut } from "../(auth)/actions";
import { LogoutButton } from "./logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell
      email={user.email}
      footer={
        <form action={signOut} className="mt-2">
          <LogoutButton />
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
