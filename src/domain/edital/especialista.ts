import { modeOfDiscipline } from "./disciplines";
import type { ParsedDiscipline, ParsedEdital, ParsedTopic } from "./parser";
import { fold, titleKey } from "./text";

/**
 * Leitura do edital pelo Gemini como especialista em conteúdo programático. Aqui só há regras puras:
 * instruções, formato de resposta, validação e a CONFERÊNCIA de cada tópico contra o texto do PDF (nada que o
 * modelo escreva e que não esteja no edital entra na preparação).
 */

export const MAX_DISCIPLINAS = 40;
export const MAX_TOPICOS_POR_DISCIPLINA = 600;
/** Abaixo disto, a leitura do Gemini é descartada e vale a leitura estrutural. */
export const ANCORAGEM_MINIMA = 0.7;

export const SISTEMA_ESPECIALISTA = [
  "Você é um analista especialista em editais de concursos públicos brasileiros (carreiras policiais, segurança pública e demais), com larga experiência em separar o CONTEÚDO PROGRAMÁTICO.",
  "Trabalhe SOMENTE com o texto do edital fornecido. Nunca invente matéria, tópico, número, cargo ou página: se algo não está no texto, não existe.",
  "Preserve a redação e a numeração originais dos itens. Não resuma, não reescreva e não una assuntos de itens diferentes.",
  "Ignore tudo que não é conteúdo programático: inscrições, vagas, remuneração, cronograma, regras de prova, TAF, exames, recursos, disposições gerais, quadro de questões e pesos.",
  "Quando o edital traz conteúdos diferentes por cargo, use apenas os do cargo indicado. Se o conteúdo for o mesmo para todos os cargos, use-o.",
  "Responda apenas no formato JSON pedido.",
].join(" ");

const T = { objeto: "OBJECT", texto: "STRING", inteiro: "INTEGER", lista: "ARRAY" } as const;

/** Formato da resposta da etapa 1 (identificação das matérias). */
export const SCHEMA_IDENTIFICACAO = {
  type: T.objeto,
  properties: {
    concurso: { type: T.texto, nullable: true },
    banca: { type: T.texto, nullable: true },
    ano: { type: T.inteiro, nullable: true },
    cargos: { type: T.lista, items: { type: T.texto } },
    cargo_usado: { type: T.texto, nullable: true },
    pagina_inicio: { type: T.inteiro, nullable: true },
    pagina_fim: { type: T.inteiro, nullable: true },
    disciplinas: {
      type: T.lista,
      items: { type: T.objeto, properties: { nome: { type: T.texto }, pagina: { type: T.inteiro, nullable: true } }, required: ["nome"] },
    },
    observacao: { type: T.texto, nullable: true },
  },
  required: ["cargos", "disciplinas"],
} as const;

/** Formato da resposta da etapa 2 (tópicos de uma matéria). */
export const SCHEMA_TOPICOS = {
  type: T.objeto,
  properties: {
    topicos: {
      type: T.lista,
      items: {
        type: T.objeto,
        properties: { codigo: { type: T.texto, nullable: true }, nivel: { type: T.inteiro }, titulo: { type: T.texto } },
        required: ["nivel", "titulo"],
      },
    },
  },
  required: ["topicos"],
} as const;

/** Texto do edital com a página marcada, para o modelo apontar de onde tirou cada coisa. */
export function textoComPaginas(pages: readonly string[], de = 1, ate = pages.length): string {
  const out: string[] = [];
  for (let n = Math.max(1, de); n <= Math.min(pages.length, ate); n++) out.push(`[[PÁGINA ${n}]]\n${pages[n - 1] ?? ""}`);
  return out.join("\n\n");
}

