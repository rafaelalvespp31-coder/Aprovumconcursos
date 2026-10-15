import "server-only";
import { createHash } from "node:crypto";
import { normalizeContent } from "@/domain/content/normalize";
import { trailRequestSchema, type TrailRequest } from "@/domain/trail-input";
import { aiEnabled, getAIProvider } from "@/ai";
import type { CatalogMatch } from "@/domain/catalog/match";
import { createAdminClient } from "../supabase";
import { advanceBuild, resumeFailedJob } from "../pipeline/build-trail";
import { advanceLessonJob, type LessonJobState } from "../pipeline/generate-lesson";
import type { BuildState, Job } from "../pipeline/types";
import { SupabaseBuildRepo, SupabaseLessonRepo, JOB_COLUMNS, rowToJob, type JobRow } from "../repos/supabase-repos";
import { auditLog, logEvent } from "../observability";
import { catalogAvailableTitles, createStudyFromCatalog, findInCatalog, loadPublishedIndex } from "./catalog";

/** Mensagem do modo só catálogo: diz o que falta e o que já está disponível. */
async function catalogOnlyMessage(match: CatalogMatch): Promise<string> {
  const titles = await catalogAvailableTitles().catch(() => [] as string[]);
  const disponiveis = titles.length ? ` Disponíveis agora: ${titles.slice(0, 15).join("; ")}${titles.length > 15 ? "; …" : ""}.` : "";
  if (match.kind === "parcial") {
    return `Parte do pedido ainda não está no catálogo (${match.missing.join(", ")}). No momento, o APROVUM usa só conteúdos já cadastrados: peça apenas o que está disponível.${disponiveis}`;
  }
  return `Esse conteúdo ainda não está no catálogo do APROVUM. No momento, os estudos usam só conteúdos já cadastrados.${disponiveis} Dica: escreva o tema ou o artigo, como "homicídio" ou "art. 121 do CP".`;
}

export class UserFacingError extends Error {
  constructor(message: string, public readonly code: string, public readonly data?: unknown) {
    super(message);
    this.name = "UserFacingError";
  }
}

/** Limite de taxa por usuário e ação (servidor). */
export async function enforceRateLimit(userId: string, action: string, max: number, windowSeconds = 60) {
  const db = createAdminClient();
  const { data, error } = await db.rpc("check_rate_limit", { p_key: `${action}:${userId}`, p_window_seconds: windowSeconds, p_max: max });
  if (error) throw new Error(`rate limit indisponível: ${error.message}`);
  if (data !== true) throw new UserFacingError("Muitas solicitações em pouco tempo. Aguarde um instante e tente novamente.", "rate_limited");
}

async function planLimits(userId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("subscriptions")
    .select("status, plans(id, max_active_trails, max_content_chars)")
    .eq("user_id", userId)
    .single();
  const plan = (data?.status === "active" || data?.status === "trialing" ? data?.plans : null) as
    | { id: string; max_active_trails: number; max_content_chars: number }
    | null;
  if (plan) return plan;
  const free = await db.from("plans").select("id, max_active_trails, max_content_chars").eq("id", "free").single();
  if (free.error || !free.data) throw new Error("Plano gratuito não encontrado.");
  return free.data;
}

/**
 * Cria a trilha a partir da solicitação validada. Revalida no servidor, verifica
 * plano/cota, grava o texto original e normalizado e enfileira o job de construção.
 */
