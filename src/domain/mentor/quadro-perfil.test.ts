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
