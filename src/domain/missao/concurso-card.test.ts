import { describe, expect, it } from "vitest";
import { chipDoConcurso, formatarData, formatarVagas, quandoDoConcurso } from "./concurso-card";

describe("cartão de concurso", () => {
  it("formata datas e vagas em português", () => {
    expect(formatarData("2026-03-15")).toBe("15/03/2026");
    expect(formatarData(null)).toBeNull();
    expect(formatarVagas(1000)).toBe("1.000 vagas");
    expect(formatarVagas(1)).toBe("1 vaga");
  });
  it("o destaque da equipe vem antes da situação", () => {
    expect(chipDoConcurso({ destaque: true, situacao: "previsto" })).toEqual({ texto: "Destaque", tipo: "destaque" });
    expect(chipDoConcurso({ destaque: false, situacao: "inscricoes_abertas" }).tipo).toBe("verde");
    expect(chipDoConcurso({ destaque: false, situacao: "previsto" })).toEqual({ texto: "Em breve", tipo: "relogio" });
  });
  it("a linha de data usa só o que está cadastrado", () => {
    expect(quandoDoConcurso({ situacao: "inscricoes_abertas", provaEm: null, inscricaoAte: "2026-12-12" })).toBe("Inscrições até 12/12/2026");
    expect(quandoDoConcurso({ situacao: "edital_publicado", provaEm: "2027-02-01", inscricaoAte: null })).toBe("Prova 01/02/2027");
    expect(quandoDoConcurso({ situacao: "previsto", provaEm: null, inscricaoAte: null })).toBe("Edital em breve");
    expect(quandoDoConcurso({ situacao: "prova_realizada", provaEm: "2025-01-01", inscricaoAte: null })).toBe("Prova realizada");
  });
});
