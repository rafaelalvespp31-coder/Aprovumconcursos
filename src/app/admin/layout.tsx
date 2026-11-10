import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireAdmin } from "@/server/services/catalog";
import { DisciplinesSync } from "@/components/disciplines-sync";
import { ensureDisciplines } from "@/server/services/disciplines";
import { getAdminPendencias } from "@/server/services/admin-pendencias";
import { PendenciasSino } from "@/components/admin/pendencias-sino";

export const metadata = { title: "Administração" };

/** Painel do Admin: catálogo revisado e fila de temas gerados pela IA. Só administradores. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const disciplines = await ensureDisciplines();
  const pend = await getAdminPendencias().catch(() => ({ total: 0, items: [] as Awaited<ReturnType<typeof getAdminPendencias>>["items"] }));
  const nPend = (key: string) => pend.items.find((i) => i.key === key)?.count ?? 0;
  const pendentes = nPend("raiox");
  return (
    <DisciplinesSync list={disciplines}>
      <div className="min-h-dvh">
        <header className="border-b border-linha bg-superficie">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-3">
              <Logo href="/admin/catalogo" />
              <span className="rounded-full bg-tinta px-2 py-0.5 t-tiny font-semibold text-white">
                Equipe
              </span>
              <PendenciasSino initial={pend} />
            </div>
            <nav
              aria-label="Administração"
              className="flex flex-wrap gap-x-4 gap-y-1 t-small font-semibold"
            >
              <Link
                href="/admin/catalogo"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Catálogo
              </Link>
              <Link
                href="/admin/catalogo/enviar"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Catalogar aula
              </Link>
              <Link
                href="/admin/catalogo/plano"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Plano de tópicos
              </Link>
              <Link
                href="/admin/catalogo/banners"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Banners
              </Link>
              <Link
                href="/admin/legislacao"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Legislação
              </Link>
              <Link
                href="/admin/fila"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Fila da IA
              </Link>
              <Link
                href="/admin/redacao"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Redação
              </Link>
              <Link
                href="/admin/feedbacks"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Feedbacks
              </Link>
              <Link
                href="/admin/alunos"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Alunos{nPend("planos") > 0 && <span className="ml-1 rounded-full bg-destaque px-1.5 py-0.5 t-tiny font-bold text-white" aria-label={`${nPend("planos")} pedidos de plano`}>{nPend("planos")}</span>}
              </Link>
              <Link
                href="/admin/avatares"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Avatares{nPend("avatares") > 0 && <span className="ml-1 rounded-full bg-destaque px-1.5 py-0.5 t-tiny font-bold text-white" aria-label={`${nPend("avatares")} avatares personalizados`}>{nPend("avatares")}</span>}
              </Link>
              <Link
                href="/admin/concursos"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Concursos
              </Link>
              <Link
                href="/admin/estrategico"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Estratégico{pendentes > 0 && <span className="ml-1 rounded-full bg-destaque px-1.5 py-0.5 t-tiny font-bold text-white" aria-label={`${pendentes} pedidos de Raio-X`}>{pendentes}</span>}
              </Link>
              <Link
                href="/admin/editais"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Editais
              </Link>
              <Link
                href="/admin/aprovados"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Aprovados
              </Link>
              <Link
                href="/admin/depoimentos"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Depoimentos
              </Link>
              <Link
                href="/admin/indicacoes"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Indicações
              </Link>
              <Link
                href="/admin/campanha-caveira"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Campanha Caveira
              </Link>
              <Link
                href="/admin/socio"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Sócio admin
              </Link>
              <Link
                href="/banco"
                className="text-destaque underline-offset-2 hover:underline"
              >
                Banco de questões
              </Link>
              <Link
                href="/painel"
                className="text-tinta-suave underline-offset-2 hover:underline"
              >
                Voltar ao app
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </div>
    </DisciplinesSync>
  );
}
