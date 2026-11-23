import { describe, expect, it } from "vitest";
import { alvoDaFase, REPOUSO, suavizar, suavizarAudio } from "./estado-mentor";
import { nivelAbaixo, nivelInicial, qualidadeDe } from "./qualidade";

describe("alvoDaFase", () => {
  it("repouso é o estado de referência", () => {
    expect(alvoDaFase("repouso")).toEqual(REPOUSO);
  });
  it("escutando acende um pouco a esfera e acelera as partículas", () => {
    const a = alvoDaFase("escutando");
    expect(a.brilho).toBeGreaterThan(REPOUSO.brilho);
    expect(a.rapidez).toBeGreaterThan(REPOUSO.rapidez);
    expect(a.brilho).toBeLessThan(1.3);
  });
  it("processando põe as partículas em espiral", () => {
    const a = alvoDaFase("processando");
    expect(a.espiral).toBeGreaterThan(0.5);
  });
  it("respondendo acompanha a intensidade real do áudio, de forma moderada e sem emitir faíscas", () => {
    const quieto = alvoDaFase("respondendo", 0);
    const alto = alvoDaFase("respondendo", 1);
    expect(alto.brilho).toBeGreaterThan(quieto.brilho);
    expect(alto.brilho - quieto.brilho).toBeLessThan(0.4);
    expect(alto.faiscas).toBe(quieto.faiscas);
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

describe("suavizarAudio", () => {
  it("sobe e desce sem saltos: um pico curto não passa de metade", () => {
    let a = 0;
    a = suavizarAudio(a, 1, 1 / 60);
    expect(a).toBeLessThan(0.15);
    for (let i = 0; i < 6; i++) a = suavizarAudio(a, 1, 1 / 60);
    const pico = a;
    for (let i = 0; i < 6; i++) a = suavizarAudio(a, 0, 1 / 60);
    expect(a).toBeLessThan(pico);
    expect(a).toBeGreaterThan(pico * 0.4);
  });
  it("solta mais devagar do que sobe", () => {
    const sobe = suavizarAudio(0, 1, 0.1);
    const desce = 1 - suavizarAudio(1, 0, 0.1);
    expect(desce).toBeLessThan(sobe);
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
