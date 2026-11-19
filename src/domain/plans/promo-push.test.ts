import { describe, expect, it } from "vitest";
import { mensagensPlanos } from "./promo-push";
describe("convite aos planos por push", () => {
  const m = mensagensPlanos();
  it("sempre cita valores da tabela oficial e cabe na notificação", () => {
    for (const x of m) {
      expect(x.body).toMatch(/R\$ \d/);
      expect(x.title.length).toBeLessThanOrEqual(80);
      expect(x.body.length).toBeLessThanOrEqual(220);
    }
  });
  it("tem variações", () => expect(new Set(m.map((x) => x.body)).size).toBe(m.length));
});
