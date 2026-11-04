import { describe, expect, it } from "vitest";
import { explainCacheKey } from "./explain-cache";

describe("explainCacheKey", () => {
  it("ignora maiúsculas e espaços extras", () => {
    expect(explainCacheKey("Dolo  Eventual", "o  agente assume o risco")).toBe(explainCacheKey("dolo eventual ", "O agente assume o risco"));
  });
  it("muda com o trecho ou com o contexto", () => {
    expect(explainCacheKey("dolo", "a")).not.toBe(explainCacheKey("culpa", "a"));
    expect(explainCacheKey("dolo", "a")).not.toBe(explainCacheKey("dolo", "b"));
  });
});
