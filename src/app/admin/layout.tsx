import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/server/services/catalog";
import { DisciplinesSync } from "@/components/disciplines-sync";
import { ensureDisciplines } from "@/server/services/disciplines";
import { getAdminPendencias } from "@/server/services/admin-pendencias";
import { PendenciasSino } from "@/components/admin/pendencias-sino";
import { AssinaturaAviso } from "@/components/admin/assinatura-aviso";

export const metadata = { title: "Administração" };

/** Painel do Admin: catálogo revisado e fila de temas gerados pela IA. Só administradores. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const disciplines = await ensureDisciplines();
  const pend = await getAdminPendencias().catch(() => ({ total: 0, items: [] as Awaited<ReturnType<typeof getAdminPendencias>>["items"] }));
  const nPend = (key: string) => pend.items.find((i) => i.key === key)?.count ?? 0;
  const pendentes = nPend("raiox");
  return (
    <DisciplinesSync list={disciplines}>
      <div className="min-h-dvh lg:flex">
        <AdminNav badges={{ planos: nPend("planos"), avatares: nPend("avatares"), raiox: pendentes }} />
        <div className="min-w-0 flex-1 bg-nevoa/60">
          <div className="flex items-center justify-end gap-3 border-b border-linha bg-superficie px-5 py-2.5">
            <PendenciasSino initial={pend} />
            <AssinaturaAviso />
          </div>
          <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        </div>
      </div>
    </DisciplinesSync>
  );
}
