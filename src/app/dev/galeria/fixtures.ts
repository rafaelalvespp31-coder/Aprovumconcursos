/** Dados de EXEMPLO para a galeria de design (nunca usados em produção). */
import type { DashboardData } from "@/app/(app)/painel/view";
import { trailCard, type PlanModule } from "@/app/(app)/painel/model";
import type { ShellSummary } from "@/server/queries";
import { computeGamification, streakMessage, type StudyStats } from "@/domain/progress/gamification";
import type { ReaderProps } from "@/app/(app)/aula/[id]/reader";
import type { BankQuestion, LessonListItem } from "@/server/queries";
import { summarizePerformance, type AttemptRecord } from "@/domain/progress/performance";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const lessonBase = (n: number, over: Partial<LessonListItem>): LessonListItem => ({
  id: id(100 + n), key: `L${n}`, title: "", objective: "", sort_order: n, estimated_minutes: 35, status: "ready",
  supplementary: [], module_id: id(11), verification_pending: false, state: "nao_iniciada", nodeKeys: [],
  prerequisiteIds: [], questionCount: 30, reviewDue: false, ...over,
  levelsPassed: over.levelsPassed ?? (over.state === "dominada" || over.state === "aguardando_dominio" ? 3 : over.state === "em_revisao" ? 3 : 0),
});

export const trailModules: Array<{ id: string; title: string; lessons: LessonListItem[] }> = [
  {
    id: id(11),
    title: "Ato administrativo",
    lessons: [
      lessonBase(1, { title: "Conceito e requisitos do ato administrativo", objective: "Identificar competência, finalidade, forma, motivo e objeto.", state: "dominada", nodeKeys: ["N0003", "N0004"] }),
      lessonBase(2, { title: "Atributos do ato administrativo", objective: "Reconhecer presunção de legitimidade, imperatividade, autoexecutoriedade e tipicidade.", state: "em_revisao", reviewDue: true, prerequisiteIds: [id(101)], nodeKeys: ["N0005"] }),
      lessonBase(3, { title: "Anulação, revogação e convalidação", objective: "Distinguir as formas de extinção do ato, seus fundamentos e efeitos.", state: "em_andamento", verification_pending: true, prerequisiteIds: [id(101)], nodeKeys: ["N0006", "N0007"] }),
      lessonBase(4, { title: "Classificação e espécies de atos", objective: "Classificar atos quanto aos destinatários, ao alcance e à formação.", state: "nao_iniciada", status: "planned", questionCount: 0, nodeKeys: ["N0008"] }),
    ],
  },
  {
    id: id(12),
    title: "Poderes administrativos",
    lessons: [
      lessonBase(5, { module_id: id(12), title: "Poder hierárquico e disciplinar", objective: "Diferenciar a organização interna da aplicação de sanções a servidores.", state: "nao_iniciada", status: "planned", questionCount: 0 }),
      lessonBase(6, { module_id: id(12), title: "Poder de polícia", objective: "Compreender atributos e limites do poder de polícia.", state: "nao_iniciada", status: "pending_validation", supplementary: [{ title: "Direitos fundamentais e restrições", justification: "Ajuda a entender os limites do poder de polícia." }] }),
    ],
  },
];

export const trailTitles = new Map([
  ["N0003", "2.1 Conceito"], ["N0004", "requisitos"], ["N0005", "atributos"], ["N0006", "2.2 Invalidação, anulação e revogação"], ["N0007", "convalidação"], ["N0008", "classificação e espécies"],
]);

const q = (n: number, over: Partial<BankQuestion>): BankQuestion => ({
  id: id(500 + n), type: "multipla_escolha", statement: "", difficulty: 2, essential: false, board_style: "FGV", depends_on_external_source: false,
  options: [], topic: "Anulação e revogação", lessonId: id(103), lessonTitle: "Anulação, revogação e convalidação", moduleId: id(11), moduleTitle: "Ato administrativo",
  trailId: id(10), trailTitle: "Polícia Penal MG — Direito Administrativo", board: "fgv", marked: false, history: [], ...over,
});
const opts = (n: number, texts: string[]) => texts.map((t, i) => ({ id: id(900 + n * 10 + i), label: String.fromCharCode(65 + i), text: t }));

