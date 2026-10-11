import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Sem conexão" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
      <Logo />
      <h1 className="t-h1">Sem conexão</h1>
      <p className="text-tinta-suave">
        Esta página ainda não foi aberta neste aparelho. As aulas que você já abriu continuam disponíveis para leitura sem internet.
      </p>
      <p className="text-tinta-suave">Respostas às questões, progresso e geração de aulas voltam a funcionar quando a conexão retornar.</p>
      <Link href="/painel" className="font-semibold text-destaque underline underline-offset-2">
        Tentar abrir o painel
      </Link>
    </main>
  );
}
