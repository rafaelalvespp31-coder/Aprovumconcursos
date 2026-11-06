import Link from "next/link";
import { buildStrategicPrompt, IMPORT_EXAMPLE_TEXT } from "@/domain/strategic/text";
import { examRequestInfo, loadExam } from "@/server/services/strategic";
import { CopyPromptButton } from "./copy-prompt";
import { ImportForm } from "./import-form";

export const metadata = { title: "Importar análise estratégica" };
export const dynamic = "force-dynamic";

export default async function ImportarPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const { exam: examId } = await searchParams;
  const exam = examId ? await loadExam(examId, { onlyPublished: false }) : null;
  const req = exam ? await examRequestInfo(exam.id) : null;
  const prompt = buildStrategicPrompt(exam ? { name: exam.name, organ: exam.organ, role: req?.role ?? (exam.positions.join("; ") || null), board: req?.board, year: req?.year, program: req?.program } : {});
  return (
    <div>
      <Link href={exam ? `/admin/estrategico/${exam.id}` : "/admin/estrategico"} className="t-small text-tinta-suave hover:underline">← {exam ? exam.name : "Catálogo estratégico"}</Link>
      <h1 className="mt-2 t-h2 font-bold">{exam ? `Análise estratégica: ${exam.name}` : "Importar análise estratégica"}</h1>
      <p className="mt-1 t-small text-tinta-suave">Cole o texto que o ChatGPT gerou (formato CONCURSO / PROVA / NOTA / DISCIPLINA / ASSUNTO / FOCO). O formato JSON antigo também continua aceito. Nada é salvo antes da prévia. A importação entra como rascunho; depois é só abrir o concurso e tocar em <b>Publicar análise</b>.</p>
      {exam && <p className="mt-2 rounded-lg bg-superficie p-3 t-small">O comando já vem preenchido com este concurso{req?.program ? " e com o conteúdo programático extraído do edital dos alunos" : ""}. A análise será gravada em <b>{exam.name}</b>, mesmo que o ChatGPT escreva o nome de outro jeito.</p>}
      <div className="mt-5"><CopyPromptButton prompt={prompt} /></div>
      <ImportForm example={IMPORT_EXAMPLE_TEXT} examId={exam?.id ?? null} />
    </div>
  );
}
