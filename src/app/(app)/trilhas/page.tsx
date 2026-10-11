import Link from "next/link";
import { listTrails } from "@/server/queries";
import { ButtonLink, EmptyState, Tag } from "@/components/ui";
import { boardDisplayName, type ExamBoardSlug } from "@/domain/trail-input";

export const metadata = { title: "Minhas trilhas" };

const STATUS: Record<string, { label: string; tone: "azul" | "verde" | "ambar" | "vermelho" | "neutro" }> = {
  pending: { label: "Na fila", tone: "neutro" },
  processing: { label: "Em construção", tone: "azul" },
  review: { label: "Para conferir", tone: "ambar" },
  active: { label: "Em estudo", tone: "verde" },
  failed: { label: "Interrompida", tone: "vermelho" },
};

export default async function TrailsPage({ searchParams }: { searchParams: Promise<{ arquivadas?: string }> }) {
  const { arquivadas } = await searchParams;
  const all = await listTrails(true);
  const showArchived = arquivadas === "1";
  const trails = all.filter((t) => (showArchived ? t.archived_at : !t.archived_at));
  const archivedCount = all.filter((t) => t.archived_at).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-h1">{showArchived ? "Trilhas arquivadas" : "Minhas trilhas"}</h1>
        <ButtonLink href="/nova-trilha">Nova trilha</ButtonLink>
      </div>
      {trails.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={showArchived ? "Nenhuma trilha arquivada" : "Você ainda não tem trilhas"} action={!showArchived && <ButtonLink href="/nova-trilha">Criar a primeira trilha</ButtonLink>}>
            {!showArchived && "Cole o conteúdo do edital, de uma matéria ou de um artigo de lei para começar."}
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-linha rounded-lg border border-linha bg-superficie">
          {trails.map((t) => {
            const s = STATUS[t.status] ?? STATUS.pending!;
            return (
              <li key={t.id}>
                <Link href={`/trilhas/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-papel">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{t.title}</p>
                    <p className="t-small text-tinta-suave">
                      {boardDisplayName(t.board_slug as ExamBoardSlug, t.other_board_name)}
                      {t.last_studied_at ? `, estudada em ${new Date(t.last_studied_at).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                  <Tag tone={s.tone}>{s.label}</Tag>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {(archivedCount > 0 || showArchived) && (
        <Link href={showArchived ? "/trilhas" : "/trilhas?arquivadas=1"} className="mt-4 inline-block t-small text-destaque underline underline-offset-2">
          {showArchived ? "Ver trilhas ativas" : `Ver ${archivedCount} trilha(s) arquivada(s)`}
        </Link>
      )}
    </div>
  );
}
