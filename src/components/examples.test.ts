import { describe, expect, it } from "vitest";
import { parseExamples } from "./examples";

describe("exemplos interativos", () => {
  it("separa casos com situação e resposta (formato do catálogo)", () => {
    const md = "**Caso 1 — Briga no bar.** João mata Pedro por R$ 10.\n→ Homicídio **qualificado por motivo fútil**.\n\n**Caso 2 — Tocaia.** Lia espera escondida.\n→ Emboscada (§ 2º, IV).";
    expect(parseExamples(md)).toEqual([
      { title: "Briga no bar", situation: "João mata Pedro por R$ 10.", answer: "Homicídio **qualificado por motivo fútil**." },
      { title: "Tocaia", situation: "Lia espera escondida.", answer: "Emboscada (§ 2º, IV)." },
    ]);
  });
  it("lista vira um card por item; nada é descartado", () => {
    const md = "- **Anulação:** licença com documento falso.\n- **Revogação:** autorização retirada.";
    const r = parseExamples(md);
    expect(r.map((c) => c.title)).toEqual(["Anulação", "Revogação"]);
    expect(r[0]!.situation).toBe("licença com documento falso.");
    expect(r.every((c) => c.answer === "")).toBe(true);
    expect(parseExamples("Texto solto sem marcação.")).toEqual([{ title: "", situation: "Texto solto sem marcação.", answer: "" }]);
  });
});
