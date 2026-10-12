import { listStaff, requireBankStaff } from "@/server/services/bank";
import { DBadge, DCard, DNotice } from "../ui";
import { StaffForm } from "./staff-form";

export const metadata = { title: "Equipe — Banco" };

export default async function StaffPage() {
  const staff = await requireBankStaff();
  if (!staff.roles.admin) return <DNotice tone="erro">Somente administradores gerenciam a equipe.</DNotice>;
  const list = await listStaff();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[Space_Grotesk] text-[26px] font-bold">Equipe</h1>
        <p className="text-[14px] text-white/60">
          Autores cadastram e corrigem. Revisores conferem, aprovam, publicam e suspendem. Ninguém aprova a própria questão: para chegar ao Ranked, toda questão precisa de uma segunda pessoa.
        </p>
      </div>
      <DCard title="Membros">
        <ul className="flex flex-col divide-y divide-white/10">
          {list.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-2 py-2 text-[14px]">
              <span className="font-medium">{m.email}</span>
              {m.is_admin && <DBadge tone="vermelho">admin</DBadge>}
              {m.roles.map((r) => (
                <DBadge key={r} tone={r === "revisor" ? "azul" : "neutro"}>{r}</DBadge>
              ))}
            </li>
          ))}
        </ul>
      </DCard>
      <DCard title="Conceder ou remover papel">
        <StaffForm />
      </DCard>
    </div>
  );
}
