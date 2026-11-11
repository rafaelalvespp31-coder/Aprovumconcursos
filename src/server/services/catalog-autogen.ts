import "server-only";
import { z } from "zod";
import type { SessionUser } from "../auth";
import { createAdminClient } from "../supabase";
import { getAIProvider } from "@/ai";
import { AIError } from "@/ai/provider";
import { logEvent } from "../observability";
import { UserFacingError } from "./trails";
import { getOutline } from "./outlines";
import { importLessonUpload } from "./catalog-upload";
import { parseOutline } from "@/domain/catalog/topic-group";
import { assemble, checkPart, cleanPart, partPrompt, planGeneration, progressOf, type GenPlan } from "@/domain/catalog/autogen";

const STALE_MS = 6 * 60_000;
const textSchema = z.object({ text: z.string().min(20) });

export interface AutogenState {
  id: string;
  status: "planejada" | "em_geracao" | "aguardando" | "em_revisao" | "concluida" | "falha";
  label: string;
  error: string | null;
  topicId: string | null;
  blockers: string[];
  steps: Array<{ label: string; done: boolean }>;
  progress: ReturnType<typeof progressOf>;
}

type Row = { id: string; created_by: string; outline_id: string | null; ref: string; label: string; discipline_mode: string; plan: GenPlan; texts: Array<string | null>; status: AutogenState["status"]; error: string | null; topic_id: string | null; blockers: string[]; cost_usd: number; updated_at: string };

const COLS = "id, created_by, outline_id, ref, label, discipline_mode, plan, texts, status, error, topic_id, blockers, cost_usd, updated_at";

