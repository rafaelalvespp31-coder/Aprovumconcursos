import "server-only";
import { GoogleGenAI } from "@google/genai";
import { logEvent } from "../observability";
import {
  ANCORAGEM_MINIMA, SCHEMA_IDENTIFICACAO, SCHEMA_TOPICOS, SISTEMA_ESPECIALISTA, montarParsed, pedidoIdentificacao, pedidoTopicos, textoComPaginas, validarIdentificacao, validarTopicos,
  type Identificacao,
} from "@/domain/edital/especialista";
import type { ParsedEdital } from "@/domain/edital/parser";

/** Cada etapa do processamento roda numa chamada de até 60 s: o especialista trabalha dentro de um orçamento menor que isso. */
const ORCAMENTO_MS = 38_000; // deixa folga para gravar as matérias e os tópicos dentro dos 60 s
const ETAPA1_MS = 20_000;
const MAX_CHARS = 1_000_000;
const MAX_TRECHO = 160_000;
const PARALELO = 6;

export type Especialista =
  | { ok: true; modelo: string; info: Identificacao; parsed: ParsedEdital | null; precisaCargo: boolean; ancoragem: number }
  | { ok: false; motivo: string };

const modelos = () => [...new Set([process.env.GEMINI_EDITAL_MODEL?.trim(), "gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"].filter((m): m is string => !!m))];

async function gerar(ai: GoogleGenAI, modelo: string, pedido: string, schema: unknown, ms: number): Promise<unknown> {
  const r = await ai.models.generateContent({
    model: modelo,
    contents: pedido,
    config: { systemInstruction: SISTEMA_ESPECIALISTA, responseMimeType: "application/json", responseSchema: schema as never, temperature: 0, maxOutputTokens: 32768, abortSignal: AbortSignal.timeout(ms) },
  });
  return r.text ?? "";
}

/**
 * O Gemini lê o edital COMPLETO e separa o conteúdo programático: matérias (etapa 1) e tópicos de cada matéria (etapa 2, em paralelo).
 * Cada tópico é conferido contra o texto do PDF; o que não existe no edital é descartado. Qualquer falha devolve ok:false
 * e o processamento segue pela leitura estrutural (nunca fica sem resposta nem usa dado inventado).
 */
export async function lerComEspecialista(pages: readonly string[], cargo: string | null): Promise<Especialista> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { ok: false, motivo: "sem_chave" };
  const texto = textoComPaginas(pages);
  if (texto.length > MAX_CHARS) return { ok: false, motivo: "edital_muito_grande" };
  const t0 = Date.now();
  const restante = () => ORCAMENTO_MS - (Date.now() - t0);
  const ai = new GoogleGenAI({ apiKey });

  // Etapa 1: o edital inteiro → cargos, faixa de páginas e a lista de matérias do cargo.
  let info: Identificacao | null = null;
  let modelo = "";
  let ultimo = "";
  for (const m of modelos()) {
    if (restante() < 8_000) break;
    try {
      info = validarIdentificacao(await gerar(ai, m, pedidoIdentificacao(texto, cargo), SCHEMA_IDENTIFICACAO, Math.min(ETAPA1_MS, restante())), pages.length);
      if (info) { modelo = m; break; }
      ultimo = "resposta_invalida";
    } catch (e) {
      ultimo = (e as Error).message.slice(0, 160);
    }
  }
  if (!info) {
    await logEvent("edital.especialista.falhou", { etapa: 1, erro: ultimo });
    return { ok: false, motivo: ultimo || "sem_resposta" };
  }
  if (!info.disciplinas.length) {
    // Sem cargo informado e conteúdo diferente por cargo: o aluno precisa escolher (a lista de cargos vem do próprio edital).
    if (!cargo && info.cargos.length > 1) return { ok: true, modelo, info, parsed: null, precisaCargo: true, ancoragem: 1 };
    return { ok: false, motivo: "sem_disciplinas" };
  }

  // Etapa 2: tópicos de cada matéria, só com o trecho do conteúdo programático (ou o edital todo se a faixa não foi achada).
  const trecho = info.paginaInicio !== null && info.paginaFim !== null ? textoComPaginas(pages, info.paginaInicio, info.paginaFim) : texto;
  const base = trecho.length > MAX_TRECHO ? trecho.slice(0, MAX_TRECHO) : trecho;
  const saidas: Array<{ nome: string; pagina: number | null; topicos: NonNullable<ReturnType<typeof validarTopicos>> }> = [];
  const fila = [...info.disciplinas];
  let falhou: string | null = null;
  const operario = async () => {
    for (let d = fila.shift(); d && !falhou; d = fila.shift()) {
      let topicos: ReturnType<typeof validarTopicos> = null;
      for (let tentativa = 0; tentativa < 2 && !topicos; tentativa++) {
        if (restante() < 4_000) { falhou = "tempo"; return; }
        try {
          topicos = validarTopicos(await gerar(ai, modelo, pedidoTopicos(d.nome, base, info.cargoUsado ?? cargo), SCHEMA_TOPICOS, Math.min(30_000, restante())));
        } catch (e) {
          falhou = tentativa === 1 ? (e as Error).message.slice(0, 160) : null;
        }
      }
      if (!topicos) { falhou = falhou ?? "resposta_invalida"; return; }
      falhou = null;
      saidas.push({ nome: d.nome, pagina: d.pagina, topicos });
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALELO, fila.length) }, operario));
  if (falhou || saidas.length !== info.disciplinas.length) {
    await logEvent("edital.especialista.falhou", { etapa: 2, erro: falhou ?? "incompleto", modelo });
    return { ok: false, motivo: falhou ?? "incompleto" };
  }
  // Mantém a ordem do edital (as chamadas terminam fora de ordem).
  const ordem = new Map(info.disciplinas.map((d, i) => [d.nome, i]));
  saidas.sort((a, b) => (ordem.get(a.nome) ?? 0) - (ordem.get(b.nome) ?? 0));
  const m = montarParsed({ disciplinas: saidas, paginas: pages, inicio: info.paginaInicio, fim: info.paginaFim });
  if (!m.parsed.found || m.ancoragem < ANCORAGEM_MINIMA) {
    await logEvent("edital.especialista.ancoragem_baixa", { ancoragem: Math.round(m.ancoragem * 100), total: m.total, modelo });
    return { ok: false, motivo: "ancoragem_baixa" };
  }
  return { ok: true, modelo, info, parsed: m.parsed, precisaCargo: false, ancoragem: m.ancoragem };
}
