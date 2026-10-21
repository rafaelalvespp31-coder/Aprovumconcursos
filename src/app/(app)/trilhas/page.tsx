import Link from "next/link";
import { listFolders, listTrailProgress, listTrails } from "@/server/queries";
import { ButtonLink, EmptyState, Tag } from "@/components/ui";
import { boardDisplayName, type ExamBoardSlug } from "@/domain/trail-input";
import { FolderBoard, type BoardTrail } from "./folder-board";
import { getStudiesHome } from "@/server/studies-home";
import { StudiesPage } from "@/components/estudos/studies-page";
import { StudyPicker } from "@/components/estudos/study-picker";

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
  const [all, folders, progress, home] = await Promise.all([listTrails(true), listFolders(), listTrailProgress(), getStudiesHome()]);
  const showArchived = arquivadas === "1";
  const trails = all.filter((t) => (showArchived ? t.archived_at : !t.archived_at));
  const archivedCount = all.filter((t) => t.archived_at).length;
  const subtitle = (t: (typeof all)[number]) =>
    `${boardDisplayName(t.board_slug as ExamBoardSlug, t.other_board_name)}${t.last_studied_at ? ` · estudado em ${new Date(t.last_studied_at).toLocaleDateString("pt-BR")}` : ""}`;

  const board = (
    <div id={showArchived ? "pastas" : undefined} className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showArchived ? <h1 className="t-h1">Estudos arquivados</h1> : <h2 className="t-h2">Todos os seus estudos, por pasta</h2>}
        <ButtonLink href="/nova-trilha">Novo estudo</ButtonLink>
      </div>
      {!showArchived && (
        <p className="mt-1 t-small text-tinta-suave">Organize cada tema ou assunto na pasta da sua matéria. A ordem da pasta define o “próximo tema” no fim de cada aula.</p>
      )}

      {showArchived ? (
        trails.length === 0 ? (
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
        )
      ) : trails.length === 0 && folders.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Você ainda não tem estudos" action={<ButtonLink href="/nova-trilha">Começar o primeiro estudo</ButtonLink>}>
            Escolha um tema ou artigo do catálogo para começar.
          </EmptyState>
        </div>
      ) : (
        <FolderBoard
          folders={folders.map((f) => ({ id: f.id, name: f.name, color: f.color }))}
          trails={trails.map((t) => ({ id: t.id, title: t.title, subtitle: subtitle(t), status: STATUS[t.status] ?? STATUS.pending!, folderId: t.folder_id, progress: progress[t.id] ?? { done: 0, total: 0 } }))}
        />
      )}

      {(archivedCount > 0 || showArchived) && (
        <Link href={showArchived ? "/trilhas" : "/trilhas?arquivadas=1"} className="mt-4 inline-block t-small text-destaque underline underline-offset-2">
          {showArchived ? "Ver estudos ativos" : `Ver ${archivedCount} estudo(s) arquivado(s)`}
        </Link>
      )}
    </div>
  );
  if (showArchived) return board;
  // "Escolha seu novo estudo" substitui o quadro de pastas; a organização em pastas continua disponível, recolhida.
  return (
    <StudiesPage data={home}>
      <div id="pastas" className="scroll-mt-24">
        <StudyPicker themes={home.themes} />
        {home.themes.length ? (
          <details className="group mt-6 rounded-[18px] border border-linha bg-superficie px-4 py-3" data-testid="organizar-pastas">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              Organizar meus estudos em pastas
              <span className="t-small text-tinta-suave group-open:hidden">Abrir</span>
              <span className="hidden t-small text-tinta-suave group-open:inline">Fechar</span>
            </summary>
            <div className="mt-4">{board}</div>
          </details>
        ) : (
          board
        )}
      </div>
    </StudiesPage>
  );
}
