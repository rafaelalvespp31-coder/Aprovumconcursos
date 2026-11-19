import { requireAdmin } from "@/server/services/catalog";
import { countPushDevices } from "@/server/services/push";
import { AvisoForm } from "./form";

export const metadata = { title: "Avisos no celular" };
export const dynamic = "force-dynamic";

/** Envia uma notificação para o celular dos alunos que ativaram os avisos (chega mesmo com o app fechado). */
export default async function AvisosPushPage() {
  await requireAdmin();
  const c = await countPushDevices().catch(() => null);
  return (
    <div data-testid="admin-avisos-push">
      <h1 className="t-h1">AVISOS NO CELULAR</h1>
      <p className="mt-2 max-w-2xl t-small text-tinta-suave">
        Chega mesmo com o app fechado, para quem ativou em Perfil → Avisos no celular. {c ? <>Hoje: <strong>{c.users}</strong> aluno(s), <strong>{c.devices}</strong> aparelho(s).</> : null}
        {" "}Lembretes de revisão saem sozinhos todo dia às 8h, e você recebe um aviso a cada novo plano pago.
      </p>
      <AvisoForm />
    </div>
  );
}
