import { describe, expect, it } from "vitest";
import { MODELOS } from "./quadro-modelos";
import { alisar, densificar, reconhecer, retidao, type Traco } from "./quadro-reconhecer";

/** Gerador pseudo-aleatório determinístico. */
function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

/** Simula a mão: reamostra, inclina, escala, treme e muda o tamanho. */
function mao(tracos: Traco[], r: () => number, tremor: number): Traco[] {
  const inc = (r() - 0.5) * 0.35, esc = 60 + r() * 80, sx = 0.85 + r() * 0.3;
  return tracos.map((t) => densificar(t.map(([x, y]) => [x * esc * sx, y * esc] as [number, number]), 3).map(([x, y]) => [x + y * inc + (r() - 0.5) * tremor * esc, y + (r() - 0.5) * tremor * esc] as [number, number]));
}

describe("reconhecedor do quadro", () => {
  it("reconhece algarismos e sinais escritos com tremor", () => {
    const r = rng(7);
    const alvo = "0123456789+=()/.,%<>x".split("");
    let ok = 0, tot = 0; const erros: string[] = [];
    for (const ch of alvo) {
      for (const v of MODELOS[ch]!) {
        for (let k = 0; k < 4; k++) {
          tot++;
          const p = reconhecer(mao(v, r, 0.05), 1)[0];
          if (p?.ch === ch) ok++; else erros.push(`${ch}→${p?.ch}`);
        }
      }
    }
    expect(ok / tot).toBeGreaterThan(0.93);
    console.log("acerto", (ok / tot).toFixed(3), tot, erros.slice(0, 30).join(" "));
  });
  it("modelos de algarismos casam com distância pequena", () => {
    const r = rng(3);
    const d = reconhecer(mao(MODELOS["7"]![0]!, r, 0.04), 1)[0]!;
    expect(d.ch).toBe("7");
    expect(d.dist).toBeLessThan(0.6);
  });
  it("retidão e alisamento", () => {
    const reta: Traco = Array.from({ length: 20 }, (_, i) => [i * 5, 0]);
    expect(retidao(reta)).toBeGreaterThan(0.99);
    const tremida: Traco = reta.map(([x], i) => [x, i % 2 ? 2 : -2]);
    const a = alisar(tremida);
    const amp = (t: Traco) => Math.max(...t.slice(1, -1).map((p) => Math.abs(p[1])));
    expect(amp(a)).toBeLessThan(amp(tremida));
  });
});
