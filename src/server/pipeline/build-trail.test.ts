import { describe, expect, it } from "vitest";
import { normalizeContent } from "@/domain/content/normalize";
import type { ExtractedNode } from "@/domain/content/extract";
import type { StructuredRequest } from "@/ai/provider";
import { AIError } from "@/ai/provider";
import { FakeProvider } from "../../../tests/support/fake-provider";
import { EDITAL_INLINE } from "../../../tests/fixtures/samples";
import { advanceBuild, resumeFailedJob } from "./build-trail";
import type { BuildRepo, FinalizedPlan, Job, ScopeRecord, TrailInfo } from "./types";

class MemoryRepo implements BuildRepo {
  scope: ScopeRecord = {};
  answer: string | null = null;
  nodes: ExtractedNode[] = [];
  jobs: Job[] = [];
  statuses: string[] = [];
  generations = 0;
  finalized: FinalizedPlan | null = null;
  events: string[] = [];
  constructor(private text: string, private contentType = "edital") {}
  async getTrail(): Promise<TrailInfo> {
    const source = normalizeContent(this.text).normalized;
    const outline = this.scope.outline;
    return {
      id: "t1", userId: "u1", boardName: "FGV", contentType: this.contentType, versionId: "v1",
      normalizedText: outline ? `${source}\n\n${outline}` : source,
      sourceLength: source.length,
      scopeAnswer: this.answer,
      scopeDone: this.scope.summary !== undefined && this.scope.summary !== null,
    };
  }
  async saveScope(_: TrailInfo, r: ScopeRecord) { this.scope = { ...this.scope, ...r }; }
  async replaceNodes(_: TrailInfo, nodes: ExtractedNode[]) { this.nodes = structuredClone(nodes); }
  async getNodes() { return structuredClone(this.nodes); }
  async saveJob(job: Job) { this.jobs.push(structuredClone(job)); }
  async recordGeneration() { this.generations++; }
  async persistPlan(_: TrailInfo, r: FinalizedPlan) { this.finalized = r; }
  async setTrailStatus(_a: string, _b: string, s: string) { this.statuses.push(s); }
  async log(e: string) { this.events.push(e); }
}

const newJob = (): Job => ({
  id: "j1", userId: "u1", trailId: "t1", kind: "build_trail", lessonId: null,
  stage: "queued", status: "queued", progress: 0, attempts: 0, maxAttempts: 3,
  errorCode: null, errorMessage: null, state: {},
});

/** IA falsa que responde de forma coerente com o bloco recebido. */
function coherentAI(opts: { omitLast?: boolean } = {}) {
  const keysIn = (prompt: string) => [...new Set(prompt.match(/\bN\d{4}\b/g) ?? [])];
  return new FakeProvider()
    .respond("analyze_content", (req: StructuredRequest<unknown>) => ({
      disciplineMode: "lingua_portuguesa",
      nodes: keysIn(req.prompt).map((key) => ({ key, relevance: "media", prerequisiteKeys: [], needsExternalVerification: false })),
      ambiguities: [],
    }))
    .respond("plan_lessons", (req: StructuredRequest<unknown>) => {
      const m = req.prompt.match(/chaves devem aparecer.*?: ([N\d, ]+)\./);
      let keys = m ? m[1]!.split(", ") : [];
      if (opts.omitLast) keys = keys.slice(0, -1);
      return {
        modules: [{
          title: "Módulo",
          lessons: [{ ref: "A1", title: "Aula única", objective: "Objetivo da aula", nodeKeys: keys, supplementary: [], prerequisiteRefs: [], estimatedMinutes: 40 }],
        }],
      };
    });
}

async function runToEnd(job: Job, repo: MemoryRepo, ai: FakeProvider, maxSteps = 50) {
  let current = job;
  for (let i = 0; i < maxSteps; i++) {
    const r = await advanceBuild(current, { repo, ai });
    current = r.job;
    if (r.done) break;
  }
  return current;
}

