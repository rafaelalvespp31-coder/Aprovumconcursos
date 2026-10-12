import { describe, expect, it } from "vitest";
import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure } from "@/domain/content/extract";
import type { StructuredRequest } from "@/ai/provider";
import { REQUIRED_SECTION_KINDS, type LessonSectionKind } from "@/ai/pedagogy";
import type { LessonOutput, QuestionsOutput } from "@/ai/schemas";
import { FakeProvider } from "../../../tests/support/fake-provider";
import { EDITAL_INLINE } from "../../../tests/fixtures/samples";
import { advanceLessonJob, type LessonGenContext, type LessonJobState, type LessonRepo, type LessonStatus } from "./generate-lesson";
import type { Job } from "./types";

const nodes = extractStructure(normalizeContent(EDITAL_INLINE).normalized).nodes;
const scope = nodes.filter((n) => n.requiresDirectCoverage).slice(0, 3).map((n) => n.key);

const ctx: LessonGenContext = {
  trailId: "t1",
  userId: "u1",
  boardName: "FGV",
  disciplineMode: "lingua_portuguesa",
  nodes,
  previousLessonTitles: [],
  lesson: {
    id: "l1", key: "C1-L1", title: "Tema 1", objective: "Dominar o tema 1", nodeKeys: scope,
    supplementary: [], prerequisiteLessonKeys: [], estimatedMinutes: 40,
  },
};

class MemoryLessonRepo implements LessonRepo {
  lessons: Array<{ kinds: LessonSectionKind[]; status: LessonStatus; missing: string[] }> = [];
  questionSaves: Array<{ count: number; append: boolean; levels: number[]; level?: string }> = [];
  jobs: Job<LessonJobState>[] = [];
  statuses: LessonStatus[] = [];
  async getContext() { return structuredClone(ctx); }
  async saveLesson(_: LessonGenContext, out: LessonOutput, status: LessonStatus, missing: string[]) {
    this.lessons.push({ kinds: out.sections.map((s) => s.kind), status, missing });
  }
  async getLessonMarkdown() { return "# Tema 1\n\nConteúdo."; }
  async saveQuestions(_: LessonGenContext, q: QuestionsOutput, append = false, level?: string) {
    this.questionSaves.push({ count: q.questions.length, append, levels: q.questions.map((x) => x.difficulty), level });
    return q.questions.length;
  }
  async setLessonStatus(_a: string, _b: string, s: LessonStatus) { this.statuses.push(s); }
  async saveJob(job: Job<LessonJobState>) { this.jobs.push(structuredClone(job)); }
  async recordGeneration() {}
  async log() {}
}

const section = (kind: LessonSectionKind) => ({ kind, title: `Seção ${kind}`, bodyMarkdown: `Conteúdo de ${kind}.`, nodeKeys: scope });

const lessonResponse = (kinds: readonly LessonSectionKind[]): LessonOutput => ({
  title: "Tema 1",
  objective: "Dominar o tema 1",
  sections: kinds.map(section),
  taughtNodeKeys: scope,
  references: [],
  unverifiedClaims: [],
});

const question = (statement: string, nodeKey: string, difficulty: number): QuestionsOutput["questions"][number] => ({
  type: "certo_errado",
  statement,
  options: [],
  correctAnswerTrue: true,
  justification: "Justificativa suficientemente longa.",
  nodeKey,
  difficulty,
  essential: difficulty === 1,
  dependsOnExternalSource: false,
});

const newJob = (): Job<LessonJobState> => ({
  id: "j1", userId: "u1", trailId: "t1", kind: "generate_lesson", lessonId: "l1",
  stage: "queued", status: "queued", progress: 0, attempts: 0, maxAttempts: 3,
  errorCode: null, errorMessage: null, state: {},
});

async function run(ai: FakeProvider, repo: MemoryLessonRepo) {
  let job = newJob();
  for (let i = 0; i < 10; i++) {
    const r = await advanceLessonJob(job, { repo, ai });
    job = r.job;
    if (r.done) break;
  }
  return job;
}

