import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { accessEnd, mapStatus, toCents, verifySignature } from "./mercadopago";

const sign = (secret: string, id: string, req: string, ts: string) => createHmac("sha256", secret).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex");

describe("mapStatus", () => {
  it("só approved vira aprovado; o resto não libera", () => {
    expect(mapStatus("approved")).toBe("aprovado");
    for (const s of ["pending", "in_process", "authorized", "in_mediation", undefined]) expect(mapStatus(s)).toBe("pendente");
    expect(mapStatus("rejected")).toBe("recusado");
    expect(mapStatus("cancelled")).toBe("cancelado");
    expect(mapStatus("expired")).toBe("cancelado");
    expect(mapStatus("refunded")).toBe("reembolsado");
    expect(mapStatus("charged_back")).toBe("reembolsado");
  });
});

describe("verifySignature", () => {
  const secret = "segredo-de-teste";
  it("aceita assinatura válida (id alfanumérico em minúsculas)", () => {
    const v1 = sign(secret, "abc123", "req-1", "1700000000");
    expect(verifySignature({ header: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "ABC123", secret })).toBe(true);
  });
  it("recusa assinatura inválida, segredo errado, id adulterado ou cabeçalho ausente", () => {
    const v1 = sign(secret, "123", "req-1", "1700000000");
    const h = `ts=1700000000,v1=${v1}`;
    expect(verifySignature({ header: h, requestId: "req-1", dataId: "123", secret })).toBe(true);
    expect(verifySignature({ header: h, requestId: "req-1", dataId: "124", secret })).toBe(false);
    expect(verifySignature({ header: h, requestId: "req-2", dataId: "123", secret })).toBe(false);
    expect(verifySignature({ header: h, requestId: "req-1", dataId: "123", secret: "outro" })).toBe(false);
    expect(verifySignature({ header: null, requestId: "req-1", dataId: "123", secret })).toBe(false);
    expect(verifySignature({ header: `ts=1,v1=zz`, requestId: "req-1", dataId: "123", secret })).toBe(false);
    expect(verifySignature({ header: h, requestId: "req-1", dataId: "123", secret: "" })).toBe(false);
  });
});

describe("accessEnd", () => {
  const now = new Date("2026-11-04T15:00:00Z");
  it("mensal soma 30 dias a partir de hoje", () => {
    expect(accessEnd("mensal", { end: null, paid: false }, now)).toBe("2026-12-04T15:00:00.000Z");
  });
  it("não perde dias: soma ao vencimento vigente", () => {
    expect(accessEnd("mensal", { end: "2026-11-20T12:00:00Z", paid: true }, now)).toBe("2026-12-20T12:00:00.000Z");
    expect(accessEnd("semestral", { end: "2026-11-20T12:00:00Z", paid: true }, now)).toBe("2027-05-20T12:00:00.000Z");
  });
  it("vencido conta a partir de hoje", () => {
    expect(accessEnd("anual", { end: "2026-01-01T00:00:00Z", paid: false }, now)).toBe("2027-11-04T15:00:00.000Z");
  });
  it("vitalício não tem vencimento, e quem já é vitalício não ganha vencimento", () => {
    expect(accessEnd("vitalicio", { end: "2026-12-01T00:00:00Z", paid: true }, now)).toBeNull();
    expect(accessEnd("mensal", { end: null, paid: true }, now)).toBeNull();
  });
});

describe("toCents", () => {
  it("converte sem erro de ponto flutuante", () => {
    expect(toCents(197)).toBe(19700);
    expect(toCents(37.0)).toBe(3700);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents("1")).toBeNull();
  });
});
