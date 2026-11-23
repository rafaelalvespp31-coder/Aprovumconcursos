import "server-only";
import { GoogleGenAI } from "@google/genai";
import { logEvent } from "../observability";
import {
  COBERTURA_MINIMA, MAX_SECAO_CHARS, SCHEMA_IDENTIFICACAO, SCHEMA_TRECHO, SISTEMA_ESPECIALISTA, dividirEmTrechos, montarResultado, montarSecao, partirTrecho, pedidoIdentificacao, pedidoTrecho,
  textoComPaginas, validarIdentificacao, validarTrecho,
  type Bloco, type Identificacao, type Secao,
} from "@/domain/edital/especialista";
import type { ParsedEdital } from "@/domain/edital/parser";

/**
 * O Gemini, como especialista, lê o edital inteiro em VÁRIAS chamadas (cada uma cabe nos 60 s da função):
 *  1. identificação: cargos, faixa de páginas do conteúdo programático e lista de matérias;
 *  2. leitura do conteúdo programático em trechos pequenos (resposta curta e rápida), em paralelo;
 *  3. auditoria: mede quanto do texto virou tópico e relê o que ficou sem classificação;
 *  4. fechamento: junta tudo, confere cada tópico no texto do PDF e entrega a estrutura.
 * O estado fica salvo entre as chamadas. Qualquer falha definitiva devolve "falhou" e o processamento segue pela leitura estrutural.
 */
const ORCAMENTO_MS = 44_000;
const CHAMADA_MS = 38_000;
const MARGEM_MS = 9_000;
const PARALELO = 5;
const MAX_TENTATIVAS = 4;
const MAX_LACUNAS = 30;

export interface TrechoEstado { ini: number; fim: number; tent: number; ok: boolean; lacuna?: boolean; blocos?: Bloco[] }
export interface EstadoLeitura {
  v: 1;
  fase: "identificar" | "topicos" | "auditar";
  cargo: string | null;
  modelo: string | null;
  tentIdent: number;
  info?: Identificacao;
  /** Páginas do PDF que formam o conteúdo programático lido (com 1 página de folga no fim). */
  secao?: [number, number];
  trechos: TrechoEstado[];
  auditorias: number;
}

export interface LeituraResumo {
  cobertura: number;
  trechos: number;
  descartados: number;
  naoClassificados: string[];
}

export type Passo =
  | { tipo: "continua"; estado: EstadoLeitura }
  | { tipo: "pronto"; estado: EstadoLeitura; modelo: string; info: Identificacao; parsed: ParsedEdital | null; precisaCargo: boolean; leitura: LeituraResumo }
  | { tipo: "falhou"; motivo: string };

export const estadoInicial = (cargo: string | null): EstadoLeitura => ({ v: 1, fase: "identificar", cargo, modelo: null, tentIdent: 0, trechos: [], auditorias: 0 });

const MODELOS = () => [...new Set([process.env.GEMINI_EDITAL_MODEL?.trim(), "gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"].filter((m): m is string => !!m))];

const ehTempo = (e: unknown) => /abort|timeout|timed out|deadline/i.test(`${(e as Error)?.name ?? ""} ${(e as Error)?.message ?? ""}`);
const ehModeloInvalido = (e: unknown) => /\b(404|400)\b|not found|not supported|unsupported|invalid argument|no longer available|does not exist/i.test((e as Error)?.message ?? "");