export function pedidoIdentificacao(texto: string, cargo: string | null): string {
  return [
    cargo
      ? `CARGO PRETENDIDO PELO ALUNO: ${cargo}.`
      : "O aluno ainda NÃO informou o cargo. Liste todos os cargos do edital em `cargos`. Se o conteúdo programático for diferente por cargo, devolva `disciplinas` vazio; se for o mesmo para todos, devolva as disciplinas normalmente.",
    "Leia o edital INTEIRO abaixo e devolva em JSON:",
    "- concurso, banca e ano, se constarem;",
    "- cargos: todos os cargos/especialidades que o edital oferece;",
    "- cargo_usado: o cargo cujo conteúdo você separou (ou null se o conteúdo é comum);",
    "- pagina_inicio e pagina_fim: onde está o conteúdo programático do cargo (use os números dos marcadores [[PÁGINA n]]);",
    "- disciplinas: TODAS as matérias do conteúdo programático do cargo, na ordem do edital, com o nome exatamente como escrito e a página onde começam. Inclua conhecimentos básicos e específicos; não inclua itens que não sejam matéria de estudo;",
    "- observacao: qualquer aviso importante (ex.: conteúdo diferente por cargo), ou null.",
    "",
    "EDITAL:",
    texto,
  ].join("\n");
}

export function pedidoTopicos(disciplina: string, trecho: string, cargo: string | null): string {
  return [
    cargo ? `CARGO: ${cargo}.` : "",
    `Do conteúdo programático abaixo, extraia SOMENTE os tópicos da matéria "${disciplina}" (do início da matéria até onde começa a próxima).`,
    "Devolva em JSON, na ordem do edital, um item por assunto:",
    "- codigo: a numeração original do item (ex.: \"1\", \"1.2\", \"a\"), ou null se não houver;",
    "- nivel: 1 para o item principal, 2 para subitem, 3 para o seguinte, e assim por diante;",
    "- titulo: o texto do item como está no edital, sem a numeração.",
    "Quando um item lista vários assuntos separados por ponto e vírgula, mantenha o item no nível 1 e coloque cada assunto no nível 2, com o texto original.",
    "Não inclua tópicos de outras matérias, nem texto que não seja conteúdo programático.",
    "",
    "CONTEÚDO:",
    trecho,
  ].filter(Boolean).join("\n");
}

const limpa = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const inteiro = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

export function lerJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const t = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

export interface Identificacao {
  concurso: string | null;
  banca: string | null;
  ano: number | null;
  cargos: string[];
  cargoUsado: string | null;
  paginaInicio: number | null;
  paginaFim: number | null;
  disciplinas: Array<{ nome: string; pagina: number | null }>;
  observacao: string | null;
}

/** Valida a resposta da etapa 1: só o que tem forma de matéria passa. */
export function validarIdentificacao(raw: unknown, totalPaginas: number): Identificacao | null {
  const o = lerJson(raw) as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return null;
  const pg = (v: unknown) => { const n = inteiro(v); return n !== null && n >= 1 && n <= totalPaginas ? n : null; };
  const vistas = new Set<string>();
  const disciplinas: Identificacao["disciplinas"] = [];
  for (const d of Array.isArray(o.disciplinas) ? (o.disciplinas as unknown[]) : []) {
    const r = d as Record<string, unknown>;
    const nome = limpa(r?.nome, 120);
    const k = fold(nome);
    if (nome.length < 3 || !k || vistas.has(k)) continue;
    vistas.add(k);
    disciplinas.push({ nome, pagina: pg(r.pagina) });
    if (disciplinas.length >= MAX_DISCIPLINAS) break;
  }
  const cargos = [...new Set((Array.isArray(o.cargos) ? (o.cargos as unknown[]) : []).map((c) => limpa(c, 160)).filter((c) => c.length >= 3))].slice(0, 40);
  let ini = pg(o.pagina_inicio), fim = pg(o.pagina_fim);
  if (ini !== null && fim !== null && fim < ini) [ini, fim] = [fim, ini];
  const ano = inteiro(o.ano);
  return {
    concurso: limpa(o.concurso, 160) || null,
    banca: limpa(o.banca, 80) || null,
    ano: ano !== null && ano >= 1990 && ano <= 2100 ? ano : null,
    cargos,
    cargoUsado: limpa(o.cargo_usado, 160) || null,
    paginaInicio: ini,
    paginaFim: fim,
    disciplinas,
    observacao: limpa(o.observacao, 300) || null,
  };
}

