import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../observability", () => ({ logEvent: vi.fn(async () => undefined) }));

const gerar = vi.fn();
vi.mock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent: gerar }; } }));

import { lerComEspecialista } from "./edital-especialista";

const PAGINAS = [
  "EDITAL 01/2026 POLÍCIA CIVIL DE MINAS GERAIS. Cargos: Investigador de Polícia I; Escrivão de Polícia I.",
  "ANEXO II CONTEÚDO PROGRAMÁTICO\nLÍNGUA PORTUGUESA\n1 Compreensão e interpretação de textos. 2 Emprego das classes de palavras.\nDIREITO PENAL\n1 Princípios básicos. 2 Aplicação da lei penal.",
];
const resp = (o: unknown) => ({ text: JSON.stringify(o) });
const identificacao = (extra: Record<string, unknown> = {}) => resp({ concurso: "PC MG", cargos: ["Investigador de Polícia I", "Escrivão de Polícia I"], cargo_usado: "Investigador de Polícia I", pagina_inicio: 2, pagina_fim: 2, disciplinas: [{ nome: "LÍNGUA PORTUGUESA", pagina: 2 }, { nome: "DIREITO PENAL", pagina: 2 }], ...extra });

beforeEach(() => { gerar.mockReset(); process.env.GEMINI_API_KEY = "k"; delete process.env.GEMINI_EDITAL_MODEL; });

describe("lerComEspecialista", () => {
  it("sem chave da IA: não chama o Gemini e deixa a leitura estrutural seguir", async () => {
    delete process.env.GEMINI_API_KEY;
    expect(await lerComEspecialista(PAGINAS, null)).toEqual({ ok: false, motivo: "sem_chave" });
    expect(gerar).not.toHaveBeenCalled();
  });

  it("lê o edital inteiro (etapa 1) e separa os tópicos de cada matéria (etapa 2), conferidos no texto", async () => {
    gerar.mockImplementation(async ({ contents }: { contents: string }) => {
      if (contents.includes("Leia o edital INTEIRO")) { expect(contents).toContain("[[PÁGINA 1]]"); expect(contents).toContain("[[PÁGINA 2]]"); return identificacao(); }
      if (contents.includes('"LÍNGUA PORTUGUESA"')) return resp({ topicos: [{ codigo: "1", nivel: 1, titulo: "Compreensão e interpretação de textos" }, { codigo: "2", nivel: 1, titulo: "Emprego das classes de palavras" }] });
      return resp({ topicos: [{ codigo: "1", nivel: 1, titulo: "Princípios básicos" }, { codigo: "2", nivel: 1, titulo: "Aplicação da lei penal" }] });
    });
    const r = await lerComEspecialista(PAGINAS, "Investigador de Polícia I");
    expect(r.ok).toBe(true);
    if (!r.ok || !r.parsed) throw new Error("esperava estrutura");
    expect(r.parsed.disciplines.map((d) => [d.name, d.topics.length])).toEqual([["LÍNGUA PORTUGUESA", 2], ["DIREITO PENAL", 2]]);
    expect(r.ancoragem).toBe(1);
    expect(r.info.concurso).toBe("PC MG");
    expect(gerar).toHaveBeenCalledTimes(3); // 1 leitura do edital + 1 por matéria
  });

  it("descarta tópico inventado e, se a leitura não bate com o edital, devolve falha (nada inventado entra)", async () => {
    gerar.mockImplementation(async ({ contents }: { contents: string }) => contents.includes("Leia o edital INTEIRO") ? identificacao() : resp({ topicos: [{ codigo: "1", nivel: 1, titulo: "Mecânica quântica aplicada à perícia" }, { codigo: "2", nivel: 1, titulo: "Astrofísica de partículas" }] }));
    const r = await lerComEspecialista(PAGINAS, "Investigador de Polícia I");
    expect(r).toEqual({ ok: false, motivo: "ancoragem_baixa" });
  });

  it("vários cargos com conteúdo diferente e cargo não informado: pede o cargo ao aluno", async () => {
    gerar.mockResolvedValueOnce(identificacao({ disciplinas: [], cargo_usado: null }));
    const r = await lerComEspecialista(PAGINAS, null);
    expect(r.ok && r.precisaCargo).toBe(true);
    expect(r.ok && r.info.cargos).toEqual(["Investigador de Polícia I", "Escrivão de Polícia I"]);
    expect(gerar).toHaveBeenCalledTimes(1);
  });

  it("modelo indisponível: tenta o seguinte; resposta inválida em todos: falha sem derrubar", async () => {
    gerar.mockRejectedValueOnce(new Error("404 model not found")).mockImplementation(async ({ contents }: { contents: string }) => contents.includes("Leia o edital INTEIRO") ? identificacao() : resp({ topicos: [{ codigo: "1", nivel: 1, titulo: "Princípios básicos" }, { codigo: "1", nivel: 1, titulo: "Compreensão e interpretação de textos" }] }));
    const r = await lerComEspecialista(PAGINAS, "Investigador de Polícia I");
    expect(r.ok).toBe(true);
    expect(gerar.mock.calls[0]![0].model).not.toBe(gerar.mock.calls[1]![0].model);

    gerar.mockReset();
    gerar.mockResolvedValue({ text: "isto não é json" });
    expect(await lerComEspecialista(PAGINAS, null)).toMatchObject({ ok: false });
  });

  it("falha numa matéria na etapa 2: não aceita estrutura incompleta", async () => {
    gerar.mockImplementation(async ({ contents }: { contents: string }) => {
      if (contents.includes("Leia o edital INTEIRO")) return identificacao();
      if (contents.includes('"DIREITO PENAL"')) throw new Error("503 sobrecarga");
      return resp({ topicos: [{ codigo: "1", nivel: 1, titulo: "Compreensão e interpretação de textos" }] });
    });
    const r = await lerComEspecialista(PAGINAS, "Investigador de Polícia I");
    expect(r.ok).toBe(false);
  });
});
