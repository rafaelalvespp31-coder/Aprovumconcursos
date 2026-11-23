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
