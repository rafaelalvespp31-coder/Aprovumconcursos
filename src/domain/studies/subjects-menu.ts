/**
 * Submenu "Estudos" da barra lateral: as matérias que o aluno estuda e, em cada uma,
 * os assuntos (estudos). A matéria vem do catálogo (tema de origem do estudo); sem isso,
 * do nome da pasta; sem pasta, "Outras matérias".
 */
export type StudyStatus = "concluido" | "andamento" | "nao_iniciado";

export interface MenuStudy { id: string; title: string; status: StudyStatus }
export interface SubjectMenuItem {
  name: string;
  /** Todos os estudos da matéria (contagem e lookup). */
  studies: MenuStudy[];
  /** Os mesmos estudos agrupados por tópico do edital; `name` null = sem tópico definido. */
  topics: Array<{ name: string | null; studies: MenuStudy[] }>;
}

/**
 * Situação de um estudo a partir das aulas e do progresso reais:
 * concluído = todas as aulas com os 3 níveis aprovados; em andamento = alguma aula
 * começada (aberta, lida ou com nível aprovado); senão, não iniciado.
 */
export function studyStatus(lessonCount: number, progress: Array<{ state: string; levels_passed: number; reading_completed_at: string | null }>): StudyStatus {
  const done = progress.filter((p) => p.levels_passed >= 3).length;
  if (lessonCount > 0 && done >= lessonCount) return "concluido";
  const started = progress.some((p) => p.levels_passed > 0 || !!p.reading_completed_at || !["nao_iniciada", "disponivel"].includes(p.state));
  return started ? "andamento" : "nao_iniciado";
}

export const OTHER_SUBJECTS = "Outras matérias";

/** Matérias básicas, na ordem em que aparecem primeiro no menu; as demais (conhecimentos específicos) vêm depois, em ordem alfabética. */
const BASICAS = ["portugu", "matematica", "raciocinio logico", "informatica"];
const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Posição da matéria: 0..3 = básicas (na ordem fixa); 100 = específicas; 999 = "Outras matérias". */
export function subjectRank(name: string): number {
  if (name === OTHER_SUBJECTS) return 999;
  const n = semAcento(name);
  const i = BASICAS.findIndex((k) => n.includes(k));
  return i >= 0 ? i : 100;
}

/** Valor mais frequente (empate: o que apareceu primeiro). */
function mostFrequent(values: string[]): string | undefined {
  const n = new Map<string, number>();
  for (const v of values) n.set(v, (n.get(v) ?? 0) + 1);
  let best: string | undefined;
  for (const [v, c] of n) if (best === undefined || c > (n.get(best) ?? 0)) best = v;
  return best;
}

export function buildSubjectsMenu(input: {
  trails: Array<{ id: string; title: string; folder_id: string | null; last_studied_at: string | null; updated_at: string; catalogTopicIds: string[] }>;
  folders: Array<{ id: string; name: string }>;
  topicDiscipline: Map<string, string>;
  /** Tópico do edital de cada tema do catálogo (id → tópico). */
  topicGroup?: Map<string, string>;
  /** Situação de cada estudo (id → status). Sem dado: não iniciado. */
  status?: Map<string, StudyStatus>;
}): SubjectMenuItem[] {
  const folderName = new Map(input.folders.map((f) => [f.id, f.name]));
  const groups = new Map<string, Array<{ id: string; title: string; at: string; topic: string | null }>>();
  for (const t of input.trails) {
    // Estudo com temas de várias matérias vai para a matéria predominante (não para a do primeiro tema).
    const main = mostFrequent(t.catalogTopicIds.map((id) => input.topicDiscipline.get(id)).filter((x): x is string => !!x));
    const name = main ?? (t.folder_id ? folderName.get(t.folder_id) : undefined) ?? OTHER_SUBJECTS;
    const topic = main
      ? (mostFrequent(t.catalogTopicIds.filter((id) => input.topicDiscipline.get(id) === main).map((id) => input.topicGroup?.get(id)).filter((x): x is string => !!x)) ?? null)
      : null;
    const list = groups.get(name) ?? [];
    list.push({ id: t.id, title: t.title, at: t.last_studied_at ?? t.updated_at, topic });
    groups.set(name, list);
  }
  return [...groups.entries()]
    .map(([name, list]) => {
      const sorted = list.sort((a, b) => b.at.localeCompare(a.at));
      const mk = (x: { id: string; title: string }): MenuStudy => ({ id: x.id, title: x.title, status: input.status?.get(x.id) ?? "nao_iniciado" });
      const byTopic = new Map<string | null, MenuStudy[]>();
      for (const x of sorted) byTopic.set(x.topic, [...(byTopic.get(x.topic) ?? []), mk(x)]);
      const topics = [...byTopic.entries()]
        .map(([tn, studies]) => ({ name: tn, studies }))
        .sort((a, b) => (a.name === null ? 1 : 0) - (b.name === null ? 1 : 0) || (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"));
      return { name, studies: sorted.map(mk), topics };
    })
    .sort((a, b) => subjectRank(a.name) - subjectRank(b.name) || a.name.localeCompare(b.name, "pt-BR"));
}
