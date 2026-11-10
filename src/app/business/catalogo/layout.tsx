import Link from "next/link";
import { DisciplinesSync } from "@/components/disciplines-sync";
import { ensureDisciplines } from "@/server/services/disciplines";
import { requireCatalogEditor } from "@/server/services/catalog";

export const metadata = { title: "Catálogo · APROVUM BUSINESS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Catálogo do SÓCIO: só "Plano de tópicos" e "Catalogar aula", e só se o administrador liberou
 * a permissão (conferida no servidor a cada tela e a cada ação).
 */
export default async function PartnerCatalogLayout({ children }: { children: React.ReactNode }) {
  await requireCatalogEditor();
  const disciplines = await ensureDisciplines();
  return (
    <DisciplinesSync list={disciplines}>
      <div className="min-h-dvh">
        <header className="border-b border-linha bg-superficie">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-extrabold tracking-tight">APROVUM</span>
              <span className="rounded-full bg-tinta px-2 py-0.5 t-tiny font-semibold text-white">Sócio · Catálogo</span>
            </div>
            <nav aria-label="Catálogo do sócio" className="flex flex-wrap gap-x-4 gap-y-1 t-small font-semibold">
              <Link href="/business" className="text-destaque underline-offset-2 hover:underline">Painel do sócio</Link>
              <Link href="/business/catalogo/plano" className="text-destaque underline-offset-2 hover:underline">Plano de tópicos</Link>
              <Link href="/business/catalogo/enviar" className="text-destaque underline-offset-2 hover:underline">Catalogar aula</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
      </div>
    </DisciplinesSync>
  );
}
