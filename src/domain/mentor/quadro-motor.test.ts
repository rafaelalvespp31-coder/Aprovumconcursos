import { describe, expect, it } from "vitest";
import { MODELOS } from "./quadro-modelos";
import { apagar, interpretar, mesmaForma, type Medidor } from "./quadro-motor";
import { densificar, type Traco } from "./quadro-reconhecer";

const med: Medidor = () => ({ asc: 0.6, desc: 0, w: 0.6 });
const escala = (t: Traco[], s: number, ox = 0, oy = 0): Traco[] => t.map((l) => densificar(l.map(([x, y]) => [x * s + ox, y * s + oy] as [number, number]), 3));

describe("motor do quadro", () => {
  it("traço longo e torto vira linha reta horizontal", () => {
    const t: Traco = Array.from({ length: 40 }, (_, i) => [i * 6, (i % 3) - 1 + i * 0.05]);
    const r = interpretar([t], "preto", med);
    expect(r.itens).toHaveLength(1);
    const it = r.itens[0]!;
    expect(it.t).toBe("tr");
    if (it.t === "tr") { const s = it.segs[0]!; expect(s[0]![1]).toBeCloseTo(s[s.length - 1]![1], 5); }
  });
  it("traço curto na horizontal vira sinal de menos; vertical vira 1", () => {
    const h: Traco = Array.from({ length: 10 }, (_, i) => [i * 3, 0]);
    expect(interpretar([h], "azul", med).itens[0]!.t).toBe("tr");
    const v: Traco = Array.from({ length: 10 }, (_, i) => [0, i * 5]);
    const r = interpretar([v], "azul", med).itens[0]!;
    expect(r.t === "gl" && r.ch).toBe("1");
  });
  it("algarismo escrito vira o caractere", () => {
    for (const ch of ["3", "5", "8", "2"]) {
      const r = interpretar(escala(MODELOS[ch]![0]!, 80, 100, 100), "preto", med).itens[0]!;
      expect(r.t === "gl" && r.ch).toBe(ch);
    }
  });
  it("símbolo '=' de dois traços vira duas linhas retas", () => {
    const r = interpretar(escala(MODELOS["="]![0]!, 70, 50, 50), "vermelho", med);
    expect(r.reconhecido).toBe(true);
    expect(r.itens[0]!.t === "tr" && r.itens[0]!.segs.length).toBe(2);
  });
  it("rabisco sem forma fica como traço alisado", () => {
    const rab: Traco = Array.from({ length: 60 }, (_, i) => [Math.sin(i * 0.9) * 40 + i, Math.cos(i * 1.7) * 35]);
    const r = interpretar([rab], "preto", med);
    expect(r.itens.length).toBe(1);
    expect(r.itens[0]!.t).toBe("tr");
  });
  it("borracha corta só o pedaço tocado do traço", () => {
    const linha = interpretar([Array.from({ length: 40 }, (_, i) => [i * 6, 0] as [number, number])], "preto", med).itens;
    const { itens, mudou } = apagar(linha, 120, 0, 12);
    expect(mudou).toBe(true);
    const it = itens[0]!;
    expect(it.t === "tr" && it.segs.length).toBe(2);
  });
  it("borracha remove o caractere inteiro", () => {
    const g = interpretar(escala(MODELOS["7"]![0]!, 80, 100, 100), "preto", med).itens;
    const { itens } = apagar(g, 140, 140, 14);
    expect(itens).toHaveLength(0);
  });

  it("junta os traços de um mesmo símbolo, mas não dois algarismos vizinhos", () => {
    const mais = escala(MODELOS["+"]![0]!, 60, 100, 100);
    expect(mesmaForma([mais[0]!], mais[1]!)).toBe(true);
    expect(mesmaForma([mais[1]!], mais[0]!)).toBe(true);
    const igual = escala(MODELOS["="]![0]!, 60, 100, 100);
    expect(mesmaForma([igual[0]!], igual[1]!)).toBe(true);
    const quatro = escala(MODELOS["4"]![0]!, 60, 100, 100);
    expect(mesmaForma([quatro[0]!], quatro[1]!)).toBe(true);
    for (const [a, b] of [["1", "2"], ["3", "4"], ["4", "6"], ["2", "5"], ["7", "8"], ["1", "1"]] as const) {
      const A = escala(MODELOS[a]![0]!, 48, 100, 100), B = escala(MODELOS[b]![0]!, 48, 160, 100);
      expect(mesmaForma(A, B[0]!), a + b).toBe(false);
    }
  });
});
