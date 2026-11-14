import { describe, expect, it } from "vitest";
import { splitTreeMap } from "./tree-map";

const md = "ESTRUTURA GERAL:\n\nBUSCA E APREENSÃO\n|\n|-- 1. Quanto ao local\n|     |-- Domiciliar\n|     |-- Pessoal\n|\n|-- 2. Quanto à finalidade\n|     |-- Localizar vítimas\n|\n|-- 3. Resultado\n      |-- Apreensão\n\nATENÇÃO:\nTexto.";

describe("mapa mental em árvore de texto", () => {
  it("vira raiz + ramos + filhos e preserva o texto ao redor", () => {
    const t = splitTreeMap(md)!;
    expect(t.root).toBe("BUSCA E APREENSÃO");
    expect(t.before).toBe("ESTRUTURA GERAL:");
    expect(t.nodes.map((n) => n.label)).toEqual(["1. Quanto ao local", "2. Quanto à finalidade", "3. Resultado"]);
    expect(t.nodes[0]!.children.map((c) => c.label)).toEqual(["Domiciliar", "Pessoal"]);
    expect(t.nodes[2]!.children[0]!.label).toBe("Apreensão");
    expect(t.after).toBe("ATENÇÃO:\nTexto.");
  });
  it("ignora tabelas e texto comum", () => {
    expect(splitTreeMap("| a | b |\n|---|---|\n| 1 | 2 |")).toBeNull();
    expect(splitTreeMap("só texto\n\noutro")).toBeNull();
  });
});