export const bank: BankQuestion[] = [
  q(1, {
    statement: "Um servidor obteve licença com base em documento que, descobriu-se depois, era falso. Ao identificar o vício, a Administração deve:",
    essential: true,
    options: opts(1, [
      "revogar a licença, por conveniência e oportunidade, com efeitos a partir da revogação",
      "anular a licença, por ilegalidade, com efeitos, em regra, retroativos",
      "convalidar a licença, pois todo vício de ato administrativo é sanável",
      "aguardar decisão judicial, pois a Administração não pode rever os próprios atos",
    ]),
    history: [{ correct: false, at: "2026-10-08T14:00:00Z", context: "fixacao", confidence: 3 }],
  }),
  q(2, { type: "certo_errado", statement: "A revogação de ato administrativo pode ser feita pelo Poder Judiciário no exercício de sua função jurisdicional.", difficulty: 1, history: [{ correct: true, at: "2026-10-09T10:00:00Z", context: "fixacao", confidence: 2 }] }),
  q(3, { statement: "Sobre a convalidação de atos administrativos, é correto afirmar que:", difficulty: 3, marked: true, options: opts(3, ["alcança qualquer vício de finalidade", "só é possível para vícios sanáveis, sem prejuízo a terceiros nem ao interesse público", "depende sempre de autorização legislativa", "produz efeitos apenas a partir da data da convalidação, nunca retroagindo"]) }),
  ...Array.from({ length: 9 }, (_, k) => q(10 + k, { statement: `Questão de exemplo ${k + 4}.`, options: opts(10 + k, ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]), history: k % 3 === 0 ? [{ correct: k % 2 === 0, at: "2026-10-07T10:00:00Z", context: "fixacao", confidence: null }] : [] })),
];

const LEI = "Art. 53. A Administração deve anular seus próprios atos, quando eivados de vício de legalidade, e pode revogá-los por motivo de conveniência ou oportunidade, respeitados os direitos adquiridos.";

