import { describe, expect, it } from "vitest";
import { devePerguntar, enviarSchema, evolucaoMensal, porAula, resumoGeral, type FeedbackLinha } from "./feedback";

const U = "6f1c2d4e-1b2a-4c3d-8e9f-0a1b2c3d4e5f";
const linha = (o: Partial<FeedbackLinha>): FeedbackLinha => ({ id: "x", rating: 5, comment: null, lessonId: U, lessonTitle: "A", subject: "Penal", createdAt: "2026-11-07T10:00:00Z", ...o });

describe("enviarSchema", () => {
  it("aceita só a nota e normaliza comentário vazio", () => {
    expect(enviarSchema.parse({ lessonId: U, rating: 4, comment: "   " }).comment).toBeNull();
    expect(enviarSchema.parse({ lessonId: U, rating: 5 }).comment).toBeNull();
  });
  it("aceita as cinco notas e rejeita fora de 1–5", () => {
    for (const n of [1, 2, 3, 4, 5]) expect(enviarSchema.safeParse({ lessonId: U, rating: n }).success).toBe(true);
    for (const n of [0, 6, 2.5, -1]) expect(enviarSchema.safeParse({ lessonId: U, rating: n }).success).toBe(false);
  });
  it("limita o comentário a 500 caracteres", () => {
    expect(enviarSchema.safeParse({ lessonId: U, rating: 3, comment: "a".repeat(500) }).success).toBe(true);
    expect(enviarSchema.safeParse({ lessonId: U, rating: 3, comment: "a".repeat(501) }).success).toBe(false);
  });
});

describe("devePerguntar", () => {
  const agora = new Date("2026-11-07T12:00:00Z");
  it("pergunta quando nunca respondeu; nunca depois de enviar", () => {
    expect(devePerguntar({ status: "nenhum", skips: 0, lastSkippedAt: null }, agora)).toBe(true);
    expect(devePerguntar({ status: "enviado", skips: 0, lastSkippedAt: null }, agora)).toBe(false);
  });
  it("após dispensar, espera 24h e para após 3 dispensas", () => {
    expect(devePerguntar({ status: "dispensado", skips: 1, lastSkippedAt: "2026-11-07T11:00:00Z" }, agora)).toBe(false);
    expect(devePerguntar({ status: "dispensado", skips: 1, lastSkippedAt: "2026-11-06T11:00:00Z" }, agora)).toBe(true);
    expect(devePerguntar({ status: "dispensado", skips: 3, lastSkippedAt: "2026-10-01T11:00:00Z" }, agora)).toBe(false);
  });
});

describe("análises", () => {
  const rows = [linha({ rating: 1 }), linha({ rating: 2 }), linha({ rating: 2 }), linha({ rating: 5, lessonId: "b", lessonTitle: "B" })];
  it("resume totais e faixas", () => {
    expect(resumoGeral(rows)).toEqual({ total: 4, media: 2.5, cinco: 1, quatro: 0, tres: 0, baixas: 3 });
    expect(resumoGeral([])).toMatchObject({ total: 0, media: null });
  });
  it("alerta só com média baixa e amostra mínima", () => {
    const g = porAula(rows);
    expect(g.find((x) => x.rotulo === "A")).toMatchObject({ total: 3, alerta: true });
    expect(g.find((x) => x.rotulo === "B")?.alerta).toBe(false);
    expect(porAula([linha({ rating: 1 })])[0]!.alerta).toBe(false);
  });
  it("evolui por mês", () => {
    expect(evolucaoMensal([linha({ createdAt: "2026-10-01T00:00:00Z", rating: 4 }), linha({ createdAt: "2026-11-01T00:00:00Z", rating: 2 })])).toEqual([
      { mes: "2026-10", total: 1, media: 4 },
      { mes: "2026-11", total: 1, media: 2 },
    ]);
  });
});

import { filtrarFeedbacks } from "./feedback";
describe("filtrarFeedbacks", () => {
  const rows = [
    { ...linha({ id: "1", rating: 5, comment: "Ótima explicação", lessonTitle: "Princípios", subject: "Penal", createdAt: "2026-11-07T10:00:00Z" }), studentName: "João da Silva", studentEmail: "j@x.com" },
    { ...linha({ id: "2", rating: 2, comment: null, lessonTitle: "MMC", subject: "Matemática", createdAt: "2026-10-01T10:00:00Z" }), studentName: "Maria", studentEmail: "m@x.com" },
  ];
  it("filtra por busca (sem acento), nota, matéria, comentário e período", () => {
    expect(filtrarFeedbacks(rows, { q: "joao" }).map((r) => r.id)).toEqual(["1"]);
    expect(filtrarFeedbacks(rows, { q: "otima" }).map((r) => r.id)).toEqual(["1"]);
    expect(filtrarFeedbacks(rows, { nota: 2 }).map((r) => r.id)).toEqual(["2"]);
    expect(filtrarFeedbacks(rows, { materia: "Penal" }).map((r) => r.id)).toEqual(["1"]);
    expect(filtrarFeedbacks(rows, { comentario: "sem" }).map((r) => r.id)).toEqual(["2"]);
    expect(filtrarFeedbacks(rows, { de: "2026-11-01" }).map((r) => r.id)).toEqual(["1"]);
    expect(filtrarFeedbacks(rows, { ate: "2026-10-31" }).map((r) => r.id)).toEqual(["2"]);
    expect(filtrarFeedbacks(rows, {}).length).toBe(2);
  });
});
