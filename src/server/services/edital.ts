import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "../supabase";
import { auditLog, logEvent } from "../observability";
import { UserFacingError, enforceRateLimit } from "./trails";
import { looksLikeEdital, parseEdital, parseProgrammaticText, type ParsedEdital } from "@/domain/edital/parser";
import { detectContestInfo, detectRole, displayTitle } from "@/domain/edital/info";
import { extractOrgLogo } from "./edital-logo";
import { buildIndex, matchTopic, type CatalogEntry } from "@/domain/edital/match";

/**
 * APROVUM AI — preparação por edital. Tudo roda aqui, sem IA externa: leitura do PDF, localização do
 * conteúdo programático, correspondência com o catálogo e persistência. O processamento é dividido
 * em etapas curtas e recuperáveis (cada chamada executa UMA etapa e grava eventos reais), então
 * cabe nos limites da Vercel e pode ser retomado sem reenviar o PDF.
 */

export const EDITAL_BUCKET = "editais";
export const MAX_EDITAL_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 600;

export type PrepStatus = "recebendo" | "lendo" | "identificando" | "mapeando" | "organizando" | "concluido" | "conferencia" | "erro";
export const PARSER_V = 5;
const STEP_OF: Record<PrepStatus, number> = { recebendo: 1, lendo: 2, identificando: 3, mapeando: 4, organizando: 5, concluido: 6, conferencia: 3, erro: 0 };

export const createInput = z.object({
  fileName: z.string().trim().min(1).max(200),
  size: z.number().int().positive().max(MAX_EDITAL_BYTES),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  contestName: z.string().trim().max(160).optional(),
  roleName: z.string().trim().max(160).optional(),
  board: z.string().trim().max(80).optional(),
  year: z.number().int().min(1990).max(2100).optional(),
});

