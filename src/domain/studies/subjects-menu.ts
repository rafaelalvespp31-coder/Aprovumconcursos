/**
 * Submenu "Estudos" da barra lateral: as matérias que o aluno estuda e, em cada uma,
 * os assuntos (estudos). A matéria vem do catálogo (tema de origem do estudo); sem isso,
 * do nome da pasta; sem pasta, "Outras matérias".
 */
export type StudyStatus = "concluido" | "andamento" | "nao_iniciado";

export interface SubjectMenuItem {
  name: string;
  studies: Array<{ id: string; title: string; status: StudyStatus }>;
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

export function buildSubjectsMenu(input: {
  trails: Array<{ id: string; title: string; folder_id: string | null; last_studied_at: string | null; updated_at: string; catalogTopicIds: string[] }>;
  folders: Array<{ id: string; name: string }>;
  topicDiscipline: Map<string, string>;
  /** Situação de cada estudo (id → status). Sem dado: não iniciado. */
  status?: Map<string, StudyStatus>;
}): SubjectMenuItem[] {
  const folderName = new Map(input.folders.map((f) => [f.id, f.name]));
  const groups = new Map<string, Array<{ id: string; title: string; at: string }>>();
  for (const t of input.trails) {
    const name =
      t.catalogTopicIds.map((id) => input.topicDiscipline.get(id)).find(Boolean) ?? (t.folder_id ? folderName.get(t.folder_id) : undefined) ?? OTHER_SUBJECTS;
    const list = groups.get(name) ?? [];
    list.push({ id: t.id, title: t.title, at: t.last_studied_at ?? t.updated_at });
    groups.set(name, list);
  }
  return [...groups.entries()]
    .map(([name, list]) => ({
      name,
      studies: list.sort((a, b) => b.at.localeCompare(a.at)).map(({ id, title }) => ({ id, title, status: input.status?.get(id) ?? ("nao_iniciado" as const) })),
    }))
    .sort((a, b) => subjectRank(a.name) - subjectRank(b.name) || a.name.localeCompare(b.name, "pt-BR"));
}
