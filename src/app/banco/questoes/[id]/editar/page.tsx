import Link from "next/link";
import { getQuestion, requireBankStaff } from "@/server/services/bank";
import { EDITABLE_STATUSES } from "@/domain/bank/workflow";
import { STATUS_LABEL, type Origin, type QuestionType } from "@/domain/bank/labels";
import { DNotice, dButton } from "../../../ui";
import { formLookups } from "../../form-lookups";
import { QuestionForm } from "../../question-form";
import { emptyRef, type QuestionFormState } from "../../form-state";

export const metadata = { title: "Editar questão — Banco" };

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default async function EditBankQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBankStaff();
  const { id } = await params;
  const [q, lookups] = await Promise.all([getQuestion(id), formLookups()]);
  if (!EDITABLE_STATUSES.has(q.status)) {
    return (
      <div className="flex flex-col gap-4">
        <DNotice tone="alerta">
          Questão {STATUS_LABEL[q.status].toLowerCase()} não pode ser editada diretamente. Reencaminhe para revisão: a versão atual fica preservada e a correção gera uma nova versão.
        </DNotice>
        <Link href={`/banco/questoes/${id}`} className={dButton("secundario")}>Voltar à questão</Link>
      </div>
    );
  }
  const initial: QuestionFormState = {
    subjectId: q.subject_id,
    topicId: s(q.topic_id),
    origin: q.origin as Origin,
    questionType: q.question_type as QuestionType,
    statement: q.statement,
    caseContext: s(q.case_context),
    initialDifficulty: q.initial_difficulty,
    boardStyle: s(q.board_style),
    sourceId: s(q.source_id),
    examId: s(q.exam_id),
    boardSlug: s(q.board_slug),
    year: s(q.year),
    originalNumber: s(q.original_number),
    correctAnswerTrue: q.correct_answer_true === null ? "" : q.correct_answer_true ? "true" : "false",
    options: Array.from({ length: 5 }, (_, i) => {
      const o = q.options[i];
      return { text: o?.text ?? "", isCorrect: o?.is_correct ?? false, explanation: o?.explanation ?? "" };
    }),
    justification: s(q.justification),
    legalBasis: s(q.legal_basis),
    usageRights: q.usage_rights,
    verifiedAt: s(q.verified_at),
    legalRefs: q.legal_refs.map((r) => ({
      ...emptyRef(),
      normName: s(r.norm_name),
      normNumber: s(r.norm_number),
      normYear: s(r.norm_year),
      article: s(r.article),
      paragraph: s(r.paragraph),
      item: s(r.item),
      letter: s(r.letter),
      officialUrl: s(r.official_url),
      consultedOn: s(r.consulted_on),
      normVersion: s(r.norm_version),
      amendmentNote: s(r.amendment_note),
      caseLawCourt: s(r.case_law_court),
      caseLawId: s(r.case_law_id),
      caseLawThesis: s(r.case_law_thesis),
    })),
  };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-[Space_Grotesk] text-[26px] font-bold">
        Editar <span className="font-mono text-[#ff8080]">{q.public_code}</span>
      </h1>
      {q.status === "em_revisao" && <DNotice tone="alerta">Editar durante a revisão zera o checklist de conteúdo e gabarito.</DNotice>}
      <QuestionForm id={id} initial={initial} lookups={lookups} />
    </div>
  );
}
