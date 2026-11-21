import { AdminNav } from "@/components/admin/admin-nav";
import { EMPTY_BADGES, type NavBadges } from "@/components/admin/nav-data";
import { requireAdmin } from "@/server/services/catalog";
import { DisciplinesSync } from "@/components/disciplines-sync";
import { ensureDisciplines } from "@/server/services/disciplines";
import { Suspense } from "react";
import { getAdminPendencias } from "@/server/services/admin-pendencias";
import { PendenciasSino } from "@/components/admin/pendencias-sino";
import { AssinaturaAviso } from "@/components/admin/assinatura-aviso";

export const metadata = { title: "Administração" };

const PEND_VAZIA = { total: 0, items: [] as Awaited<ReturnType<typeof getAdminPendencias>>["items"] };
const nPend = (p: typeof PEND_VAZIA, key: string) => p.items.find((i) => i.key === key)?.count ?? 0;
const badgesOf = (p: typeof PEND_VAZIA): NavBadges => ({ planos: nPend(p, "planos"), equipe: nPend(p, "equipe"), avatares: nPend(p, "avatares"), raiox: nPend(p, "raiox"), pagamentos: nPend(p, "pagamentos"), feedbacks: nPend(p, "feedbacks"), indicacoes: nPend(p, "indicacoes"), parceiros: nPend(p, "parceiros") });

// As pendências carregam à parte: a página não espera por elas para aparecer.
async function MenuComAvisos() {
  const pend = await getAdminPendencias().catch(() => PEND_VAZIA);
  return <AdminNav badges={badgesOf(pend)} />;
}
async function BarraSuperior() {
  const pend = await getAdminPendencias().catch(() => PEND_VAZIA);
  return (
    <>
      <PendenciasSino initial={pend} />
      <AssinaturaAviso />
    </>
  );
}

/** Painel do Admin: catálogo revisado e fila de temas gerados pela IA. Só administradores. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const disciplines = await ensureDisciplines();
  return (
    <DisciplinesSync list={disciplines}>
      <div className="min-h-dvh lg:flex">
        <Suspense fallback={<AdminNav badges={EMPTY_BADGES} />}>
          <MenuComAvisos />
        </Suspense>
        <div className="adm min-w-0 flex-1">
          <div className="flex items-center justify-end gap-3 border-b border-linha bg-white/80 px-5 py-2.5 backdrop-blur">
            <Suspense fallback={null}>
              <BarraSuperior />
            </Suspense>
          </div>
          <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        </div>
      </div>
    </DisciplinesSync>
  );
}
