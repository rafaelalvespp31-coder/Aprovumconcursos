import { titleKey } from "@/domain/edital/text";

export interface EdTopic { title: string; questions: number; annulled: number }
export interface EdSubject { name: string; mode: string | null; questions: number; annulled: number; topics: EdTopic[] }
export interface Edition { id: string; year: number; board: string | null; totalQuestions: number | null; countingRule: string | null; subjects: EdSubject[] }

export type Heat = "muito_alta" | "alta" | "moderada" | "baixa" | "sem_dados";

/** Critérios do mapa de calor (transparentes): média da participação do assunto nas provas com dados de assuntos. */
export const HEAT_CRITERIA = { minEditions: 2, muitoAlta: 3, alta: 1.5, moderada: 0.5 } as const;

/** Denominador explícito: total da prova quando cadastrado; senão, a soma das questões das disciplinas. */
export const denominator = (e: Edition) => e.totalQuestions ?? e.subjects.reduce((n, s) => n + s.questions, 0);

export interface SubjectRow { name: string; mode: string | null; questions: number; annulled: number; pct: number }
export function subjectIncidence(e: Edition): { denominator: number; rows: SubjectRow[] } {
  const den = denominator(e);
  const rows = e.subjects.map((s) => ({ name: s.name, mode: s.mode, questions: s.questions, annulled: s.annulled, pct: den ? (s.questions / den) * 100 : 0 })).sort((a, b) => b.questions - a.questions);
  return { denominator: den, rows };
}

export interface SubjectDelta { name: string; recent: number | null; previous: number | null; delta: number | null }
export interface TopicDelta { subject: string; title: string; recent: number | null; previous: number | null; presence: "ambas" | "so_anterior" | "so_recente" }
export interface Comparison { recent: Edition; previous: Edition; subjects: SubjectDelta[]; topics: TopicDelta[]; topicDataBoth: boolean }

const sk = (s: string) => titleKey(s);

/** Compara as duas edições mais recentes (por ano). Valores só vêm do que foi cadastrado. */
export function compareLastTwo(editions: Edition[]): Comparison | null {
  const sorted = [...editions].sort((a, b) => b.year - a.year);
  if (sorted.length < 2) return null;
  const [recent, previous] = [sorted[0]!, sorted[1]!];
  const names = new Map<string, string>();
  for (const e of [recent, previous]) for (const s of e.subjects) names.set(sk(s.name), s.name);
  const q = (e: Edition, key: string) => e.subjects.find((s) => sk(s.name) === key)?.questions ?? null;
  const subjects = [...names].map(([key, name]) => {
    const r = q(recent, key);
    const p = q(previous, key);
    return { name, recent: r, previous: p, delta: r !== null && p !== null ? r - p : null };
  }).sort((a, b) => (b.recent ?? 0) - (a.recent ?? 0));
  const tmap = new Map<string, TopicDelta>();
  const feed = (e: Edition, slot: "recent" | "previous") => {
    for (const s of e.subjects) for (const t of s.topics) {
      const key = `${sk(s.name)}|${sk(t.title)}`;
      const cur = tmap.get(key) ?? { subject: s.name, title: t.title, recent: null, previous: null, presence: "ambas" as const };
      cur[slot] = (cur[slot] ?? 0) + t.questions;
      tmap.set(key, cur);
    }
  };
  feed(recent, "recent");
  feed(previous, "previous");
  const topics = [...tmap.values()].map((t) => ({ ...t, presence: t.recent !== null && t.previous !== null ? ("ambas" as const) : t.recent !== null ? ("so_recente" as const) : ("so_anterior" as const) }))
    .sort((a, b) => (b.recent ?? 0) + (b.previous ?? 0) - ((a.recent ?? 0) + (a.previous ?? 0)));
  const hasTopics = (e: Edition) => e.subjects.some((s) => s.topics.length > 0);
  return { recent, previous, subjects, topics, topicDataBoth: hasTopics(recent) && hasTopics(previous) };
}

export interface HeatCell {
  subject: string;
  title: string;
  key: string;
  heat: Heat;
  /** Média da participação (% do total) nas provas com dados de assuntos. */
  meanShare: number;
  editionsPresent: number;
  editionsWithData: number;
  questions: number;
  byEdition: Array<{ year: number; questions: number | null }>;
}

/** Mapa de calor: "baixa" só com dados suficientes (≥ minEditions provas com assuntos cadastrados). */
export function heatmap(editions: Edition[]): { cells: HeatCell[]; editionsWithData: number; criteria: typeof HEAT_CRITERIA } {
  const sorted = [...editions].sort((a, b) => b.year - a.year);
  const withData = sorted.filter((e) => e.subjects.some((s) => s.topics.length > 0));
  const cells = new Map<string, HeatCell>();
  for (const e of withData) {
    for (const s of e.subjects) for (const t of s.topics) {
      const key = `${sk(s.name)}|${sk(t.title)}`;
      const c = cells.get(key) ?? { subject: s.name, title: t.title, key, heat: "sem_dados" as Heat, meanShare: 0, editionsPresent: 0, editionsWithData: withData.length, questions: 0, byEdition: withData.map((x) => ({ year: x.year, questions: null as number | null })) };
      const slot = c.byEdition.find((b) => b.year === e.year)!;
      slot.questions = (slot.questions ?? 0) + t.questions;
      c.questions += t.questions;
      cells.set(key, c);
    }
  }
  const dens = new Map(withData.map((e) => [e.year, denominator(e)]));
  for (const c of cells.values()) {
    c.editionsPresent = c.byEdition.filter((b) => b.questions !== null).length;
    const shares = c.byEdition.map((b) => ((b.questions ?? 0) / (dens.get(b.year) || 1)) * 100);
    c.meanShare = shares.reduce((a, b) => a + b, 0) / (shares.length || 1);
    if (withData.length < HEAT_CRITERIA.minEditions) c.heat = "sem_dados";
    else if (c.meanShare >= HEAT_CRITERIA.muitoAlta) c.heat = "muito_alta";
    else if (c.meanShare >= HEAT_CRITERIA.alta) c.heat = "alta";
    else if (c.meanShare >= HEAT_CRITERIA.moderada) c.heat = "moderada";
    else c.heat = "baixa";
  }
  return { cells: [...cells.values()].sort((a, b) => b.meanShare - a.meanShare || b.questions - a.questions), editionsWithData: withData.length, criteria: HEAT_CRITERIA };
}

export const HEAT_LABEL: Record<Heat, string> = { muito_alta: "Muito alta", alta: "Alta", moderada: "Moderada", baixa: "Baixa", sem_dados: "Sem dados suficientes" };
