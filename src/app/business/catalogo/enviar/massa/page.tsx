import { requireCatalogEditor } from "@/server/services/catalog";
import { BulkUploadView } from "@/app/admin/catalogo/enviar/massa/view";

export const metadata = { title: "Catalogar em massa" };
export const maxDuration = 300;

export default async function BulkUploadPage({ searchParams }: { searchParams: Promise<{ plano?: string; topico?: string }> }) {
  const { admin } = await requireCatalogEditor();
  return <BulkUploadView searchParams={searchParams} base="/business/catalogo" admin={admin} />;
}