/** Uma chamada ao Gemini sem "pensar" (extração literal: pensar só atrasa). Troca de modelo se o escolhido não existe ou não aceita o pedido. */
async function chamar(ai: GoogleGenAI, estado: EstadoLeitura, pedido: string, schema: unknown, ms: number): Promise<string> {
  const ordem = [...new Set([estado.modelo, ...MODELOS()].filter((m): m is string => !!m))];
  let ultimo: unknown = new Error("sem_modelo");
  for (const modelo of ordem) {
    for (const pensando of [false, true]) {
      try {
        const r = await ai.models.generateContent({
          model: modelo,
          contents: pedido,
          config: {
            systemInstruction: SISTEMA_ESPECIALISTA,
            responseMimeType: "application/json",
            responseSchema: schema as never,
            temperature: 0,
            maxOutputTokens: 24_000,
            abortSignal: AbortSignal.timeout(ms),
            ...(pensando ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
          },
        });
        estado.modelo = modelo;
        return r.text ?? "";
      } catch (e) {
        ultimo = e;
        if (ehTempo(e)) throw e;
        if (!pensando && /thinking/i.test((e as Error)?.message ?? "")) continue; // este modelo não aceita desligar o raciocínio: tenta sem a opção
        break;
      }
    }
    if (!ehModeloInvalido(ultimo)) throw ultimo; // sobrecarga/limite: tenta de novo na próxima chamada, sem queimar os outros modelos
  }
  throw ultimo;
}

export interface Ganchos {
  salvar: (e: EstadoLeitura) => Promise<void>;
  avisar: (mensagem: string, nivel?: "info" | "ok" | "warn") => Promise<void>;
}

/** Dá o próximo passo da leitura dentro do orçamento de tempo desta chamada. */
export async function avancarEspecialista(pages: readonly string[], cargo: string | null, anterior: EstadoLeitura | null, hintSecao: [number, number] | null, g: Ganchos): Promise<Passo> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { tipo: "falhou", motivo: "sem_chave" };
  const t0 = Date.now();
  const restante = () => ORCAMENTO_MS - (Date.now() - t0);
  const ai = new GoogleGenAI({ apiKey });
  const estado: EstadoLeitura = anterior ?? estadoInicial(cargo);
  let secao: Secao | null = null;
  const getSecao = (): Secao => (secao ??= montarSecao(pages, estado.secao![0], estado.secao![1]));
  const lidos = () => estado.trechos.filter((t) => t.ok).map((t) => ({ ini: t.ini, fim: t.fim, blocos: t.blocos ?? [] }));

  for (;;) {
    if (restante() < MARGEM_MS + 3_000) { await g.salvar(estado); return { tipo: "continua", estado }; }

    if (estado.fase === "identificar") {
      const texto = textoComPaginas(pages);
      if (texto.length > 1_000_000) return { tipo: "falhou", motivo: "edital_muito_grande" };
      let info: Identificacao | null = null;
      try {
        info = validarIdentificacao(await chamar(ai, estado, pedidoIdentificacao(texto, estado.cargo), SCHEMA_IDENTIFICACAO, Math.min(CHAMADA_MS, restante() - 2_000)), pages.length);
      } catch (e) {
        await logEvent("edital.especialista.falhou", { etapa: "identificar", erro: (e as Error).message.slice(0, 160), tent: estado.tentIdent + 1 });
      }
      if (!info) {
        if (++estado.tentIdent >= 3) return { tipo: "falhou", motivo: "sem_resposta" };
        await g.salvar(estado);
        return { tipo: "continua", estado };
      }
      estado.info = info;
      if (!info.disciplinas.length && !estado.cargo && info.cargos.length > 1) return { tipo: "pronto", estado, modelo: estado.modelo ?? "", info, parsed: null, precisaCargo: true, leitura: { cobertura: 1, trechos: 0, descartados: 0, naoClassificados: [] } };
      const paginasDisc = info.disciplinas.map((d) => d.pagina).filter((n): n is number => n !== null);
      const ini = Math.min(...[info.paginaInicio, ...paginasDisc, hintSecao?.[0] ?? null].filter((n): n is number => n !== null), Infinity);
      const fim = Math.max(...[info.paginaFim, ...paginasDisc, hintSecao?.[1] ?? null].filter((n): n is number => n !== null), -Infinity);
      if (!Number.isFinite(ini) || !Number.isFinite(fim)) return { tipo: "falhou", motivo: "sem_secao" };
      estado.secao = [ini, Math.min(pages.length, fim + 1)];
      const s = getSecao();
      if (s.texto.length > MAX_SECAO_CHARS) return { tipo: "falhou", motivo: "secao_muito_grande" };
      estado.trechos = dividirEmTrechos(s.texto).map((f) => ({ ...f, tent: 0, ok: false }));
      estado.fase = "topicos";
      await g.avisar(`Especialista (${estado.modelo}) localizou o conteúdo programático nas págs. ${estado.secao[0]}–${estado.secao[1]}${info.disciplinas.length ? ` e ${info.disciplinas.length} matérias` : ""}. Lendo item por item em ${estado.trechos.length} ${estado.trechos.length === 1 ? "trecho" : "trechos"}…`, "ok");
      await g.salvar(estado);
      continue;
    }

    if (estado.fase === "topicos") {
      const s = getSecao();
      const conhecidas = (estado.info?.disciplinas ?? []).map((d) => d.nome).slice(0, 60);
      const alvo = estado.info?.cargoUsado ?? estado.cargo;
      const pend = estado.trechos.filter((t) => !t.ok).slice(0, PARALELO);
      if (!pend.length) { estado.fase = "auditar"; continue; }
      const ms = Math.min(CHAMADA_MS, restante() - 2_000);
      await Promise.all(pend.map(async (t) => {
        try {
          const blocos = validarTrecho(await chamar(ai, estado, pedidoTrecho(s.texto.slice(t.ini, t.fim), conhecidas, alvo, !!t.lacuna), SCHEMA_TRECHO, ms));
          if (!blocos) throw new Error("resposta_invalida");
          t.blocos = blocos;
          t.ok = true;
        } catch (e) {
          t.tent++;
          if (!ehTempo(e)) await logEvent("edital.especialista.falhou", { etapa: "trecho", erro: (e as Error).message.slice(0, 160), tent: t.tent });
        }
      }));
      // Trecho que não saiu: divide em dois (resposta menor, mais rápida). Sem como dividir e sem tentativas, desiste.
      for (const t of pend.filter((x) => !x.ok && x.tent >= 2)) {
        const dois = partirTrecho(s.texto, t);
        if (dois) {
          const i = estado.trechos.indexOf(t);
          estado.trechos.splice(i, 1, ...dois.map((f) => ({ ...f, tent: 0, ok: false, ...(t.lacuna ? { lacuna: true } : {}) })));
        } else if (t.tent >= MAX_TENTATIVAS) {
          return { tipo: "falhou", motivo: "trecho_sem_resposta" };
        }
      }
      const feitos = estado.trechos.filter((t) => t.ok).length;
      await g.avisar(`Conteúdo programático lido: ${feitos} de ${estado.trechos.length} ${estado.trechos.length === 1 ? "trecho" : "trechos"}.`, "info");
      await g.salvar(estado);
      continue;
    }

    // Auditoria: quanto do texto virou tópico? O que sobrou volta ao modelo uma vez.
    const s = getSecao();
    const m = montarResultado(s, lidos());
    if (m.lacunas.length && estado.auditorias < 1 && m.cobertura < 0.995) {
      estado.auditorias++;
      const novos: TrechoEstado[] = [];
      for (const l of m.lacunas.slice(0, MAX_LACUNAS)) {
        const sub = dividirEmTrechos(s.texto.slice(l.ini, l.fim));
        for (const f of sub) novos.push({ ini: l.ini + f.ini, fim: l.ini + f.fim, tent: 0, ok: false, lacuna: true });
      }
      estado.trechos.push(...novos);
      estado.fase = "topicos";
      await g.avisar(`Auditoria: ${Math.round(m.cobertura * 100)}% do texto foi classificado. Relendo ${m.lacunas.length} ${m.lacunas.length === 1 ? "trecho" : "trechos"} que ficaram de fora…`, "warn");
      await g.salvar(estado);
      continue;
    }
    const topicos = m.parsed.disciplines.reduce((n, d) => n + d.topics.length, 0);
    if (!m.parsed.found || topicos < 3 || m.cobertura < COBERTURA_MINIMA) {
      await logEvent("edital.especialista.cobertura_baixa", { cobertura: Math.round(m.cobertura * 100), topicos, descartados: m.descartados, modelo: estado.modelo });
      return { tipo: "falhou", motivo: "cobertura_baixa" };
    }
    await g.salvar(estado);
    return {
      tipo: "pronto",
      estado,
      modelo: estado.modelo ?? "",
      info: estado.info!,
      parsed: m.parsed,
      precisaCargo: false,
      leitura: { cobertura: m.cobertura, trechos: estado.trechos.length, descartados: m.descartados, naoClassificados: m.lacunas.slice(0, 12).map((l) => `pág. ${l.pagina}: ${l.texto.slice(0, 160)}`) },
    };
  }
}