export async function createTrail(
  userId: string,
  input: unknown,
  opts: { useCatalog?: boolean; catalogTopicId?: string } = {},
): Promise<{ trailId: string; jobId: string | null; fromCatalog: boolean }> {
  const parsed = trailRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new UserFacingError(parsed.error.issues[0]?.message ?? "Dados inválidos.", "invalid_input");
  }
  const req: TrailRequest = parsed.data;
  await enforceRateLimit(userId, "create_trail", 5);

  const db = createAdminClient();
  const limits = await planLimits(userId);
  if (req.content.length > limits.max_content_chars) {
    throw new UserFacingError(
      `Seu plano permite até ${limits.max_content_chars.toLocaleString("pt-BR")} caracteres por estudo. Divida o conteúdo ou altere o plano.`,
      "content_too_large",
    );
  }
  const { data: active } = await db.rpc("count_active_trails", { p_user: userId });
  if ((active as number) >= limits.max_active_trails) {
    throw new UserFacingError("Você atingiu o número de estudos ativos do seu plano. Arquive um estudo para criar outro.", "trail_limit");
  }
  // Modelo híbrido: pedido coberto pelo catálogo revisado é montado sem IA (e sem consumir cota).
  // Com a IA desligada (modo só catálogo), o catálogo é o único caminho.
  const catalogOnly = !aiEnabled();
  // Aula escolhida no seletor do catálogo: usa exatamente esse tema.
  if (opts.catalogTopicId) {
    const topic = (await loadPublishedIndex()).find((t) => t.id === opts.catalogTopicId);
    if (!topic) throw new UserFacingError("Esta aula não está mais disponível no catálogo. Escolha outra.", "catalog_only");
    const trailId = await createStudyFromCatalog(userId, req, { kind: "completo", topics: [topic], reason: `Tema: ${topic.title}` });
    return { trailId, jobId: null, fromCatalog: true };
  }
  if (opts.useCatalog !== false || catalogOnly) {
    const match = await findInCatalog(req.content).catch(async (e) => {
      await logEvent("catalog.match_failed", { error: (e as Error).message });
      return { kind: "nenhum" } as const;
    });
    if (match.kind === "completo") {
      const trailId = await createStudyFromCatalog(userId, req, match);
      return { trailId, jobId: null, fromCatalog: true };
    }
    if (catalogOnly) throw new UserFacingError(await catalogOnlyMessage(match), "catalog_only");
  }

  const quota = await db.rpc("consume_quota", { p_user: userId, p_kind: "trail_build", p_units: 1 });
  if (quota.error) throw new Error(`cota indisponível: ${quota.error.message}`);
  if (!(quota.data as { allowed: boolean }).allowed) {
    throw new UserFacingError("Limite mensal de novos estudos atingido no seu plano.", "quota_exceeded");
  }

  const norm = normalizeContent(req.content);
  const title = req.title || firstLine(norm.normalized) || "Novo estudo";

  const trail = await db
    .from("study_trails")
    .insert({
      user_id: userId,
      title: title.slice(0, 160),
      board_slug: req.board,
      other_board_name: req.board === "outra" ? req.otherBoardName : null,
      content_type: req.contentType,
      status: "pending",
    })
    .select("id")
    .single();
  if (trail.error) throw new Error(`Falha ao criar trilha: ${trail.error.message}`);
  const trailId = trail.data.id as string;

  try {
    const doc = await db.from("source_documents").insert({ trail_id: trailId, user_id: userId, kind: "texto" }).select("id").single();
    if (doc.error) throw new Error(doc.error.message);
    const ver = await db.from("source_document_versions").insert({
      document_id: doc.data.id,
      user_id: userId,
      version: 1,
      original_text: norm.original,
      normalized_text: norm.normalized,
      char_count: norm.stats.originalLength,
      sha256: createHash("sha256").update(norm.original).digest("hex"),
    });
    if (ver.error) throw new Error(ver.error.message);
    const job = await db
      .from("ai_generation_jobs")
      .insert({ user_id: userId, trail_id: trailId, kind: "build_trail", stage: "queued", status: "queued" })
      .select("id")
      .single();
    if (job.error) throw new Error(job.error.message);
    await auditLog(db, { actorId: userId, userId, action: "trail.created", entity: "study_trails", entityId: trailId, meta: { board: req.board, type: req.contentType, chars: norm.stats.originalLength } });
    return { trailId, jobId: job.data.id as string, fromCatalog: false };
  } catch (err) {
    // Sem trilha "fantasma": desfaz a criação parcial.
    await db.from("study_trails").delete().eq("id", trailId).eq("user_id", userId);
    await logEvent("trail.create_failed", { userId, error: (err as Error).message });
    throw new Error("Não foi possível registrar o estudo. Tente novamente.");
  }
}

