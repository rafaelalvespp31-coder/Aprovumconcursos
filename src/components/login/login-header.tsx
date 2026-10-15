import Link from "next/link";
import { Lock } from "lucide-react";

/** Cabeçalho da tela de login: logo APROVUM (V vermelho) e indicadores de sistema. */
export function LoginHeader() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:px-12 lg:pt-8">
      <Link href="/" aria-label="APROVUM — início" className="block w-[min(64vw,300px)] shrink-0 sm:w-[340px] lg:w-[400px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/aprovum-login-logo.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={523} height={107} className="h-auto w-full" />
      </Link>
      <ul className="login-indicadores hidden min-[420px]:flex" aria-label="Indicadores do sistema">
        <li>
          <span className="login-indicador-traco" aria-hidden /> Sistema de treinamento
        </li>
        <li>
          <Lock className="size-3 sm:size-3.5" aria-hidden /> Protocolo de acesso
        </li>
      </ul>
    </header>
  );
}
