import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_DISABLED_MESSAGE, aiEnabled, aiIsConfigured, getAIProvider } from "./index";

afterEach(() => vi.unstubAllEnvs());

describe("modo só catálogo", () => {
  it("IA desligada por padrão: nenhuma chamada possível, com mensagem clara", () => {
    vi.stubEnv("AI_ENABLED", "");
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("AI_MODEL", "m");
    expect(aiEnabled()).toBe(false);
    expect(aiIsConfigured()).toBe(false);
    expect(() => getAIProvider()).toThrow(AI_DISABLED_MESSAGE);
  });
  it("AI_ENABLED=true liga a IA", () => {
    vi.stubEnv("AI_ENABLED", " TRUE ");
    expect(aiEnabled()).toBe(true);
  });
});

describe("IA só para o banco de questões", () => {
  it("AI_ENABLED=banco liga o banco e mantém as aulas só no catálogo", () => {
    vi.stubEnv("AI_ENABLED", "banco");
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "gsk_x");
    vi.stubEnv("AI_MODEL", "openai/gpt-oss-120b");
    expect(aiEnabled("banco")).toBe(true);
    expect(aiEnabled()).toBe(false);
    expect(() => getAIProvider()).toThrow(AI_DISABLED_MESSAGE);
    expect(getAIProvider("banco").name).toBe("groq");
  });
});