function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim().length > 2) ?? "";
  return line.replace(/[:.]+$/, "").slice(0, 80);
}

export async function loadJob(jobId: string, userId: string): Promise<Job<Record<string, unknown>> | null> {
  const db = createAdminClient();
  const { data } = await db.from("ai_generation_jobs").select(JOB_COLUMNS).eq("id", jobId).eq("user_id", userId).maybeSingle();
  return data ? rowToJob(data as JobRow) : null;
}

/**
 * Executa UM passo do job, se conseguir o lease. Devolve o estado atualizado.
 * Seguro para ser chamado repetidamente (polling) e por mais de uma aba.
 */
export async function advanceJob(jobId: string, userId: string) {
  await enforceRateLimit(userId, "advance_job", 60);
  const db = createAdminClient();
  const job = await loadJob(jobId, userId);
  if (!job) throw new UserFacingError("Processamento não encontrado.", "not_found");
  if (job.status === "succeeded" || job.status === "failed") return job;

  const { data: leased } = await db.rpc("acquire_job_lease", { p_job: jobId, p_user: userId, p_seconds: 280 });
  if (!leased) return job; // outro passo em andamento

  const started = Date.now();
  const result =
    job.kind === "build_trail"
      ? await advanceBuild(job as Job<BuildState>, { repo: new SupabaseBuildRepo(db), ai: getAIProvider })
      : await advanceLessonJob(job as Job<LessonJobState>, { repo: new SupabaseLessonRepo(db), ai: getAIProvider });
  await logEvent("job.step", { jobId, kind: job.kind, from: job.stage, to: result.job.stage, status: result.job.status, ms: Date.now() - started });
  return result.job;
}

export async function retryJob(jobId: string, userId: string) {
  const db = createAdminClient();
  const job = await loadJob(jobId, userId);
  if (!job) throw new UserFacingError("Processamento não encontrado.", "not_found");
  if (job.status !== "failed") return job;
  const resumed = resumeFailedJob(job);
  const r = await db
    .from("ai_generation_jobs")
    .update({ status: resumed.status, attempts: 0, error_code: null, error_message: null, finished_at: null })
    .eq("id", jobId)
    .eq("user_id", userId);
  if (r.error) throw new Error(r.error.message);
  if (job.kind === "build_trail") await db.from("study_trails").update({ status: "processing" }).eq("id", job.trailId).eq("user_id", userId);
  return resumed;
}

/** Confirma a trilha após a conferência da prévia e libera a primeira aula. */
export async function activateTrail(trailId: string, userId: string) {
  const db = createAdminClient();
  const t = await db.from("study_trails").select("status").eq("id", trailId).eq("user_id", userId).single();
  if (t.error) throw new UserFacingError("Trilha não encontrada.", "not_found");
  if (t.data.status === "active") return;
  if (t.data.status !== "review") throw new UserFacingError("O estudo ainda não está pronto para começar.", "not_ready");

  const lessons = await db.from("lessons").select("id, sort_order").eq("trail_id", trailId).eq("user_id", userId).order("sort_order");
  if (lessons.error || !lessons.data.length) throw new UserFacingError("O estudo não tem unidades planejadas.", "empty_plan");
  const rows = lessons.data.map((l, i) => ({
    user_id: userId,
    lesson_id: l.id,
    trail_id: trailId,
    state: i === 0 ? "disponivel" : "nao_iniciada",
  }));
  const up = await db.from("learning_progress").upsert(rows, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
  if (up.error) throw new Error(up.error.message);
  await db.from("study_trails").update({ status: "active" }).eq("id", trailId).eq("user_id", userId);
  await db.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
}

export async function setTrailArchived(trailId: string, userId: string, archived: boolean) {
  const db = createAdminClient();
  const r = await db
    .from("study_trails")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", trailId)
    .eq("user_id", userId);
  if (r.error) throw new Error(r.error.message);
}

/**
 * Exclui o estudo de vez: aulas, questões, respostas, progresso, anotações e PDFs
 * vão junto (chaves estrangeiras em cascata). O histórico de cota não é devolvido.
 */
export async function deleteTrail(trailId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(trailId)) throw new UserFacingError("Estudo não encontrado.", "not_found");
  const db = createAdminClient();
  const { data: t } = await db.from("study_trails").select("title").eq("id", trailId).eq("user_id", userId).maybeSingle();
  if (!t) throw new UserFacingError("Estudo não encontrado.", "not_found");
  const r = await db.from("study_trails").delete().eq("id", trailId).eq("user_id", userId);
  if (r.error) throw new Error(r.error.message);
  await auditLog(db, { actorId: userId, userId, action: "trail.deleted", entity: "study_trails", entityId: trailId, meta: { title: t.title } });
}

