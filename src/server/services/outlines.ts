import "server-only";
import { isDisciplineSlug } from "@/ai/pedagogy";
import { buildSubtopicPrompt } from "@/domain/catalog/subtopic-prompt";
import { findCatalogFor, parseOutline, type Outline, type OutlineStatus } from "@/domain/catalog/topic-group";
import { createAdminClient } from "../supabase";
import type { SessionUser } from "../auth";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";

/**
 * Plano de tópicos: o sumário do edital colado pela equipe. A árvore (tópico › subtópico › itens)
 * é lida do texto a cada vez; a situação de cada subtópico vem do catálogo (mesmo tópico + número).
 */
export interface OutlineRow {
  id: string;
  disciplineMode: string;
  title: string;
  sourceText: string;
  updatedAt: string;
}

const rowOf = (r: Record<string, unknown>): OutlineRow => ({
  id: r.id as string,
  disciplineMode: r.discipline_mode as string,
  title: r.title as string,
  sourceText: r.source_text as string,
  updatedAt: r.updated_at as string,
});

function validate(input: { disciplineMode: string; title: string; text: string }) {
  const title = input.title.replace(/\s+/g, " ").trim();
  const text = input.text.replace(/\r/g, "").trim();
  if (!isDisciplineSlug(input.disciplineMode) || input.disciplineMode === "outra") throw new UserFacingError("Escolha a matéria do sumário.", "invalid_input");
  if (title.length < 2 || title.length > 160) throw new UserFacingError("Dê um nome ao plano (ex.: Direito Penal — Parte Geral).", "invalid_input");
  if (text.length < 2 || text.length > 60000) throw new UserFacingError("Cole o sumário (até 60 mil caracteres).", "invalid_input");
  if (!parseOutline(text).groups.length) throw new UserFacingError("Não encontrei tópicos no texto. Use a numeração do edital: 4. Tópico, 4.1 Subtópico, 4.1.1 Item.", "invalid_input");
  return { discipline_mode: input.disciplineMode, title, source_text: text };
}

export async function listOutlines(): Promise<OutlineRow[]> {
  const { data, error } = await createAdminClient().from("catalog_outlines").select("*").order("updated_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowOf);
}

export async function getOutline(id: string): Promise<OutlineRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("catalog_outlines").select("*").eq("id", id).maybeSingle();
  return data ? rowOf(data) : null;
}

export async function createOutline(user: SessionUser, input: { disciplineMode: string; title: string; text: string }): Promise<string> {
  const db = createAdminClient();
  const r = await db.from("catalog_outlines").insert({ ...validate(input), created_by: user.id }).select("id").single();
  if (r.error) throw new Error(r.error.message);
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.outline_created", entity: "catalog_outlines", entityId: r.data.id as string, meta: {} });
  return r.data.id as string;
}

export async function updateOutline(user: SessionUser, id: string, input: { disciplineMode: string; title: string; text: string }) {
  const db = createAdminClient();
  const r = await db.from("catalog_outlines").update({ ...validate(input), updated_at: new Date().toISOString() }).eq("id", id);
  if (r.error) throw new Error(r.error.message);
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.outline_updated", entity: "catalog_outlines", entityId: id, meta: {} });
}

export async function deleteOutline(user: SessionUser, id: string) {
  const db = createAdminClient();
  const r = await db.from("catalog_outlines").delete().eq("id", id);
  if (r.error) throw new Error(r.error.message);
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.outline_deleted", entity: "catalog_outlines", entityId: id, meta: {} });
}

export interface PlanSubtopic {
  /** Endereço no plano ("0-1" = 1º tópico, 2º subtópico). */
  ref: string;
  code: string | null;
  title: string;
  items: Array<{ code: string | null; title: string }>;
  status: OutlineStatus;
  topicId: string | null;
  prompt: string;
}
export interface PlanView {
  outline: OutlineRow;
  warnings: string[];
  groups: Array<{ code: string | null; title: string; subtopics: PlanSubtopic[] }>;
  totals: { subtopics: number; publicado: number; rascunho: number; pendente: number };
}

