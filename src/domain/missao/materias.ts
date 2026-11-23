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
  /** Duração estimada somada das aulas (catalog_topics.estimated_minutes). */
  minutos: number;
  /** Percentual (0 a 100) de aulas do catálogo desta matéria que o aluno já concluiu; null = não foi possível apurar. */
  progresso: number | null;
}

/** "8h 30min", "1h", "40min". */
export function formatarDuracao(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}min`;
  return r ? `${h}h ${r}min` : `${h}h`;
}

/** Estados de aula que contam como "concluída" no progresso da matéria. */
export const ESTADOS_CONCLUIDOS = new Set(["aula_concluida", "em_revisao", "aguardando_dominio", "dominada"]);

const AVULSAS = "Aulas avulsas";

/** Agrupa as aulas publicadas por matéria e assunto (grupo). Matérias e assuntos do maior para o menor. */
export function agruparCatalogo(
  linhas: ReadonlyArray<{ discipline_mode: string; topic_group: string | null; estimated_minutes?: number | null }>,
  rotulo: (slug: string) => string | undefined,
  /** Percentual concluído por matéria (slug), quando já apurado para o aluno. */
  progresso?: ReadonlyMap<string, number>,
): MateriaCatalogo[] {
  const por = new Map<string, Map<string, number>>();
  const minutos = new Map<string, number>();
  for (const l of linhas) {
    const g = (l.topic_group ?? "").trim() || AVULSAS;
    const m = por.get(l.discipline_mode) ?? new Map<string, number>();
    m.set(g, (m.get(g) ?? 0) + 1);
    por.set(l.discipline_mode, m);
    minutos.set(l.discipline_mode, (minutos.get(l.discipline_mode) ?? 0) + Math.max(0, l.estimated_minutes ?? 0));
  }
  const fim: MateriaCatalogo[] = [];
  for (const [slug, grupos] of por) {
    const assuntos = [...grupos].map(([titulo, aulas]) => ({ titulo, aulas })).sort((a, b) => b.aulas - a.aulas || a.titulo.localeCompare(b.titulo, "pt-BR"));
    fim.push({ slug, nome: rotulo(slug) ?? "Outras matérias", aulas: assuntos.reduce((s, a) => s + a.aulas, 0), assuntos, minutos: minutos.get(slug) ?? 0, progresso: progresso ? progresso.get(slug) ?? 0 : null });
  }
  return fim.sort((a, b) => b.aulas - a.aulas || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** pronto: edital publicado (o aluno estuda); analise: só a análise está publicada; breve: catalogado, ainda sem edital nem análise. */
export type EstadoConcurso = "pronto" | "analise" | "breve";

/** Concurso catalogado pela equipe, para os quadrados "Concursos" da Central. */
export interface ConcursoCard {
  estado: EstadoConcurso;
  id: string;
  nome: string;
  /** Órgão/instituição. */
  orgao: string;
  cargo: string | null;
  uf: string | null;
  imagem: string | null;
  /** Vagas (cadastro da equipe); null = não informado. */
  vagas: number | null;
  /** Concurso em destaque (marcado pela equipe). */
  destaque: boolean;
  /** Situação cadastrada: previsto, autorizado, edital_publicado, inscricoes_abertas, inscricoes_encerradas, prova_realizada, encerrado. */
  situacao: string;
  /** Datas confirmadas (AAAA-MM-DD) quando existirem. */
  provaEm: string | null;
  inscricaoAte: string | null;
  banca: string | null;
  categoria: CategoriaConcurso;
}

export type CategoriaConcurso = "policia" | "militar" | "juridico" | "administrativo";
export const ROTULO_CATEGORIA: Record<CategoriaConcurso, string> = { policia: "Polícia", militar: "Militar", juridico: "Jurídico", administrativo: "Administrativo" };

/** Agrupa o concurso pelo texto do órgão, nome e cargo (sem inventar: o que não casa com nada é "administrativo"). */
export function classificarConcurso(texto: string): CategoriaConcurso {
  const t = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tem = (...ps: string[]) => ps.some((p) => new RegExp(`(^|[^a-z])${p}([^a-z]|$)`).test(t));
  if (tem("militar", "exercito", "marinha", "aeronautica", "bombeiros?", "forcas armadas")) return "militar";
  if (tem("policia", "policial", "pm", "pf", "prf", "pc", "penal", "penitenciari[oa]", "depen", "guarda", "sejusp", "seguranca publica")) return "policia";
  if (tem("tribunal", "tribunais", "trf", "trt", "tre", "tj", "stf", "stj", "tst", "ministerio publico", "mp", "defensoria", "procuradoria", "oab", "magistratura")) return "juridico";
  return "administrativo";
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
