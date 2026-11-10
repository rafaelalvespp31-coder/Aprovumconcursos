import Link from "next/link";
import { listFolders, listTrailProgress, listTrails } from "@/server/queries";
import { EmptyState, Tag } from "@/components/ui";
import { boardDisplayName, type ExamBoardSlug } from "@/domain/trail-input";
import type { BoardTrail } from "./folder-board";
import { getStudiesHome } from "@/server/studies-home";
import { MeuEstudo } from "@/components/meu-estudo/meu-estudo";
import { getStudySeconds } from "@/server/queries";

export const metadata = { title: "Seus estudos" };

const STATUS: Record<string, BoardTrail["status"]> = {
  pending: { label: "Na fila", tone: "neutro" },
  processing: { label: "Em construção", tone: "azul" },
  clarification: { label: "Aguardando você", tone: "ambar" },
  review: { label: "Para conferir", tone: "ambar" },
  active: { label: "Em estudo", tone: "verde" },
  failed: { label: "Interrompida", tone: "vermelho" },
};

export default async function TrailsPage({ searchParams }: { searchParams: Promise<{ arquivadas?: string }> }) {
  const { arquivadas } = await searchParams;
  const [all, folders, progress, home, studySeconds] = await Promise.all([listTrails(true), listFolders(), listTrailProgress(), getStudiesHome(), getStudySeconds()]);
  const showArchived = arquivadas === "1";
  const trails = all.filter((t) => (showArchived ? t.archived_at : !t.archived_at));
  const archivedCount = all.filter((t) => t.archived_at).length;
  const subtitle = (t: (typeof all)[number]) =>
    `${boardDisplayName(t.board_slug as ExamBoardSlug, t.other_board_name)}${t.last_studied_at ? ` · estudado em ${new Date(t.last_studied_at).toLocaleDateString("pt-BR")}` : ""}`;

  if (showArchived)
    return (
      <div id="pastas" className="scroll-mt-24">
        <h1 className="t-h1">Estudos arquivados</h1>
        {trails.length === 0 ? (
          <div className="mt-6"><EmptyState title="Nenhum estudo arquivado" /></div>
        ) : (
          <ul className="mt-6 divide-y divide-linha rounded-lg border border-linha bg-superficie">
            {trails.map((t) => {
              const s = STATUS[t.status] ?? STATUS.pending!;
              return (
                <li key={t.id}>
                  <Link href={`/trilhas/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-papel active:opacity-60">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.title}</p>
                      <p className="t-small text-tinta-suave">{subtitle(t)}</p>
                    </div>
                    <Tag tone={s.tone}>{s.label}</Tag>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/trilhas" className="mt-4 inline-block t-small text-destaque underline underline-offset-2">Ver estudos ativos</Link>
      </div>
    );
  const continueHref = home.current ? `/aula/${home.current.lessonId}` : null;
  return (
    <MeuEstudo
      folders={folders.map((f) => ({ id: f.id, name: f.name, color: f.color }))}
      trails={trails.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: subtitle(t),
        status: STATUS[t.status] ?? STATUS.pending!,
        folderId: t.folder_id,
        progress: progress[t.id] ?? { done: 0, total: 0 },
        banca: t.board_slug,
        bancaLabel: boardDisplayName(t.board_slug as ExamBoardSlug, t.other_board_name),
        updatedAt: t.last_studied_at ?? t.updated_at,
      }))}
      studySeconds={studySeconds}
      continueHref={continueHref}
      continueLabel="Continuar estudos"
      archivedCount={archivedCount}
    />
  );
}
