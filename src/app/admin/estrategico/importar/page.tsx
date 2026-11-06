import Link from "next/link";
import { IMPORT_EXAMPLE_TEXT } from "@/domain/strategic/text";
import { ImportForm } from "./import-form";

export const metadata = { title: "Importar análise estratégica" };

export default function ImportarPage() {
  return (
    <div>
      <Link href="/admin/estrategico" className="t-small text-tinta-suave hover:underline">← Catálogo estratégico</Link>
      <h1 className="mt-2 t-h2 font-bold">Importar análise estratégica</h1>
      <p className="mt-1 t-small text-tinta-suave">Cole o texto que o ChatGPT gerou (formato CONCURSO / PROVA / NOTA / DISCIPLINA / ASSUNTO / FOCO). O formato JSON antigo também continua aceito. Nada é salvo antes da prévia e a importação <b>nunca publica</b>: depois você revisa, aprova e publica.</p>
      <ImportForm example={IMPORT_EXAMPLE_TEXT} />
    </div>
  );
}