/** Árvore do plano com a situação de cada subtópico no catálogo e o comando pronto do ChatGPT. */
export async function planView(outline: OutlineRow): Promise<PlanView> {
  const parsed: Outline = parseOutline(outline.sourceText);
  const { data } = await createAdminClient()
    .from("catalog_topics")
    .select("id, title, status, topic_group, subtopic_code")
    .eq("discipline_mode", outline.disciplineMode)
    .not("topic_group", "is", null)
    .limit(2000);
  const catalog = (data ?? []).map((t) => ({ id: t.id as string, title: t.title as string, status: t.status as string, topicGroup: t.topic_group as string | null, subtopicCode: t.subtopic_code as string | null }));
  const totals = { subtopics: 0, publicado: 0, rascunho: 0, pendente: 0 };
  const groups = parsed.groups.map((g, gi) => ({
    code: g.code,
    title: g.title,
    subtopics: g.subtopics.map((s, si): PlanSubtopic => {
      const hit = findCatalogFor(g, s, catalog);
      const status: OutlineStatus = hit ? (hit.status === "publicado" ? "publicado" : "rascunho") : "pendente";
      totals.subtopics++;
      totals[status]++;
      return { ref: `${gi}-${si}`, code: s.code, title: s.title, items: s.items, status, topicId: hit?.id ?? null, prompt: buildSubtopicPrompt({ disciplineMode: outline.disciplineMode, group: g, sub: s }) };
    }),
  }));
  return { outline, warnings: parsed.warnings, groups, totals };
}

/** Comando de um subtópico do plano (para abrir direto em "Catalogar aula"). */
export async function subtopicPrompt(outlineId: string, ref: string): Promise<{ prompt: string; label: string; planTitle: string } | null> {
  const o = await getOutline(outlineId);
  const m = ref.match(/^(\d{1,3})-(\d{1,3})$/);
  if (!o || !m) return null;
  const parsed = parseOutline(o.sourceText);
  const g = parsed.groups[Number(m[1])];
  const s = g?.subtopics[Number(m[2])];
  if (!g || !s) return null;
  return { prompt: buildSubtopicPrompt({ disciplineMode: o.disciplineMode, group: g, sub: s }), label: `${s.code ? `${s.code} ` : ""}${s.title}`, planTitle: o.title };
}

export interface OutlineTotals {
  subtopics: number;
  publicado: number;
  rascunho: number;
  /** Ainda não publicados (em rascunho ou nem catalogados). */
  faltam: number;
}

/** Planos salvos com quantos subtópicos já estão publicados e quantos faltam (uma consulta só ao catálogo). */
export async function listOutlinesWithTotals(): Promise<Array<OutlineRow & { totals: OutlineTotals }>> {
  const outlines = await listOutlines();
  if (!outlines.length) return [];
  const modes = [...new Set(outlines.map((o) => o.disciplineMode))];
  const { data, error } = await createAdminClient()
    .from("catalog_topics")
    .select("id, title, status, topic_group, subtopic_code, discipline_mode")
    .in("discipline_mode", modes)
    .not("topic_group", "is", null)
    .limit(10000);
  if (error) throw new Error(error.message);
  type Row = { id: string; title: string; status: string; topicGroup: string | null; subtopicCode: string | null; mode: string };
  const byMode = new Map<string, Row[]>();
  for (const t of data ?? []) {
    const row: Row = { id: t.id as string, title: t.title as string, status: t.status as string, topicGroup: t.topic_group as string | null, subtopicCode: t.subtopic_code as string | null, mode: t.discipline_mode as string };
    byMode.set(row.mode, [...(byMode.get(row.mode) ?? []), row]);
  }
  return outlines.map((o) => {
    const catalog = byMode.get(o.disciplineMode) ?? [];
    const totals: OutlineTotals = { subtopics: 0, publicado: 0, rascunho: 0, faltam: 0 };
    for (const g of parseOutline(o.sourceText).groups)
      for (const sub of g.subtopics) {
        const hit = findCatalogFor(g, sub, catalog);
        totals.subtopics++;
        if (hit?.status === "publicado") totals.publicado++;
        else {
          totals.faltam++;
          if (hit) totals.rascunho++;
        }
      }
    return { ...o, totals };
  });
}
