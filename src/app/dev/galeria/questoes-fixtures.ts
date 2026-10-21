import type { Notebook, NotebookLookups, NotebookQuestion, Notice } from "@/server/services/notebooks";
import { EMPTY_FILTERS, type IndexedQuestion } from "@/domain/notebooks/filters";
import type { AnswerFeedback } from "@/server/services/study";

/** Dados de EXEMPLO do menu Questões (galeria de desenvolvimento). */
const SUB = { adm: "a0000000-0000-4000-8000-000000000001", pen: "a0000000-0000-4000-8000-000000000002", con: "a0000000-0000-4000-8000-000000000003", leg: "a0000000-0000-4000-8000-000000000004", ppe: "a0000000-0000-4000-8000-000000000005" };
const TOP = { atos: "b0000000-0000-4000-8000-000000000001", anul: "b0000000-0000-4000-8000-000000000002", hom: "b0000000-0000-4000-8000-000000000003" };
const EX1 = "c0000000-0000-4000-8000-000000000001";

const nb = (id: string, title: string, scope: string, iconHint: string, createdAt: string, extra: Partial<Notebook> = {}): Notebook => ({
  id,
  title,
  filters: { ...EMPTY_FILTERS },
  labels: [scope],
  scope,
  iconHint,
  showFullStatement: true,
  pinned: false,
  lastOpenedAt: null,
  createdAt,
  available: 0,
  answered: 0,
  correct: 0,
  ...extra,
});

export const demoNotebooks: Notebook[] = [
  nb("11111111-1111-4111-8111-111111111111", "AGENTE DE APOIO MP ES", "Direito Administrativo", "Direito Administrativo", "2026-03-30T13:00:00Z", { labels: ["Direito Administrativo", "Agente de Apoio · 2026"], available: 3, answered: 12, correct: 9, pinned: true, lastOpenedAt: "2026-10-20T13:00:00Z" }),
  nb("22222222-2222-4222-8222-222222222222", "Caderno de Questões", "Direito Penal", "Direito Penal", "2025-12-02T13:00:00Z", { available: 3, lastOpenedAt: "2026-10-18T13:00:00Z" }),
  nb("33333333-3333-4333-8333-333333333333", "Caderno de Questões", "Direito Constitucional", "Direito Constitucional", "2025-12-02T12:00:00Z", { available: 3, answered: 4, correct: 2, lastOpenedAt: "2026-10-15T13:00:00Z" }),
  nb("44444444-4444-4444-8444-444444444444", "Polícia Civil Espírito Santo", "Legislação Especial", "Legislação Especial", "2025-10-20T13:00:00Z", { labels: ["Legislação Especial", "Banca IBADE"], pinned: true }),
  nb("55555555-5555-4555-8555-555555555555", "Crm", "Banca CEBRASPE", "", "2025-10-19T13:00:00Z", { labels: ["Banca CEBRASPE", "Certo ou errado"] }),
  nb("66666666-6666-4666-8666-666666666666", "Revisão final PPMG", "Direito Processual Penal", "Direito Processual Penal", "2025-09-01T13:00:00Z", { showFullStatement: false, available: 3 }),
];

export const demoNotices: Notice[] = [
  { id: "n1", kicker: "Conheça os novos", title: "Cadernos de", highlight: "Questões", body: "Monte cadernos por matéria, concurso e banca e treine com questões de concurso revisadas.", ctaLabel: "Criar caderno", href: "/questoes/cadernos/novo", image: "/images/jogo-hero-arte-sm.webp" },
  { id: "n2", kicker: "Treine a lei seca no", title: "Modo", highlight: "Jogo", body: "Complete os artigos, suba no ranking e fixe a literalidade da lei.", ctaLabel: "Jogar agora", href: "/quiz", image: "/images/jogo-hero-arte-sm.webp" },
  { id: "n3", kicker: "Não perca o ritmo", title: "Revisões", highlight: "em dia", body: "A revisão espaçada traz de volta o que está para ser esquecido.", ctaLabel: "Ver revisões", href: "/revisoes", image: "/images/jogo-hero-arte-sm.webp" },
];

