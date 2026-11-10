import { requireAdmin } from "@/server/services/catalog";
import { PlanView } from "./views";

export const metadata = { title: "Plano de tópicos" };

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  return <PlanView id={id} base="/admin/catalogo" admin />;
}
