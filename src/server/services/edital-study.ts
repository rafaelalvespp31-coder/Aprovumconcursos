import "server-only";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";
import { UserFacingError } from "./trails";
import { createStudyFromCatalog, loadPublishedIndex } from "./catalog";
import { createFolder, moveTrailToFolder } from "./folders";
import { getPreparationTree } from "./edital-view";
import { EXAM_BOARDS, type ExamBoardSlug, type TrailRequest } from "@/domain/trail-input";
import { fold } from "@/domain/edital/text";

/** Aulas por estudo: matéria grande vira "Parte 1", "Parte 2"… (mesmo limite do mapa). */
const PER_STUDY = 20;

const boardSlug = (b: string | null): ExamBoardSlug => {
  const f = fold(b ?? "");
  return (EXAM_BOARDS.find((x) => x.slug !== "outra" && (f.includes(x.slug) || f.includes(fold(x.name))))?.slug ?? "outra") as ExamBoardSlug;
};

/** Nome da pasta em "Meus estudos": o cargo do concurso; sem cargo, o nome do concurso/órgão. */
export function folderNameFor(prep: { roleName: string | null; contestName: string | null; title: string }): string {
  const role = prep.roleName?.trim();
  const contest = (prep.contestName ?? prep.title).trim();
  const name = role ? (contest && !fold(role).includes(fold(contest)) ? `${role} · ${contest}` : role) : contest || "Meu concurso";
  return name.replace(/\s+/g, " ").slice(0, 80);
}

/**
 * "Começar estudo": reúne todas as aulas do edital numa pasta (nome do cargo) em "Meus estudos",
 * com um estudo por matéria e as aulas na ordem do edital. Tocar de novo só reabre a mesma pasta.
 */
export async function startEditalStudy(userId: string, prepId: string): Promise<{ folderId: string; created: number }> {
  const tree = await getPreparationTree(userId, prepId);
  const db = createAdminClient();
  const name = folderNameFor(tree.prep);

  // Já começou: pasta guardada na preparação ou pasta com o mesmo nome que já tem estudos.
  const saved = (tree.prep.stats as { studyFolderId?: string }).studyFolderId;
  const candidates = await db.from("study_folders").select("id, name").eq("user_id", userId);
  const existing = ((candidates.data ?? []) as Array<{ id: string; name: string }>).find((f) => f.id === saved) ?? ((candidates.data ?? []) as Array<{ id: string; name: string }>).find((f) => f.name === name);
  if (existing) {
    const has = await db.from("study_trails").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("folder_id", existing.id).is("archived_at", null);
    if ((has.count ?? 0) > 0) return { folderId: existing.id, created: 0 };
  }

  const index = new Map((await loadPublishedIndex()).map((t) => [t.id, t]));
  const plan = tree.disciplines
    .map((d) => {
      const ids = [...new Set(d.topics.flatMap((t) => t.lessons.map((l) => l.catalogId)))].filter((id) => index.has(id));
      return { name: d.name, topics: ids.map((id) => index.get(id)!) };
    })
    .filter((d) => d.topics.length > 0);
  if (!plan.length) throw new UserFacingError("Ainda não há aulas no catálogo para as matérias deste edital. Assim que forem catalogadas, o estudo poderá começar.", "no_lessons");

  const folderId = existing?.id ?? (await createFolder(userId, name, "vermelho"));
  const board = boardSlug(tree.prep.board);
  let created = 0;
  for (const d of plan) {
    const parts = Math.ceil(d.topics.length / PER_STUDY);
    for (let i = 0; i < parts; i++) {
      const topics = d.topics.slice(i * PER_STUDY, (i + 1) * PER_STUDY);
      const title = (parts > 1 ? `${d.name} · Parte ${i + 1}` : d.name).slice(0, 160);
      const req = {
        board,
        otherBoardName: board === "outra" ? (tree.prep.board ?? "Banca do edital").slice(0, 80) : undefined,
        contentType: "edital",
        content: `${d.name}: ${topics.map((t) => t.title).join("; ")}`.slice(0, 15000),
        title,
      } as TrailRequest;
      try {
        const trailId = await createStudyFromCatalog(userId, req, { kind: "completo", topics, reason: `Edital: ${tree.prep.title} · ${d.name}` });
        await moveTrailToFolder(userId, trailId, folderId);
        created++;
      } catch (e) {
        await logEvent("edital.start_study_failed", { userId, prepId, discipline: d.name, error: (e as Error).message });
      }
    }
  }
  if (!created) throw new UserFacingError("Não foi possível montar os estudos agora. Tente novamente em instantes.", "start_failed");
  await db.from("edital_preparations").update({ stats: { ...tree.prep.stats, studyFolderId: folderId } }).eq("id", prepId).eq("user_id", userId);
  return { folderId, created };
}
