import { bankLookups, requireBankStaff } from "@/server/services/bank";
import { TopicManager } from "./topic-manager";

export const metadata = { title: "Matérias e assuntos — Banco" };

export default async function TopicsPage() {
  const staff = await requireBankStaff();
  const lk = await bankLookups();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[Space_Grotesk] text-[26px] font-bold">Matérias e assuntos</h1>
        <p className="text-[14px] text-white/60">Hierarquia livre: Matéria → Assunto → Subtópico → … (ex.: Direito Penal → Teoria do Crime → Tipicidade → Dolo e culpa).</p>
      </div>
      <TopicManager subjects={lk.subjects} topics={lk.topics} canManage={staff.roles.revisor || staff.roles.admin} />
    </div>
  );
}
