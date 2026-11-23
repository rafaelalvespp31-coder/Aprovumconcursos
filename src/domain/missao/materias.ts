/** Matérias catalogadas na plataforma Aprovum (aulas publicadas), para os quadrados da Central de Missão. Só números reais do catálogo. */
export interface AssuntoCatalogo {
  titulo: string;
  aulas: number;
}

export interface MateriaCatalogo {
  /** Matéria do catálogo (discipline_mode). */
  slug: string;
  nome: string;
  aulas: number;
  assuntos: AssuntoCatalogo[];
}

const AVULSAS = "Aulas avulsas";

/** Agrupa as aulas publicadas por matéria e assunto (grupo). Matérias e assuntos do maior para o menor. */
export function agruparCatalogo(
  linhas: ReadonlyArray<{ discipline_mode: string; topic_group: string | null }>,
  rotulo: (slug: string) => string | undefined,
): MateriaCatalogo[] {
  const por = new Map<string, Map<string, number>>();
  for (const l of linhas) {
    const g = (l.topic_group ?? "").trim() || AVULSAS;
    const m = por.get(l.discipline_mode) ?? new Map<string, number>();
    m.set(g, (m.get(g) ?? 0) + 1);
    por.set(l.discipline_mode, m);
  }
  const fim: MateriaCatalogo[] = [];
  for (const [slug, grupos] of por) {
    const assuntos = [...grupos].map(([titulo, aulas]) => ({ titulo, aulas })).sort((a, b) => b.aulas - a.aulas || a.titulo.localeCompare(b.titulo, "pt-BR"));
    fim.push({ slug, nome: rotulo(slug) ?? "Outras matérias", aulas: assuntos.reduce((s, a) => s + a.aulas, 0), assuntos });
  }
  return fim.sort((a, b) => b.aulas - a.aulas || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Concurso com edital publicado pela equipe, para os quadrados "Concursos" da Central. */
export interface ConcursoCard {
  id: string;
  nome: string;
  /** Órgão/instituição. */
  orgao: string;
  cargo: string | null;
  uf: string | null;
  imagem: string | null;
}

export type GrupoMateria = "basicas" | "especificas";

/** Matérias de conhecimentos básicos/gerais dos concursos; o restante (Direito, legislação, trânsito, conhecimentos específicos…) é específico. */
const BASICAS = new Set(["lingua_portuguesa", "matematica", "raciocinio_logico", "informatica", "geopolitica", "etica_e_cidadania", "atualidades", "ingles"]);

export const grupoDaMateria = (slug: string): GrupoMateria => (BASICAS.has(slug) ? "basicas" : "especificas");

export const ROTULO_GRUPO: Record<GrupoMateria, string> = { basicas: "Matérias básicas", especificas: "Matérias específicas" };

const dobrar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Busca na Central: todas as palavras digitadas precisam aparecer no nome da matéria ou em algum assunto dela. */
export function filtrarMaterias(materias: readonly MateriaCatalogo[], termo: string): MateriaCatalogo[] {
  const palavras = dobrar(termo).split(" ").filter(Boolean);
  if (!palavras.length) return [...materias];
  return materias.filter((m) => {
    const alvo = dobrar([m.nome, ...m.assuntos.map((a) => a.titulo)].join(" "));
    return palavras.every((p) => alvo.includes(p));
  });
}

export function dividirPorGrupo(materias: readonly MateriaCatalogo[]): Record<GrupoMateria, MateriaCatalogo[]> {
  const out: Record<GrupoMateria, MateriaCatalogo[]> = { basicas: [], especificas: [] };
  for (const m of materias) out[grupoDaMateria(m.slug)].push(m);
  return out;
}

/** Partes da barra de assuntos de um quadrado: até `max` assuntos maiores e o restante junto (frações somam 1). */
export function fatiasDeAssuntos(assuntos: readonly AssuntoCatalogo[], max = 7): number[] {
  const total = assuntos.reduce((s, a) => s + a.aulas, 0);
  if (!total) return [];
  const ord = [...assuntos].map((a) => a.aulas).sort((a, b) => b - a);
  const topo = ord.slice(0, max);
  const resto = ord.slice(max).reduce((s, n) => s + n, 0);
  return (resto ? [...topo, resto] : topo).map((n) => n / total);
}
