import { describe, expect, it } from "vitest";
import { MODELOS } from "./quadro-modelos";
import { interpretar, type Medidor } from "./quadro-motor";
import { perfilDaAula } from "./quadro-perfil";
import { densificar, type Traco } from "./quadro-reconhecer";

const med: Medidor = () => ({ asc: 0.7, desc: 0, w: 0.6 });
const escala = (t: Traco[], s: number, ox = 0, oy = 0): Traco[] => t.map((l) => densificar(l.map(([x, y]) => [x * s + ox, y * s + oy] as [number, number]), 3));

describe("perfil da lousa por aula", () => {
  it("detecta o assunto", () => {
    expect(perfilDaAula({ aula: "MMC e MDC", materia: "Matemática" })).toMatchObject({ modo: "calculo", xVezes: true });
    expect(perfilDaAula({ aula: "Regra de três simples" })).toMatchObject({ modo: "calculo", xVezes: false });
    expect(perfilDaAula({ aula: "Princípios da Administração", materia: "Direito Administrativo" }).modo).toBe("texto");
  });
  it("tudo sai do tamanho da primeira escrita", () => {
    const a = interpretar(escala(MODELOS["7"]![0]!, 40, 100, 100), "azul", med);
    expect(a.ref).toBeGreaterThan(0);
    // segundo algarismo escrito bem maior: sai igual ao primeiro
    const b = interpretar(escala(MODELOS["3"]![0]!, 120, 300, 100), "azul", med, a.itens, { ref: a.ref });
    const g1 = a.itens[0]!, g2 = b.itens[0]!;
    expect(g1.t === "gl" && g2.t === "gl" && g2.size).toBe(a.ref);
    expect(b.ref).toBeUndefined();
  });
  it("sinal de menos escrito grande acompanha o tamanho dos números", () => {
    const h: Traco = Array.from({ length: 30 }, (_, i) => [i * 2, 0]); // 58px
    const r = interpretar([h], "azul", med, [], { ref: 40 });
    const it = r.itens[0]!;
    // h0 = 28; 58 > 1.25*28 => linha longa mantida; um traço de 20px vira menos normalizado
    expect(it.t).toBe("tr");
    const c: Traco = Array.from({ length: 10 }, (_, i) => [i * 2, 0]);
    const r2 = interpretar([c], "azul", med, [], { ref: 40 });
    const s = r2.itens[0]!;
    if (s.t === "tr") { const p = s.segs[0]!; expect(Math.abs(p[p.length - 1]![0] - p[0]![0])).toBeCloseTo(0.62 * 28, 0); }
  });
});

describe("desenho x caractere", () => {
  const calc = perfilDaAula({ aula: "MMC e MDC" });
  it("o ajuste do assunto não transforma rabisco em número", () => {
    const rabisco: Traco = Array.from({ length: 60 }, (_, i) => [100 + Math.sin(i * 0.9) * 30 + i, 100 + Math.cos(i * 2.3) * 25]);
    const r = interpretar([rabisco], "azul", med, [], { ref: 40, perfil: calc });
    expect(r.itens[0]!.t).toBe("tr");
  });
  it("desenho grande (estrela) continua desenho", () => {
    const pts: Traco = [];
    for (let i = 0; i <= 5; i++) { const a = (i * 4 * Math.PI) / 5 - Math.PI / 2; pts.push([300 + 90 * Math.cos(a), 300 + 90 * Math.sin(a)]); }
    const r = interpretar([densificar(pts, 3)], "azul", med, [], { ref: 40, perfil: calc });
    expect(r.itens[0]!.t).toBe("tr");
  });
});

describe("reconhecimento de algarismos com o perfil da aula", () => {
  it("acerta a grande maioria de 0-9 tremidos, tortos e fora de tamanho", () => {
    const calc = perfilDaAula({ aula: "MMC e MDC" });
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
    let ok = 0, tot = 0;
    for (const d of "0123456789") for (const v of MODELOS[d]!) for (let k = 0; k < 6; k++) {
      const s = 34 + rnd() * 20, rot = rnd() * 0.35, sx = 0.85 + rnd() * 0.3;
      const t = v.map((l) => densificar(l.map(([x, y]) => [(x * Math.cos(rot) - y * Math.sin(rot)) * s * sx + 200 + rnd() * 2.5, (x * Math.sin(rot) + y * Math.cos(rot)) * s + 200 + rnd() * 2.5] as [number, number]), 3));
      const viz = d === "1" ? [interpretar(escala(MODELOS["5"]![0]!, 40, 120, 200), "azul", med).itens[0]!] : [];
      const r = interpretar(t, "azul", med, viz, { ref: 40, perfil: calc });
      tot++; if (r.itens[0]!.t === "gl" && (r.itens[0] as { ch: string }).ch === d) ok++;
    }
    console.log("acerto", ok, "/", tot);
    expect(ok / tot).toBeGreaterThan(0.85);
  });
});