export interface PrepEvent {
  id: number;
  step: number;
  level: "info" | "ok" | "warn" | "error";
  message: string;
  at: string;
}
export interface PrepStats {
  disciplines?: number;
  topics?: number;
  lessons?: number;
  completa?: number;
  parcial?: number;
  conferencia?: number;
  pendentes?: number;
  coveragePct?: number;
  /** Versão do leitor que montou a estrutura; versões antigas são reanalisadas sem novo envio. */
  parserV?: number;
  failedAt?: PrepStatus;
  errorCode?: string;
  notEdital?: boolean;
  confidence?: number;
  warnings?: string[];
  /** Pasta em "Meus estudos" criada pelo botão Começar estudo. */
  studyFolderId?: string;
}
export interface PrepSummary {
  id: string;
  title: string;
  contestName: string | null;
  roleName: string | null;
  /** Símbolo do órgão tirado do cabeçalho do edital (data URL PNG) — null quando o PDF não traz. */
  orgLogo: string | null;
  board: string | null;
  year: number | null;
  fileName: string;
  fileSize: number;
  pageCount: number | null;
  status: PrepStatus;
  step: number;
  error: string | null;
  stats: PrepStats;
  createdAt: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;
const toSummary = (r: Row): PrepSummary => ({
  id: r.id as string,
  title: displayTitle((r.contest_name as string | null) ?? null, r.file_name as string),
  contestName: (r.contest_name as string | null) ?? null,
  roleName: (r.role_name as string | null) ?? null,
  orgLogo: (r.org_logo as string | null) ?? null,
  board: (r.board as string | null) ?? null,
  year: (r.contest_year as number | null) ?? null,
  fileName: r.file_name as string,
  fileSize: r.file_size as number,
  pageCount: (r.page_count as number | null) ?? null,
  status: r.status as PrepStatus,
  step: r.step as number,
  error: (r.error as string | null) ?? null,
  stats: (r.stats as PrepStats) ?? {},
  createdAt: r.created_at as string,
});

async function own(userId: string, id: string): Promise<Row> {
  if (!UUID.test(id)) throw new UserFacingError("Preparação não encontrada.", "not_found");
  const { data, error } = await createAdminClient().from("edital_preparations").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new UserFacingError("Preparação não encontrada.", "not_found");
  return data as Row;
}

async function event(prepId: string, userId: string, step: number, message: string, level: PrepEvent["level"] = "info") {
  await createAdminClient().from("edital_events").insert({ preparation_id: prepId, user_id: userId, step, level, message });
}

async function setStatus(prepId: string, status: PrepStatus, patch: Record<string, unknown> = {}) {
  const { error } = await createAdminClient().from("edital_preparations").update({ status, step: STEP_OF[status] || 1, updated_at: new Date().toISOString(), ...patch }).eq("id", prepId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------

/** Cria a preparação e devolve o endereço assinado para o navegador enviar o PDF direto ao armazenamento. */
export async function createPreparation(userId: string, raw: unknown): Promise<{ id: string; existing: boolean; upload: { path: string; token: string } | null }> {
  const input = createInput.safeParse(raw);
  if (!input.success) throw new UserFacingError("Arquivo inválido. Envie um PDF de até 25 MB.", "invalid_input");
  const v = input.data;
  if (!/\.pdf$/i.test(v.fileName)) throw new UserFacingError("Envie o edital em PDF.", "invalid_input");
  await enforceRateLimit(userId, "edital_novo", 6, 3600);
  const db = createAdminClient();
  // Mesmo edital já enviado por este aluno: reaproveita (sem duplicar nem reprocessar).
  const dup = await db.from("edital_preparations").select("id, status").eq("user_id", userId).eq("file_hash", v.hash).maybeSingle();
  if (dup.data) return { id: dup.data.id as string, existing: true, upload: null };
  const id = crypto.randomUUID();
  const path = `${userId}/${id}.pdf`;
  const ins = await db.from("edital_preparations").insert({
    id,
    user_id: userId,
    contest_name: v.contestName || null,
    role_name: v.roleName || null,
    board: v.board || null,
    contest_year: v.year ?? null,
    file_name: v.fileName,
    file_size: v.size,
    file_hash: v.hash,
    file_path: path,
  });
  if (ins.error) throw new Error(ins.error.message);
  const signed = await db.storage.from(EDITAL_BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data) {
    await db.from("edital_preparations").delete().eq("id", id);
    throw new UserFacingError("Não foi possível preparar o envio agora. Tente novamente.", "storage");
  }
  await auditLog(db, { actorId: userId, userId, action: "edital.criado", entity: "edital_preparations", entityId: id }).catch(() => {});
  return { id, existing: false, upload: { path, token: signed.data.token } };
}

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------

export async function loadCatalog(): Promise<CatalogEntry[]> {
  const { data, error } = await createAdminClient().from("catalog_topics").select("id, title, aliases, discipline_mode, topic_group, law_code, articles").eq("status", "publicado").limit(5000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    aliases: (r.aliases as string[] | null) ?? [],
    mode: r.discipline_mode as string,
    group: (r.topic_group as string | null) ?? null,
    lawCode: (r.law_code as string | null) ?? null,
    articles: (r.articles as string[] | null) ?? [],
  }));
}

async function stageReceive(p: Row) {
  const userId = p.user_id as string;
  const id = p.id as string;
  const db = createAdminClient();
  const dl = await db.storage.from(EDITAL_BUCKET).download(p.file_path as string);
  if (dl.error || !dl.data) throw new UserFacingError("O arquivo ainda não chegou ao armazenamento. Envie o PDF novamente.", "upload_missing");
  const buf = Buffer.from(await dl.data.arrayBuffer());
  if (buf.length > MAX_EDITAL_BYTES) throw new UserFacingError("O PDF passa de 25 MB.", "too_big");
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    await db.storage.from(EDITAL_BUCKET).remove([p.file_path as string]).catch(() => {});
    throw new UserFacingError("O arquivo não é um PDF válido.", "not_pdf");
  }
  const hash = createHash("sha256").update(buf).digest("hex");
  if (hash !== p.file_hash) throw new UserFacingError("O arquivo recebido não confere com o enviado. Envie novamente.", "hash_mismatch");
  await event(id, userId, 1, "Edital recebido.", "ok");
  await event(id, userId, 1, `Documento validado (${(buf.length / 1048576).toFixed(1)} MB).`, "ok");
  await setStatus(id, "lendo");
}

