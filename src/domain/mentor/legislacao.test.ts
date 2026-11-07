import { describe, expect, it } from "vitest";
import { LEGISLACAO_ATUALIZADA, PEC_SEGURANCA } from "./legislacao";
import { VOICE_SYSTEM_PROMPT } from "./voice";

describe("legislação atualizada do Mentor", () => {
  it("entra no prompt de voz", () => {
    expect(VOICE_SYSTEM_PROMPT).toContain(LEGISLACAO_ATUALIZADA);
  });
  it("traz o art. 144, os novos artigos e a situação da PEC", () => {
    for (const t of ["§ 5º-A", "§ 8º-A", "144-A", "144-B", "polícias municipais", "Susp", "aguardando promulgação"]) expect(LEGISLACAO_ATUALIZADA).toContain(t);
    expect(PEC_SEGURANCA.numero).toBe("PEC 18/2025");
  });
});
