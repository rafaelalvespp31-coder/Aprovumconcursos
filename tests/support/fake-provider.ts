/**
 * Provedor de IA FALSO, exclusivo para testes. Não é importado por código de produção.
 * Devolve respostas programadas por tarefa e registra os prompts recebidos.
 */
import { AIError, type AIProvider, type AITask, type StructuredRequest, type StructuredResult } from "@/ai/provider";

type Responder = (req: StructuredRequest<unknown>) => unknown;

export class FakeProvider implements AIProvider {
  readonly name = "fake";
  readonly model = "fake-model";
  calls: Array<{ task: AITask; prompt: string; system: string }> = [];
  private queue = new Map<AITask, Array<Responder | Error>>();

  respond(task: AITask, value: unknown | Responder | Error): this {
    const list = this.queue.get(task) ?? [];
    list.push(value instanceof Error ? value : typeof value === "function" ? (value as Responder) : () => value);
    this.queue.set(task, list);
    return this;
  }

  async generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    this.calls.push({ task: req.task, prompt: req.prompt, system: req.system });
    const list = this.queue.get(req.task) ?? [];
    const next = list.length > 1 ? list.shift() : list[0];
    if (!next) throw new AIError(`Sem resposta programada para ${req.task}`, "provider_error", false);
    if (next instanceof Error) throw next;
    const parsed = req.schema.safeParse(next(req as StructuredRequest<unknown>));
    if (!parsed.success) throw new AIError("invalid", "invalid_output", true);
    return {
      data: parsed.data,
      usage: { inputTokens: 100, outputTokens: 50, estimatedCostUsd: null },
      model: this.model,
      provider: this.name,
      latencyMs: 1,
      attempts: 1,
    };
  }
}
