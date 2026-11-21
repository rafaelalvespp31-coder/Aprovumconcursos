import { describe, expect, it } from "vitest";
import { dataLista, hora, rotuloDia, rotuloPresenca } from "@/domain/presenca";

// 21/11/2026 17:00 em Brasília (UTC-3).
const NOW = Date.UTC(2026, 10, 21, 20, 0, 0);

describe("presença estilo WhatsApp", () => {
  it("online tem prioridade", () => expect(rotuloPresenca({ online: true, vistoEm: null }, NOW)).toBe("online"));
  it("sem registro = offline", () => {
    expect(rotuloPresenca(null, NOW)).toBe("offline");
    expect(rotuloPresenca({ online: false, vistoEm: null }, NOW)).toBe("offline");
  });
  it("visto hoje, ontem e em data antiga", () => {
    expect(rotuloPresenca({ online: false, vistoEm: "2026-11-21T17:30:00Z" }, NOW)).toBe("visto por último hoje às 14:30");
    expect(rotuloPresenca({ online: false, vistoEm: "2026-11-20T12:00:00Z" }, NOW)).toBe("visto por último ontem às 09:00");
    expect(rotuloPresenca({ online: false, vistoEm: "2026-11-12T11:00:00Z" }, NOW)).toBe("visto por último em 12/11/2026 às 08:00");
  });
  it("usa o fuso de Brasília na virada do dia", () => {
    // 02:30 UTC do dia 21 = 23:30 do dia 20 em Brasília → ontem.
    expect(rotuloPresenca({ online: false, vistoEm: "2026-11-21T02:30:00Z" }, NOW)).toBe("visto por último ontem às 23:30");
  });
  it("rótulos de dia e hora da lista", () => {
    expect(hora("2026-11-21T17:05:00Z")).toBe("14:05");
    expect(rotuloDia("2026-11-21T17:05:00Z", NOW)).toBe("Hoje");
    expect(dataLista("2026-11-21T17:05:00Z", NOW)).toBe("14:05");
    expect(dataLista("2026-11-20T15:00:00Z", NOW)).toBe("Ontem");
    expect(dataLista("2026-10-01T15:00:00Z", NOW)).toBe("01/10/2026");
  });
});
