import { describe, expect, it } from "vitest";
import { normalizeContent } from "@/domain/content/normalize";
import type { ExtractedNode } from "@/domain/content/extract";
import type { StructuredRequest } from "@/ai/provider";
import { AIError } from "@/ai/provider";
import { FakeProvider } from "../../../tests/support/fake-provider";
import { EDITAL_INLINE } from "../../../tests/fixtures/samples";
import { advanceBuild, resumeFailedJob } from "./build-trail";
import type { BuildRepo, FinalizedPlan, Job, TrailInfo } from "./types";

class MemoryRepo implements BuildRepo {
  nodes: ExtractedNode[] = [];
  jobs: Job[] = [];
  statuses: string[] = [];
  generations = 0;
  finalized: FinalizedPlan | null = null;
  events: string[] = [];
  constructor(private text: string) {}
  async getTrail(): Promise<TrailInfo> {
    return { id: "t1", userId: "u1", boardName: "FGV", contentType: "edital", versionId: "v1", normalizedText: normalizeContent(this.text).normalized };
  }
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
});
