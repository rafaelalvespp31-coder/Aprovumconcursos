import { describe, expect, it } from "vitest";
import { chaveCopia, ehCopiaPublicada, podePublicar, statsDaCopia } from "./publicado";

describe("edital publicado", () => {
  it("chave da cópia é estável e distinta de hash de PDF", () => {
    expect(chaveCopia("abc")).toBe("publicado:abc");
    expect(chaveCopia("abc")).not.toMatch(/^[0-9a-f]{64}$/);
  });
  it("statsDaCopia mantém a leitura e remove o que é do dono", () => {
    const r = statsDaCopia({ topics: 10, reader: "gemini", studyFolderId: "x", matchedAt: "t", matchV: 7, needRole: true, failedAt: "lendo" }, { contestId: "c", fonteEditalId: "e", fonteEm: "2026-01-01" }, 6);
    expect(r).toEqual({ topics: 10, reader: "gemini", parserV: 6, publicado: { contestId: "c", fonteEditalId: "e", fonteEm: "2026-01-01" } });
    expect(ehCopiaPublicada(r)).toBe(true);
    expect(ehCopiaPublicada({ topics: 1 })).toBe(false);
    expect(ehCopiaPublicada(null)).toBe(false);
  });
  it("só publica edital próprio, concluído e com matérias", () => {
    expect(podePublicar({ status: "concluido", user_id: "a" }, "a", 3)).toEqual({ ok: true });
    expect(podePublicar({ status: "concluido", user_id: "b" }, "a", 3).ok).toBe(false);
    expect(podePublicar({ status: "lendo", user_id: "a" }, "a", 3).ok).toBe(false);
    expect(podePublicar({ status: "concluido", user_id: "a" }, "a", 0).ok).toBe(false);
  });
});