async function assertEditor(user: SessionUser) {
  const db = createAdminClient();
  const adm = await db.from("admin_roles").select("user_id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (adm.data) return;
  const { data } = await db.from("partner_accounts").select("active, permissions").eq("user_id", user.id).maybeSingle();
  if (data?.active && Array.isArray(data.permissions) && (data.permissions as string[]).includes("catalogar_aulas")) return;
  throw new UserFacingError("Sem permissão para catalogar aulas.", "forbidden");
}

function state(r: Row): AutogenState {
  const texts = r.texts;
  const parts = r.plan.parts;
  const pr = progressOf(parts, texts);
  return {
    id: r.id,
    status: r.status,
    label: r.label,
    error: r.error,
    topicId: r.topic_id,
    blockers: r.blockers ?? [],
    steps: parts.map((p, i) => ({ label: p.label, done: !!texts[i] })),
    progress: r.status === "concluida" ? { ...pr, percent: 100 } : pr,
  };
}

async function load(id: string): Promise<Row> {
  const { data } = await createAdminClient().from("catalog_generation_jobs").select(COLS).eq("id", id).maybeSingle();
  if (!data) throw new UserFacingError("Geração não encontrada.", "not_found");
  return data as unknown as Row;
}

/** Cria (ou retoma) a geração de um subtópico do plano. Uma aula já em andamento é retomada, nunca duplicada. */
export async function startAutogen(user: SessionUser, outlineId: string, ref: string): Promise<AutogenState> {
  await assertEditor(user);
  getAIProvider("catalogo"); // falha cedo e com mensagem clara se a IA não estiver ligada
  const db = createAdminClient();
  const open = await db.from("catalog_generation_jobs").select(COLS).eq("outline_id", outlineId).eq("ref", ref).in("status", ["planejada", "em_geracao", "aguardando", "falha", "em_revisao"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (open.data) return state(open.data as unknown as Row);
  const o = await getOutline(outlineId);
  const m = ref.match(/^(\d{1,3})-(\d{1,3})$/);
  if (!o || !m) throw new UserFacingError("Subtópico não encontrado.", "not_found");
  const g = parseOutline(o.sourceText).groups[Number(m[1])];
  const s = g?.subtopics[Number(m[2])];
  if (!g || !s) throw new UserFacingError("Subtópico não encontrado.", "not_found");
  const input = { disciplineMode: o.disciplineMode, group: g, sub: s };
  const plan = planGeneration(input);
  const label = `${s.code ? `${s.code} ` : ""}${s.title}`;
  const ins = await db.from("catalog_generation_jobs").insert({ created_by: user.id, outline_id: outlineId, ref, label, discipline_mode: o.disciplineMode, input, plan, texts: plan.parts.map(() => null) }).select(COLS).single();
  if (ins.error) throw new Error(ins.error.message);
  return state(ins.data as unknown as Row);
}

export async function autogenStatus(user: SessionUser, id: string): Promise<AutogenState> {
  await assertEditor(user);
  return state(await load(id));
}

/** Gera a próxima parte pendente (uma chamada de IA) ou, no fim, valida e cataloga. */
export async function advanceAutogen(user: SessionUser, id: string): Promise<AutogenState> {
  await assertEditor(user);
  const db = createAdminClient();
  const row = await load(id);
  if (row.status === "concluida") return state(row);
  if (row.status === "em_geracao" && Date.now() - new Date(row.updated_at).getTime() < STALE_MS) throw new UserFacingError("Esta aula já está sendo gerada neste momento.", "rate_limited");

  const parts = row.plan.parts;
  const texts = [...row.texts];
  const idx = texts.findIndex((t) => !t);
  if (idx < 0) return finalize(user, row);

  const claim = await db.from("catalog_generation_jobs").update({ status: "em_geracao", error: null, updated_at: new Date().toISOString() }).eq("id", id).eq("updated_at", row.updated_at).select("id");
  if (!claim.data?.length) throw new UserFacingError("Esta aula já está sendo gerada neste momento.", "rate_limited");

  const part = parts[idx]!;
  const done = parts.filter((_, i) => texts[i]).map((p) => p.label);
  const tail = (texts.slice(0, idx).reverse().find((t) => t) ?? "").slice(-1500);
  const ai = getAIProvider("catalogo");
  let cost = Number(row.cost_usd) || 0;
  let text = "";
  let problems: string[] = [];
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { system, prompt } = partPrompt(row.plan, part, done, tail);
      const note = attempt > 1 ? `\n\nATENÇÃO: a tentativa anterior veio incompleta (${problems.join("; ")}). Escreva a parte INTEIRA de novo, completa.` : "";
      const r = await ai.generateStructured({ task: "generate_lesson", system, prompt: prompt + note, schema: textSchema, schemaName: "parte_da_aula", maxOutputTokens: 16000, temperature: 0.3, timeoutMs: 280_000 });
      cost += r.usage.estimatedCostUsd ?? 0;
      text = cleanPart(r.data.text, part.kind);
      problems = checkPart(part, text);
      if (!problems.length) break;
    }
    if (problems.length) throw new UserFacingError(`A parte “${part.label}” veio incompleta (${problems.join("; ")}). Toque em continuar para refazer só ela.`, "invalid_output");
    texts[idx] = text;
    const fin = texts.every((t) => t);
    await db.from("catalog_generation_jobs").update({ texts, status: "aguardando", error: null, cost_usd: cost, updated_at: new Date().toISOString() }).eq("id", id);
    const fresh = await load(id);
    return fin ? await finalize(user, fresh) : state(fresh);
  } catch (e) {
    const msg = e instanceof UserFacingError ? e.message : e instanceof AIError ? `A IA não respondeu (${e.message.slice(0, 160)}).` : (e as Error).message.slice(0, 200);
    await db.from("catalog_generation_jobs").update({ status: "falha", error: msg, cost_usd: cost, updated_at: new Date().toISOString() }).eq("id", id);
    await logEvent("catalogo.autogen.falha", { id, part: part.key, error: msg });
    return state(await load(id));
  }
}

/** Validação final: só vira "concluída" se o catálogo publicar (≥ 10 questões válidas por nível e todo o conteúdo). */
async function finalize(user: SessionUser, row: Row): Promise<AutogenState> {
  const db = createAdminClient();
  const full = assemble(row.texts as string[]);
  try {
    const r = await importLessonUpload(user, full, `${row.label}.txt`);
    const ok = r.published && !r.blockers.length;
    await db.from("catalog_generation_jobs").update({ status: ok ? "concluida" : "em_revisao", topic_id: r.id, blockers: r.blockers, error: ok ? null : `Salva como rascunho: ${r.blockers.join("; ")}`, updated_at: new Date().toISOString() }).eq("id", row.id);
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await db.from("catalog_generation_jobs").update({ status: "em_revisao", error: msg, updated_at: new Date().toISOString() }).eq("id", row.id);
  }
  return state(await load(row.id));
}

/** Refaz uma parte específica (ex.: depois de uma falha de validação final). */
export async function redoPart(user: SessionUser, id: string, stepIndex: number): Promise<AutogenState> {
  await assertEditor(user);
  const row = await load(id);
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= row.plan.parts.length) throw new UserFacingError("Parte inválida.", "invalid_input");
  const texts = [...row.texts];
  texts[stepIndex] = null;
  await createAdminClient().from("catalog_generation_jobs").update({ texts, status: "aguardando", error: null, updated_at: new Date().toISOString() }).eq("id", id);
  return state(await load(id));
}
