import { requireAdmin } from "@/server/services/catalog";
import { listAvatarRequests } from "@/server/services/avatar";
import { setRequestStatusAction } from "./actions";
import { RequestsList } from "./requests-list";

export const metadata = { title: "Solicitações de avatar" };
export const dynamic = "force-dynamic";

/** Fotos de corpo inteiro enviadas pelos alunos em "Solicitar meu avatar" (links temporários). */
export default async function AvatarRequestsPage() {
  await requireAdmin();
  const rows = await listAvatarRequests();
  return (
    <div>
      <h1 className="t-h1">Solicitações de avatar</h1>
      <p className="mt-1 max-w-3xl t-small text-tinta-suave">Fotos de corpo inteiro enviadas pelos alunos. Os links das fotos valem por 1 hora (o arquivo fica num armazenamento privado).</p>
      <RequestsList rows={rows} action={setRequestStatusAction} />
    </div>
  );
}
