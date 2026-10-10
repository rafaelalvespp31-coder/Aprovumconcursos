import { describe, expect, it } from "vitest";
import { trailRequestSchema, CONTENT_LIMITS } from "./trail-input";

const valid = {
  board: "fgv",
  contentType: "edital",
  content: "LÍNGUA PORTUGUESA: 1 Compreensão e interpretação de textos.",
};

describe("solicitação de trilha", () => {
  it("aceita solicitação válida", () => {
    expect(trailRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("exige a banca", () => {
    const r = trailRequestSchema.safeParse({ ...valid, board: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Selecione a banca examinadora.");
  });

  it("rejeita banca desconhecida", () => {
    expect(trailRequestSchema.safeParse({ ...valid, board: "xpto" }).success).toBe(false);
  });

  it("exige o nome quando a banca é 'outra'", () => {
    const r = trailRequestSchema.safeParse({ ...valid, board: "outra" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["otherBoardName"]);
    expect(trailRequestSchema.safeParse({ ...valid, board: "outra", otherBoardName: "FCC" }).success).toBe(true);
  });

  it("valida tamanho e conteúdo", () => {
    expect(trailRequestSchema.safeParse({ ...valid, content: "curto" }).success).toBe(false);
    expect(trailRequestSchema.safeParse({ ...valid, content: "1234567890 ........ 1234567890 !!!" }).success).toBe(false);
    expect(trailRequestSchema.safeParse({ ...valid, content: "a".repeat(CONTENT_LIMITS.maxChars + 1) }).success).toBe(false);
  });
});