/** IA de questões coerente: responde ao nível pedido cobrindo os itens (ou parte deles). */
function questionsAI(opts: { skipOnFirstEasy?: string } = {}) {
  let easyCalls = 0;
  return (req: StructuredRequest<unknown>) => {
    const level = /NÍVEL FÁCIL/.test(req.prompt) ? 1 : /NÍVEL MÉDIO/.test(req.prompt) ? 3 : 5;
    if (req.prompt.includes("rodada COMPLEMENTAR")) {
      return { questions: [question(`Complementar ${opts.skipOnFirstEasy}`, opts.skipOnFirstEasy!, level)] };
    }
    let keys = scope;
    if (level === 1 && opts.skipOnFirstEasy && easyCalls++ === 0) keys = scope.filter((k) => k !== opts.skipOnFirstEasy);
    // A IA às vezes erra a dificuldade: o serviço ajusta para a faixa do nível.
    return { questions: keys.map((k, i) => question(`Nível ${level} item ${i} ${k}`, k, level === 1 ? 3 : level)) };
  };
}

describe("geração da unidade: formas de ensino e três níveis de avaliação", () => {
  it("completa só as seções ausentes e gera fácil, médio e difícil cobrindo todos os itens", async () => {
    const missing: LessonSectionKind[] = ["excecoes", "checklist"];
    const first = REQUIRED_SECTION_KINDS.filter((k) => !missing.includes(k));
    const ai = new FakeProvider()
      .respond("generate_lesson", (req: StructuredRequest<unknown>) =>
        req.schemaName === "registrar_secoes"
          ? { sections: [section("checklist"), section("resumo"), section("excecoes")] }
          : lessonResponse(first),
      )
      .respond("generate_questions", questionsAI({ skipOnFirstEasy: scope[2] }));
    const repo = new MemoryLessonRepo();
    const final = await run(ai, repo);

    expect(final.status).toBe("succeeded");
    expect(repo.jobs.map((j) => j.stage)).toEqual(["sections", "questions", "questions_extra", "questions", "questions", "done"]);
    const progress = repo.jobs.map((j) => j.progress);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));

    expect(repo.lessons[0]!.status).toBe("pending_validation");
    expect(repo.lessons[0]!.missing).toEqual(["secao:excecoes", "secao:checklist"]);
    expect(repo.lessons[1]!.status).toBe("ready");
    expect(repo.lessons[1]!.kinds).toEqual([...REQUIRED_SECTION_KINDS]);

    // Fácil substitui as antigas; a complementar do fácil e os demais níveis acrescentam.
    expect(repo.questionSaves.map((q) => [q.level, q.append])).toEqual([
      ["facil", false], ["facil", true], ["medio", true], ["dificil", true],
    ]);
    // Dificuldade sempre dentro da faixa do nível.
    expect(repo.questionSaves[0]!.levels.every((d) => d <= 2)).toBe(true);
    expect(repo.questionSaves[2]!.levels.every((d) => d === 3)).toBe(true);
    expect(repo.questionSaves[3]!.levels.every((d) => d >= 4)).toBe(true);
    expect(final.state.levelGaps).toEqual({ facil: [], medio: [], dificil: [] });
    expect(final.state.draft).toBeUndefined();

    const prompts = ai.calls.filter((c) => c.task === "generate_questions").map((c) => c.prompt);
    expect(prompts[0]).toMatch(/NÍVEL FÁCIL[\s\S]*90% de acerto/);
    expect(prompts[1]).toContain("rodada COMPLEMENTAR");
  });

  it("aula completa de primeira vai direto aos três níveis", async () => {
    const ai = new FakeProvider().respond("generate_lesson", lessonResponse(REQUIRED_SECTION_KINDS)).respond("generate_questions", questionsAI());
    const repo = new MemoryLessonRepo();
    const final = await run(ai, repo);
    expect(repo.jobs.map((j) => j.stage)).toEqual(["questions", "questions", "questions", "done"]);
    expect(repo.lessons).toHaveLength(1);
    expect(repo.lessons[0]!.status).toBe("ready");
    expect(final.state.missingKinds).toEqual([]);
  });

  it("se a rodada complementar também falhar em trazer a seção, a aula fica pendente com o motivo", async () => {
    const ai = new FakeProvider().respond("generate_lesson", (req: StructuredRequest<unknown>) =>
      req.schemaName === "registrar_secoes"
        ? { sections: [section("resumo")] }
        : lessonResponse(REQUIRED_SECTION_KINDS.filter((k) => k !== "pegadinhas")),
    ).respond("generate_questions", questionsAI());
    const repo = new MemoryLessonRepo();
    const final = await run(ai, repo);
    expect(final.status).toBe("succeeded");
    expect(repo.lessons.at(-1)!.status).toBe("pending_validation");
    expect(repo.lessons.at(-1)!.missing).toEqual(["secao:pegadinhas"]);
    expect(final.state.missingKinds).toEqual(["pegadinhas"]);
  });
});
