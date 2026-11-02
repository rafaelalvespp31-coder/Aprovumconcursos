import { requireAdmin } from "@/server/services/catalog";
import {
  listPartnerAudit,
  listPartners,
} from "@/server/services/partner-admin";
import {
  createPartnerAction,
  setPartnerActiveAction,
  setPartnerPermissionsAction,
} from "./actions";
import { PartnerManager } from "./partner-manager";

export const metadata = { title: "Gestão do sócio admin" };
export const dynamic = "force-dynamic";

/** GESTÃO DO SÓCIO ADMIN — só o ADMIN MASTER (requireAdmin no servidor). */
export default async function PartnerAdminPage() {
  await requireAdmin();
  const [partners, audit] = await Promise.all([
    listPartners(),
    listPartnerAudit(),
  ]);
  return (
    <div>
      <h1 className="t-h1">Gestão do sócio admin</h1>
      <p className="mt-1 max-w-3xl t-small text-tinta-suave">
        O sócio administrativo entra com login e senha próprios e vê só o{" "}
        <strong>APROVUM BUSINESS</strong>, com os indicadores que você liberar
        abaixo. Ele não acessa esta área, o catálogo, nem dados individuais dos
        alunos além do que for liberado.
      </p>
      <div className="mt-6">
        <PartnerManager
          partners={partners}
          audit={audit}
          actions={{
            create: createPartnerAction,
            setActive: setPartnerActiveAction,
            setPermissions: setPartnerPermissionsAction,
          }}
        />
      </div>
    </div>
  );
}
