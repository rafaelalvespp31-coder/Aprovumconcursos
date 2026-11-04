import { describe, expect, it } from "vitest";
import { formatWhatsapp, normalizeWhatsapp } from "./whatsapp";

describe("whatsapp", () => {
  it("normaliza números brasileiros com ou sem DDI", () => {
    expect(normalizeWhatsapp("(31) 99999-8888")).toBe("5531999998888");
    expect(normalizeWhatsapp("+55 31 3333-4444")).toBe("553133334444");
    expect(normalizeWhatsapp("5531999998888")).toBe("5531999998888");
  });
  it("recusa números inválidos", () => {
    expect(normalizeWhatsapp("1234")).toBeNull();
    expect(normalizeWhatsapp("")).toBeNull();
  });
  it("formata para exibir", () => {
    expect(formatWhatsapp("5531999998888")).toBe("+55 (31) 99999-8888");
    expect(formatWhatsapp(null)).toBe("");
  });
});
