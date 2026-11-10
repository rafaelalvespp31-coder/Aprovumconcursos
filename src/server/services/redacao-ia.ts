import "server-only";
import { z } from "zod";
import { getAIProvider, AIError } from "@/ai";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";
import { brDay } from "@/domain/plans/limits";
import { RUBRICAS_PADRAO, rubricaDaModalidade, rubricaPersonalizada, type Criterio, type Rubrica } from "@/domain/redacao/rubricas";
import { AnaliseSchema, ApontamentosSchema, CriteriosEditalSchema, DiagnosticoSchema, PontuacaoSchema } from "@/domain/redacao/schemas";
import { contaDesviosObjetivos, revisarPontuacao } from "@/domain/redacao/consistencia";
import { localizar, paragrafoDe, type Trecho } from "@/domain/redacao/texto";
import { PROFESSOR, promptAnalise, promptApontamentos, promptCriteriosEdital, promptDiagnostico, promptPontuacao, type Contexto } from "@/domain/redacao/prompts";
import type { AITask, StructuredResult } from "@/ai/provider";

/** Motor de correção em etapas independentes (cada uma com saída estruturada validada) + revisão de consistência em código. */

export const USER_FACING_AI = "O professor de redação não está disponível agora. Tente novamente em instantes.";

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

/** Limite diário de redações enviadas por aluno (admin ilimitado). Ajustável por REDACAO_LIMITE_DIA. */
export const limiteDiario = () => num(process.env.REDACAO_LIMITE_DIA, 5);

/** Teto de gasto diário com IA de redação em USD (REDACAO_ORCAMENTO_DIA_USD); sem a variável, não há teto de custo. */
async function checarOrcamento(): Promise<void> {
  const teto = Number(process.env.REDACAO_ORCAMENTO_DIA_USD);
  if (!Number.isFinite(teto) || teto <= 0) return;
  const db = createAdminClient();
  // Soma no banco (migração 20261110050000). Se ela ainda não foi aplicada, cai para a soma no servidor.
  const agg = await db.rpc("redacao_gasto_dia", { p_start: brDay().start });
  let gasto: number;
  if (!agg.error && agg.data !== null) gasto = Number(agg.data);
  else {
    const r = await db.from("writing_usage").select("cost_usd").gte("created_at", brDay().start).limit(20000);
    gasto = ((r.data ?? []) as { cost_usd: number | null }[]).reduce((s, x) => s + Number(x.cost_usd ?? 0), 0);
  }
  if (gasto >= teto) throw new AIError("O limite diário de uso da IA de redação foi atingido. Tente amanhã.", "budget_exceeded", false);
}

export async function registrarUso(userId: string | null, kind: string, r: { ok: boolean; model?: string; tokensIn?: number; tokensOut?: number; cost?: number | null; error?: string }) {
  try {
    await createAdminClient().from("writing_usage").insert({ user_id: userId, kind, ok: r.ok, model: r.model ?? null, tokens_in: r.tokensIn ?? 0, tokens_out: r.tokensOut ?? 0, cost_usd: r.cost ?? null, error: r.error?.slice(0, 500) ?? null });
  } catch {
    /* o registro de uso nunca derruba a correção */
  }
}

export interface Chamada<T> { task: AITask; schema: z.ZodType<T>; schemaName: string; system?: string; prompt: string; maxOutputTokens: number; temperature?: number; timeoutMs?: number }

