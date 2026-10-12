import type { ExtractedNode } from "@/domain/content/extract";
import type { LessonPlan } from "@/domain/content/plan";
import type { AuditReport, Repair } from "@/domain/content/audit";
import type { SourceSpan } from "@/domain/content/types";
import type { AnalysisOutput } from "@/ai/schemas";
import type { AIUsage } from "@/ai/provider";
import type { Warning } from "@/ai/services";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export type BuildStage = "scope" | "extract" | "analyze" | "plan" | "audit" | "done";

export interface BuildState {
  chunks?: string[][];
  chunkIndex?: number;
  analyses?: AnalysisOutput[];
  plans?: LessonPlan[];
  warnings?: Warning[];
  unassigned?: SourceSpan[];
}

export interface Job<S = BuildState> {
  id: string;
  userId: string;
  trailId: string;
  kind: "build_trail" | "generate_lesson";
  lessonId: string | null;
  stage: string;
  status: JobStatus;
  progress: number;
  attempts: number;
  maxAttempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  state: S;
}

export interface TrailInfo {
  id: string;
  userId: string;
  boardName: string;
  contentType: string;
  versionId: string;
  /**
   * Texto usado pela extração: o conteúdo do aluno e, quando houver, o roteiro de
   * subtemas organizado pela IA logo depois (a partir de `sourceLength`).
   */
  normalizedText: string;
  /** Tamanho do texto do aluno dentro de `normalizedText`; nós além disso têm origem "ia". */
  sourceLength?: number;
  /** Resposta do aluno ao pedido de esclarecimento, se houve. */
  scopeAnswer?: string | null;
  /** O pedido é jurídico (subtemas organizados pela IA ficam pendentes de verificação). */
  scopeLegal?: boolean;
  /** Já passou pela delimitação de escopo. */
  scopeDone?: boolean;
}

export interface ScopeRecord {
  summary?: unknown;
  outline?: string | null;
  question?: { question: string; options: string[] } | null;
}

export interface GenerationRecord {
  jobId: string;
  userId: string;
  trailId: string;
  lessonId?: string | null;
  task: string;
  provider: string;
  model: string;
  usage: AIUsage;
  latencyMs?: number;
  warnings: Warning[];
  output?: unknown;
}

export interface FinalizedPlan {
  plan: LessonPlan;
  analysis: AnalysisOutput["nodes"];
  disciplineMode: string;
  audit: AuditReport;
  repairs: Repair[];
  ambiguities: AnalysisOutput["ambiguities"];
}

/** Persistência usada pelo pipeline de construção. */
export interface BuildRepo {
  getTrail(trailId: string, userId: string): Promise<TrailInfo>;
  replaceNodes(trail: TrailInfo, nodes: ExtractedNode[]): Promise<void>;
  getNodes(trail: TrailInfo): Promise<ExtractedNode[]>;
  saveJob(job: Job): Promise<void>;
  recordGeneration(rec: GenerationRecord): Promise<void>;
  persistPlan(trail: TrailInfo, result: FinalizedPlan): Promise<void>;
  setTrailStatus(trailId: string, userId: string, status: "processing" | "clarification" | "review" | "failed"): Promise<void>;
  /** Grava a delimitação de escopo (ou a pergunta de esclarecimento). */
  saveScope(trail: TrailInfo, scope: ScopeRecord): Promise<void>;
  log(event: string, meta: Record<string, unknown>): Promise<void>;
}
