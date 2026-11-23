import { modeOfDiscipline } from "./disciplines";
import type { ParsedDiscipline, ParsedEdital, ParsedTopic } from "./parser";
import { fold, titleKey } from "./text";

/**
 * Leitura do edital pelo Gemini como especialista em conteúdo programático. Aqui só há regras puras:
 * instruções, formato de resposta, divisão do conteúdo em trechos, validação, CONFERÊNCIA de cada tópico contra o texto do PDF
 * e AUDITORIA de cobertura (quanto do texto do conteúdo programático virou tópico e o que sobrou sem classificar).
 */

export const MAX_DISCIPLINAS = 60;
export const MAX_TOPICOS_POR_TRECHO = 400;
/** Tamanho-alvo de cada trecho enviado ao modelo: limita a resposta e o tempo de cada chamada. */
export const TRECHO_ALVO = 7_000;
export const TRECHO_SOBREPOSICAO = 260;
export const TRECHO_MINIMO = 1_200;
/** O conteúdo programático lido pelo especialista tem este teto (≈ 60 trechos). */
export const MAX_SECAO_CHARS = 420_000;
/** Pedaço sem classificação só entra na releitura a partir deste tamanho (caracteres sem acento/pontuação). */
export const LACUNA_MINIMA = 70;
/** Abaixo disto a leitura do Gemini é descartada e vale a leitura estrutural. */
export const COBERTURA_MINIMA = 0.5;

export const SISTEMA_ESPECIALISTA = [
  "Você é um analista especialista em editais de concursos públicos brasileiros (carreiras policiais, segurança pública e demais), com larga experiência em separar o CONTEÚDO PROGRAMÁTICO.",
  "Trabalhe SOMENTE com o texto fornecido. Nunca invente matéria, tópico, número, cargo ou página: se algo não está no texto, não existe.",
  "Preserve a redação e a numeração originais dos itens. Não resuma, não reescreva, não pule itens e não una assuntos de itens diferentes.",
  "Ignore tudo que não é conteúdo programático: inscrições, vagas, remuneração, cronograma, regras de prova, TAF, exames, recursos, disposições gerais, quadro de questões e pesos.",
  "Quando o edital traz conteúdos diferentes por cargo, use apenas os do cargo indicado. Se o conteúdo for o mesmo para todos os cargos, use-o.",
  "Responda apenas no formato JSON pedido.",
].join(" ");

const T = { objeto: "OBJECT", texto: "STRING", inteiro: "INTEGER", lista: "ARRAY" } as const;

/** Formato da resposta da etapa 1 (identificação do cargo, da faixa de páginas e das matérias). */
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

/** Formato da resposta da etapa 2 (matérias e tópicos de um trecho do conteúdo programático). */
export const SCHEMA_TRECHO = {
  type: T.objeto,
  properties: {
    blocos: {
      type: T.lista,
      items: {
        type: T.objeto,
        properties: {
          materia: { type: T.texto, nullable: true },
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
      },
    },
  },
  required: ["blocos"],
} as const;

/** Texto do edital com a página marcada, para o modelo apontar de onde tirou cada coisa (usado só na etapa 1). */
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
    "- pagina_inicio e pagina_fim: a primeira e a ÚLTIMA página que contêm itens do conteúdo programático do cargo (use os números dos marcadores [[PÁGINA n]]; o conteúdo costuma ocupar várias páginas seguidas);",
    "- disciplinas: TODAS as matérias do conteúdo programático do cargo, na ordem do edital, com o nome exatamente como escrito (sem a numeração) e a página onde começam. Matéria é a disciplina de estudo (ex.: Língua Portuguesa, Direito Penal). Grupos como “Conhecimentos Básicos” e “Conhecimentos Específicos” NÃO são matérias: as disciplinas que estão dentro deles são;",
    "- observacao: qualquer aviso importante (ex.: conteúdo diferente por cargo), ou null.",
    "",
    "EDITAL:",
    texto,
  ].join("\n");
}

