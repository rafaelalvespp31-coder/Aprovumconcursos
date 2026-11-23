import { describe, expect, it } from "vitest";
import { alvoDaFase, REPOUSO, suavizar } from "./estado-mentor";
import { nivelAbaixo, nivelInicial, qualidadeDe } from "./qualidade";

describe("alvoDaFase", () => {
  it("repouso é o estado de referência", () => {
    expect(alvoDaFase("repouso")).toEqual(REPOUSO);
  });
  it("escutando acende mais a esfera, acelera as partículas e abre ondas", () => {
    const a = alvoDaFase("escutando");
    expect(a.brilho).toBeGreaterThan(REPOUSO.brilho);
    expect(a.rapidez).toBeGreaterThan(REPOUSO.rapidez);
    expect(a.ondas).toBeGreaterThan(0);
  });
  it("processando põe as partículas em espiral e multiplica as faíscas", () => {
    const a = alvoDaFase("processando");
    expect(a.espiral).toBe(1);
    expect(a.faiscas).toBeGreaterThan(2);
  });
  it("respondendo reage à intensidade real do áudio", () => {
    const quieto = alvoDaFase("respondendo", 0);
    const alto = alvoDaFase("respondendo", 1);
    expect(alto.brilho).toBeGreaterThan(quieto.brilho);
    expect(alto.pulso).toBeGreaterThan(quieto.pulso);
    expect(alto.faiscas).toBeGreaterThan(quieto.faiscas);
  });
  it("erro apaga a esfera e desacelera, mas a atmosfera segue", () => {
    const a = alvoDaFase("erro");
    expect(a.brilho).toBeLessThan(REPOUSO.brilho);
    expect(a.rapidez).toBeLessThan(REPOUSO.rapidez);
    expect(a.brasas).toBeGreaterThan(0);
  });
  it("o áudio fora do intervalo é limitado", () => {
    expect(alvoDaFase("respondendo", 9).brilho).toBeCloseTo(alvoDaFase("respondendo", 1).brilho);
  });
});

describe("suavizar", () => {
  it("volta ao repouso aos poucos, sem salto", () => {
    const alvo = alvoDaFase("processando");
    let a = { ...alvo };
    a = suavizar(a, REPOUSO, 0.1);
    expect(a.brilho).toBeLessThan(alvo.brilho);
    expect(a.brilho).toBeGreaterThan(REPOUSO.brilho);
    for (let i = 0; i < 200; i++) a = suavizar(a, REPOUSO, 0.05);
    expect(a.brilho).toBeCloseTo(REPOUSO.brilho, 2);
  });
  it("sem tempo decorrido nada muda", () => {
    const a = alvoDaFase("escutando");
    expect(suavizar(a, REPOUSO, 0)).toEqual(a);
  });
});

describe("qualidade", () => {
  it("celular fraco começa em baixa, comum em média, desktop em alta", () => {
    expect(nivelInicial({ toqueGrosso: true, larguraTela: 390, memoria: 2, nucleos: 4 })).toBe("baixa");
    expect(nivelInicial({ toqueGrosso: true, larguraTela: 390, memoria: 8, nucleos: 8 })).toBe("media");
    expect(nivelInicial({ toqueGrosso: false, larguraTela: 1440, memoria: 8, nucleos: 12 })).toBe("alta");
    expect(nivelInicial({ toqueGrosso: false, larguraTela: 1440, memoria: 2, nucleos: 2 })).toBe("media");
  });
  it("os níveis reduzem partículas e resolução", () => {
    const a = qualidadeDe("alta"), b = qualidadeDe("baixa");
    expect(b.orbParticulas).toBeLessThan(a.orbParticulas);
    expect(b.brasasFundo).toBeLessThan(a.brasasFundo);
    expect(b.dpr).toBeLessThanOrEqual(a.dpr);
  });
  it("nivelAbaixo desce até o fim", () => {
    expect(nivelAbaixo("alta")).toBe("media");
    expect(nivelAbaixo("media")).toBe("baixa");
    expect(nivelAbaixo("baixa")).toBeNull();
  });
});
