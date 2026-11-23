import { buildIndex, matchTopic, type CatalogEntry } from "@/domain/edital/match";
import { fold, stem, tokensCheios } from "@/domain/edital/text";

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
/** Aula(s) do catálogo, na matéria da disciplina, que não casaram com nenhum item: continuam catalogadas e aparecem à parte. */
export interface AulasCatalogadas {
  titulo: string;
  total: number;
  aulas: string[];
}
export interface DisciplinaVisao {
  nome: string;
  topicos: TopicoVisao[];
  /** Só no conteúdo derivado dos focos da análise. Não entra na contagem de cobertura. */
  extras?: AulasCatalogadas[];
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

/** Matérias do catálogo (discipline_mode) que a disciplina da análise cobre. Vazio = o catálogo não tem aula dessa área: tudo fica vermelho, sem procurar em outras matérias. */
export function modosDaDisciplina(nome: string, modosDoCatalogo: ReadonlySet<string> = new Set()): string[] {
  const f = fold(nome);
  if (/\b(legislacao (penal|especial|extravagante|de transito)|extravagante)\b/.test(f)) return ["legislacao_especial"];
  if (/\b(lingua portuguesa|portugues|redacao oficial|interpretacao de texto)\b/.test(f)) return ["lingua_portuguesa"];
  if (/\braciocinio logico\b|\blogica\b|\bmatematica\b|\bestatistica\b/.test(f)) return ["raciocinio_logico", "matematica"];
  if (/\binformatica\b|\bseguranca da informacao\b/.test(f)) return ["informatica"];
  if (/\bdireito constitucional\b/.test(f)) return ["direito_constitucional"];
  if (/\bdireito administrativo\b|\badministrativo\b/.test(f)) return ["direito_administrativo"];
  if (/\bprocessual penal\b|\bprocesso penal\b/.test(f)) return ["direito_processual_penal"];
  if (/\bdireito penal\b|\bpenal militar\b/.test(f)) return ["direito_penal"];
  if (/\bdireitos humanos\b/.test(f)) return ["direitos_humanos"];
  if (/\betica\b|\bcidadania\b/.test(f)) return ["etica_e_cidadania"];
  if (/\bgeopolitica\b|\bgeografia\b|\batualidades\b/.test(f)) return ["geopolitica"];
  if (/\btransito\b/.test(f)) return ["ctb_codigo_de_transito_brasileiro"];
  // Matéria que o catálogo passou a ter e que não está na lista acima: vale quando todas as palavras do nome do modo estão no nome da disciplina.
  const palavras = new Set(f.split(" ").map(stem));
  return [...modosDoCatalogo].filter((m) => m.split("_").every((w) => palavras.has(stem(w))));
}

/** Palavras que só repetem a matéria ("segurança da informação" dentro de Informática) e por isso não diferenciam o assunto. */
const REDUNDANTES: Record<string, string[]> = { informatica: ["informatica", "informacao"], direito_processual_penal: ["processual"] };

/** Tira do foco o que não é assunto: "..., conforme os tópicos previstos", "quando previstas", "e demais assuntos expressamente previstos". */
function assuntoDoFoco(foco: string): string {
  return foco
    .replace(/[,;]?\s*\b(conforme|quando previst\w*|se previst\w*|especialmente|expressamente|previst[oa]s?)\b.*$/i, "")
    .replace(/\s+e\s+demais\s+(assuntos|[aá]reas|itens)\b.*$/i, "")
    .trim();
}

const AMPLAS = new Set(["medida", "crime", "consequencia", "procedimento", "regra", "alteracao", "competencia", "atribuicao", "organizacao", "estrutura"].map((w) => stem(w)));

interface Alvo {
  entry: CatalogEntry;
  titulos: Array<Set<string>>;
  grupo: Set<string> | null;
  cabeca: Set<string> | null;
  chave: string;
}

const conjunto = (texto: string, ignorar: ReadonlySet<string>) => new Set(tokensCheios(texto).map((t) => t.st).filter((t) => !ignorar.has(t)));
const contem = (maior: ReadonlySet<string>, menor: ReadonlySet<string>) => menor.size > 0 && [...menor].every((t) => maior.has(t));

function montarAlvos(entradas: readonly CatalogEntry[], ignorar: ReadonlySet<string>): Alvo[] {
  return entradas.map((entry) => {
    const g = entry.group;
    const cabecaTxt = g && /[:—–]/.test(g) ? g.split(/[:—–]/)[0]! : null;
    return {
      entry,
      titulos: [entry.title, ...entry.aliases].map((t) => conjunto(t, ignorar)),
      grupo: g ? conjunto(g, ignorar) : null,
      cabeca: cabecaTxt ? conjunto(cabecaTxt, ignorar) : null,
      chave: g ?? entry.title,
    };
  });
}

interface AcertoGrupo {
  chave: string;
  titulo: string;
  porGrupo: boolean;
}

/**
 * Procura aulas para um assunto amplo ("Teoria do crime", "Provas"): o nome do grupo da aula (ou o título dela) tem de conter todas as palavras do assunto.
 * O grupo pode ter até 2 palavras a mais ("Teoria Geral do Crime"); o título, quantas tiver. Só olha as matérias da disciplina.
 */
function acharAulas(alvos: readonly Alvo[], texto: string, ignorar: ReadonlySet<string>): AcertoGrupo[] {
  const clausulas = assuntoDoFoco(texto).split(/\s*[,;]\s*|\s+e\s+/).map((c) => c.trim()).filter(Boolean);
  const acertos = new Map<string, AcertoGrupo>();
  for (const c of clausulas) {
    const palavras = tokensCheios(c).filter((t) => !ignorar.has(t.st));
    if (!palavras.some((p) => !p.generico)) continue; // só palavras genéricas ("direitos", "conceitos") não identificam assunto
    const C = new Set(palavras.map((p) => p.st));
    const especie = /^crimes? em especie$/.test(fold(c));
    for (const a of alvos) {
      const porGrupo = !!a.grupo && ((contem(a.grupo, C) && a.grupo.size - C.size <= 2) || (!!a.cabeca && contem(a.cabeca, C) && a.cabeca.size - C.size <= 1));
      // Palavra solta e ampla ("medidas", "crimes") em título de aula não prova assunto: só vale com duas palavras ou uma específica.
      const porTitulo = (C.size >= 2 || ![...C].some((t) => AMPLAS.has(t))) && a.titulos.some((t) => contem(t, C));
      const parteEspecial = especie && (/^crimes?\s+(contra|do|da|de)\b/.test(fold(a.entry.group ?? "")) || /\bcp, art\b/.test(fold(a.entry.title)));
      if (!porGrupo && !porTitulo && !parteEspecial) continue;
      const k = a.chave + (porGrupo || parteEspecial ? "|g" : `|${a.entry.id}`);
      if (!acertos.has(k)) acertos.set(k, { chave: a.chave, titulo: porGrupo || parteEspecial ? (a.entry.group ?? a.entry.title) : a.entry.title, porGrupo: porGrupo || parteEspecial });
    }
  }
  return [...acertos.values()];
}

/**
 * Conteúdo derivado da análise: cada "principal foco" da disciplina vira um item, conferido contra as aulas catalogadas das matérias da disciplina.
 * Verde = há aula; vermelho = ainda não. As aulas da matéria que não casaram com nenhum foco aparecem à parte (extras): estão catalogadas.
 */
export function focosComoConteudo(disciplinas: ReadonlyArray<{ nome: string; focos: readonly string[] }>, catalogo: readonly CatalogEntry[]): DisciplinaVisao[] {
  const idx = buildIndex(catalogo);
  const titulos = new Map(catalogo.map((c) => [c.id, c.title]));
  const porId = new Map(catalogo.map((c) => [c.id, c]));
  const modosCatalogo = new Set(catalogo.map((c) => c.mode));
  return disciplinas
    .filter((d) => d.focos.length)
    .map((d) => {
      const modos = modosDaDisciplina(d.nome, modosCatalogo);
      const ignorar = new Set(modos.flatMap((m) => REDUNDANTES[m] ?? []).map((w) => stem(w)));
      const doArea = catalogo.filter((c) => modos.includes(c.mode));
      const alvos = montarAlvos(doArea, ignorar);
      const tamanhoGrupo = new Map<string, number>();
      for (const a of alvos) tamanhoGrupo.set(a.chave, (tamanhoGrupo.get(a.chave) ?? 0) + 1);
      const usados = new Set<string>();
      const topicos = d.focos.map((f, i): TopicoVisao => {
        let aulas: string[] = [];
        if (modos.length) {
          const acertos = acharAulas(alvos, f, ignorar);
          for (const a of acertos) usados.add(a.chave);
          aulas = [...new Set(acertos.map((a) => (a.porGrupo ? `${a.titulo} · ${plural(tamanhoGrupo.get(a.chave) ?? 1)}` : a.titulo)))];
          if (!aulas.length) {
            // Casamento do edital (títulos e sinônimos), uma matéria por vez, para não perder o que a regra acima não vê.
            const melhor = modos.map((m) => matchTopic(idx, f, m)).filter((r) => r.status !== "nao_encontrado").sort((x, y) => y.score - x.score)[0];
            if (melhor) {
              const ids = melhor.links.map((l) => l.catalogId).filter((id) => modos.includes(porId.get(id)?.mode ?? ""));
              for (const id of ids) usados.add(porId.get(id)!.group ?? porId.get(id)!.title);
              aulas = [...new Set(ids.map((id) => titulos.get(id)).filter((t): t is string => !!t))];
            }
          }
        }
        return { codigo: String(i + 1), nivel: 1, titulo: f, disponivel: aulas.length > 0, aulas: aulas.slice(0, 4) };
      });
      const extras = new Map<string, AulasCatalogadas>();
      for (const a of alvos) {
        if (usados.has(a.chave)) continue;
        const e = extras.get(a.chave) ?? { titulo: a.chave, total: 0, aulas: [] };
        e.total += 1;
        if (e.aulas.length < 4 && a.entry.title !== e.titulo) e.aulas.push(a.entry.title);
        extras.set(a.chave, e);
      }
      const lista = [...extras.values()].sort((x, y) => y.total - x.total || x.titulo.localeCompare(y.titulo, "pt-BR")).slice(0, 12);
      return { nome: d.nome, topicos, ...(lista.length ? { extras: lista } : {}) };
    });
}

const plural = (n: number) => `${n} ${n === 1 ? "aula" : "aulas"}`;