export const reader: ReaderProps = {
  lesson: { id: id(103), title: "Anulação, revogação e convalidação", objective: "Distinguir as formas de extinção do ato administrativo, seus fundamentos e efeitos.", trailId: id(10), trailTitle: "Polícia Penal MG — Direito Administrativo", estimatedMinutes: 35, stateLabel: "Em andamento" },
  nodes: [
    { key: "N0006", marker: "2.2", title: "Invalidação, anulação e revogação", taught: true },
    { key: "N0007", marker: null, title: "convalidação", taught: true },
    { key: "N0009", marker: "Art. 53", title: "Lei 9.784/1999", taught: true },
  ],
  sections: [
    { id: id(201), kind: "introducao", title: "Introdução", node_keys: ["N0006"], verification_status: "nao_aplicavel", body_markdown: "Um ato administrativo pode deixar de produzir efeitos por razões muito diferentes. Às vezes ele **nasceu com defeito**; outras vezes era válido, mas **deixou de ser conveniente**. Separar essas duas situações é o que a banca mais cobra neste tema.\n\n:::exemplo\nSituação: A prefeitura concedeu um alvará com base em documento falso e, dois meses depois, descobriu a fraude.\nPergunta: A Administração deve anular ou revogar o alvará?\nResposta: **Anular.** O ato nasceu **ilegal** (vício), então a Administração o anula, com efeitos **retroativos** (*ex tunc*). Revogar é para ato **válido** que deixou de ser conveniente.\n:::" },
    { id: id(202), kind: "texto_legal", title: "Texto legal", node_keys: ["N0009"], verification_status: "nao_aplicavel", body_markdown: `> ${LEI}` },
    { id: id(203), kind: "quadro_comparativo", title: "Anulação × revogação", node_keys: ["N0006"], verification_status: "nao_aplicavel", body_markdown: "| | Anulação | Revogação |\n|---|---|---|\n| Motivo | Ilegalidade | Conveniência e oportunidade |\n| Quem pode | Administração e Judiciário | Somente a Administração |\n| Efeitos | Em regra, retroativos (*ex tunc*) | Daqui para a frente (*ex nunc*) |\n| Alcança | Ato ilegal | Ato válido e discricionário |" },
    { id: id(204), kind: "exemplos", title: "Exemplos", node_keys: ["N0006"], verification_status: "nao_aplicavel", body_markdown: "**Caso 1 — Documento falso.** A prefeitura concede licença com base em documento falso.\n→ **Anulação**: o ato nasceu viciado e o efeito retroage (*ex tunc*).\n\n**Caso 2 — Rota de ônibus.** A autorização de mesas na calçada é retirada porque a rua virou rota de ônibus.\n→ **Revogação**: o ato era válido, mas deixou de atender ao interesse público (*ex nunc*)." },
    { id: id(205), kind: "pegadinhas", title: "Pegadinhas", node_keys: ["N0006"], verification_status: "nao_aplicavel", body_markdown: "O Judiciário **não revoga** atos de outro Poder no exercício da função jurisdicional: ele só anula por ilegalidade. Revogar é juízo de mérito, exclusivo de quem praticou o ato." },
    { id: id(206), kind: "conceitos_fundamentais", title: "Convalidação", node_keys: ["N0007"], verification_status: "nao_aplicavel", body_markdown: "Convalidar é **corrigir um vício sanável** e manter o ato, com efeitos retroativos. Só cabe quando o defeito é sanável e não há prejuízo ao interesse público nem a terceiros." },
    { id: id(207), kind: "jurisprudencia", title: "Entendimento dos tribunais", node_keys: ["N0006"], verification_status: "pendente", body_markdown: "A orientação consolidada é de que a Administração pode anular os próprios atos ilegais e revogá-los por conveniência, respeitados os direitos adquiridos e ressalvada a apreciação judicial." },
    { id: id(208), kind: "resumo", title: "Resumo", node_keys: ["N0006", "N0007"], verification_status: "nao_aplicavel", body_markdown: "1. Ilegal → **anula** (retroage).\n2. Válido, mas inconveniente → **revoga** (não retroage).\n3. Vício sanável, sem prejuízo → pode **convalidar**." },
  ],
  questions: bank.slice(0, 3).map((b, i) => ({ ...b, nodeKey: i === 2 ? "N0007" : "N0006", level: i === 2 ? ("medio" as const) : ("facil" as const), recovery_of: null })),
  levelsPassed: 0,
  markedQuestionIds: [id(503)],
  // Questão já respondida em outra visita: abre marcada, com o gabarito comentado.
  answers: {
    [id(502)]: {
      choice: "false",
      feedback: {
        correct: true,
        attempts: 1,
        correctAnswerTrue: false,
        justification: "Revogar é juízo de conveniência e oportunidade, exclusivo de quem praticou o ato. O Judiciário, ao julgar, só anula por ilegalidade.",
        options: [],
      },
    },
  },
  annotations: [
    { id: id(301), section_id: id(203), section_title: "Anulação × revogação", kind: "revisar", body: "", resolved: false, updated_at: "2026-10-10T12:00:00Z" },
    { id: id(302), section_id: id(206), section_title: "Convalidação", kind: "duvida", body: "Vício de competência sempre pode ser convalidado?", resolved: false, updated_at: "2026-10-10T12:05:00Z" },
  ],
  clarifications: [
    { id: id(401), section_id: id(205), question: "Então o juiz nunca pode revogar ato nenhum?", answer_markdown: "Pode revogar **os próprios atos administrativos** do Judiciário (por exemplo, uma portaria interna do tribunal), porque aí ele atua como Administração. O que não pode é revogar, ao julgar um processo, ato de outro Poder.", verification_pending: false },
  ],
  readingDone: false,
  context: "fixacao",
  prevId: id(102),
  nextId: id(104),
  position: { index: 2, total: 6 },
  moduleTitle: "Módulo 2 · Extinção do ato",
  outline: [
    { id: id(101), title: "Conceito e atributos", module: "Ato administrativo" },
    { id: id(102), title: "Elementos do ato", module: "Ato administrativo" },
    { id: id(103), title: "Anulação, revogação e convalidação", module: "Extinção do ato" },
    { id: id(104), title: "Cassação e caducidade", module: "Extinção do ato" },
    { id: id(105), title: "Poderes administrativos", module: "Poderes" },
    { id: id(106), title: "Abuso de poder", module: "Poderes" },
  ],
  nextHref: `/aula/${id(104)}`,
  nextLabel: "Atos administrativos: atributos",
  notices: null,
};

// ---- Desempenho (EXEMPLO): tentativas sintéticas processadas pela mesma função de produção ----

const SUBJECTS = [
  { id: id(11), title: "Ato administrativo", topics: ["Anulação e revogação", "Atributos", "Convalidação"] },
  { id: id(12), title: "Poderes administrativos", topics: ["Poder de polícia", "Poder disciplinar"] },
  { id: id(21), title: "Coesão e coerência", topics: ["Conectivos", "Referenciação"] },
];
const sampleAttempts: AttemptRecord[] = Array.from({ length: 60 }, (_, k) => {
  const s = SUBJECTS[k % 3]!;
  const correct = s.id === id(12) ? k % 3 === 0 : k % 4 !== 0;
  return {
    questionId: `q${k % 40}`,
    correct,
    at: new Date(Date.UTC(2026, 8, 12 + (k % 28), 10, k)).toISOString(),
    context: "fixacao",
    confidence: k % 5 === 0 ? 3 : k % 7 === 0 ? 1 : null,
    difficulty: (k % 4) + 1,
    board: k % 3 === 2 ? "FGV" : "CEBRASPE",
    subjectId: s.id,
    subjectTitle: s.title,
    topic: s.topics[k % s.topics.length]!,
    lessonId: id(103),
    lessonTitle: "Anulação, revogação e convalidação",
    statement: `Questão de exemplo ${(k % 40) + 1}: enunciado ilustrativo para a galeria de design.`,
  };
});

