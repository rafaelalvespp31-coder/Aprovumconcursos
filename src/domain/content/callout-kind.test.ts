import { describe, expect, it } from "vitest";
import { calloutKindOf, leadingLabelKind } from "./callout-kind";

describe("tipo de explicação", () => {
  it("reconhece o rótulo que abre o trecho", () => {
    expect(calloutKindOf("**Pegadinha:** a banca troca…")).toBe("pegadinha");
    expect(calloutKindOf("Atenção: não confunda")).toBe("atencao");
    expect(calloutKindOf("Observação — vale também")).toBe("observacao");
    expect(calloutKindOf("Súmula 593 do STJ")).toBe("jurisprudencia");
    expect(calloutKindOf("Um texto qualquer")).toBeNull();
  });
  it("só trata parágrafo como nota quando abre com rótulo", () => {
    expect(leadingLabelKind("Pegadinha: a banca troca o prazo.")).toBe("pegadinha");
    expect(leadingLabelKind("A pena é aumentada de um terço.")).toBeNull();
    expect(leadingLabelKind("Dica: decore a sigla")).toBe("dica");
  });
});
