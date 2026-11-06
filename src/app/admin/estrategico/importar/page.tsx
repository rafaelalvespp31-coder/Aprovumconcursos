import Link from "next/link";
import { IMPORT_EXAMPLE } from "@/domain/strategic/import";
import { ImportForm } from "./import-form";

export const metadata = { title: "Importar análise estratégica" };

export default function ImportarPage() {
  return (
    <div>
      <Link href="/admin/estrategico" className="t-small text-tinta-suave hover:underline">← Catálogo estratégico</Link>
      <h1 className="mt-2 t-h2 font-bold">Importar análise estratégica</h1>
      <p className="mt-1 t-small text-tinta-suave">Cole o JSON ou envie o arquivo. Nada é salvo antes da prévia e a importação <b>nunca publica</b>: depois você revisa, aprova e publica.</p>
      <ImportForm example={JSON.stringify(IMPORT_EXAMPLE, null, 2)} />
    </div>
  );
}