describe("pipeline de construção de trilha", () => {
  it("percorre todas as etapas com progresso crescente e persiste o plano", async () => {
    const repo = new MemoryRepo(EDITAL_INLINE);
    const ai = coherentAI();
    const final = await runToEnd(newJob(), repo, ai);
    expect(final.status).toBe("succeeded");
    expect(final.progress).toBe(100);
    const progress = repo.jobs.map((j) => j.progress);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(repo.jobs.map((j) => j.stage)).toEqual(["analyze", "plan", "audit", "done"]);
    expect(repo.finalized!.audit.summary.structurallyComplete).toBe(true);
    expect(repo.statuses).toEqual(["processing", "review"]);
    expect(repo.generations).toBe(2);
    // Nenhuma chamada de IA recebe o edital inteiro sem delimitação.
    expect(ai.calls.every((c) => c.prompt.includes("<conteudo_do_aluno>"))).toBe(true);
  });

  it("corrige automaticamente tópico omitido pela IA e registra a correção", async () => {
    const repo = new MemoryRepo(EDITAL_INLINE);
    await runToEnd(newJob(), repo, coherentAI({ omitLast: true }));
    expect(repo.finalized!.repairs.map((r) => r.action)).toContain("assigned_orphan");
    expect(repo.finalized!.audit.summary.errors).toBe(0);
  });

  it("falha de IA temporária não conclui o job e permite nova tentativa no mesmo estágio", async () => {
    const repo = new MemoryRepo(EDITAL_INLINE);
    const ai = coherentAI();
    let job = (await advanceBuild(newJob(), { repo, ai })).job; // extract
    const flaky = new FakeProvider().respond("analyze_content", new AIError("timeout", "timeout", true));
    const r = await advanceBuild(job, { repo, ai: flaky });
    expect(r.done).toBe(false);
    expect(r.job.status).toBe("running");
    expect(r.job.stage).toBe("analyze");
    expect(r.job.errorCode).toBe("ai_timeout");
    expect(r.job.attempts).toBe(1);
    job = await runToEnd(r.job, repo, ai);
    expect(job.status).toBe("succeeded");
  });

  it("após esgotar tentativas, marca falha visível — nunca simula conclusão", async () => {
    const repo = new MemoryRepo(EDITAL_INLINE);
    const job = (await advanceBuild(newJob(), { repo, ai: coherentAI() })).job;
    const broken = new FakeProvider().respond("analyze_content", new AIError("x", "provider_error", true));
    const final = await runToEnd(job, repo, broken);
    expect(final.status).toBe("failed");
    expect(final.progress).toBeLessThan(100);
    expect(repo.finalized).toBeNull();
    expect(repo.statuses.at(-1)).toBe("failed");

    // Retomada continua do estágio que falhou, sem refazer a extração.
    const resumed = resumeFailedJob(final);
    expect(resumed.stage).toBe("analyze");
    const ok = await runToEnd(resumed, repo, coherentAI());
    expect(ok.status).toBe("succeeded");
  });

  it("IA não configurada falha imediatamente com mensagem clara", async () => {
    const repo = new MemoryRepo(EDITAL_INLINE);
    const job = (await advanceBuild(newJob(), { repo, ai: coherentAI() })).job;
    const r = await advanceBuild(job, {
      repo,
      ai: () => { throw new AIError("IA não configurada", "not_configured", false); },
    });
    expect(r.job.status).toBe("failed");
    expect(r.job.errorMessage).toMatch(/não configurada/);
  });

  it("conteúdo sem tópicos falha sem chamar a IA", async () => {
    const repo = new MemoryRepo("...");
    const ai = coherentAI();
    const r = await advanceBuild(newJob(), { repo, ai });
    expect(r.job.status).toBe("failed");
    expect(r.job.errorCode).toBe("empty_content");
    expect(ai.calls).toHaveLength(0);
  });

  it("tema breve: a IA delimita o escopo e os subtemas entram no mapa de cobertura", async () => {
    const repo = new MemoryRepo("Prisão em flagrante", "tema_livre");
    const ai = coherentAI().respond("delimit_scope", {
      subject: "Prisão em flagrante (CPP, arts. 301 a 310)",
      scopeStatement: "Conceito, espécies, sujeitos, auto de prisão e audiência de custódia.",
      outOfScope: ["Prisão preventiva", "Prisão temporária"],
      isLegal: true,
      legalReferences: [{ norm: "Código de Processo Penal", provisions: "arts. 301 a 310" }],
      subtopics: [
        { title: "Conceito e natureza jurídica", children: [] },
        { title: "Espécies de flagrante", children: [{ title: "Próprio" }, { title: "Impróprio; quase flagrante" }, { title: "Presumido" }] },
        { title: "1.2 Auto de prisão em flagrante", children: [] },
      ],
      needsClarification: false,
      clarification: null,
    });
    const final = await runToEnd(newJob(), repo, ai);
    expect(final.status).toBe("succeeded");
    expect(repo.scope.outline).toBe("1 Conceito e natureza jurídica\n2 Espécies de flagrante\n2.1 Próprio\n2.2 Impróprio, quase flagrante\n2.3 Presumido\n3 Auto de prisão em flagrante");
    const titles = repo.nodes.map((n) => n.title);
    expect(titles).toEqual(expect.arrayContaining(["Prisão em flagrante", "Conceito e natureza jurídica", "Presumido"]));
    expect(repo.finalized!.audit.summary.errors).toBe(0);
    // O planejamento recebe a orientação de conteúdo específico (não edital).
    expect(ai.calls.find((c) => c.task === "plan_lessons")!.prompt).toMatch(/UM conteúdo específico/);
  });

  it("ambiguidade relevante pausa e pede esclarecimento; a resposta retoma do mesmo ponto", async () => {
    const repo = new MemoryRepo("Prisão", "tema_livre");
    const ask = {
      subject: "Prisão", scopeStatement: "Pedido amplo.", outOfScope: [], isLegal: true, legalReferences: [], subtopics: [],
      needsClarification: true,
      clarification: { question: "Qual modalidade de prisão você quer estudar?", options: ["Em flagrante", "Preventiva", "Temporária"] },
    };
    const ai = coherentAI().respond("delimit_scope", (req: StructuredRequest<unknown>) =>
      req.prompt.includes("esclarecimento_do_aluno")
        ? { ...ask, needsClarification: false, clarification: null, subject: "Prisão preventiva", subtopics: [{ title: "Pressupostos", children: [] }] }
        : ask,
    );
    const paused = await runToEnd(newJob(), repo, ai);
    expect(paused.status).toBe("failed");
    expect(paused.errorCode).toBe("needs_clarification");
    expect(paused.errorMessage).toBe("Qual modalidade de prisão você quer estudar?");
    expect(repo.statuses.at(-1)).toBe("clarification");
    expect(repo.scope.question?.options).toHaveLength(3);
    expect(repo.nodes).toHaveLength(0);

    repo.answer = "Preventiva";
    const done = await runToEnd(resumeFailedJob(paused), repo, ai);
    expect(done.status).toBe("succeeded");
    expect(repo.scope.outline).toBe("1 Pressupostos");
    expect(repo.scope.question).toBeNull();
  });

  it("edital e conteúdo colado por inteiro não passam pela delimitação da IA", async () => {
    const repo = new MemoryRepo(EDITAL_INLINE, "tema_livre");
    const ai = coherentAI();
    await runToEnd(newJob(), repo, ai);
    expect(ai.calls.some((c) => c.task === "delimit_scope")).toBe(false);
  });
});