/**
 * Solicita a geração de uma aula (consome cota uma única vez). Se já houver job
 * ativo para a aula, devolve-o em vez de criar outro.
 */
export async function requestLessonGeneration(lessonId: string, userId: string): Promise<string> {
  const db = createAdminClient();
  const lesson = await db.from("lessons").select("id, trail_id, status").eq("id", lessonId).eq("user_id", userId).single();
  if (lesson.error) throw new UserFacingError("Aula não encontrada.", "not_found");
  const existing = await db
    .from("ai_generation_jobs")
    .select("id, status")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .in("status", ["queued", "running"])
    .maybeSingle();
  if (existing.data) return existing.data.id as string;

  await enforceRateLimit(userId, "generate_lesson", 10);
  const quota = await db.rpc("consume_quota", { p_user: userId, p_kind: "lesson_generation", p_units: 1 });
  if (quota.error) throw new Error(`cota indisponível: ${quota.error.message}`);
  if (!(quota.data as { allowed: boolean }).allowed) {
    throw new UserFacingError("Limite mensal de geração de aulas atingido no seu plano.", "quota_exceeded");
  }
  const job = await db
    .from("ai_generation_jobs")
    .insert({ user_id: userId, trail_id: lesson.data.trail_id, lesson_id: lessonId, kind: "generate_lesson", stage: "queued", status: "queued" })
    .select("id")
    .single();
  if (job.error) throw new Error(job.error.message);
  return job.data.id as string;
}

/**
 * Resposta do aluno ao pedido de esclarecimento do escopo. Grava a resposta e retoma
 * a construção do mesmo ponto (a delimitação roda de novo, agora sem perguntar).
 */
export async function answerClarification(userId: string, trailId: string, answer: string): Promise<string> {
  const text = answer.trim();
  if (text.length < 1 || text.length > 1000) throw new UserFacingError("Escreva uma resposta de até 1.000 caracteres.", "invalid_input");
  await enforceRateLimit(userId, "clarify_scope", 6);
  const db = createAdminClient();
  const t = await db.from("study_trails").select("status").eq("id", trailId).eq("user_id", userId).single();
  if (t.error) throw new UserFacingError("Estudo não encontrado.", "not_found");
  if (t.data.status !== "clarification") throw new UserFacingError("Este estudo não está aguardando esclarecimento.", "not_waiting");
  const job = await db
    .from("ai_generation_jobs")
    .select("id")
    .eq("trail_id", trailId)
    .eq("user_id", userId)
    .eq("kind", "build_trail")
    .eq("error_code", "needs_clarification")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!job.data) throw new UserFacingError("Processamento não encontrado.", "not_found");
  const up = await db.from("study_trails").update({ scope_answer: text }).eq("id", trailId).eq("user_id", userId);
  if (up.error) throw new Error(up.error.message);
  await retryJob(job.data.id as string, userId);
  return job.data.id as string;
}
