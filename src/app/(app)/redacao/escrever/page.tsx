import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getSubmission, getTheme, temaComoTexto } from "@/server/services/redacao";
import { Editor, type EditorInicial } from "@/components/redacao/editor";

export const metadata = { title: "Escrever redação" };
export const dynamic = "force-dynamic";

export default async function EscreverPage({ searchParams }: { searchParams: Promise<{ id?: string; tema?: string }> }) {
  const { id, tema } = await searchParams;
  const user = await requireUser("/redacao/escrever");
  let inicial: EditorInicial = { id: null, themeId: null, themeTitle: null, themeText: null, title: "", body: "", modality: "enem", board: null, contest: null, criteriaText: null, lineLimit: null, parentId: null };
  let proposta = false;
  if (id) {
    const s = await getSubmission(user.id, id);
    if (!s) redirect("/redacao/escrever");
    if (!["rascunho", "falhou"].includes(s.status)) redirect(`/redacao/${s.id}`);
    inicial = { id: s.id, themeId: s.themeId, themeTitle: s.themeTitle, themeText: s.themeText, title: s.title, body: s.body, modality: s.modality, board: s.board, contest: s.contest, criteriaText: s.criteriaText, lineLimit: s.lineLimit, parentId: s.parentId };
    proposta = Boolean(s.themeId);
  } else if (tema) {
    const t = await getTheme(user.id, tema);
    if (t) {
      inicial = { ...inicial, themeId: t.id, themeTitle: t.title, themeText: temaComoTexto(t), modality: t.mode === "simulado" || t.board ? "concurso" : "enem", board: t.board, lineLimit: t.linesMax };
      proposta = true;
    }
  }
  return <Editor inicial={inicial} temaDaProposta={proposta} />;
}
