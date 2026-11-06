import Link from "next/link";
import { CHATGPT_STRATEGIC_PROMPT, IMPORT_EXAMPLE_TEXT } from "@/domain/strategic/text";
import { CopyPromptButton } from "./copy-prompt";
import { ImportForm } from "./import-form";

export const metadata = { title: "Importar análise estratégica" };

export default function ImportarPage() {
  return (
    <div>
      <Link href="/admin/estrategico" className="t-small text-tinta-suave hover:underline">← Catálogo estratégico</Link>
      <h1 className="mt-2 t-h2 font-bold">Importar análise estratégica</h1>
      <p className="mt-1 t-small text-tinta-suave">Cole o texto que o ChatGPT gerou (formato CONCURSO / PROVA / NOTA / DISCIPLINA / ASSUNTO / FOCO). O formato JSON antigo também continua aceito. Nada é salvo antes da prévia. A importação entra como rascunho; depois é só abrir o concurso e tocar em <b>Publicar análise</b>.</p>
      <div className="mt-5"><CopyPromptButton prompt={CHATGPT_STRATEGIC_PROMPT} /></div>
      <ImportForm example={IMPORT_EXAMPLE_TEXT} />
    </div>
  );
}
