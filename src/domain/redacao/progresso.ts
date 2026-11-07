import { categoriaLabel } from "./rubricas";

export interface AvaliacaoResumo {
  id: string;
  createdAt: string;
  modality: string;
  score: number;
  max: number;
  competencias: { key: string; label: string; score: number; max: number }[];
  erros: { categoria: string; tipo: string }[];
}

export const MIN_AVALIACOES = 3;
const pct = (s: number, m: number) => (m ? Math.round((s / m) * 100) : 0);

export interface Serie { id: string; data: string; pct: number; nota: number; max: number }

export function serieNotas(av: AvaliacaoResumo[]): Serie[] {
  return [...av].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((a) => ({ id: a.id, data: a.createdAt, pct: pct(a.score, a.max), nota: a.score, max: a.max }));
}

export type Tendencia = "melhorando" | "piorando" | "estavel";

/** Compara as 3 últimas medições de uma série em % (precisa de pelo menos 3); variação mínima de 5 pontos percentuais. */
export function tendencia(valores: number[]): Tendencia | null {
  if (valores.length < MIN_AVALIACOES) return null;
  const u = valores.slice(-3);
  const a = u[0] ?? 0;
  const c = u[2] ?? 0;
  if (c - a >= 5) return "melhorando";
  if (a - c >= 5) return "piorando";
  return "estavel";
}

export interface Insight { tipo: "positivo" | "atencao" | "info"; texto: string }

/**
 * Padrões ao longo do tempo. Sem quantidade suficiente de redações (mínimo 3) não conclui nada:
 * devolve só o aviso de quantas faltam.
 */
export function insights(av: AvaliacaoResumo[]): { suficiente: boolean; faltam: number; itens: Insight[] } {
  const ord = [...av].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (ord.length < MIN_AVALIACOES) return { suficiente: false, faltam: MIN_AVALIACOES - ord.length, itens: [] };
  const itens: Insight[] = [];
  const keys = new Map<string, string>();
  for (const a of ord) for (const c of a.competencias) keys.set(c.key, c.label);
  const melhoraram: string[] = [];
  const fracas: string[] = [];
  for (const [key, label] of keys) {
    const serie = ord.map((a) => a.competencias.find((c) => c.key === key)).filter((c): c is NonNullable<typeof c> => !!c).map((c) => pct(c.score, c.max));
    const t = tendencia(serie);
    const nome = label.replace(/^Competência [IVX]+ — /, "");
    if (t === "melhorando") melhoraram.push(nome);
    const ultimo = serie[serie.length - 1];
    if (serie.length >= MIN_AVALIACOES && ultimo !== undefined && ultimo < 60) fracas.push(nome);
  }
  if (melhoraram.length) itens.push({ tipo: "positivo", texto: `Melhora nas últimas redações em: ${melhoraram.join(", ")}.` });
  if (fracas.length) itens.push({ tipo: "atencao", texto: `Ainda abaixo de 60% de aproveitamento em: ${fracas.join(", ")}.` });
  // Erros recorrentes: categoria presente em pelo menos 3 redações distintas.
  const cont = new Map<string, number>();
  for (const a of ord) for (const c of new Set(a.erros.filter((e) => e.tipo === "erro_objetivo").map((e) => e.categoria))) cont.set(c, (cont.get(c) ?? 0) + 1);
  const rec = [...cont.entries()].filter(([, n]) => n >= MIN_AVALIACOES).sort((a, b) => b[1] - a[1]);
  if (rec.length) itens.push({ tipo: "atencao", texto: `Erro recorrente (em ${rec[0]?.[1] ?? MIN_AVALIACOES} redações): ${rec.map(([c]) => categoriaLabel(c).toLowerCase()).join(", ")}.` });
  const nota = tendencia(ord.map((a) => pct(a.score, a.max)));
  if (nota === "melhorando") itens.push({ tipo: "positivo", texto: "Seu aproveitamento geral subiu nas últimas três redações." });
  if (nota === "piorando") itens.push({ tipo: "atencao", texto: "Seu aproveitamento geral caiu nas últimas três redações." });
  if (!itens.length) itens.push({ tipo: "info", texto: "Desempenho estável nas últimas redações, sem padrão marcante de melhora ou piora." });
  return { suficiente: true, faltam: 0, itens };
}

export interface ErroComTexto { id: string; categoria: string; trecho: string }
const nrm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const LETRA = /[\p{L}\p{N}]/u;
/** O trecho aparece no texto como palavra(s) inteira(s) ("Os aluno" não está em "Os alunos"). */
function contem(texto: string, trecho: string): boolean {
  const q = nrm(trecho);
  if (!q) return false;
  let i = texto.indexOf(q);
  while (i >= 0) {
    const antes = i === 0 ? "" : texto[i - 1] ?? "";
    const depois = texto[i + q.length] ?? "";
    if (!(antes && LETRA.test(antes)) && !(depois && LETRA.test(depois))) return true;
    i = texto.indexOf(q, i + 1);
  }
  return false;
}

export interface ComparacaoErros { corrigidos: ErroComTexto[]; permaneceram: ErroComTexto[]; novos: ErroComTexto[] }

/**
 * Compara versões pelos trechos: um erro da versão anterior foi "corrigido" se o trecho não aparece mais no novo texto,
 * "permaneceu" se aparece igual; um erro da nova versão é "novo" se o trecho não existia no texto anterior.
 */
export function compararErros(antes: { texto: string; erros: ErroComTexto[] }, depois: { texto: string; erros: ErroComTexto[] }): ComparacaoErros {
  const tNovo = nrm(depois.texto);
  const tAntigo = nrm(antes.texto);
  return {
    corrigidos: antes.erros.filter((e) => !contem(tNovo, e.trecho)),
    permaneceram: antes.erros.filter((e) => contem(tNovo, e.trecho)),
    novos: depois.erros.filter((e) => !contem(tAntigo, e.trecho)),
  };
}

export interface DeltaCompetencia { key: string; label: string; antes: number; depois: number; max: number; delta: number }

export function compararNotas(a: AvaliacaoResumo, b: AvaliacaoResumo) {
  const mesmaEscala = a.max === b.max;
  const comp: DeltaCompetencia[] = b.competencias
    .map((c) => {
      const o = a.competencias.find((x) => x.key === c.key);
      return o ? { key: c.key, label: c.label, antes: o.score, depois: c.score, max: c.max, delta: c.score - o.score } : null;
    })
    .filter((x): x is DeltaCompetencia => !!x);
  return { mesmaEscala, antes: a.score, depois: b.score, max: b.max, delta: mesmaEscala ? b.score - a.score : null, competencias: comp };
}