/** Uma chamada de IA protegida: orçamento, nova tentativa em falhas recuperáveis, registro de uso e custo. */
export async function chamarIA<T>(userId: string | null, kind: string, c: Chamada<T>): Promise<StructuredResult<T> & { tentativas: number }> {
  await checarOrcamento();
  const provider = getAIProvider("redacao");
  let ultimo: unknown;
  for (let t = 1; t <= 2; t++) {
    try {
      const r = await provider.generateStructured({ task: c.task, system: c.system ?? PROFESSOR, prompt: c.prompt, schema: c.schema, schemaName: c.schemaName, maxOutputTokens: c.maxOutputTokens, temperature: c.temperature ?? 0.2, timeoutMs: c.timeoutMs ?? 150_000 });
      await registrarUso(userId, kind, { ok: true, model: r.model, tokensIn: r.usage.inputTokens, tokensOut: r.usage.outputTokens, cost: r.usage.estimatedCostUsd });
      return { ...r, tentativas: t };
    } catch (e) {
      ultimo = e;
      const retry = e instanceof AIError && e.retryable && t === 1;
      await registrarUso(userId, kind, { ok: false, tokensIn: e instanceof AIError ? e.usage?.inputTokens : 0, tokensOut: e instanceof AIError ? e.usage?.outputTokens : 0, cost: e instanceof AIError ? e.usage?.estimatedCostUsd : null, error: (e as Error).message });
      if (!retry) break;
    }
  }
  throw ultimo;
}

let rubricasOk = false;
/** Garante que as rubricas padrão (e suas versões) existam no banco, para auditoria de cada avaliação. */
export async function garantirRubricas(): Promise<void> {
  if (rubricasOk) return;
  const db = createAdminClient();
  const { error } = await db.from("writing_rubrics").upsert(
    RUBRICAS_PADRAO.map((r) => ({ key: r.key, version: r.version, modality: r.modalities[0] ?? "geral", name: r.name, criteria: r.criteria, max_score: r.max, estimated: r.estimated, source_note: r.note, active: true })),
    { onConflict: "key,version", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  rubricasOk = true;
}

type Sub = { id: string; user_id: string; theme_title: string | null; theme_text: string | null; title: string; body: string; modality: string; board: string | null; contest: string | null; criteria_text: string | null; line_limit: number | null };

async function etapa(evalId: string, stage: string) {
  await createAdminClient().from("writing_evaluations").update({ stage }).eq("id", evalId);
}

/** Rubrica a usar: a dos critérios do edital (se extraídos), senão a da modalidade. */
async function escolherRubrica(sub: Sub): Promise<{ rubrica: Rubrica; criteriosTexto: string | null; avisos: string[]; tokens: { i: number; o: number; c: number } }> {
  const base = rubricaDaModalidade(sub.modality);
  const tokens = { i: 0, o: 0, c: 0 };
  const avisos: string[] = [];
  if (!sub.criteria_text?.trim()) return { rubrica: base, criteriosTexto: null, avisos, tokens };
  try {
    const r = await chamarIA(sub.user_id, "redacao.criterios", { task: "writing_correction", schema: CriteriosEditalSchema, schemaName: "criterios_edital", prompt: promptCriteriosEdital(sub.criteria_text), maxOutputTokens: 2000 });
    tokens.i += r.usage.inputTokens;
    tokens.o += r.usage.outputTokens;
    tokens.c += r.usage.estimatedCostUsd ?? 0;
    if (r.data.encontrou && r.data.criterios.length) {
      const seen = new Set<string>();
      const criteria: Criterio[] = r.data.criterios
        .map((c) => ({ key: c.key.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40) || "criterio", label: c.label, description: c.descricao, max: c.max }))
        .filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true)));
      return { rubrica: rubricaPersonalizada(criteria, base), criteriosTexto: sub.criteria_text, avisos, tokens };
    }
    avisos.push("Não encontramos critérios com pontuação no texto do edital informado; usamos a avaliação pedagógica estimada.");
  } catch (e) {
    if (e instanceof AIError && e.kind === "budget_exceeded") throw e;
    avisos.push("Não foi possível interpretar os critérios do edital; usamos a avaliação pedagógica estimada.");
  }
  return { rubrica: base, criteriosTexto: null, avisos, tokens };
}

