import { notFound } from "next/navigation";
import { PendenciasSino } from "@/components/admin/pendencias-sino";

/** Galeria de desenvolvimento: sino de pendências do painel da equipe (bloqueada em produção). */
export default function Page() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_GALLERY !== "1") notFound();
  const initial = {
    total: 3,
    items: [
      { key: "planos", label: "Pedidos de plano", count: 1, href: "/admin/alunos", latestAt: "2026-11-10T13:00:00.000Z" },
      { key: "avatares", label: "Avatares personalizados", count: 2, href: "/admin/avatares", latestAt: "2026-11-10T09:00:00.000Z" },
      { key: "raiox", label: "Pedidos de Raio-X", count: 0, href: "/admin/estrategico", latestAt: null },
    ],
  };
  return (
    <div className="flex justify-end p-6">
      <PendenciasSino initial={initial} />
    </div>
  );
}
