import "server-only";
import { createHash } from "node:crypto";
import { decodeHtml, extractArticles, htmlToText, LAW_SOURCES } from "@/domain/bank/law-text";
import { articleId } from "@/domain/catalog/match";
import { compareLawHashes, extractLawRefs, hashLawText, type LawCheck, type LawRef } from "@/domain/catalog/law-refs";
import { createAdminClient } from "../supabase";
import { auditLog, logEvent } from "../observability";
import { UserFacingError } from "./trails";
import { getTopic, getTopicQuestions, generateTopicLesson, generateTopicQuestions, generateTopicStructure, publishBlockers, requireAdmin, type TopicRow } from "./catalog";
import { LEVELS } from "@/domain/progress/levels";

/** Baixa a lei na hora (sem cache): a conferência existe justamente para ver o que mudou. */
async function fetchFreshLaw(code: string): Promise<string | null> {
  const src = LAW_SOURCES[code];
  if (!src) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(src.url, { signal: ctrl.signal, headers: { "User-Agent": "APROVUM/1.0 (+conferencia de legislacao)", Accept: "text/html" }, cache: "no-store" });
    if (!res.ok) return null;
    return htmlToText(decodeHtml(new Uint8Array(await res.arrayBuffer()), res.headers.get("content-type")));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Artigos do tema: o que está cadastrado + o que o texto cita. */
export function topicRefs(t: Pick<TopicRow, "law_code" | "articles" | "source_text" | "title" | "summary">): LawRef[] {
  return extractLawRefs({ law_code: t.law_code, articles: t.articles, texts: [t.title, t.summary ?? "", t.source_text] });
}

type LawCache = Map<string, string | null>;

async function checkOne(t: TopicRow, laws: LawCache): Promise<LawCheck | null> {
  const refs = topicRefs(t);
  const hashes: Record<string, string> = {};
  const missing: string[] = [];
  for (const ref of refs) {
    if (!laws.has(ref.law)) laws.set(ref.law, await fetchFreshLaw(ref.law));
    const full = laws.get(ref.law);
    if (!full) return null; // fonte fora do ar: não conclui nada
    const ex = extractArticles(full, ref.articles, 400_000);
    for (const a of ex.found) {
      const one = extractArticles(full, [a], 40_000);
      hashes[`${ref.law}:${a}`] = hashLawText(one.text);
    }
    for (const m of ex.missing) missing.push(`${ref.law}:${articleId(m)}`);
  }
  const prev = (t as TopicRow & { law_hashes?: Record<string, string> }).law_hashes ?? null;
  return compareLawHashes(prev, hashes, missing);
}

export interface LawSyncSummary {
  checked: number;
  desatualizados: number;
  baseline: number;
  semReferencia: number;
  falhas: number;
}

/** Confere os temas contra o texto oficial atual e grava o resultado. Não altera conteúdo. */
export async function checkLawUpdates(topicIds?: string[]): Promise<LawSyncSummary> {
  const user = await requireAdmin();
  const db = createAdminClient();
  let q = db.from("catalog_topics").select("*").neq("status", "arquivado");
  if (topicIds?.length) q = q.in("id", topicIds);
  const { data, error } = await q.limit(1000);
  if (error) throw new Error(error.message);
  const laws: LawCache = new Map();
  const out: LawSyncSummary = { checked: 0, desatualizados: 0, baseline: 0, semReferencia: 0, falhas: 0 };
  for (const row of (data ?? []) as TopicRow[]) {
    const r = await checkOne(row, laws);
    out.checked++;
    const now = new Date().toISOString();
    if (!r) {
      out.falhas++;
      await db.from("catalog_topics").update({ law_status: "erro", law_checked_at: now }).eq("id", row.id);
      continue;
    }
    if (r.status === "desatualizado") out.desatualizados++;
    else if (r.status === "baseline") out.baseline++;
    else if (r.status === "sem_referencia") out.semReferencia++;
    // A base só avança quando está ok/baseline: um tema "desatualizado" mantém a base antiga até ser atualizado.
    const patch: Record<string, unknown> = { law_status: r.status, law_changed: r.changed, law_missing: r.missing, law_checked_at: now };
    if (r.status !== "desatualizado") patch.law_hashes = r.hashes;
    await db.from("catalog_topics").update(patch).eq("id", row.id);
  }
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.law_check", entity: "catalog_topics", meta: { ...out } });
  return out;
}

const hashSnapshot = (s: unknown) => createHash("sha256").update(JSON.stringify(s)).digest("hex").slice(0, 12);

async function snapshotTopic(t: TopicRow, reason: string) {
  const db = createAdminClient();
  const questions = await db.from("catalog_questions").select("*").eq("topic_id", t.id);
  const snap = { topic: t, questions: questions.data ?? [] };
  const ins = await db.from("catalog_topic_history").insert({ topic_id: t.id, version: t.version, reason, snapshot: snap });
  if (ins.error) throw new Error(ins.error.message);
  return hashSnapshot(snap);
}

/** Restaura nós, aula, texto-fonte e questões do último snapshot do tema. */
export async function restoreTopicSnapshot(id: string): Promise<void> {
  const db = createAdminClient();
  const { data } = await db.from("catalog_topic_history").select("*").eq("topic_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) throw new UserFacingError("Não há versão anterior guardada para restaurar.", "no_history");
  const snap = data.snapshot as { topic: TopicRow; questions: Array<Record<string, unknown>> };
  const t = snap.topic;
  const up = await db
    .from("catalog_topics")
    .update({ source_text: t.source_text, nodes: t.nodes, lesson: t.lesson, summary: t.summary, law_status: "desatualizado", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (up.error) throw new Error(up.error.message);
  await db.from("catalog_questions").delete().eq("topic_id", id);
  if (snap.questions.length) {
    const ins = await db.from("catalog_questions").insert(snap.questions);
    if (ins.error) throw new Error(ins.error.message);
  }
}

/**
 * Atualiza um tema com a redação oficial atual: guarda a versão vigente, refaz o texto-fonte
 * (dispositivos), a estrutura, a aula e o banco de questões, e republica com versão nova.
 * Se qualquer passo falhar, restaura a versão guardada — o aluno nunca fica com conteúdo pela metade.
 */
export async function refreshTopicFromLaw(id: string): Promise<{ version: number | null; published: boolean }> {
  const user = await requireAdmin();
  const db = createAdminClient();
  const t = await getTopic(id);
  if (t.law_status === "atualizando") throw new UserFacingError("Este tema já está sendo atualizado.", "busy");
  const wasPublished = t.status === "publicado";
  await snapshotTopic(t, "atualizacao_legislacao");
  await db.from("catalog_topics").update({ law_status: "atualizando" }).eq("id", id);
  try {
    // Dispositivo com lei e artigos: o texto-fonte passa a ser o texto oficial atual.
    if (t.kind === "dispositivo" && t.law_code && t.articles.length) {
      const full = await fetchFreshLaw(t.law_code);
      if (!full) throw new UserFacingError("Não consegui baixar o texto oficial agora. Nada foi alterado.", "law_unavailable");
      const ex = extractArticles(full, t.articles, 120_000);
      if (!ex.found.length) throw new UserFacingError("Os artigos deste tema não foram encontrados no texto oficial (revogados ou renumerados). Nada foi alterado.", "law_missing");
      const up = await db.from("catalog_topics").update({ source_text: ex.text }).eq("id", id);
      if (up.error) throw new Error(up.error.message);
    }
    await generateTopicStructure(id);
    await generateTopicLesson(id);
    for (const l of LEVELS) await generateTopicQuestions(id, l.key);
    const fresh = await getTopic(id);
    const blockers = publishBlockers(fresh, await getTopicQuestions(id));
    if (blockers.length) throw new UserFacingError(`A versão atualizada ficou incompleta: ${blockers.join(" ")} Restaurei a versão anterior.`, "not_ready");
    // Nova base de comparação = redação oficial usada agora.
    const laws: LawCache = new Map();
    const chk = await checkOne({ ...fresh, law_hashes: {} } as TopicRow, laws);
    let version: number | null = null;
    if (wasPublished) {
      const r = await db.rpc("publish_catalog_topic", { p_topic: id });
      if (r.error) throw new Error(r.error.message);
      version = r.data as number;
    }
    await db
      .from("catalog_topics")
      .update({ law_status: chk ? "ok" : "baseline", law_hashes: chk?.hashes ?? {}, law_changed: [], law_missing: chk?.missing ?? [], law_checked_at: new Date().toISOString() })
      .eq("id", id);
    await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.law_refreshed", entity: "catalog_topics", entityId: id, meta: { version, republished: wasPublished } });
    return { version, published: wasPublished };
  } catch (e) {
    await restoreTopicSnapshot(id).catch((re) => logEvent("catalog.law_restore_failed", { id, error: (re as Error).message }));
    await logEvent("catalog.law_refresh_failed", { id, error: (e as Error).message });
    throw e;
  }
}