/** Executa a correção completa de uma avaliação já criada (status "processando"). Nunca marca concluída se algo falhar. */
export async function executarCorrecao(evalId: string): Promise<void> {
  const db = createAdminClient();
  const ev = await db.from("writing_evaluations").select("id, submission_id, user_id, status").eq("id", evalId).maybeSingle();
  if (!ev.data || ev.data.status !== "processando") return;
  const subRow = await db.from("writing_submissions").select("id, user_id, theme_title, theme_text, title, body, modality, board, contest, criteria_text, line_limit").eq("id", ev.data.submission_id).eq("user_id", ev.data.user_id).maybeSingle();
  if (!subRow.data) return falhar(evalId, null, "Redação não encontrada.");
  const sub = subRow.data as Sub;
  const ctx: Contexto = { modality: sub.modality, board: sub.board, contest: sub.contest, themeTitle: sub.theme_title, themeText: sub.theme_text, lineLimit: sub.line_limit, title: sub.title, body: sub.body };
  const acc = { i: 0, o: 0, c: 0, tentativas: 0, model: "", provider: "" };
  const soma = <T,>(r: StructuredResult<T> & { tentativas: number }) => {
    acc.i += r.usage.inputTokens;
    acc.o += r.usage.outputTokens;
    acc.c += r.usage.estimatedCostUsd ?? 0;
    acc.tentativas += r.tentativas;
    acc.model = r.model;
    acc.provider = r.provider;
  };
  try {
    await garantirRubricas();
    await etapa(evalId, "Identificando a modalidade e os critérios");
    const esc = await escolherRubrica(sub);
    acc.i += esc.tokens.i;
    acc.o += esc.tokens.o;
    acc.c += esc.tokens.c;
    const rubrica = esc.rubrica;
    await db.from("writing_evaluations").update({ rubric_key: rubrica.key, rubric_version: rubrica.version, estimated: rubrica.estimated, max_score: rubrica.max }).eq("id", evalId);

    await etapa(evalId, "Interpretando o tema e analisando estrutura, coesão e argumentação");
    const analiseR = await chamarIA(sub.user_id, "redacao.analise", { task: "writing_correction", schema: AnaliseSchema, schemaName: "analise_redacao", prompt: promptAnalise(ctx, rubrica), maxOutputTokens: 5000 });
    soma(analiseR);
    const analise = analiseR.data;

    await etapa(evalId, "Revisando gramática, ortografia e pontuação linha por linha");
    const apontR = await chamarIA(sub.user_id, "redacao.apontamentos", { task: "writing_correction", schema: ApontamentosSchema, schemaName: "apontamentos", prompt: promptApontamentos(ctx, analise), maxOutputTokens: 9000 });
    soma(apontR);

    // Cada apontamento só vale se o trecho existir de fato no texto original (offsets calculados no servidor).
    const usados: Trecho[] = [];
    const localizados: { start: number; end: number; excerpt: string; a: (typeof apontR.data.apontamentos)[number] }[] = [];
    let descartados = 0;
    for (const a of apontR.data.apontamentos) {
      const loc = localizar(sub.body, a.trecho, usados);
      if (!loc) {
        descartados += 1;
        continue;
      }
      usados.push(loc);
      localizados.push({ ...loc, excerpt: sub.body.slice(loc.start, loc.end), a });
    }
    localizados.sort((x, y) => x.start - y.start);
    const desvios = contaDesviosObjetivos(localizados.map((l) => ({ tipo: l.a.tipo, categoria: l.a.categoria })));
    const resumoErros = localizados.length ? localizados.slice(0, 30).map((l) => `[${l.a.tipo}/${l.a.categoria}] "${l.excerpt.slice(0, 80)}" — ${l.a.problema}`).join("; ") : "nenhum apontamento relevante";

    await etapa(evalId, "Aplicando a rubrica de avaliação");
    const pontR = await chamarIA(sub.user_id, "redacao.pontuacao", { task: "writing_correction", schema: PontuacaoSchema, schemaName: "pontuacao", prompt: promptPontuacao(ctx, rubrica, analise, resumoErros, esc.criteriosTexto), maxOutputTokens: 4000 });
    soma(pontR);

    await etapa(evalId, "Revisando a consistência da pontuação");
    const nota = revisarPontuacao({ rubrica, pontuacoes: pontR.data.criterios.map((c) => ({ key: c.key, pontuacao: c.pontuacao, justificativa: c.justificativa })), analise, desviosObjetivos: desvios });
    const notas = [...esc.avisos, ...nota.notes];
    if (descartados) notas.push(`${descartados} apontamento(s) da IA foram descartados por não corresponderem a um trecho real do seu texto.`);

    await etapa(evalId, "Elaborando o diagnóstico final e o plano de evolução");
    const notaTxt = `${nota.total}/${nota.max}${nota.zeroReason ? ` (nota zero: ${nota.zeroReason})` : ""}; critérios: ${nota.criterios.map((c) => `${c.label} ${c.score}/${c.max}`).join("; ")}`;
    const diagR = await chamarIA(sub.user_id, "redacao.diagnostico", { task: "writing_correction", schema: DiagnosticoSchema, schemaName: "diagnostico", prompt: promptDiagnostico(ctx, rubrica, notaTxt, analise, resumoErros), maxOutputTokens: 9000 });
    soma(diagR);

    // Persistência: só chega aqui com TODAS as etapas válidas.
    const uid = sub.user_id;
    if (localizados.length) {
      const ins = await db.from("writing_errors").insert(
        localizados.map((l, i) => ({ evaluation_id: evalId, user_id: uid, category: l.a.categoria, kind: l.a.tipo, severity: l.a.gravidade, start_offset: l.start, end_offset: l.end, paragraph: paragrafoDe(sub.body, l.start) + 1, excerpt: l.excerpt, issue: l.a.problema, explanation: l.a.explicacao, rule: l.a.regra ?? null, suggestion: l.a.sugestao ?? null, example: l.a.exemplo ?? null, position: i })),
      );
      if (ins.error) throw new Error(ins.error.message);
    }
    const comp = await db.from("writing_competencies").insert(nota.criterios.map((c, i) => ({ evaluation_id: evalId, user_id: uid, key: c.key, label: c.label, score: c.score, max_score: c.max, level: c.level, justification: c.justification, position: i })));
    if (comp.error) throw new Error(comp.error.message);
    const up = await db
      .from("writing_evaluations")
      .update({ status: "concluida", stage: null, model: acc.model, provider: acc.provider, score: nota.total, max_score: nota.max, zero_reason: nota.zeroReason, analysis: analise, diagnostic: diagR.data, plan: diagR.data.plano, consistency_notes: notas, attempts: acc.tentativas, tokens_in: acc.i, tokens_out: acc.o, cost_usd: acc.c || null, finished_at: new Date().toISOString() })
      .eq("id", evalId);
    if (up.error) throw new Error(up.error.message);
    await db.from("writing_submissions").update({ status: "concluida", updated_at: new Date().toISOString() }).eq("id", sub.id);
  } catch (e) {
    const msg = e instanceof AIError ? (e.kind === "not_configured" || e.kind === "budget_exceeded" ? e.message : "A correção falhou por uma instabilidade do professor de redação. Reenvie para tentar de novo.") : "Não foi possível concluir a correção. Reenvie para tentar de novo.";
    await logEvent("redacao.correcao_falhou", { evaluation: evalId, error: (e as Error).message });
    await falhar(evalId, sub.id, msg, (e as Error).message, acc);
  }
}

async function falhar(evalId: string, subId: string | null, userMsg: string, tecnico?: string, acc?: { i: number; o: number; c: number; tentativas: number }) {
  const db = createAdminClient();
  await db.from("writing_evaluations").update({ status: "falhou", stage: null, error: userMsg, consistency_notes: tecnico ? [`técnico: ${tecnico.slice(0, 300)}`] : null, attempts: acc?.tentativas ?? 0, tokens_in: acc?.i ?? 0, tokens_out: acc?.o ?? 0, cost_usd: acc?.c || null, finished_at: new Date().toISOString() }).eq("id", evalId);
  if (subId) await db.from("writing_submissions").update({ status: "falhou", updated_at: new Date().toISOString() }).eq("id", subId);
}