/** Atividade de exemplo: dias de outubro a dezembro com volumes variados (padrão fixo, sem aleatoriedade). */
export function demoActivity(year: number): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  for (let m = 9; m <= 12; m++) {
    for (let d = 1; d <= 30; d++) {
      const v = (d * 7 + m * 13) % 41;
      if (v % 3 === 0) continue;
      out.push([`${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, v]);
    }
  }
  return out;
}

const iq = (id: string, subject: string, topic: string | null, board: string | null, exam: string | null, year: number | null, difficulty: IndexedQuestion["difficulty"], type: IndexedQuestion["type"]): IndexedQuestion => ({ id, subject, topic, board, exam, year, difficulty, type });

export const demoLookups: NotebookLookups = {
  subjects: [
    { id: SUB.pen, name: "Direito Penal", topics: [{ id: TOP.hom, name: "Homicídio", depth: 0 }] },
    { id: SUB.ppe, name: "Direito Processual Penal", topics: [] },
    { id: SUB.leg, name: "Legislação Especial", topics: [] },
    { id: SUB.con, name: "Direito Constitucional", topics: [] },
    { id: SUB.adm, name: "Direito Administrativo", topics: [{ id: TOP.atos, name: "Atos administrativos", depth: 0 }, { id: TOP.anul, name: "Anulação e revogação", depth: 1 }] },
  ],
  boards: [
    { slug: "cebraspe", name: "CEBRASPE" },
    { slug: "fgv", name: "FGV" },
    { slug: "ibade", name: "IBADE" },
  ],
  exams: [{ id: EX1, name: "Agente de Apoio", organ: "MPES", role: "Agente de Apoio", year: 2026 }],
  years: [2026, 2025],
  index: [
    iq("q1", SUB.adm, TOP.anul, "fgv", EX1, 2026, "dificil", "multipla_escolha"),
    iq("q2", SUB.adm, TOP.atos, "fgv", EX1, 2026, "muito_dificil", "multipla_escolha"),
    iq("q3", SUB.adm, null, null, null, null, "dificil", "multipla_escolha"),
    iq("q4", SUB.pen, TOP.hom, "cebraspe", null, 2025, "extrema", "certo_errado"),
    iq("q5", SUB.pen, null, null, null, 2025, "dificil", "multipla_escolha"),
    iq("q6", SUB.con, null, null, null, null, "muito_dificil", "multipla_escolha"),
  ],
  answered: ["q1", "q4"],
  favorites: ["q2"],
  topicParent: [[TOP.atos, null], [TOP.anul, TOP.atos], [TOP.hom, null]],
};

export const demoQuestions: NotebookQuestion[] = [
  {
    id: "q-demo-1",
    code: "APV-000101",
    type: "multipla_escolha",
    statement: "Um servidor obteve licença com base em documento que, descobriu-se depois, era falso. Ao identificar o vício, a Administração deve:",
    caseContext: null,
    board: null,
    year: null,
    examName: null,
    subjectName: "Direito Administrativo",
    topicName: "Anulação e revogação",
    cargo: null,
    note: "",
    origin: "autoral_humana",
    options: [
      { id: "o1", label: "A", text: "revogar a licença, por conveniência e oportunidade" },
      { id: "o2", label: "B", text: "anular a licença, por ilegalidade, com efeitos em regra retroativos" },
      { id: "o3", label: "C", text: "convalidar a licença, pois todo vício é sanável" },
      { id: "o4", label: "D", text: "aguardar decisão judicial, pois a Administração não revê os próprios atos" },
      { id: "o5", label: "E", text: "manter a licença até o fim do prazo concedido" },
    ],
    favorite: true,
    last: { correct: false, at: "2026-10-08T13:00:00Z" },
  },
  {
    id: "q-demo-2",
    code: "APV-000102",
    type: "certo_errado",
    statement: "A autotutela permite à Administração anular os próprios atos ilegais, independentemente de provocação.",
    caseContext: null,
    board: null,
    year: null,
    examName: null,
    subjectName: "Direito Administrativo",
    topicName: "Anulação e revogação",
    cargo: null,
    note: "",
    origin: "autoral_humana",
    options: [],
    favorite: false,
    last: null,
  },
  {
    id: "q-demo-3",
    code: "APV-000103",
    type: "multipla_escolha",
    statement: "A revogação de um ato administrativo discricionário válido produz efeitos:",
    caseContext: null,
    board: null,
    year: null,
    examName: null,
    subjectName: "Direito Administrativo",
    topicName: "Anulação e revogação",
    cargo: null,
    note: "",
    origin: "autoral_humana",
    options: [
      { id: "p1", label: "A", text: "ex tunc, desde a edição do ato" },
      { id: "p2", label: "B", text: "ex nunc, a partir da revogação" },
      { id: "p3", label: "C", text: "apenas após decisão judicial" },
      { id: "p4", label: "D", text: "retroativos, se houver má-fé" },
      { id: "p5", label: "E", text: "nenhum, pois ato válido não pode ser revogado" },
    ],
    favorite: false,
    last: null,
  },
];

const KEY: Record<string, { correct: string | boolean; why: string }> = {
  "q-demo-1": { correct: "o2", why: "Documento falso é vício de legalidade: a Administração anula o ato (autotutela), em regra com efeitos retroativos." },
  "q-demo-2": { correct: true, why: "Certo. A autotutela autoriza a anulação de ofício dos atos ilegais (Súmula 473/STF), respeitados o contraditório e o prazo decadencial quando houver efeitos favoráveis." },
  "q-demo-3": { correct: "p2", why: "A revogação retira ato válido por conveniência e oportunidade e produz efeitos ex nunc." },
};

export function demoFeedback(questionId: string, input: { optionId?: string; answerTrue?: boolean }): AnswerFeedback {
  const k = KEY[questionId]!;
  const q = demoQuestions.find((x) => x.id === questionId)!;
  if (q.type === "certo_errado") return { correct: input.answerTrue === k.correct, justification: k.why, correctAnswerTrue: k.correct as boolean, options: [] };
  return {
    correct: input.optionId === k.correct,
    justification: k.why,
    correctAnswerTrue: null,
    options: q.options.map((o) => ({ id: o.id, label: o.label, isCorrect: o.id === k.correct, explanation: o.id === k.correct ? "" : `Incorreta: a alternativa ${o.label} não corresponde à regra.` })),
  };
}
