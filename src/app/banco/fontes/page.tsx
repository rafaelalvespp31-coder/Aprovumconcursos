import { bankLookups, listSources, requireBankStaff } from "@/server/services/bank";
import { DCard } from "../ui";
import { ExamForm, SourceManager } from "./source-manager";

export const metadata = { title: "Fontes — Banco" };

export default async function SourcesPage() {
  const staff = await requireBankStaff();
  const [sources, lk] = await Promise.all([listSources(), bankLookups()]);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[Space_Grotesk] text-[26px] font-bold">Fontes</h1>
        <p className="text-[14px] text-white/60">
          Uma URL pública, sozinha, não autoriza a redistribuição. Registre a licença ou a autorização. Provas anteriores só podem ser aprovadas quando um revisor verifica essa autorização.
        </p>
      </div>
      <SourceManager sources={sources} canVerify={staff.roles.revisor} />
      <DCard title="Concursos">
        <ul className="mb-4 flex flex-col gap-1 text-[14px] text-white/80">
          {lk.exams.length === 0 && <li className="text-white/55">Nenhum concurso cadastrado.</li>}
          {lk.exams.map((e) => (
            <li key={e.id}>
              {e.name}
              {e.year ? ` (${e.year})` : ""}
              {e.board_slug ? ` · ${lk.boards.find((b) => b.slug === e.board_slug)?.name ?? e.board_slug}` : ""}
            </li>
          ))}
        </ul>
        <ExamForm boards={lk.boards} />
      </DCard>
    </div>
  );
}
