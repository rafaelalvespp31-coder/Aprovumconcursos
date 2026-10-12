import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireAdmin } from "@/server/services/catalog";

export const metadata = { title: "Administração" };

/** Área da equipe: catálogo revisado e fila de temas gerados pela IA. Só administradores. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-linha bg-superficie">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <Logo href="/admin/catalogo" />
            <span className="rounded-full bg-tinta px-2 py-0.5 t-tiny font-semibold text-white">Equipe</span>
          </div>
          <nav aria-label="Administração" className="flex gap-4 t-small font-semibold">
            <Link href="/admin/catalogo" className="text-destaque underline-offset-2 hover:underline">Catálogo</Link>
            <Link href="/admin/fila" className="text-destaque underline-offset-2 hover:underline">Fila da IA</Link>
            <Link href="/painel" className="text-tinta-suave underline-offset-2 hover:underline">Voltar ao app</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
