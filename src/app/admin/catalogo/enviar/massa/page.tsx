import { requireAdmin } from "@/server/services/catalog";
import { BulkUploadView } from "@/app/admin/catalogo/enviar/massa/view";

export const metadata = { title: "Catalogar em massa" };
export const maxDuration = 300;

export default async function BulkUploadPage({ searchParams }: { searchParams: Promise<{ plano?: string; topico?: string }> }) {
  await requireAdmin();
  return <BulkUploadView searchParams={searchParams} base="/admin/catalogo" admin={true} />;
}