export const performance = {
  summary: summarizePerformance(sampleAttempts),
  daily: Array.from({ length: 30 }, (_, i) => {
    const c = [6, 9, 0, 12, 8, 4, 0, 10, 14, 7][i % 10]!;
    return { day: new Date(Date.UTC(2026, 8, 11 + i)).toISOString().slice(0, 10), correct: c, wrong: Math.round(c * 0.35) };
  }),
  truncated: false,
};

// ---------------------------------------------------------------------------
// Painel "Leveza Pastel" e casco (EXEMPLO)
// ---------------------------------------------------------------------------
const portugues: PlanModule[] = [
  { id: id(21), title: "Coesão e coerência", lessons: Array.from({ length: 9 }, (_, i) => ({ id: id(200 + i), title: `Tema ${i + 1}`, state: i < 8 ? "dominada" : "em_andamento" })) },
  { id: id(22), title: "Crase", lessons: Array.from({ length: 4 }, (_, i) => ({ id: id(210 + i), title: `Tema ${i + 1}`, state: i < 4 ? "aguardando_dominio" : null })) },
];

export const dashboard: DashboardData = {
  name: "Rafael",
  goals: { dailyQuestions: 20, weeklyLessons: 5 },
  today: { answered: 13, correct: 10 },
  weekLessonsCompleted: 3,
  days: Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 8, 27 + i));
    const c = [6, 9, 0, 12, 8, 4, 0, 10, 14, 7, 11, 0, 9, 10][i]!;
    return { day: d.toISOString().slice(0, 10), correct: c, wrong: Math.round(c * 0.35) };
  }),
  accuracy14d: 0.74,
  answered14d: 136,
  continueLesson: {
    id: id(103),
    state: "em_andamento",
    stage: "ensino",
    title: "Anulação, revogação e convalidação",
    objective: "Distinguir as formas de extinção do ato administrativo, seus fundamentos e efeitos.",
    trailId: id(10),
    trailTitle: "Polícia Penal MG — Direito Administrativo",
    moduleTitle: "Ato administrativo",
    position: 3,
    totalLessons: 6,
    trailProgress: 17,
    estimatedMinutes: 35,
  },
  questions: { total: 84, unanswered: 31, marked: 4, unansweredByLevel: { facil: 12, medio: 14, dificil: 5 } },
  reviews: { count: 2, top: { lessonId: id(102), title: "Atributos do ato administrativo", overdueDays: 2 } },
  trails: [
    trailCard({ id: id(10), title: "Polícia Penal MG — Direito Administrativo", disciplineMode: "direito_administrativo" }, trailModules, 0),
    trailCard({ id: id(20), title: "Língua Portuguesa — FGV", disciplineMode: "lingua_portuguesa" }, portugues, 1),
  ],
  pendingTrails: [{ id: id(30), title: "Lei 7.210/1984 — Execução Penal", status: "review" }],
  basePath: "/dev/galeria",
};

export const studyStats: StudyStats = {
  answered: 136,
  correct: 101,
  activeDays: dashboard.days.filter((d) => d.correct + d.wrong > 0).map((d) => d.day),
  maxInDay: 19,
  themesPassed: 13,
  themesMastered: 9,
  modulesClosed: 1,
  today: dashboard.days.at(-1)!.day,
};

const g = computeGamification(studyStats);
export const shellSummary: ShellSummary = {
  name: "Rafael",
  email: "exemplo@nivelaprovado.dev",
  streak: { current: g.streak.current, last7: g.streak.last7, message: streakMessage(g.streak) },
  level: g.level.level,
  counts: { trails: 2, questions: 84, dueReviews: 2, answered: 136 },
  subjects: [
    { name: "Direito Administrativo", studies: [{ id: id(10), title: "Polícia Penal MG — Direito Administrativo" }] },
    { name: "Direito Penal", studies: [{ id: id(12), title: "Teoria do crime: fato típico" }, { id: id(13), title: "Homicídio (CP, art. 121)" }] },
    { name: "Direito Processual Penal", studies: [{ id: id(14), title: "Inquérito policial (CPP, arts. 4º a 23)" }] },
  ],
};
