import { requireUser } from "@/server/auth";
import { Logo } from "@/components/logo";
import { ConnectivityBanner } from "@/components/pwa";
import { AppNav } from "./nav";
import { signOut } from "../(auth)/actions";
import { LogoutButton } from "./logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      <aside className="hidden border-r border-linha bg-superficie md:flex md:min-h-dvh md:flex-col md:gap-8 md:px-4 md:py-6">
        <div className="px-2">
          <Logo href="/painel" />
        </div>
        <AppNav variant="lateral" />
        <div className="mt-auto px-2 t-tiny text-tinta-fraca">
          <p className="truncate">{user.email}</p>
          <form action={signOut} className="mt-2">
            <LogoutButton />
          </form>
        </div>
      </aside>
      <div className="flex min-h-dvh flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        <ConnectivityBanner />
        <header className="flex items-center justify-between border-b border-linha bg-superficie px-4 py-3 md:hidden">
          <Logo href="/painel" />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
      <AppNav variant="inferior" />
    </div>
  );
}
