import { QuestionForm } from "@/app/banco/questoes/question-form";
import { emptyQuestion } from "@/app/banco/questoes/form-state";
import { DecisionPanel } from "@/app/banco/questoes/[id]/decision-panel";
import { SourceManager } from "@/app/banco/fontes/source-manager";
import { TopicManager } from "@/app/banco/assuntos/topic-manager";
import { DCard, DStat } from "@/app/banco/ui";
import { DemoBankUpload } from "./demo-upload";

/** Prévia do painel escuro do banco de questões com dados de EXEMPLO. Os botões não gravam aqui. */
const S1 = "00000000-0000-4000-8000-00000000b001";
const S2 = "00000000-0000-4000-8000-00000000b002";
const T1 = "00000000-0000-4000-8000-00000000b101";
const T2 = "00000000-0000-4000-8000-00000000b102";

export default function Page() {
  const lookups = {
    subjects: [
      { id: S1, name: "Direito Penal", status: "ativa" },
      { id: S2, name: "Direito Constitucional", status: "ativa" },
    ],
    topics: [
      { id: T1, subject_id: S1, name: "Teoria do Crime", path: "Teoria do Crime", status: "ativo" },
      { id: T2, subject_id: S1, name: "Tipicidade", path: "Teoria do Crime › Tipicidade", status: "ativo" },
    ],
    boards: [
      { slug: "fgv", name: "FGV" },
      { slug: "cebraspe", name: "CEBRASPE" },
    ],
    exams: [{ id: "00000000-0000-4000-8000-00000000b201", name: "Concurso fictício de exemplo", year: 2024 }],
    sources: [{ id: "00000000-0000-4000-8000-00000000b301", name: "Código Penal (Planalto)", kind: "legislacao", status: "ativa", reuse_verified: true }],
  };
  return (
    <div className="-mx-4 rounded-2xl bg-[#09090b] p-4 text-white [color-scheme:dark] sm:mx-0" data-testid="banco-galeria">
      <h1 className="mb-4 font-[Space_Grotesk] text-[24px] font-bold">Banco de questões (prévia)</h1>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <DStat label="Cadastradas" value={42} />
        <DStat label="Publicadas" value={18} tone="verde" />
        <DStat label="Pendentes" value={9} tone="ambar" />
        <DStat label="Suspensas" value={1} tone="vermelho" />
      </div>
      <div className="flex flex-col gap-6">
        <DCard title="Decisão (revisor, questão em revisão)">
          <DecisionPanel
            id="00000000-0000-4000-8000-00000000b401"
            status="em_revisao"
            roles={{ autor: false, revisor: true, admin: false }}
            isCreator={false}
            rightsOk
            checklist={{ content: false, answer: false, source: false, rights: false }}
          />
        </DCard>
        <DemoBankUpload />
        <QuestionForm id={null} initial={emptyQuestion(S1)} lookups={lookups} />
        <SourceManager
          canVerify
          sources={[
            {
              id: "00000000-0000-4000-8000-00000000b301",
              name: "Prova fictícia de exemplo — Caderno A",
              kind: "prova_oficial",
              author_institution: "Banca fictícia",
              url: "https://exemplo.invalid/prova.pdf",
              published_on: null,
              consulted_on: "2026-10-01",
              license: null,
              reuse_verified: false,
              reuse_verified_at: null,
              legal_notes: null,
              status: "ativa",
            },
          ]}
        />
        <TopicManager
          canManage
          subjects={lookups.subjects.map((s) => ({ ...s }))}
          topics={[
            { id: T1, subject_id: S1, parent_id: null, name: "Teoria do Crime", status: "ativo" },
            { id: T2, subject_id: S1, parent_id: T1, name: "Tipicidade", status: "ativo" },
          ]}
        />
      </div>
    </div>
  );
}
