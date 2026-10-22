import Link from "next/link";
import { requireAdmin } from "@/server/services/catalog";
import { ImportForm } from "./import-form";

export const metadata = { title: "Importar conteúdo · Administração" };

export default async function ImportPage() {
  await requireAdmin();
  return (
    <div>
      <Link href="/admin/catalogo" className="t-small text-destaque underline underline-offset-2">Administração / Catálogo</Link>
      <h1 className="mt-2 t-h1">Importar aulas e questões</h1>
      <p className="mt-2 max-w-3xl text-tinta-suave">
        Envie os arquivos JSON que seguem o formato atual do APROVUM. A importação aproveita as tabelas existentes, cria um rascunho e mantém o conteúdo fora da área dos alunos até a revisão e publicação.
      </p>
      <div className="mt-5 rounded-lg border border-linha p-4 t-small">
        <p className="font-semibold">Formato esperado</p>
        <p className="mt-1 text-tinta-suave">Os arquivos costumam estar juntos em cada pasta <code>conteudo-catalogo-…</code> do repositório. Selecione os arquivos do mesmo tema; não misture arquivos de temas diferentes.</p>
      </div>
      <ImportForm />
    </div>
  );
}
