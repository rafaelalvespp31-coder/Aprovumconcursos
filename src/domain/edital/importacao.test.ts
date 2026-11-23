import { describe, expect, it } from "vitest";
import { COMANDO_CHATGPT, comandoParaCargo, objetosJson, validarImportacao } from "./importacao";

const base = {
  versao: 1,
  concurso: { nome: "Polícia Penal MG", orgao: "SEJUSP", cargo: "Policial Penal", banca: "Consulplan", ano: 2026 },
  materias: [
    { nome: "LÍNGUA PORTUGUESA", itens_no_edital: 3, topicos: [{ codigo: "1", titulo: "Compreensão e interpretação de textos", subtopicos: [{ codigo: "1.1", titulo: "Tipologia textual" }] }, { codigo: "2", titulo: "Ortografia" }] },
    { nome: "INFORMÁTICA", topicos: [{ codigo: "", titulo: "Conceito de internet e intranet" }] },
  ],
};

describe("objetosJson", () => {
  it("acha o JSON em meio a conversa e cercas de código", () => {
    const t = "Claro! Aqui está:\n```json\n" + JSON.stringify(base) + "\n```\nQualquer ajuste, me avise.";
    expect(objetosJson(t)).toHaveLength(1);
  });
  it("ignora chaves dentro de textos", () => {
    const o = '{"a":"texto com } e { dentro","b":1}';
    expect(objetosJson(`x ${o} y`)).toEqual([o]);
  });
  it("acha várias partes", () => {
    expect(objetosJson('{"a":1} e depois {"b":2}')).toHaveLength(2);
  });
});

describe("validarImportacao", () => {
  it("converte para matérias › tópicos com nível e modo", () => {
    const r = validarImportacao(JSON.stringify(base));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resumo).toEqual({ materias: 2, topicos: 4, porMateria: [{ nome: "LÍNGUA PORTUGUESA", topicos: 3 }, { nome: "INFORMÁTICA", topicos: 1 }] });
    const lp = r.parsed.disciplines[0]!;
    expect(lp.mode).toBe("lingua_portuguesa");
    expect(lp.topics.map((t) => [t.code, t.depth])).toEqual([["1", 1], ["1.1", 2], ["2", 1]]);
    expect(r.parsed.disciplines[1]!.topics[0]!.code).toBeNull();
    expect(r.info).toEqual({ nome: "Polícia Penal MG", orgao: "SEJUSP", cargo: "Policial Penal", banca: "Consulplan", ano: 2026 });
    expect(r.avisos).toEqual([]);
  });
  it("avisa quando vieram menos itens do que o ChatGPT contou", () => {
    const r = validarImportacao(JSON.stringify({ ...base, materias: [{ nome: "DIREITO PENAL", itens_no_edital: 10, topicos: [{ titulo: "Princípios" }] }] }));
    expect(r.ok && r.avisos[0]).toMatch(/contou 10 itens/);
  });
  it("junta matérias repetidas em partes", () => {
    const p1 = JSON.stringify({ concurso: base.concurso, materias: [{ nome: "DIREITO PENAL", topicos: [{ titulo: "Parte um" }] }] });
    const p2 = JSON.stringify({ materias: [{ nome: "Direito Penal", topicos: [{ titulo: "Parte dois" }] }, { nome: "INFORMÁTICA", topicos: [{ titulo: "Redes" }] }] });
    const r = validarImportacao(`${p1}\n\ncontinuação:\n${p2}`);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resumo.porMateria).toEqual([{ nome: "DIREITO PENAL", topicos: 2 }, { nome: "INFORMÁTICA", topicos: 1 }]);
      expect(r.avisos.some((a) => /mais de uma parte/.test(a))).toBe(true);
    }
  });
  it("erros em português", () => {
    expect(validarImportacao("oi").ok).toBe(false);
    expect(validarImportacao("sem json aqui, só conversa do chat sobre o edital").ok).toBe(false);
    expect(validarImportacao('{"materias": [').ok).toBe(false);
    const semTopicos = validarImportacao('{"materias":[{"nome":"DIREITO PENAL","topicos":[]}]}');
    expect(!semTopicos.ok && semTopicos.erros[0]).toMatch(/não tem tópicos/);
    const semNome = validarImportacao('{"materias":[{"topicos":[{"titulo":"x tópico"}]}]}');
    expect(!semNome.ok && semNome.erros[0]).toMatch(/sem nome/);
    const semLista = validarImportacao('{"concurso":{"nome":"x"},"outra":[1,2,3,4,5,6]}');
    expect(!semLista.ok && semLista.erros[0]).toMatch(/materias/);
  });
  it("hierarquia funda demais é recusada", () => {
    let no: Record<string, unknown> = { titulo: "fundo" };
    for (let i = 0; i < 8; i++) no = { titulo: `n${i}`, subtopicos: [no] };
    const r = validarImportacao(JSON.stringify({ materias: [{ nome: "X MATERIA", topicos: [no] }] }));
    expect(r.ok).toBe(false);
  });
});

describe("comando", () => {
  it("troca o cargo e traz o formato esperado", () => {
    expect(comandoParaCargo("Policial Penal")).toContain("cargo: Policial Penal");
    expect(COMANDO_CHATGPT).toContain('"materias"');
    expect(COMANDO_CHATGPT).toContain('"subtopicos"');
    expect(COMANDO_CHATGPT).toContain("itens_no_edital");
  });
  it("o exemplo do comando, preenchido, é aceito", () => {
    const exemplo = COMANDO_CHATGPT.slice(COMANDO_CHATGPT.indexOf("{\n  \"versao\""), COMANDO_CHATGPT.lastIndexOf("}") + 1);
    const preenchido = exemplo.replace(/"…"/g, '"Texto do tópico"').replace('"nome": ""', '"nome": "X"');
    expect(validarImportacao(preenchido).ok).toBe(true);
  });
});
