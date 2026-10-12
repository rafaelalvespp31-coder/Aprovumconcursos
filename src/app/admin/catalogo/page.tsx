import Link from "next/link";
import { ButtonLink, EmptyState, Tag } from "@/components/ui";
import { LEVELS } from "@/domain/progress/levels";
import { LAWS } from "@/domain/catalog/match";
import { listTopics, MIN_BANK_PER_LEVEL, requireAdmin } from "@/server/services/catalog";

export const metadata = { title: "Catálogo" };

const STATUS: Record<string, { label: string; tone: "verde" | "ambar" | "neutro" }> = {
  publicado: { label: "Publicado", tone: "verde" },
  rascunho: { label: "Rascunho", tone: "ambar" },
  arquivado: { label: "Arquivado", tone: "neutro" },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  // A verificação fica também na página: layout e página renderizam em paralelo.
  await requireAdmin();
  const sp = await searchParams;
  const all = await listTopics();
  const q = (sp.q ?? "").trim().toLowerCase();
  const topics = all.filter((t) => (!sp.status || t.status === sp.status) && (!q || t.title.toLowerCase().includes(q)));
  const counts = { publicado: all.filter((t) => t.status === "publicado").length, rascunho: all.filter((t) => t.status === "rascunho").length };
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-h1">Catálogo revisado</h1>
          <p className="mt-1 text-tinta-suave">
            {counts.publicado} publicado(s) · {counts.rascunho} rascunho(s). Pedidos cobertos por temas publicados viram estudos na hora, sem IA.
          </p>
        </div>
        <ButtonLink href="/admin/catalogo/novo">Novo tema</ButtonLink>
      </div>
      <form className="mt-5 flex flex-wrap gap-2 t-small" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Buscar pelo título" className="min-h-10 rounded-md border border-linha-forte px-3" aria-label="Buscar pelo título" />
        <select name="status" defaultValue={sp.status ?? ""} className="min-h-10 rounded-md border border-linha-forte px-3" aria-label="Situação">
          <option value="">Todas as situações</option>
          <option value="publicado">Publicados</option>
          <option value="rascunho">Rascunhos</option>
          <option value="arquivado">Arquivados</option>
        </select>
        <button className="min-h-10 rounded-md border border-linha-forte px-3 font-semibold">Filtrar</button>
      </form>
      {topics.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nenhum tema aqui ainda" action={<ButtonLink href="/admin/catalogo/novo">Cadastrar o primeiro tema</ButtonLink>}>
            Comece pelos temas mais pedidos — a Fila da IA mostra o que os alunos estão estudando.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-linha">
          <table className="w-full min-w-[720px] t-small">
            <thead className="bg-nevoa text-left">
              <tr>
                <th className="px-3 py-2">Tema</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Questões no banco</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {topics.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/catalogo/${t.id}`} className="font-semibold text-destaque underline-offset-2 hover:underline">{t.title}</Link>
                    {t.origin === "promovido" && <span className="ml-2 t-tiny text-tinta-fraca">(promovido da IA)</span>}
                  </td>
                  <td className="px-3 py-2">
                    {t.kind === "dispositivo" ? `${LAWS.find((l) => l.code === t.lawCode)?.name.split(" (")[0] ?? t.lawCode}, art. ${t.articles.join(", ")}` : "Tema"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {LEVELS.map((l) => {
                      const n = t.questions[l.key] ?? 0;
                      return (
                        <span key={l.key} className={`mr-2 ${n < MIN_BANK_PER_LEVEL ? "text-erro" : ""}`}>
                          {l.label[0]}: {n}
                        </span>
                      );
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <Tag tone={STATUS[t.status]!.tone}>{STATUS[t.status]!.label}{t.version ? ` v${t.version}` : ""}</Tag>
                  </td>
                  <td className="px-3 py-2 text-tinta-fraca">{new Date(t.updatedAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