async function stageRead(p: Row) {
  const userId = p.user_id as string;
  const id = p.id as string;
  const db = createAdminClient();
  const hash = p.file_hash as string;
  const cached = await db.from("edital_extractions").select("page_count, chars").eq("file_hash", hash).maybeSingle();
  if (cached.data) {
    await event(id, userId, 2, `Leitura reaproveitada: ${cached.data.page_count} páginas já processadas deste edital.`, "ok");
    await setStatus(id, "identificando", { page_count: cached.data.page_count });
    return;
  }
  const dl = await db.storage.from(EDITAL_BUCKET).download(p.file_path as string);
  if (dl.error || !dl.data) throw new UserFacingError("Não consegui abrir o PDF guardado. Envie novamente.", "upload_missing");
  const { extractText, getDocumentProxy } = await import("unpdf");
  let pages: string[];
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await dl.data.arrayBuffer()));
    if (pdf.numPages > MAX_PAGES) throw new UserFacingError(`O PDF tem ${pdf.numPages} páginas (limite: ${MAX_PAGES}).`, "too_big");
    const r = await extractText(pdf, { mergePages: false });
    pages = r.text.map((t) => t.replace(/\u0000/g, ""));
  } catch (e) {
    if (e instanceof UserFacingError) throw e;
    throw new UserFacingError("Não consegui ler este PDF (protegido ou corrompido).", "unreadable");
  }
  const chars = pages.reduce((n, t) => n + t.length, 0);
  await event(id, userId, 2, `${pages.length} páginas lidas.`, "ok");
  if (chars < 200 || chars / Math.max(1, pages.length) < 40) {
    await event(id, userId, 2, "O PDF não tem texto selecionável (parece digitalizado).", "error");
    throw new UserFacingError("Este PDF parece digitalizado (imagem) e não tem texto para leitura. Use a conferência manual para colar o conteúdo programático.", "no_text");
  }
  // O texto de TODAS as páginas fica guardado (cache por hash): se a seção for mal localizada, dá para reler sem novo upload.
  // A análise, porém, só considera a seção do conteúdo programático (parseEdital isola essa parte).
  const found = parseEdital(pages);
  if (found.found && found.sectionPages) {
    await event(id, userId, 2, `Conteúdo programático localizado (págs. ${found.sectionPages[0]}–${found.sectionPages[1]}). O restante do edital não será analisado.`, "ok");
  } else {
    await event(id, userId, 2, "Não localizei o conteúdo programático com segurança; ele será conferido na próxima etapa.", "warn");
  }
  const ins = await db.from("edital_extractions").upsert({ file_hash: hash, page_count: pages.length, pages, chars }, { onConflict: "file_hash" });
  if (ins.error) throw new Error(ins.error.message);
  await setStatus(id, "identificando", { page_count: pages.length });
}

async function persistParsed(p: Row, parsed: ParsedEdital, manual: boolean) {
  const userId = p.user_id as string;
  const id = p.id as string;
  const db = createAdminClient();
  await db.from("edital_disciplines").delete().eq("preparation_id", id); // cascata limpa tópicos e vínculos
  let nTopics = 0;
  for (const [i, d] of parsed.disciplines.entries()) {
    const disc = await db.from("edital_disciplines").insert({ preparation_id: id, user_id: userId, position: i, name: d.name.slice(0, 160), discipline_mode: d.mode, source_page: manual ? null : d.page }).select("id").single();
    if (disc.error || !disc.data) throw new Error(disc.error?.message ?? "disciplina");
    const rows = d.topics.map((t, k) => ({ preparation_id: id, discipline_id: disc.data.id, user_id: userId, position: k, code: t.code, depth: Math.min(t.depth, 6), title: t.title, title_key: t.titleKey, source_page: manual ? null : t.page }));
    for (let o = 0; o < rows.length; o += 400) {
      const ins = await db.from("edital_topics").insert(rows.slice(o, o + 400));
      if (ins.error) throw new Error(ins.error.message);
    }
    nTopics += rows.length;
  }
  const stats = { ...((p.stats as PrepStats) ?? {}), parserV: PARSER_V, disciplines: parsed.disciplines.length, topics: nTopics, confidence: Math.round(parsed.confidence * 100) / 100, warnings: parsed.warnings.slice(0, 6) };
  const range = parsed.sectionPages ? `[${parsed.sectionPages[0]},${parsed.sectionPages[1] + 1})` : null;
  await setStatus(id, "mapeando", { stats, section_pages: range, error: null });
  await event(id, userId, 3, manual ? "Conteúdo programático recebido na conferência manual." : `Conteúdo programático localizado${parsed.sectionPages ? ` (págs. ${parsed.sectionPages[0]}–${parsed.sectionPages[1]})` : ""}.`, "ok");
  await event(id, userId, 3, `${parsed.disciplines.length} disciplinas identificadas.`, "ok");
  await event(id, userId, 3, `${nTopics} tópicos encontrados.`, "ok");
}

