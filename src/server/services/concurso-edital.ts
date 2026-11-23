import "server-only";
import { z } from "zod";
import { createAdminClient } from "../supabase";
import { auditLog } from "../observability";
import { podePublicar } from "@/domain/edital/publicado";
import { UserFacingError } from "./trails";
import { toContest, type Contest, type ContestRow } from "./gamification";

export interface VinculoEdital {
  prepId: string;
  titulo: string;
  status: string;
  disciplinas: number;
}

/** Edital publicado em cada concurso (para o painel do admin). */
export async function vinculosDosConcursos(): Promise<Map<string, VinculoEdital>> {
  const db = createAdminClient();
  const { data } = await db.from("contest_catalog").select("id, edital_prep_id").not("edital_prep_id", "is", null).limit(500);
  const linhas = (data ?? []) as Array<{ id: string; edital_prep_id: string }>;
  const out = new Map<string, VinculoEdital>();
  if (!linhas.length) return out;
  const ids = linhas.map((l) => l.edital_prep_id);
  const [preps, discs] = await Promise.all([
    db.from("edital_preparations").select("id, contest_name, role_name, file_name, status").in("id", ids),
    Promise.all(ids.map(async (id) => [id, (await db.from("edital_disciplines").select("id", { count: "exact", head: true }).eq("preparation_id", id)).count ?? 0] as const)),
  ]);
  const nDisc = new Map(discs);
  const porId = new Map(((preps.data ?? []) as Array<{ id: string; contest_name: string | null; role_name: string | null; file_name: string; status: string }>).map((p) => [p.id, p]));
  for (const l of linhas) {
    const p = porId.get(l.edital_prep_id);
    if (!p) continue;
    out.set(l.id, { prepId: p.id, titulo: [p.contest_name, p.role_name].filter(Boolean).join(" — ") || p.file_name, status: p.status, disciplinas: nDisc.get(p.id) ?? 0 });
  }
  return out;
}

/** Liga (ou desliga, com null) o edital lido pelo admin a um concurso do catálogo. Só edital próprio, concluído e com matérias. */
export async function vincularEdital(adminId: string, contestId: unknown, prepId: unknown): Promise<void> {
  const cid = z.uuid().safeParse(contestId);
  if (!cid.success) throw new UserFacingError("Concurso inválido.", "invalid_input");
  const db = createAdminClient();
  if (prepId == null) {
    const r = await db.from("contest_catalog").update({ edital_prep_id: null }).eq("id", cid.data);
    if (r.error) throw new Error(r.error.message);
    await auditLog(db, { actorId: adminId, userId: adminId, action: "concurso.edital_desvinculado", entity: "contest_catalog", entityId: cid.data }).catch(() => {});
    return;
  }
  const pid = z.uuid().safeParse(prepId);
  if (!pid.success) throw new UserFacingError("Edital inválido.", "invalid_input");
  const [p, n] = await Promise.all([
    db.from("edital_preparations").select("id, status, user_id").eq("id", pid.data).maybeSingle(),
    db.from("edital_disciplines").select("id", { count: "exact", head: true }).eq("preparation_id", pid.data),
  ]);
  if (!p.data) throw new UserFacingError("Edital não encontrado.", "not_found");
  const ok = podePublicar(p.data as { status: string; user_id: string }, adminId, n.count ?? 0);
  if (!ok.ok) throw new UserFacingError(ok.motivo, "invalid_input");
  const r = await db.from("contest_catalog").update({ edital_prep_id: pid.data }).eq("id", cid.data);
  if (r.error) throw new Error(r.error.message);
  await auditLog(db, { actorId: adminId, userId: adminId, action: "concurso.edital_vinculado", entity: "contest_catalog", entityId: cid.data, meta: { preparacao: pid.data } }).catch(() => {});
}

/** Concursos ativos com edital publicado e lido: são os que o aluno escolhe na Central. */
export async function listarConcursosParaEstudo(): Promise<Contest[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("contest_catalog").select("*").eq("active", true).not("edital_prep_id", "is", null).order("featured", { ascending: false }).order("name").limit(200);
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as Array<ContestRow & { edital_prep_id: string }>;
  if (!linhas.length) return [];
  const prontos = await db.from("edital_preparations").select("id").in("id", linhas.map((l) => l.edital_prep_id)).eq("status", "concluido");
  const ok = new Set(((prontos.data ?? []) as Array<{ id: string }>).map((p) => p.id));
  return linhas.filter((l) => ok.has(l.edital_prep_id)).map(toContest);
}
