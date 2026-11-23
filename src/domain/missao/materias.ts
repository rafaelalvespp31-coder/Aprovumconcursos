/** Cards das matérias do edital na Central de Missão: só números reais do edital do aluno (nada inventado). */
export interface CardMateria {
  id: string;
  nome: string;
  /** Tópicos do edital nessa matéria. */
  total: number;
  /** Tópicos com aula catalogada (completa, parcial ou a conferir). */
  comAula: number;
}

export interface MateriasMissao {
  editalId: string;
  editalNome: string;
  cards: CardMateria[];
}

const COM_AULA = new Set(["completa", "parcial", "conferencia"]);

/** Junta matérias (na ordem do edital) e tópicos; matéria sem nenhum tópico não vira card. */
export function resumirMaterias(
  disciplinas: ReadonlyArray<{ id: string; name: string }>,
  topicos: ReadonlyArray<{ discipline_id: string; match_status: string | null }>,
): CardMateria[] {
  const total = new Map<string, number>();
  const com = new Map<string, number>();
  for (const t of topicos) {
    total.set(t.discipline_id, (total.get(t.discipline_id) ?? 0) + 1);
    if (t.match_status && COM_AULA.has(t.match_status)) com.set(t.discipline_id, (com.get(t.discipline_id) ?? 0) + 1);
  }
  return disciplinas
    .filter((d) => (total.get(d.id) ?? 0) > 0)
    .map((d) => ({ id: d.id, nome: d.name, total: total.get(d.id) ?? 0, comAula: com.get(d.id) ?? 0 }));
}
