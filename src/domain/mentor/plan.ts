/**
 * Plano de estudo do Mentor para o concurso que o aluno quer passar. Puro e testável: recebe os dados
 * reais (tempo diário, matérias, desempenho, aulas pendentes, revisões, data da prova) e devolve a
 * semana inteira — que estudar em cada dia, quanto tempo, quantas questões e quando revisar.
 */
export interface PlanSubject {
  name: string;
  /** Percentual de acerto nas questões (null = sem dados). */
  pct: number | null;
  pendingLessons: number;
}

export interface PlanInput {
  contest: string;
  examDate?: string | null;
  banca?: string | null;
  /** Minutos que o aluno consegue estudar por dia (meta dele; padrão 120). */
  dailyMinutes: number;
  /** Meta de questões por dia, se o aluno definiu. */
  dailyQuestions?: number | null;
  subjects: PlanSubject[];
  reviewsDue: number;
  /** Hoje (YYYY-MM-DD, horário de Brasília). */
  today: string;
}

export type BlockKind = "aula" | "questoes" | "revisao" | "simulado";
export interface PlanBlock { kind: BlockKind; subject: string; minutes: number; detail: string }
export interface PlanDay { weekday: number; label: string; theme: string; blocks: PlanBlock[]; minutes: number; questions: number }
export interface StudyPlan {
  contest: string;
  daysToExam: number | null;
  weeklyMinutes: number;
  weeklyQuestions: number;
  days: PlanDay[];
  notes: string[];
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const MIN_PER_QUESTION = 2.5;
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export function daysUntil(examDate: string | null | undefined, today: string): number | null {
  if (!examDate) return null;
  const d = Date.parse(`${examDate.slice(0, 10)}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(d) || !Number.isFinite(t)) return null;
  return Math.round((d - t) / 86_400_000);
}

/** Matérias por prioridade: pouco acerto e aulas pendentes primeiro. */
export function rankSubjects(list: readonly PlanSubject[]): PlanSubject[] {
  const score = (s: PlanSubject) => (s.pct === null ? 45 : 100 - s.pct) + Math.min(30, s.pendingLessons * 4);
  return [...list].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "pt-BR"));
}

export function buildStudyPlan(i: PlanInput): StudyPlan {
  const subjects = rankSubjects(i.subjects.filter((s) => s.name.trim()));
  const daysToExam = daysUntil(i.examDate, i.today);
  const perDay = Math.min(480, Math.max(30, Math.round(i.dailyMinutes || 120)));
  const notes: string[] = [];
  // Prova perto (≤ 60 dias): mais questões e simulado; longe: mais aula nova.
  const near = daysToExam !== null && daysToExam >= 0 && daysToExam <= 60;
  const lessonShare = near ? 0.4 : 0.55;
  const questionShare = near ? 0.45 : 0.3;
  const generic: PlanSubject[] = subjects.length ? subjects : [{ name: "Matérias do edital", pct: null, pendingLessons: 0 }];
  if (!subjects.length) notes.push("Ainda não há matérias estudadas: comece pelas aulas do seu concurso na plataforma para eu afinar o plano com o seu desempenho.");
  if (daysToExam !== null) notes.push(daysToExam >= 0 ? `Faltam ${daysToExam} dias para a prova${near ? ": foco total em questões e simulados." : "."}` : "A data da prova cadastrada já passou: confira o edital atualizado.");
  if (i.reviewsDue > 0) notes.push(`Você tem ${i.reviewsDue} ${i.reviewsDue === 1 ? "revisão vencida" : "revisões vencidas"}: comece por elas.`);

  const qPerDay = i.dailyQuestions && i.dailyQuestions > 0 ? Math.round(i.dailyQuestions) : null;
  const days: PlanDay[] = [];
  let k = 0; // gira entre as matérias, as mais fracas voltam mais vezes
  const pick = () => generic[(k++) % Math.min(generic.length, 4 + (near ? 1 : 0))]!;
  for (const wd of [1, 2, 3, 4, 5, 6, 0]) {
    const label = WEEKDAYS[wd]!;
    const blocks: PlanBlock[] = [];
    if (wd === 0) {
      // Domingo: simulado curto (ou revisão leve) e planejamento da semana.
      const m = Math.round(perDay * 0.8);
      const sim = round5(m * 0.7);
      blocks.push({ kind: "simulado", subject: "Todas as matérias", minutes: sim, detail: `Mini-simulado de ${Math.max(10, Math.round(sim / MIN_PER_QUESTION))} questões, no tempo, sem consulta.` });
      blocks.push({ kind: "revisao", subject: generic[0]!.name, minutes: round5(m - sim), detail: "Corrija o simulado e anote os erros no caderno." });
    } else if (wd === 6) {
      // Sábado: bateria de questões + revisão da semana.
      const q = round5(perDay * 0.6);
      blocks.push({ kind: "questoes", subject: pick().name, minutes: q, detail: `${qPerDay ?? Math.round(q / MIN_PER_QUESTION)} questões; refaça as que errou na semana.` });
      blocks.push({ kind: "revisao", subject: pick().name, minutes: round5(perDay - q), detail: "Revisão semanal dos assuntos mais fracos." });
    } else {
      const s = pick();
      const a = round5(perDay * lessonShare);
      const q = round5(perDay * questionShare);
      const r = Math.max(5, perDay - a - q);
      blocks.push({ kind: "aula", subject: s.name, minutes: a, detail: s.pendingLessons > 0 ? `Aula nova (${s.pendingLessons} pendente${s.pendingLessons === 1 ? "" : "s"} nessa matéria).` : "Aula nova ou reforço do assunto." });
      blocks.push({ kind: "questoes", subject: s.name, minutes: q, detail: `${qPerDay ?? Math.max(5, Math.round(q / MIN_PER_QUESTION))} questões de ${s.name}.` });
      blocks.push({ kind: "revisao", subject: pick().name, minutes: r, detail: wd === 3 && i.reviewsDue > 0 ? "Zere as revisões vencidas." : "Revisão rápida do que estudou ontem (flashcards e post-its)." });
    }
    const minutes = blocks.reduce((a, b) => a + b.minutes, 0);
    const questions = blocks.filter((b) => b.kind === "questoes" || b.kind === "simulado").reduce((a, b) => a + Math.round(b.minutes / MIN_PER_QUESTION), 0);
    const theme = wd === 0 ? "Simulado e correção" : wd === 6 ? "Questões e revisão semanal" : "Aula + questões + revisão";
    days.push({ weekday: wd, label, theme, blocks, minutes, questions: qPerDay && wd !== 0 ? qPerDay : questions });
  }
  return {
    contest: i.contest,
    daysToExam,
    weeklyMinutes: days.reduce((a, d) => a + d.minutes, 0),
    weeklyQuestions: days.reduce((a, d) => a + d.questions, 0),
    days,
    notes,
  };
}

/** Texto do plano para o Mentor (voz/chat), em linguagem simples. */
export function planAsText(p: StudyPlan): string {
  const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);
  const lines = p.days.map((d) => `${d.label}: ${d.theme} — ${fmt(d.minutes)}, ${d.questions} questões (${d.blocks.map((b) => `${b.kind} ${b.subject} ${fmt(b.minutes)}`).join("; ")})`);
  return `PLANO SEMANAL PARA ${p.contest}: total ${fmt(p.weeklyMinutes)} e ${p.weeklyQuestions} questões por semana. ${lines.join(" | ")}.${p.notes.length ? ` Observações: ${p.notes.join(" ")}` : ""}`;
}