/** Preenche nome do concurso, banca e ano pelo texto do edital, sem sobrescrever o que o aluno informou. */
async function fillInfo(p: Row, pages: string[]) {
  try {
    const info = detectContestInfo(pages);
    const patch: Record<string, unknown> = {};
    if (!p.contest_name && info.contestName) patch.contest_name = info.contestName;
    if (!p.board && info.board) patch.board = info.board;
    if (!p.contest_year && info.year) patch.contest_year = info.year;
    if (!p.role_name) {
      const role = detectRole(pages);
      if (role) patch.role_name = role;
    }
    if (!Object.keys(patch).length) return;
    await createAdminClient().from("edital_preparations").update(patch).eq("id", p.id as string);
    Object.assign(p, patch);
    if (patch.contest_name) await event(p.id as string, p.user_id as string, 3, `Concurso identificado: ${patch.contest_name as string}.`, "ok");
    if (patch.role_name) await event(p.id as string, p.user_id as string, 3, `Cargo identificado: ${patch.role_name as string}.`, "ok");
  } catch {
    /* identificar o nome é um extra: nunca derruba o processamento */
  }
}

/** Preparações antigas sem nome: tenta identificar pelo texto já extraído (reaproveitado pelo hash). */
export async function backfillInfo(rows: Row[]): Promise<void> {
  for (const r of rows) {
    if (r.status === "erro" || r.status === "recebendo") continue;
    if (r.contest_name && r.role_name) continue;
    if (r.contest_name && r.extras_checked) continue; // cargo já procurado uma vez e não havia um só
    const ex = await createAdminClient().from("edital_extractions").select("pages").eq("file_hash", r.file_hash as string).maybeSingle();
    if (ex.data) await fillInfo(r, ex.data.pages as string[]);
  }
  // Símbolo do órgão: procurado uma única vez por preparação (inclusive nas antigas).
  await Promise.all(rows.filter((r) => !r.extras_checked && r.status !== "recebendo").slice(0, 6).map((r) => fillLogo(r)));
}

/** Tira o brasão/logo do cabeçalho do PDF e grava (uma vez). Nunca derruba o processamento. */
async function fillLogo(p: Row): Promise<void> {
  try {
    const db = createAdminClient();
    let logo: string | null = null;
    const dl = await db.storage.from(EDITAL_BUCKET).download(p.file_path as string);
    if (!dl.error && dl.data) logo = await extractOrgLogo(new Uint8Array(await dl.data.arrayBuffer()));
    const patch: Record<string, unknown> = { extras_checked: true };
    if (logo && !p.org_logo) patch.org_logo = logo;
    const up = await db.from("edital_preparations").update(patch).eq("id", p.id as string);
    if (!up.error) Object.assign(p, patch);
  } catch {
    /* símbolo é um extra */
  }
}

