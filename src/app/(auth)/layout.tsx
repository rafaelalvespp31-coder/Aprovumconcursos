import Link from "next/link";
import { publicEnv } from "@/lib/env";
import { Notice } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-md flex-col items-center px-5 pt-8">
        <Link href="/" aria-label="APROVUM — início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/aprovum-logo.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={600} height={515} className="h-auto w-[220px] sm:w-[260px]" />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        {!publicEnv().configured && (
          <div className="mb-6">
            <Notice tone="alerta" title="Autenticação não configurada">
              Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para habilitar o login.
            </Notice>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
