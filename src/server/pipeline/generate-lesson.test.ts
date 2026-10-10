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
  questionSaves: Array<{ count: number; append: boolean; levels: number[] }> = [];
  jobs: Job<LessonJobState>[] = [];
  statuses: LessonStatus[] = [];
  async getContext() { return structuredClone(ctx); }
  async saveLesson(_: LessonGenContext, out: LessonOutput, status: LessonStatus, missing: string[]) {
    this.lessons.push({ kinds: out.sections.map((s) => s.kind), status, missing });
  }
  async getLessonMarkdown() { return "# Tema 1\n\nConteúdo."; }
  async saveQuestions(_: LessonGenContext, q: QuestionsOutput, append = false) {
    this.questionSaves.push({ count: q.questions.length, append, levels: q.questions.map((x) => x.difficulty) });
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

describe("geração do tema: todas as formas de ensino e todos os níveis", () => {
  it("completa só as seções ausentes e só os níveis ausentes, sem reescrever", async () => {
    const missing: LessonSectionKind[] = ["excecoes", "checklist"];
    const first = REQUIRED_SECTION_KINDS.filter((k) => !missing.includes(k));
    const ai = new FakeProvider()
      .respond("generate_lesson", (req: StructuredRequest<unknown>) =>
        req.schemaName === "registrar_secoes"
          ? { sections: [section("checklist"), section("resumo"), section("excecoes")] }
          : lessonResponse(first),
      )
      .respond("generate_questions", (req: StructuredRequest<unknown>) =>
        req.prompt.includes("rodada COMPLEMENTAR")
          ? { questions: [question("Questão avançada do tema", scope[0]!, 5), question("Questão 1 do item", scope[0]!, 1)] }
          : { questions: scope.flatMap((k, i) => [question(`Questão 1 do item`.replace("1", String(i * 2 + 1)), k, 1 + (i % 4)), question(`Questão extra ${i}`, k, 2 + (i % 3))]) },
      );
    const repo = new MemoryLessonRepo();
    const final = await run(ai, repo);

    expect(final.status).toBe("succeeded");
    expect(repo.jobs.map((j) => j.stage)).toEqual(["sections", "questions", "questions_extra", "done"]);
    const progress = repo.jobs.map((j) => j.progress);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));

    // 1ª gravação: aula utilizável mas pendente; 2ª: completa, na ordem canônica, sem duplicar "resumo".
    expect(repo.lessons[0]!.status).toBe("pending_validation");
    expect(repo.lessons[0]!.missing).toEqual(["secao:excecoes", "secao:checklist"]);
    expect(repo.lessons[1]!.status).toBe("ready");
    expect(repo.lessons[1]!.kinds).toEqual([...REQUIRED_SECTION_KINDS]);

    // Questões: a principal substitui; a complementar acrescenta só o nível que faltava.
    expect(repo.questionSaves[0]!.append).toBe(false);
    expect(repo.questionSaves[0]!.levels).not.toContain(5);
    expect(repo.questionSaves[1]).toEqual({ count: 1, append: true, levels: [5] });
    expect(final.state.questionGaps).toEqual({ missingLevels: [], uncoveredNodeKeys: [] });
    expect(final.state.draft).toBeUndefined();

    const extraPrompt = ai.calls.find((c) => c.prompt.includes("rodada COMPLEMENTAR"))!.prompt;
    expect(extraPrompt).toContain("5 — avançada");
    expect(extraPrompt).not.toContain("1 — memorização");
  });

  it("aula completa de primeira vai direto às questões", async () => {
    const ai = new FakeProvider()
      .respond("generate_lesson", lessonResponse(REQUIRED_SECTION_KINDS))
      .respond("generate_questions", {
        questions: [1, 2, 3, 4, 5].map((lvl, i) => question(`Questão de nível ${lvl}`, scope[i % scope.length]!, lvl)),
      });
    const repo = new MemoryLessonRepo();
    const final = await run(ai, repo);
    expect(repo.jobs.map((j) => j.stage)).toEqual(["questions", "done"]);
    expect(repo.lessons).toHaveLength(1);
    expect(repo.lessons[0]!.status).toBe("ready");
    expect(final.state.missingKinds).toEqual([]);
    expect(ai.calls.filter((c) => c.task === "generate_questions")[0]!.prompt).toContain("Use TODOS os níveis de dificuldade");
  });

  it("se a rodada complementar também falhar em trazer a seção, a aula fica pendente com o motivo", async () => {
    const ai = new FakeProvider().respond("generate_lesson", (req: StructuredRequest<unknown>) =>
      req.schemaName === "registrar_secoes"
        ? { sections: [section("resumo")] }
        : lessonResponse(REQUIRED_SECTION_KINDS.filter((k) => k !== "pegadinhas")),
    ).respond("generate_questions", {
      questions: [1, 2, 3, 4, 5].map((lvl, i) => question(`Questão de nível ${lvl}`, scope[i % scope.length]!, lvl)),
    });
    const repo = new MemoryLessonRepo();
    const final = await run(ai, repo);
    expect(final.status).toBe("succeeded");
    expect(repo.lessons.at(-1)!.status).toBe("pending_validation");
    expect(repo.lessons.at(-1)!.missing).toEqual(["secao:pegadinhas"]);
    expect(final.state.missingKinds).toEqual(["pegadinhas"]);
  });
});