async function stageIdentify(p: Row) {
  const userId = p.user_id as string;
  const id = p.id as string;
  const db = createAdminClient();
  const ex = await db.from("edital_extractions").select("pages").eq("file_hash", p.file_hash as string).maybeSingle();
  if (ex.error || !ex.data) throw new UserFacingError("A leitura do edital não foi encontrada. Retome o processamento.", "extraction_missing");
  await fillInfo(p, ex.data.pages as string[]);
  if (!p.extras_checked) await fillLogo(p);
  const parsed = parseEdital(ex.data.pages as string[]);
  if (!parsed.found || parsed.confidence < 0.4 || !parsed.disciplines.length) {
    const notEdital = !looksLikeEdital(ex.data.pages as string[]);
    const msg = notEdital ? "Este arquivo não parece ser um edital de concurso (não há inscrições, cargos, vagas ou banca)." : (parsed.warnings[0] ?? "Não localizei o conteúdo programático com segurança.");
    await event(id, userId, 3, msg, "warn");
    await event(id, userId, 3, notEdital ? "Envie o PDF do edital oficial." : "Precisamos da sua conferência para continuar.", "warn");
    await setStatus(id, "conferencia", { stats: { ...((p.stats as PrepStats) ?? {}), warnings: [msg, ...parsed.warnings.slice(1)], notEdital } });
    return;
  }
  await persistParsed(p, parsed, false);
}

async function stageMap(p: Row) {
  const userId = p.user_id as string;
  const id = p.id as string;
  const db = createAdminClient();
  await event(id, userId, 4, "Consultando catálogo de aulas.", "info");
  const catalog = await loadCatalog();
  const idx = buildIndex(catalog);
  const discs = await db.from("edital_disciplines").select("id, discipline_mode").eq("preparation_id", id);
  const modeOf = new Map(((discs.data ?? []) as Row[]).map((d) => [d.id as string, (d.discipline_mode as string | null) ?? null]));
  const tops = await db.from("edital_topics").select("id, discipline_id, title").eq("preparation_id", id).limit(5000);
  if (tops.error) throw new Error(tops.error.message);
  await db.from("edital_topic_lessons").delete().in("topic_id", ((tops.data ?? []) as Row[]).map((t) => t.id as string).slice(0, 5000));
  const links: Array<{ topic_id: string; catalog_topic_id: string; coverage: string; score: number }> = [];
  const lessonIds = new Set<string>();
  const counts = { completa: 0, parcial: 0, conferencia: 0, nao_encontrado: 0 };
  const updates = new Map<string, Array<{ id: string; score: number }>>();
  for (const t of (tops.data ?? []) as Row[]) {
    const r = matchTopic(idx, t.title as string, modeOf.get(t.discipline_id as string) ?? null);
    counts[r.status]++;
    const list = updates.get(r.status) ?? [];
    list.push({ id: t.id as string, score: r.score });
    updates.set(r.status, list);
    for (const l of r.links) {
      links.push({ topic_id: t.id as string, catalog_topic_id: l.catalogId, coverage: l.coverage, score: l.score });
      lessonIds.add(l.catalogId);
    }
  }
  for (const [status, list] of updates) {
    for (let o = 0; o < list.length; o += 200) {
      await Promise.all(list.slice(o, o + 200).map(async (u) => {
        const up = await db.from("edital_topics").update({ match_status: status, score: u.score }).eq("id", u.id);
        if (up.error) throw new Error(up.error.message);
      }));
    }
  }
  for (let o = 0; o < links.length; o += 400) {
    const ins = await db.from("edital_topic_lessons").insert(links.slice(o, o + 400));
    if (ins.error) throw new Error(ins.error.message);
  }
  const stats = { ...((p.stats as PrepStats) ?? {}), lessons: lessonIds.size, completa: counts.completa, parcial: counts.parcial, conferencia: counts.conferencia, pendentes: counts.nao_encontrado };
  await setStatus(id, "organizando", { stats });
  await event(id, userId, 4, `${lessonIds.size} aulas correspondentes localizadas.`, "ok");
  if (counts.conferencia) await event(id, userId, 4, `${counts.conferencia} conteúdos necessitam de conferência.`, "warn");
  if (counts.nao_encontrado) await event(id, userId, 4, `${counts.nao_encontrado} conteúdos sem aula no catálogo (pendentes).`, "warn");
}