export function pedidoTrecho(trecho: string, conhecidas: readonly string[], cargo: string | null, lacuna: boolean): string {
  return [
    cargo ? `CARGO: ${cargo}. Use só o conteúdo deste cargo; ignore blocos que o edital marca para outros cargos.` : "",
    "O texto abaixo é um TRECHO do conteúdo programático de um edital. Extraia TODOS os itens dele, sem pular nenhum, na ordem em que aparecem.",
    "Devolva `blocos`, um por matéria que aparece no trecho, cada um com:",
    "- materia: o nome da matéria como o edital escreve, sem a numeração. Matéria é a disciplina de estudo (ex.: Língua Portuguesa, Direito Penal); “Conhecimentos Básicos/Específicos”, “Anexo” e títulos de cargo NÃO são matérias. Use null se o trecho começa no meio de uma matéria cujo título não aparece nele;",
    "- topicos: os itens daquela matéria, cada um com `codigo` (a numeração original, ex.: \"1.1\", \"3.5.3\", \"a\"; null se não houver), `nivel` (1 = item principal, 2 = subitem, 3 = o seguinte…) e `titulo` (o texto do item exatamente como está no edital, sem a numeração).",
    "Quando os assuntos de uma matéria vêm numa frase só, separados por ponto e vírgula ou ponto, cada assunto vira um item. Nunca repita o mesmo texto em dois itens.",
    "O título da matéria não é um tópico. Não inclua cabeçalhos, números de página, rodapés nem texto que não seja conteúdo programático.",
    conhecidas.length ? `Nomes de matérias já conhecidos deste edital (use a mesma grafia quando for a mesma matéria): ${conhecidas.join("; ")}.` : "",
    lacuna ? "ATENÇÃO: este trecho ficou sem classificação numa leitura anterior. Extraia os assuntos que ele contém. Se for só a continuação do último item de um trecho anterior (frase pela metade), devolva `blocos` vazio." : "",
    "",
    "TRECHO:",
    trecho,
  ].filter((l) => l !== "").join("\n");
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
export interface Bloco { materia: string | null; topicos: TopicoBruto[] }

/** Valida a resposta de um trecho. Lista vazia é resposta válida (trecho sem itens). */
export function validarTrecho(raw: unknown): Bloco[] | null {
  const o = lerJson(raw) as Record<string, unknown> | null;
  if (!o || !Array.isArray(o.blocos)) return null;
  const out: Bloco[] = [];
  let total = 0;
  for (const b of o.blocos as unknown[]) {
    const r = b as Record<string, unknown>;
    if (!r || !Array.isArray(r.topicos)) continue;
    const topicos: TopicoBruto[] = [];
    let anterior = "";
    for (const t of r.topicos as unknown[]) {
      const x = t as Record<string, unknown>;
      const titulo = limpa(x?.titulo, 700);
      if (titulo.length < 2) continue;
      const nivel = Math.min(6, Math.max(1, inteiro(x.nivel) ?? 1));
      const codigo = limpa(x.codigo, 24) || null;
      const chave = `${codigo ?? ""}|${fold(titulo)}`;
      if (chave === anterior) continue;
      anterior = chave;
      topicos.push({ codigo, nivel, titulo });
      if (++total >= MAX_TOPICOS_POR_TRECHO) break;
    }
    out.push({ materia: limpa(r.materia, 120) || null, topicos });
    if (total >= MAX_TOPICOS_POR_TRECHO) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Texto do conteúdo programático, divisão em trechos e mapa de posições
// ---------------------------------------------------------------------------

/** Só letras e números, sem acento: casa mesmo com quebra de linha, hífen e espaços do PDF. */
export const compacto = (s: string): string => {
  let o = "";
  for (let i = 0; i < s.length; i++) o += s[i]!.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return o;
};

/** O PDF repete o número da página no começo ("43 43 ..."): tira esse ruído para não quebrar tópicos que atravessam a página. */
export function limparPagina(texto: string, n: number): string {
  return texto.replace(/\u0000/g, "").replace(new RegExp(`^\\s*${n}\\s?${n}(?=\\s|$)`), "").trim();
}

export interface Secao {
  texto: string;
  /** Posição (no texto) em que cada página começa. */
  paginas: Array<{ n: number; inicio: number }>;
  /** Texto compacto (só letras/números) e, para cada letra dele, a posição no texto original. */
  c: string;
  paraOriginal: Int32Array;
  /** Para cada posição do texto original (0..tamanho), onde ela cai no texto compacto. */
  deOriginal: Int32Array;
}

export function montarSecao(pages: readonly string[], de: number, ate: number): Secao {
  const partes: string[] = [];
  const paginas: Secao["paginas"] = [];
  let tam = 0;
  for (let n = Math.max(1, de); n <= Math.min(pages.length, ate); n++) {
    const t = limparPagina(pages[n - 1] ?? "", n);
    paginas.push({ n, inicio: tam });
    partes.push(t);
    tam += t.length + 2;
  }
  const texto = partes.join("\n\n");
  const letras: string[] = [];
  const para: number[] = [];
  const de2 = new Int32Array(texto.length + 1);
  for (let i = 0; i < texto.length; i++) {
    de2[i] = letras.length;
    const f = texto[i]!.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const ch of f) { letras.push(ch); para.push(i); }
  }
  de2[texto.length] = letras.length;
  return { texto, paginas, c: letras.join(""), paraOriginal: Int32Array.from(para), deOriginal: de2 };
}

export interface Faixa { ini: number; fim: number }

/** Corta no melhor ponto perto de `alvo`: quebra de linha, fim de frase, ponto e vírgula, espaço. */
function pontoDeCorte(texto: string, de: number, alvo: number): number {
  const lim = Math.min(texto.length, alvo);
  if (lim >= texto.length) return texto.length;
  const janela = texto.slice(Math.max(de + 1, lim - 700), lim);
  const base = Math.max(de + 1, lim - 700);
  for (const re of [/\n(?=[^\n]*$)/, /[.;:](?=\s[^.;:]*$)/, /\s(?=\S*$)/]) {
    const m = re.exec(janela);
    if (m) return base + m.index + 1;
  }
  return lim;
}

/** Divide o conteúdo programático em trechos sequenciais (com uma pequena sobreposição entre eles). */
export function dividirEmTrechos(texto: string, alvo = TRECHO_ALVO, sobreposicao = TRECHO_SOBREPOSICAO): Faixa[] {
  const out: Faixa[] = [];
  let ini = 0;
  while (ini < texto.length) {
    const fim = pontoDeCorte(texto, ini, ini + alvo);
    out.push({ ini, fim });
    if (fim >= texto.length) break;
    let prox = Math.max(ini + 1, fim - sobreposicao);
    const sp = texto.slice(prox, fim).search(/\s/);
    if (sp >= 0) prox += sp + 1;
    ini = Math.min(prox, fim);
  }
  return out;
}

/** Parte um trecho em dois (usado quando o modelo não consegue ler um trecho inteiro a tempo). */
export function partirTrecho(texto: string, f: Faixa): [Faixa, Faixa] | null {
  if (f.fim - f.ini < TRECHO_MINIMO * 2) return null;
  const meio = pontoDeCorte(texto, f.ini, f.ini + Math.floor((f.fim - f.ini) / 2));
  if (meio <= f.ini || meio >= f.fim) return null;
  return [{ ini: f.ini, fim: meio }, { ini: Math.max(f.ini, meio - TRECHO_SOBREPOSICAO), fim: f.fim }];
}

// ---------------------------------------------------------------------------
// Conferência contra o texto do PDF, montagem e auditoria de cobertura
// ---------------------------------------------------------------------------

export interface TrechoLido { ini: number; fim: number; blocos: Bloco[] }

interface Entrada { materia: string | null; codigo: string | null; nivel: number; titulo: string; pos: number; fimPos: number; trecho: number }

const ehCodigoNumerico = (c: string | null): c is string => !!c && /^\d+(\.\d+)*\.?$/.test(c);
const segmentos = (c: string) => c.replace(/\.$/, "").split(".").length;

/**
 * Acha o início do título dentro do texto (compacto), da posição `de` até `ate`. Com a numeração do item (ex.: "5.6" + "Prova") a busca é mais firme
 * e acha até títulos curtos; sem ela, usa o começo do título (aceita um prefixo menor quando o PDF quebrou o texto).
 */
function achar(c: string, codigo: string | null, titulo: string, de: number, ate: number): number {
  const k = compacto(titulo);
  const cod = codigo ? compacto(codigo) : "";
  if (cod && k.length >= 2) {
    const i = c.indexOf(cod + k.slice(0, 48), de);
    if (i >= 0 && i <= ate) return i + cod.length;
  }
  for (const n of [48, 24, 14, 8]) {
    if (k.length < Math.min(n, 5)) continue;
    const chave = k.slice(0, n);
    const i = c.indexOf(chave, de);
    if (i >= 0 && i <= ate) return i;
  }
  return -1;
}

export interface Lacuna { ini: number; fim: number; texto: string; pagina: number }

export interface Montagem {
  parsed: ParsedEdital;
  /** Fração do texto do conteúdo programático que virou tópico (0 a 1). */
  cobertura: number;
  /** Tópicos devolvidos pelo modelo que não existem no texto do edital (descartados). */
  descartados: number;
  total: number;
  /** Pedaços do texto que não foram classificados em nenhum tópico (faixas no texto original). */
  lacunas: Lacuna[];
}

const paginaDe = (s: Secao, pos: number): number => {
  let n = s.paginas[0]?.n ?? 1;
  for (const p of s.paginas) { if (p.inicio <= pos) n = p.n; else break; }
  return n;
};

/**
 * Junta os trechos lidos na estrutura da preparação, conferindo cada tópico no texto do PDF (o que não aparece no edital é descartado),
 * ordenando pela posição no texto, herdando a matéria quando o trecho começa no meio dela e medindo a cobertura.
 */
export function montarResultado(secao: Secao, trechos: readonly TrechoLido[]): Montagem {
  const entradas: Entrada[] = [];
  let total = 0, descartados = 0;
  trechos.forEach((t, idx) => {
    const ci = secao.deOriginal[Math.min(t.ini, secao.texto.length)] ?? 0;
    const cf = secao.deOriginal[Math.min(t.fim, secao.texto.length)] ?? secao.c.length;
    let cursor = Math.max(0, ci - 40);
    for (const b of t.blocos) {
      let materia = b.materia;
      for (const tp of b.topicos) {
        total++;
        let pos = achar(secao.c, tp.codigo, tp.titulo, cursor, cf + 40);
        if (pos < 0) pos = achar(secao.c, tp.codigo, tp.titulo, Math.max(0, ci - 40), cf + 40);
        if (pos < 0) { descartados++; continue; }
        cursor = pos + 1;
        const fimPos = Math.min(secao.c.length, pos + compacto(tp.titulo).length);
        entradas.push({ materia, codigo: tp.codigo, nivel: tp.nivel, titulo: tp.titulo, pos, fimPos, trecho: idx });
        materia = null; // o nome só vale para o primeiro item do bloco; os demais herdam pela ordem
      }
    }
  });
  entradas.sort((a, b) => a.pos - b.pos || b.titulo.length - a.titulo.length);
  // Remove duplicatas da sobreposição entre trechos: mesmo início (fica o mais completo) ou fragmento contido em outro item de outro trecho.
  const unicas: Entrada[] = [];
  for (const e of entradas) {
    const ant = unicas[unicas.length - 1];
    if (ant && ant.pos === e.pos) {
      if (e.materia && !ant.materia) ant.materia = e.materia;
      continue;
    }
    const cont = unicas.slice(-6).some((f) => f.trecho !== e.trecho && f.pos < e.pos && e.fimPos <= f.fimPos);
    if (cont) continue;
    unicas.push(e);
  }
  // Matéria: a do próprio item, ou a do item anterior.
  let atual: string | null = null;
  for (const e of unicas) { if (e.materia) atual = e.materia; else e.materia = atual ?? "Conteúdo programático"; }

  // Cobertura do texto: itens (com a numeração) e nomes de matéria.
  const coberto = new Uint8Array(secao.c.length);
  const marca = (a: number, b: number) => { for (let i = Math.max(0, a); i < Math.min(b, coberto.length); i++) coberto[i] = 1; };
  let nomeAnterior = "";
  for (const e of unicas) {
    marca(e.pos - (e.codigo ? compacto(e.codigo).length : 0), e.fimPos);
    if (e.materia !== nomeAnterior) {
      nomeAnterior = e.materia ?? "";
      const k = compacto(nomeAnterior);
      const i = k.length >= 3 ? secao.c.lastIndexOf(k, e.pos) : -1;
      if (i >= 0 && e.pos - i < 400) marca(i - 6, i + k.length);
    }
  }
  // Só conta o miolo, do primeiro ao último item classificado: o que vem antes (capa do anexo) e depois (outro anexo) não é conteúdo programático.
  const lo = coberto.indexOf(1);
  const hi = coberto.lastIndexOf(1) + 1;
  const lacunas: Lacuna[] = [];
  let ok = 0;
  for (let i = Math.max(0, lo); i < hi;) {
    if (coberto[i]) { ok++; i++; continue; }
    let j = i;
    while (j < hi && !coberto[j]) j++;
    if (j - i >= LACUNA_MINIMA) {
      const ini = secao.paraOriginal[i] ?? 0;
      const fim = (secao.paraOriginal[j - 1] ?? secao.texto.length - 1) + 1;
      lacunas.push({ ini, fim, texto: secao.texto.slice(ini, fim).replace(/\s+/g, " ").trim(), pagina: paginaDe(secao, ini) });
    }
    i = j;
  }
  const cobertura = hi > lo && lo >= 0 ? ok / (hi - lo) : 0;

  // Estrutura: matérias na ordem em que aparecem; a mesma matéria em dois pontos do texto vira uma só.
  const grupos = new Map<string, { nome: string; itens: Entrada[] }>();
  for (const e of unicas) {
    const k = fold(e.materia ?? "");
    const g = grupos.get(k) ?? { nome: e.materia ?? "Conteúdo programático", itens: [] };
    g.itens.push(e);
    grupos.set(k, g);
  }
  const disciplines: ParsedDiscipline[] = [];
  for (const g of grupos.values()) {
    const base = Math.min(...g.itens.filter((e) => ehCodigoNumerico(e.codigo)).map((e) => segmentos(e.codigo!)), Infinity);
    const topics: ParsedTopic[] = g.itens.map((e) => ({
      code: e.codigo,
      depth: Math.min(6, Math.max(1, ehCodigoNumerico(e.codigo) && Number.isFinite(base) ? segmentos(e.codigo) - base + 1 : e.nivel)),
      title: e.titulo,
      titleKey: titleKey(e.titulo),
      page: paginaDe(secao, secao.paraOriginal[e.pos] ?? 0),
    }));
    disciplines.push({ name: g.nome, mode: modeOfDiscipline(g.nome), page: topics[0]!.page, topics });
  }
  const warnings: string[] = [];
  if (descartados > 0) warnings.push(`${descartados} ${descartados === 1 ? "tópico devolvido pela IA não foi encontrado" : "tópicos devolvidos pela IA não foram encontrados"} no texto do edital e ${descartados === 1 ? "foi descartado" : "foram descartados"}.`);
  if (lacunas.length) warnings.push(`${lacunas.length} ${lacunas.length === 1 ? "trecho do conteúdo programático ficou" : "trechos do conteúdo programático ficaram"} sem classificação (${Math.round((1 - cobertura) * 100)}% do texto).`);
  const faixa: [number, number] | null = secao.paginas.length ? [secao.paginas[0]!.n, secao.paginas[secao.paginas.length - 1]!.n] : null;
  return { parsed: { found: disciplines.length > 0, confidence: Math.round(cobertura * 100) / 100, sectionPages: faixa, disciplines, warnings }, cobertura, descartados, total, lacunas };
}