export interface TopicoBruto { codigo: string | null; nivel: number; titulo: string }

/** Valida a resposta da etapa 2 (tópicos de uma matéria). */
export function validarTopicos(raw: unknown): TopicoBruto[] | null {
  const o = lerJson(raw) as Record<string, unknown> | null;
  if (!o || !Array.isArray(o.topicos)) return null;
  const out: TopicoBruto[] = [];
  let anterior = "";
  for (const t of o.topicos as unknown[]) {
    const r = t as Record<string, unknown>;
    const titulo = limpa(r?.titulo, 600);
    if (titulo.length < 2) continue;
    const nivel = Math.min(5, Math.max(1, inteiro(r.nivel) ?? 1));
    const codigo = limpa(r.codigo, 20) || null;
    const chave = `${codigo ?? ""}|${fold(titulo)}`;
    if (chave === anterior) continue;
    anterior = chave;
    out.push({ codigo, nivel, titulo });
    if (out.length >= MAX_TOPICOS_POR_DISCIPLINA) break;
  }
  return out;
}

/** Só letras e números, sem acento: casa mesmo com quebra de linha, hífen e espaços do PDF. */
export const compacto = (s: string) => fold(s).replace(/ /g, "");

/** Primeiro trecho do título (compacto) que precisa existir no texto do edital. */
function chaveDeAncora(titulo: string): string {
  const c = compacto(titulo);
  return c.length <= 48 ? c : c.slice(0, 48);
}

export interface EntradaMontagem {
  disciplinas: Array<{ nome: string; pagina: number | null; topicos: TopicoBruto[] }>;
  paginas: readonly string[];
  inicio: number | null;
  fim: number | null;
}

export interface Montagem {
  parsed: ParsedEdital;
  /** Fração dos tópicos devolvidos pelo modelo que foi encontrada no texto do edital (0 a 1). */
  ancoragem: number;
  descartados: number;
  total: number;
}

/**
 * Converte o que o Gemini separou na estrutura da preparação, conferindo cada tópico no texto do PDF:
 * o que não aparece no edital é descartado (e contado), e a confiança é a fração conferida.
 */
export function montarParsed(e: EntradaMontagem): Montagem {
  const compactas = e.paginas.map((p) => compacto(p));
  const todo = compactas.join("");
  const warnings: string[] = [];
  let total = 0, ok = 0;
  const disciplinas: ParsedDiscipline[] = [];
  for (const d of e.disciplinas) {
    const topics: ParsedTopic[] = [];
    for (const t of d.topicos) {
      total++;
      const chave = chaveDeAncora(t.titulo);
      if (chave.length < 3 || !todo.includes(chave)) continue;
      ok++;
      const idx = compactas.findIndex((p) => p.includes(chave));
      topics.push({ code: t.codigo, depth: t.nivel, title: t.titulo, titleKey: titleKey(t.titulo), page: idx >= 0 ? idx + 1 : (d.pagina ?? e.inicio ?? 1) });
    }
    if (!topics.length) { warnings.push(`A matéria “${d.nome}” não teve tópicos conferidos no texto do edital e ficou de fora.`); continue; }
    disciplinas.push({ name: d.nome, mode: modeOfDiscipline(d.nome), page: d.pagina ?? topics[0]!.page, topics });
  }
  const ancoragem = total ? ok / total : 0;
  const descartados = total - ok;
  if (descartados > 0) warnings.push(`${descartados} ${descartados === 1 ? "tópico devolvido pela IA não foi encontrado" : "tópicos devolvidos pela IA não foram encontrados"} no texto do edital e ${descartados === 1 ? "foi descartado" : "foram descartados"}.`);
  const faixa: [number, number] | null = e.inicio !== null && e.fim !== null ? [e.inicio, e.fim] : null;
  return { parsed: { found: disciplinas.length > 0, confidence: Math.round(ancoragem * 100) / 100, sectionPages: faixa, disciplines: disciplinas, warnings }, ancoragem, descartados, total };
}