async function stageOrganize(p: Row) {
  const userId = p.user_id as string;
  const id = p.id as string;
  const db = createAdminClient();
  const tops = await db.from("edital_topics").select("id, match_status").eq("preparation_id", id).limit(5000);
  if (tops.error) throw new Error(tops.error.message);
  const total = (tops.data ?? []).length;
  const covered = ((tops.data ?? []) as Row[]).filter((t) => t.match_status === "completa" || t.match_status === "parcial").length;
  const full = ((tops.data ?? []) as Row[]).filter((t) => t.match_status === "completa").length;
  const linked = await db.from("edital_topic_lessons").select("topic_id", { count: "exact", head: true }).in("topic_id", ((tops.data ?? []) as Row[]).map((t) => t.id as string).slice(0, 1000));
  await event(id, userId, 5, "Disciplinas ordenadas conforme o edital.", "ok");
  await event(id, userId, 5, `Vínculos com as aulas originais conferidos (${linked.count ?? 0}).`, "ok");
  const stats = { ...((p.stats as PrepStats) ?? {}), coveragePct: total ? Math.round(((full + (covered - full) * 0.5) / total) * 100) : 0 };
  await setStatus(id, "concluido", { stats });
  await event(id, userId, 6, "Preparação estruturada com sucesso.", "ok");
  // Raio-X: liga ao concurso do catálogo estratégico (ou cria "aguardando análise" para o admin).
  await import("./strategic").then((m) => m.linkPreparationToExam(id)).catch(() => null);
  await auditLog(db, { actorId: userId, userId, action: "edital.concluido", entity: "edital_preparations", entityId: id, meta: stats as Record<string, unknown> }).catch(() => {});
}

/** Executa a PRÓXIMA etapa pendente e devolve o estado. Chamada repetida pelo navegador até terminar. */
export async function advancePreparation(userId: string, id: string): Promise<PrepSummary> {
  let p = await own(userId, id);
  await enforceRateLimit(userId, "edital_etapa", 60, 60);
  const status = p.status as PrepStatus;
  const run: Partial<Record<PrepStatus, (p: Row) => Promise<void>>> = { recebendo: stageReceive, lendo: stageRead, identificando: stageIdentify, mapeando: stageMap, organizando: stageOrganize };
  const fn = run[status];
  if (!fn) return toSummary(p);
  try {
    await fn(p);
  } catch (e) {
    const known = e instanceof UserFacingError;
    const message = known ? e.message : "Falha inesperada no processamento. Você pode retomar sem reenviar o edital.";
    if (!known) await logEvent("edital.erro", { id, status, error: (e as Error).message.slice(0, 300) });
    await event(id, userId, STEP_OF[status], message, "error").catch(() => {});
    const noText = known && e.code === "no_text";
    await setStatus(id, noText ? "conferencia" : "erro", { error: message, stats: { ...((p.stats as PrepStats) ?? {}), failedAt: status, errorCode: known ? e.code : "interno" } }).catch(() => {});
  }
  p = await own(userId, id);
  return toSummary(p);
}

/** Retoma uma preparação que falhou, a partir da etapa onde parou (sem reenviar o PDF). */
export async function resumePreparation(userId: string, id: string): Promise<PrepSummary> {
  const p = await own(userId, id);
  if (p.status !== "erro") return toSummary(p);
  const from = ((p.stats as PrepStats)?.failedAt ?? "recebendo") as PrepStatus;
  const code = (p.stats as PrepStats)?.errorCode;
  if (code === "upload_missing" || code === "not_pdf" || code === "hash_mismatch") throw new UserFacingError("É preciso enviar o PDF novamente.", "reupload");
  await setStatus(id, from === "concluido" ? "organizando" : from, { error: null });
  await event(id, userId, STEP_OF[from] || 1, "Processamento retomado.", "info");
  return toSummary(await own(userId, id));
}

