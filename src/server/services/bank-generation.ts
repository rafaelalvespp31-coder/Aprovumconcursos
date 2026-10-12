import "server-only";
import { z } from "zod";
import { AIError, aiEnabled, aiIsConfigured, getAIProvider } from "@/ai";
import { generateBankChunk } from "@/ai/bank-generation";
import {
  BANK_PROMPT_VERSION,
  DEFAULT_CHUNK,
  MAX_SOURCE_CHARS,
  generationParamsSchema,
  quickGenerationSchema,
  type QuickGenerationInput,
  toQuestionInput,
  validateBankQuestions,
  type GenerationParams,
} from "@/domain/bank/generation";
import { LAW_SOURCES } from "@/domain/bank/law-text";
import { LAWS, parseLawReference } from "@/domain/catalog/match";
import { createAdminClient } from "../supabase";
import { officialArticles } from "./law-text";
import { auditLog, logEvent } from "../observability";
import { UserFacingError } from "./trails";
import { saveQuestion, type BankStaff } from "./bank";

/** Teto diário de questões pedidas à IA (toda a equipe), para controlar consumo. */
export function dailyQuestionLimit(): number {
  const n = Number(process.env.AI_BANK_DAILY_QUESTIONS);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : 60;
}
function chunkSize(): number {
  const n = Number(process.env.AI_BANK_CHUNK);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10) : DEFAULT_CHUNK;
}

export function bankAIStatus() {
  const enabled = aiEnabled("banco");
  return {
    enabled,
    configured: enabled && aiIsConfigured("banco"),
    provider: process.env.AI_PROVIDER ?? null,
    model: process.env.AI_MODEL ?? null,
    dailyLimit: dailyQuestionLimit(),
  };
}

const startOfDayIso = () => {
  // Dia no fuso de Brasília.
  const now = new Date(Date.now() - 3 * 3600_000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + 3 * 3600_000).toISOString();
};

export async function usedToday(): Promise<number> {
  const { data } = await createAdminClient().from("bank_generation_batches").select("requested_count, status").gte("created_at", startOfDayIso());
  return (data ?? []).filter((b) => b.status !== "cancelado").reduce((s, b) => s + (b.requested_count as number), 0);
}

interface BatchParams extends GenerationParams {
  attempts?: number;
  rejected?: Array<{ reason: string }>;
  questionIds?: string[];
  leaseUntil?: string;
  lastError?: string;
}

/** Resolve a base do pedido: texto próprio colado > catálogo revisado > texto oficial do Planalto > conhecimento geral. */
async function resolveBase(staff: BankStaff, q: QuickGenerationInput) {
  const db = createAdminClient();
  const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  const ref = parseLawReference(q.query);
  const law = ref.law ? LAW_SOURCES[ref.law] : undefined;
  const lawName = law?.name ?? LAWS.find((l) => l.code === ref.law)?.name;
  const artLabel = ref.articles.length ? `art. ${ref.articles.slice(0, 6).join(", ")}${ref.articles.length > 6 ? "…" : ""}` : "";

  if (q.customText) {
    return { mode: "texto" as const, label: "texto colado por você", sourceText: q.customText, sourceId: undefined, ref: undefined };
  }

  let sourceText: string | null = null;
  let label = "";
  let notice: string | undefined;
  if (ref.law && ref.articles.length) {
    // 1) catálogo revisado da equipe
    const { data: topics } = await db.from("catalog_topics").select("title, source_text, articles").eq("status", "publicado").eq("law_code", ref.law);
    const cat = (topics ?? []).find((t) => ref.articles.every((a) => ((t.articles as string[]) ?? []).includes(a)) && (t.source_text as string)?.length >= 200);
    if (cat) {
      sourceText = (cat.source_text as string).slice(0, MAX_SOURCE_CHARS);
      label = `texto do catálogo revisado (${cat.title as string})`;
    } else if (law) {
      // 2) texto oficial do Planalto
      const off = await officialArticles(ref.law, ref.articles, MAX_SOURCE_CHARS);
      if (off && off.text.length >= 200) {
        sourceText = off.text;
        label = `texto oficial do Planalto (${law.name}, art. ${off.found.join(", ")})`;
        if (off.missing.length) notice = `Artigo(s) não encontrado(s) ou fora do limite de tamanho: ${off.missing.join(", ")}.`;
      } else {
        notice = "Não consegui ler o texto oficial agora; as questões foram geradas com conhecimento geral e os fundamentos serão conferidos na revisão.";
      }
    }
  }

  if (sourceText && law) {
    // Fonte da lei (domínio público) — criada uma vez e reaproveitada.
    let { data: src } = await db.from("question_sources").select("id").eq("url", law.url).maybeSingle();
    if (!src) {
      const ins = await db
        .from("question_sources")
        .insert({
          name: `${law.name} (${law.number}) — Planalto`,
          kind: "legislacao",
          author_institution: "Presidência da República",
          url: law.url,
          consulted_on: today,
          license: "Texto de lei: não protegido por direito autoral (Lei 9.610/1998, art. 8º, IV).",
          status: "ativa",
          created_by: staff.id,
        })
        .select("id")
        .single();
      src = ins.data;
    }
    return {
      mode: "texto" as const,
      label,
      notice,
      sourceText,
      sourceId: (src?.id as string | undefined) ?? undefined,
      ref: { normName: law.name, normNumber: law.number, article: ref.articles.length === 1 ? ref.articles[0] : undefined, officialUrl: law.url, consultedOn: today },
    };
  }
  return {
    mode: "geral" as const,
    label: "conhecimento geral da IA (fundamentos conferidos na revisão)",
    notice,
    sourceText: undefined,
    sourceId: undefined,
    ref: undefined,
    focusHint: lawName ? `${lawName}${artLabel ? `, ${artLabel}` : ""}` : undefined,
  };
}

