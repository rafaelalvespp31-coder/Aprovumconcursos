import { describe, expect, it } from "vitest";
import { AVISO_KINDS, MOTIVACAO, NOVIDADES, horaBr, montarAgenda } from "./avisos-agenda";

const base = { intervalo: 1, horaIni: 9, horaFim: 20, elegiveis: AVISO_KINDS, frases: MOTIVACAO.length, dicas: NOVIDADES.length };

describe("agenda de avisos automáticos", () => {
  it("um aviso por hora na janela, alternando motivação e informação", () => {
    const a = montarAgenda(base);
    expect(a.map((s) => s.hour)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    a.forEach((s, i) => expect(s.kind === "motivacao").toBe(i % 2 === 0));
  });
  it("conteúdo (concursos, revisões, planos, Mentor) sai no máximo uma vez por dia; o resto são dicas", () => {
    for (let i = 0; i < 200; i++) {
      const a = montarAgenda(base);
      const info = a.filter((s) => s.kind !== "motivacao");
      expect(info).toHaveLength(6);
      for (const k of ["concursos", "revisoes", "planos", "mentor"] as const) expect(info.filter((s) => s.kind === k).length).toBeLessThanOrEqual(1);
      expect(info.filter((s) => s.kind === "novidades")).toHaveLength(2);
    }
  });
  it("não repete a mesma frase nem a mesma dica no dia", () => {
    for (let i = 0; i < 200; i++) {
      const a = montarAgenda(base);
      const f = a.filter((s) => s.kind === "motivacao").map((s) => s.variant);
      expect(new Set(f).size).toBe(f.length);
      const d = a.filter((s) => s.kind === "novidades").map((s) => s.variant);
      expect(new Set(d).size).toBe(d.length);
    }
  });
  it("sem concurso aberto, o aviso de concursos não entra; intervalo maior reduz a quantidade", () => {
    const sem = AVISO_KINDS.filter((k) => k !== "concursos");
    for (let i = 0; i < 100; i++) expect(montarAgenda({ ...base, elegiveis: sem }).some((s) => s.kind === "concursos")).toBe(false);
    expect(montarAgenda({ ...base, intervalo: 3 }).map((s) => s.hour)).toEqual([9, 12, 15, 18]);
  });
  it("varia de um dia para o outro e é reproduzível com o mesmo sorteio", () => {
    const seq = (s: number) => { let x = s; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };
    expect(montarAgenda(base, seq(1))).toEqual(montarAgenda(base, seq(1)));
    expect(JSON.stringify(montarAgenda(base, seq(1)))).not.toBe(JSON.stringify(montarAgenda(base, seq(7))));
  });
  it("hora em Brasília", () => {
    expect(horaBr(new Date("2026-11-20T12:30:00Z"))).toBe(9);
    expect(horaBr(new Date("2026-11-20T02:59:00Z"))).toBe(23);
    expect(horaBr(new Date("2026-11-20T03:00:00Z"))).toBe(0);
  });
  it("textos cabem na notificação e levam a uma tela do app", () => {
    for (const n of NOVIDADES) { expect(n.title.length).toBeLessThanOrEqual(40); expect(n.body.length).toBeLessThanOrEqual(120); expect(n.url).toMatch(/^\//); }
    for (const m of MOTIVACAO) { expect(m.title.length).toBeLessThanOrEqual(40); expect(m.body.length).toBeLessThanOrEqual(130); }
    expect(MOTIVACAO.length).toBeGreaterThanOrEqual(12);
  });
});
