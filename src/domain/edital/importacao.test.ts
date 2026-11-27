import { describe, expect, it } from "vitest";
import { COMANDO_CHATGPT, comandoParaCargo, validarImportacao } from "./importacao";

const texto = `RAIO-X DO CONCURSO
CONCURSO: Polícia Penal MG
ÓRGÃO: SEJUSP-MG
CARGO: Policial Penal
BANCA: Consulplan
ANO: 2026
EDITAL: 01/2026
NOTA DE CORTE: 62 de 100 pontos na última prova (Consulplan, 2024).
VISÃO GERAL: 80 questões, 2 blocos.

MATÉRIA 1: LÍNGUA PORTUGUESA
QUESTÕES: 10
INCIDÊNCIA: Interpretação de texto é a mais cobrada (40%).
Concordância vem em seguida.
O QUE FOCAR: Interpretação e concordância.
ITENS NO EDITAL: 4
CONTEÚDO PROGRAMÁTICO:
1. Compreensão e interpretação de textos [ALTA]
1.1 Tipologia textual
a) Textos narrativos
2. Ortografia

MATÉRIA 2: INFORMÁTICA
QUESTÕES: NÃO ENCONTRADO
INCIDÊNCIA: NÃO ENCONTRADO
O QUE FOCAR: Segurança da informação.
CONTEÚDO PROGRAMÁTICO:
1. Conceito de internet e intranet`;

describe("raio-x em texto (sem JSON)", () => {
  it("lê cabeçalho, nota de corte, incidência, foco e o conteúdo em ordem e com hierarquia", () => {
    const r = validarImportacao(texto);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.info).toMatchObject({ nome: "Polícia Penal MG", cargo: "Policial Penal", banca: "Consulplan", ano: 2026 });
    expect(r.info.notaCorte).toContain("62 de 100");
    expect(r.resumo).toMatchObject({ materias: 2, topicos: 5 });
    const [pt, inf] = r.parsed.disciplines;
    expect(pt!.name).toBe("LÍNGUA PORTUGUESA");
    expect(pt!.topics.map((t) => [t.code, t.depth, t.title])).toEqual([
      ["1", 1, "Compreensão e interpretação de textos"],
      ["1.1", 2, "Tipologia textual"],
      ["a)", 3, "Textos narrativos"],
      ["2", 1, "Ortografia"],
    ]);
    expect(inf!.topics).toHaveLength(1);
    const m = r.info.raioX.materias;
    expect(m[0]).toMatchObject({ questoes: 10, foco: "Interpretação e concordância." });
    expect(m[0]!.incidencia).toContain("Concordância vem em seguida");
    expect(m[0]!.incidenciaTopicos).toEqual([{ titulo: "Compreensão e interpretação de textos", nivel: "ALTA" }]);
    expect(m[1]!.questoes).toBeNull();
    expect(r.avisos.some((a) => a.includes("INFORMÁTICA") && a.includes("incidência"))).toBe(true);
    expect(r.avisos.some((a) => a.includes("contou 4 itens") && a.includes("vieram 4"))).toBe(false);
  });
  it("aceita markdown solto e juntar partes da mesma matéria", () => {
    const r = validarImportacao(`**MATÉRIA 1: DIREITO PENAL**\n**CONTEÚDO PROGRAMÁTICO:**\n1. Crime\n\nMATÉRIA 1: DIREITO PENAL\nCONTEÚDO PROGRAMÁTICO:\n2. Pena`);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resumo.topicos).toBe(2);
      expect(r.avisos.some((a) => a.includes("mais de uma parte"))).toBe(true);
    }
  });
  it("avisa quando faltou conteúdo em relação à contagem do edital", () => {
    const r = validarImportacao(`MATÉRIA 1: DIREITO X\nITENS NO EDITAL: 5\nCONTEÚDO PROGRAMÁTICO:\n1. Alfa teste\n2. Beta teste`);
    expect(r.ok && r.avisos.some((a) => a.includes("contou 5"))).toBe(true);
  });
  it("erra com mensagem clara: sem matéria, matéria sem conteúdo e JSON antigo", () => {
    expect(validarImportacao("x".repeat(60))).toMatchObject({ ok: false });
    const sem = validarImportacao(`MATÉRIA 1: DIREITO X\nQUESTÕES: 3\nINCIDÊNCIA: algo bem longo aqui para passar do mínimo`);
    expect(!sem.ok && sem.erros[0]).toContain("não tem conteúdo programático");
    const json = validarImportacao(`{"versao":1,"materias":[{"nome":"A","topicos":[]}]} e mais texto para passar do mínimo`);
    expect(!json.ok && json.erros[0]).toContain("JSON do comando antigo");
  });
});

describe("comando do raio-x", () => {
  it("troca o cargo e pede texto simples, sem JSON, com tudo o que o admin precisa", () => {
    expect(comandoParaCargo("Policial Penal")).toContain("cargo: Policial Penal");
    expect(comandoParaCargo("  ")).toContain("(informe o cargo)");
    for (const termo of ["NOTA DE CORTE", "INCIDÊNCIA", "O QUE FOCAR", "CONTEÚDO PROGRAMÁTICO", "MATÉRIA 1:", "Proibido JSON", "NÃO ENCONTRADO"]) expect(COMANDO_CHATGPT).toContain(termo);
    expect(COMANDO_CHATGPT).not.toContain('"materias"');
  });
});