export async function startGeneration(staff: BankStaff, raw: unknown): Promise<{ batchId: string; total: number; base: string; notice?: string }> {
  if (!staff.roles.autor) throw new UserFacingError("Somente autores geram questões.", "forbidden");
  const status = bankAIStatus();
  if (!status.enabled) throw new UserFacingError("A geração por IA está desligada. Defina AI_ENABLED=banco no servidor.", "ai_off");
  if (!status.configured) throw new UserFacingError("IA não configurada no servidor (provedor, chave ou modelo).", "ai_off");
  const q = quickGenerationSchema.parse(raw);
  const db = createAdminClient();

  const used = await usedToday();
  if (used + q.count > status.dailyLimit) {
    throw new UserFacingError(`Limite diário de geração atingido (${used}/${status.dailyLimit} questões hoje). Tente amanhã ou ajuste AI_BANK_DAILY_QUESTIONS.`, "budget");
  }
  // Evita pedido duplicado (duplo toque): lote igual em andamento nos últimos 2 minutos.
  const { data: recent } = await db
    .from("bank_generation_batches")
    .select("id, params")
    .eq("requested_by", staff.id)
    .eq("status", "processando")
    .gte("created_at", new Date(Date.now() - 120_000).toISOString());
  const dup = (recent ?? []).find((b) => {
    const bp = b.params as BatchParams;
    return bp.subjectId === q.subjectId && bp.topicLabel === q.query && bp.difficulty === q.difficulty && bp.questionType === q.questionType;
  });
  if (dup) return { batchId: dup.id as string, total: q.count, base: "lote já em andamento" };

  // Assunto cadastrado com o mesmo nome vira o assunto da questão.
  const { data: topics } = await db.from("subject_topics").select("id, name").eq("subject_id", q.subjectId).eq("status", "ativo");
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const topicId = (topics ?? []).find((t) => norm(t.name as string) === norm(q.query))?.id as string | undefined;

  const base = await resolveBase(staff, q);
  const p: GenerationParams = generationParamsSchema.parse({
    subjectId: q.subjectId,
    topicId: topicId ?? "",
    difficulty: q.difficulty,
    questionType: q.questionType,
    count: q.count,
    boardStyle: q.boardStyle ?? "",
    casePractice: q.casePractice,
    justification: "completa",
    sourceId: base.sourceId,
    sourceText: base.sourceText,
    topicLabel: q.query,
    focus: "focusHint" in base ? base.focusHint : undefined,
    ref: base.ref,
  });

  const provider = getAIProvider("banco");
  const { data, error } = await db
    .from("bank_generation_batches")
    .insert({
      requested_by: staff.id,
      provider: provider.name,
      model: provider.model,
      prompt_version: BANK_PROMPT_VERSION,
      params: { ...p, attempts: 0, rejected: [], questionIds: [], base: base.label } satisfies BatchParams & { base: string },
      requested_count: p.count,
      status: "processando",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await auditLog(db, { actorId: staff.id, userId: null, action: "bank.ai_batch_started", entity: "bank_generation_batches", entityId: data.id, meta: { count: p.count, query: q.query.slice(0, 120), mode: base.mode } });
  return { batchId: data.id as string, total: p.count, base: base.label, notice: base.notice };
}

export interface StepResult {
  done: boolean;
  produced: number;
  total: number;
  rejected: Array<{ reason: string }>;
  questionIds: string[];
  /** Esperar este tempo antes do próximo passo (limite por minuto do plano gratuito). */
  waitSeconds?: number;
  error?: string;
}

/**
 * Processa o PRÓXIMO pedaço do lote (poucas questões por chamada). O navegador chama
 * repetidamente até terminar — cada chamada cabe no tempo de uma função do servidor e
 * no limite de tokens por minuto do provedor gratuito.
 */
export async function runGenerationStep(staff: BankStaff, batchId: string): Promise<StepResult> {
  z.uuid().parse(batchId);
  const db = createAdminClient();
  const { data: b } = await db.from("bank_generation_batches").select("*").eq("id", batchId).maybeSingle();
  if (!b || b.requested_by !== staff.id) throw new UserFacingError("Lote não encontrado.", "not_found");
  const params = b.params as BatchParams;
  const state = (): StepResult => ({
    done: b.status !== "processando",
    produced: b.produced_count as number,
    total: b.requested_count as number,
    rejected: params.rejected ?? [],
    questionIds: params.questionIds ?? [],
  });
  if (b.status !== "processando") return state();

  const remaining = (b.requested_count as number) - (b.produced_count as number);
  const maxAttempts = Math.ceil((b.requested_count as number) / chunkSize()) + 3;
  if (remaining <= 0 || (params.attempts ?? 0) >= maxAttempts) {
    await db.from("bank_generation_batches").update({ status: "concluido", finished_at: new Date().toISOString() }).eq("id", batchId);
    b.status = "concluido";
    return state();
  }

  // Trava curta: impede duas chamadas simultâneas processarem o mesmo lote.
  const now = new Date();
  if (params.leaseUntil && new Date(params.leaseUntil) > now) return { ...state(), waitSeconds: 5 };
  const leased = { ...params, leaseUntil: new Date(now.getTime() + 55_000).toISOString(), attempts: (params.attempts ?? 0) + 1 };
  const lock = await db.from("bank_generation_batches").update({ params: leased }).eq("id", batchId).eq("params->>attempts", String(params.attempts ?? 0)).select("id");
  if (!lock.data?.length) return { ...state(), waitSeconds: 5 };

  const n = Math.min(chunkSize(), remaining);
  const started = Date.now();
  const { data: board } = params.boardStyle ? await db.from("exam_boards").select("name").eq("slug", params.boardStyle).maybeSingle() : { data: null };
  const { data: existing } = await db.from("bank_questions").select("statement").in("id", params.questionIds?.length ? params.questionIds : ["00000000-0000-0000-0000-000000000000"]);
  const avoid = (existing ?? []).map((r) => r.statement as string);

  let result;
  try {
    result = await generateBankChunk(getAIProvider("banco"), params, n, avoid, (board?.name as string | undefined) ?? undefined);
  } catch (e) {
    const usage = e instanceof AIError ? e.usage : undefined;
    const patch: Record<string, unknown> = {
      params: { ...leased, leaseUntil: null, lastError: (e as Error).message.slice(0, 300) },
      input_tokens: (b.input_tokens as number) + (usage?.inputTokens ?? 0),
      output_tokens: (b.output_tokens as number) + (usage?.outputTokens ?? 0),
    };
    if (e instanceof AIError && e.kind === "rate_limited" && e.retryable) {
      // devolve a tentativa: limite por minuto não conta como falha
      (patch.params as BatchParams).attempts = params.attempts ?? 0;
      await db.from("bank_generation_batches").update(patch).eq("id", batchId);
      return { ...state(), waitSeconds: e.retryAfterSec ?? 20 };
    }
    const fatal = !(e instanceof AIError) || !e.retryable || e.kind === "not_configured";
    if (fatal) {
      patch.status = (b.produced_count as number) > 0 ? "concluido" : "falhou";
      patch.error = (e as Error).message.slice(0, 500);
      patch.finished_at = new Date().toISOString();
    }
    await db.from("bank_generation_batches").update(patch).eq("id", batchId);
    await logEvent("bank.ai_step_failed", { batchId, kind: e instanceof AIError ? e.kind : "unknown", message: (e as Error).message.slice(0, 200) });
    return { ...state(), done: fatal, error: e instanceof AIError ? e.message : "Falha ao gerar. Tente de novo." };
  }

  const { accepted, rejected } = validateBankQuestions(result.data, params, avoid);
  const ids: string[] = [];
  const perQ = accepted.length || 1;
  for (const v of accepted.slice(0, n)) {
    try {
      const input = toQuestionInput(v, params);
      const saved = await saveQuestion(staff, null, { ...input });
      // A IA cadastra para conferência humana, nunca direto para revisão/publicação.
      await db.rpc("bank_decide", { p_actor: staff.id, p_id: saved.id, p_to: "aguardando_conferencia", p_reason: "Gerada por IA: conferir antes da revisão.", p_checks: null });
      await db.from("bank_questions").update({ generation_batch_id: batchId }).eq("id", saved.id);
      await db.from("bank_question_ai_reviews").insert({
        question_id: saved.id,
        provider: result.provider,
        model: result.model,
        prompt_version: BANK_PROMPT_VERSION,
        result: { basis: v.validBasis, difficultyEstimate: v.q.difficultyEstimate, raw: v.q },
        alerts: v.alerts,
        declared_confidence: Math.round(v.q.confidence * 1000) / 1000,
        input_tokens: Math.round(result.usage.inputTokens / perQ),
        output_tokens: Math.round(result.usage.outputTokens / perQ),
        cost_usd: result.usage.estimatedCostUsd === null ? null : result.usage.estimatedCostUsd / perQ,
        duration_ms: Math.round(result.latencyMs / perQ),
      });
      if (v.alerts.some((a) => a.startsWith("IA:"))) {
        await db.from("bank_question_flags").insert({ question_id: saved.id, kind: "ambiguidade", details: v.alerts.filter((a) => a.startsWith("IA:")).join(" ").slice(0, 4000), reported_by: staff.id });
      }
      ids.push(saved.id);
    } catch (e) {
      rejected.push({ index: -1, reason: e instanceof UserFacingError ? e.message : "falha ao salvar." });
    }
  }

  const produced = (b.produced_count as number) + ids.length;
  const allRejected = [...(params.rejected ?? []), ...rejected.map((r) => ({ reason: r.reason }))].slice(-50);
  const questionIds = [...(params.questionIds ?? []), ...ids];
  const finished = produced >= (b.requested_count as number) || leased.attempts >= maxAttempts;
  await db
    .from("bank_generation_batches")
    .update({
      params: { ...leased, leaseUntil: null, rejected: allRejected, questionIds, lastError: null },
      produced_count: produced,
      input_tokens: (b.input_tokens as number) + result.usage.inputTokens,
      output_tokens: (b.output_tokens as number) + result.usage.outputTokens,
      cost_usd: result.usage.estimatedCostUsd === null ? b.cost_usd : Number(b.cost_usd ?? 0) + result.usage.estimatedCostUsd,
      duration_ms: ((b.duration_ms as number | null) ?? 0) + (Date.now() - started),
      ...(finished ? { status: "concluido", finished_at: new Date().toISOString() } : {}),
    })
    .eq("id", batchId);
  if (finished) await auditLog(db, { actorId: staff.id, userId: null, action: "bank.ai_batch_finished", entity: "bank_generation_batches", entityId: batchId, meta: { produced, rejected: allRejected.length } });
  return { done: finished, produced, total: b.requested_count as number, rejected: allRejected, questionIds };
}

export async function cancelGeneration(staff: BankStaff, batchId: string) {
  const db = createAdminClient();
  await db.from("bank_generation_batches").update({ status: "cancelado", finished_at: new Date().toISOString() }).eq("id", z.uuid().parse(batchId)).eq("requested_by", staff.id).eq("status", "processando");
}

export async function listBatches(limit = 20) {
  const { data } = await createAdminClient()
    .from("bank_generation_batches")
    .select("id, created_at, provider, model, requested_count, produced_count, status, input_tokens, output_tokens, cost_usd, duration_ms, error")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function usageReport() {
  const db = createAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(3, 0, 0, 0);
  const { data } = await db.from("bank_generation_batches").select("created_at, requested_count, produced_count, input_tokens, output_tokens, cost_usd, status").gte("created_at", monthStart.toISOString());
  const rows = data ?? [];
  const today = startOfDayIso();
  const sum = (rs: typeof rows) => ({
    batches: rs.length,
    produced: rs.reduce((s, r) => s + (r.produced_count as number), 0),
    tokens: rs.reduce((s, r) => s + (r.input_tokens as number) + (r.output_tokens as number), 0),
    cost: rs.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0),
  });
  return { today: sum(rows.filter((r) => (r.created_at as string) >= today)), month: sum(rows) };
}
