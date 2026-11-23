/** Conteúdo programático dentro da análise do concurso: pareia as disciplinas da análise com as do edital e agrupa os tópicos em cartões. Puro. */

export interface TopicoVisao {
  codigo: string | null;
  nivel: number;
  titulo: string;
  /** Há aula catalogada no Aprovum (verde) ou não (vermelho). */
  disponivel: boolean;
  /** Títulos das aulas catalogadas que cobrem o tópico. */
  aulas: string[];
}
export interface DisciplinaVisao {
  nome: string;
  topicos: TopicoVisao[];
}
export interface CartaoTopico {
  raiz: TopicoVisao;
  filhos: TopicoVisao[];
  disponiveis: number;
  total: number;
}

const PARADAS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "em", "para", "nocoes", "nocao", "conhecimentos", "conhecimento", "basica", "basico", "basicos", "gerais", "geral"]);
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Radicais de 5 letras sem palavras vazias: "Matemático" e "Matemática" se encontram. */
const radicais = (nome: string): Set<string> =>
  new Set(
    sem(nome)
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length > 1 && !PARADAS.has(p))
      .map((p) => p.slice(0, 5)),
  );
const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
};
const LIMIAR = 0.6;

/** Para cada disciplina da análise, o índice da disciplina do edital que corresponde (ou null). Cada disciplina do edital é usada uma vez; vence a mais parecida. */
export function parearDisciplinas(nomesAnalise: readonly string[], nomesEdital: readonly string[]): Array<number | null> {
  const ra = nomesAnalise.map(radicais);
  const re = nomesEdital.map(radicais);
  const pares: Array<[number, number, number]> = [];
  for (let i = 0; i < ra.length; i++) for (let j = 0; j < re.length; j++) {
    const s = jaccard(ra[i]!, re[j]!);
    if (s >= LIMIAR) pares.push([s, i, j]);
  }
  pares.sort((x, y) => y[0] - x[0] || x[1] - y[1] || x[2] - y[2]);
  const out: Array<number | null> = nomesAnalise.map(() => null);
  const usadoE = new Set<number>();
  for (const [, i, j] of pares) {
    if (out[i] != null || usadoE.has(j)) continue;
    out[i] = j;
    usadoE.add(j);
  }
  return out;
}

export function resumoDisponibilidade(topicos: readonly TopicoVisao[]): { total: number; comAula: number; semAula: number; pct: number } {
  const comAula = topicos.filter((t) => t.disponivel).length;
  return { total: topicos.length, comAula, semAula: topicos.length - comAula, pct: topicos.length ? Math.round((comAula / topicos.length) * 100) : 0 };
}

/** Cada tópico de nível mais alto vira um cartão, com os subtópicos que o seguem dentro dele. */
export function agruparTopicos(topicos: readonly TopicoVisao[]): CartaoTopico[] {
  if (!topicos.length) return [];
  const topo = Math.min(...topicos.map((t) => t.nivel));
  const cartoes: CartaoTopico[] = [];
  for (const t of topicos) {
    if (t.nivel <= topo || !cartoes.length) cartoes.push({ raiz: t, filhos: [], disponiveis: 0, total: 0 });
    else cartoes[cartoes.length - 1]!.filhos.push(t);
  }
  for (const c of cartoes) {
    const todos = [c.raiz, ...c.filhos];
    c.total = todos.length;
    c.disponiveis = todos.filter((t) => t.disponivel).length;
  }
  return cartoes;
}

/** Para cada disciplina da análise, a do edital correspondente (ou null) e, à parte, as disciplinas do edital que a análise não cita. */
export function combinarComEdital(nomesAnalise: readonly string[], conteudo: readonly DisciplinaVisao[]): { pares: Array<DisciplinaVisao | null>; extras: DisciplinaVisao[] } {
  const idx = parearDisciplinas(nomesAnalise, conteudo.map((d) => d.nome));
  const usados = new Set(idx.filter((i): i is number => i != null));
  return { pares: idx.map((i) => (i == null ? null : conteudo[i]!)), extras: conteudo.filter((_, i) => !usados.has(i)) };
}
