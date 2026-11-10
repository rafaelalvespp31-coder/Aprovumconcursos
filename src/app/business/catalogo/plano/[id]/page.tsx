import { requireCatalogEditor } from "@/server/services/catalog";
import { PlanView } from "@/app/admin/catalogo/plano/[id]/views";

export const metadata = { title: "Plano de tópicos" };

export default async function PartnerPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { admin } = await requireCatalogEditor();
  const { id } = await params;
  return <PlanView id={id} base="/business/catalogo" admin={admin} />;
}
