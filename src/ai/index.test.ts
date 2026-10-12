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