/** Conferência manual: o aluno cola o conteúdo programático; o mesmo leitor monta a estrutura. */
export async function submitManualContent(userId: string, id: string, text: unknown): Promise<PrepSummary> {
  const p = await own(userId, id);
  const t = typeof text === "string" ? text.replace(/\u0000/g, "").trim() : "";
  if (t.length < 20 || t.length > 120000) throw new UserFacingError("Cole o conteúdo programático (de 20 a 120 mil caracteres).", "invalid_input");
  const parsed = parseProgrammaticText(t);
  if (!parsed.found) throw new UserFacingError(parsed.warnings[0] ?? "Não consegui identificar disciplinas. Escreva o nome da disciplina em uma linha e os assuntos numerados abaixo.", "invalid_input");
  await persistParsed(p, parsed, true);
  return toSummary(await own(userId, id));
}

export async function listPreparations(userId: string): Promise<PrepSummary[]> {
  const { data, error } = await createAdminClient().from("edital_preparations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];
  await backfillInfo(rows);
  return rows.map(toSummary);
}

export async function updatePreparationInfo(userId: string, id: string, patch: { contestName?: string; roleName?: string; board?: string; year?: number | null }) {
  await own(userId, id);
  const clean = (v?: string) => (v ?? "").replace(/\s+/g, " ").trim().slice(0, 160) || null;
  const { error } = await createAdminClient().from("edital_preparations").update({ contest_name: clean(patch.contestName), role_name: clean(patch.roleName), board: clean(patch.board), contest_year: patch.year ?? null, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  // Nome/ano do concurso mudou: refaz a ligação automática do Raio-X.
  await import("./strategic").then((m) => m.linkPreparationToExam(id, { force: true })).catch(() => null);
}

export async function listEvents(userId: string, id: string, after = 0): Promise<PrepEvent[]> {
  await own(userId, id);
  const { data, error } = await createAdminClient().from("edital_events").select("id, step, level, message, created_at").eq("preparation_id", id).gt("id", after).order("id").limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((e) => ({ id: e.id as number, step: e.step as number, level: e.level as PrepEvent["level"], message: e.message as string, at: e.created_at as string }));
}

export async function deletePreparation(userId: string, id: string) {
  const p = await own(userId, id);
  const db = createAdminClient();
  const del = await db.from("edital_preparations").delete().eq("id", id).eq("user_id", userId);
  if (del.error) throw new Error(del.error.message);
  const others = await db.from("edital_preparations").select("id", { count: "exact", head: true }).eq("file_path", p.file_path as string);
  if (!others.count) await db.storage.from(EDITAL_BUCKET).remove([p.file_path as string]).catch(() => {});
  // O texto extraído (cache por hash) só some se ninguém mais usa este mesmo edital.
  const sameHash = await db.from("edital_preparations").select("id", { count: "exact", head: true }).eq("file_hash", p.file_hash as string);
  if (!sameHash.count) await db.from("edital_extractions").delete().eq("file_hash", p.file_hash as string);
  await auditLog(db, { actorId: userId, userId, action: "edital.excluido", entity: "edital_preparations", entityId: id }).catch(() => {});
}

/** Preparação feita por uma versão antiga do leitor: refaz a análise com o texto já guardado (sem reenviar o PDF). */
export async function reanalyzeIfStale(userId: string, id: string): Promise<boolean> {
  const p = await own(userId, id);
  const st = (p.stats as PrepStats) ?? {};
  if (p.status !== "concluido" || (st.parserV ?? 1) >= PARSER_V) return false;
  const db = createAdminClient();
  if ((st.parserV ?? 1) < 4) {
    // Leituras antigas guardaram só parte do texto: descarta o cache e relê o PDF guardado (sem novo upload).
    await db.from("edital_extractions").delete().eq("file_hash", p.file_hash as string);
    await setStatus(id, "lendo", { error: null, stats: { ...st, parserV: PARSER_V } });
  } else {
    // O texto completo já está guardado: só refaz a identificação.
    await setStatus(id, "identificando", { error: null, stats: { ...st, parserV: PARSER_V } });
  }
  await event(id, userId, 3, "Atualizando a leitura do edital com o leitor mais recente.", "info");
  return true;
}
