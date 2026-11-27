import { describe, expect, it } from "vitest";
import { lerAnalise } from "./analise";
import { COMANDO_CHATGPT, comandoParaCargo, validarImportacao } from "./importacao";

const T = "\t";
const texto = `ANÁLISE COMPLETA DO EDITAL — SEJUSP-MG | POLICIAL PENAL
CONCURSO: Polícia Penal de Minas Gerais
BANCA: Consulplan
ANO: 2026
EDITAL: Edital nº 01/2026

1. ESTRUTURA GERAL DA PROVA

Prova com 2 blocos, Edital nº 01/2026.

Bloco${T}Disciplinas${T}Questões${T}Percentual
Conhecimentos Básicos${T}1${T}10${T}50,00%
Conhecimentos Específicos${T}1${T}10${T}50,00%
TOTAL${T}2${T}20${T}100%

Leitura estratégica da prova.

⸻

2. ANÁLISE POR DISCIPLINA

CONHECIMENTOS BÁSICOS

1. LÍNGUA PORTUGUESA — 10 QUESTÕES

PRIORIDADE: MUITO ALTA

É a de maior retorno.

Principais focos de preparação:

* Interpretação de textos.
* Concordância.

ESTRATÉGIA:

Resolver questões todo dia.

INCIDÊNCIA:

Interpretação é a mais cobrada (40%). Concordância vem em seguida.

CONTEÚDO PROGRAMÁTICO COMPLETO:

1. Compreensão e interpretação de textos [ALTA]
1.1 Tipologia textual
a) Textos narrativos
2. Ortografia
3. Distribuição de ideias no texto

CONHECIMENTOS ESPECÍFICOS

2. DIREITO PENAL — 10 QUESTÕES

PRIORIDADE: ALTA

Importante.

Principais focos de preparação:

* Teoria do crime.

ESTRATÉGIA:

Lei seca.

INCIDÊNCIA:

NÃO ENCONTRADO

CONTEÚDO PROGRAMÁTICO COMPLETO:

1. Aplicação da lei penal
2. Crime [MÉDIA]

⸻

3. DISTRIBUIÇÃO DE QUESTÕES E PRIORIDADES

Disciplina${T}Questões${T}Percentual
Língua Portuguesa${T}10${T}50,00%
Direito Penal${T}10${T}50,00%
TOTAL${T}20${T}100%

⸻

7. CONCLUSÃO ESTRATÉGICA

OBSERVAÇÃO: a distribuição é do Edital nº 01/2026.

⸻

8. NOTA DE CORTE

NOTA DE CORTE DO CONCURSO ANALISADO: 62 de 100 pontos (Consulplan, 2024).
LEITURA DA NOTA DE CORTE: acertar cerca de 62% da prova.`;

describe("raio-x em texto no padrão PCMG", () => {
  it("lê cabeçalho, nota de corte, incidência, foco e o conteúdo em ordem e com hierarquia", () => {
    const r = validarImportacao(texto);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.info).toMatchObject({ nome: "Polícia Penal de Minas Gerais", orgao: "SEJUSP-MG", cargo: "POLICIAL PENAL", banca: "Consulplan", ano: 2026 });
    expect(r.info.notaCorte).toContain("62 de 100");
    expect(r.resumo).toMatchObject({ materias: 2, topicos: 7 });
    const [pt, dp] = r.parsed.disciplines;
    expect(pt!.name).toBe("LÍNGUA PORTUGUESA");
    expect(pt!.topics.map((t) => [t.code, t.depth, t.title])).toEqual([
      ["1", 1, "Compreensão e interpretação de textos"],
      ["1.1", 2, "Tipologia textual"],
      ["a)", 3, "Textos narrativos"],
      ["2", 1, "Ortografia"],
      ["3", 1, "Distribuição de ideias no texto"],
    ]);
    expect(dp!.topics).toHaveLength(2);
    const m = r.info.raioX.materias;
    expect(m[0]).toMatchObject({ questoes: 10, prioridade: "MUITO ALTA", foco: "Interpretação de textos\nConcordância", estrategia: "Resolver questões todo dia." });
    expect(m[0]!.incidencia).toContain("Concordância vem em seguida");
    expect(m[0]!.incidenciaTopicos).toEqual([{ titulo: "Compreensão e interpretação de textos", nivel: "ALTA" }]);
    expect(r.avisos.some((a) => a.includes("DIREITO PENAL") && a.includes("incidência"))).toBe(true);
  });
  it("o mesmo texto também é lido pela análise estratégica (PCMG), com incidência e nota de corte, sem sujar a descrição", () => {
    const a = lerAnalise(texto);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.analise.disciplinas).toHaveLength(2);
    expect(a.analise.disciplinas[0]!.incidencia).toContain("Interpretação é a mais cobrada");
    expect(a.analise.disciplinas[0]!.descricao).toBe("É a de maior retorno.");
    expect(a.analise.corte?.join(" ")).toContain("62 de 100");
  });
  it("aceita markdown solto e junta partes da mesma disciplina", () => {
    const r = validarImportacao(`ANÁLISE COMPLETA DO EDITAL — X | Y\n\n2. ANÁLISE POR DISCIPLINA\n\n**1. DIREITO PENAL — 5 QUESTÕES**\n**CONTEÚDO PROGRAMÁTICO COMPLETO:**\n1. Crime\n\n1. DIREITO PENAL — 5 QUESTÕES\nCONTEÚDO PROGRAMÁTICO COMPLETO:\n2. Pena`);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resumo.topicos).toBe(2);
      expect(r.avisos.some((a) => a.includes("mais de uma parte"))).toBe(true);
    }
  });
  it("erra com mensagem clara: sem disciplina, disciplina sem conteúdo programático e JSON antigo", () => {
    expect(validarImportacao("x".repeat(100))).toMatchObject({ ok: false });
    const sem = validarImportacao(`ANÁLISE COMPLETA DO EDITAL — X | Y\n\n2. ANÁLISE POR DISCIPLINA\n\n1. DIREITO PENAL — 5 QUESTÕES\nPRIORIDADE: ALTA\nTexto da disciplina para passar do mínimo de caracteres.`);
    expect(!sem.ok && sem.erros[0]).toContain("não tem o conteúdo programático completo");
    const json = validarImportacao(`{"versao":1,"materias":[{"nome":"A","topicos":[]}]} e mais texto para passar do mínimo de caracteres exigido aqui`);
    expect(!json.ok && json.erros[0]).toContain("JSON do comando antigo");
  });
});

describe("comando do raio-x", () => {
  it("é o modelo da PCMG com incidência, conteúdo programático completo e nota de corte, sem JSON", () => {
    expect(comandoParaCargo("Policial Penal")).toContain("cargo: Policial Penal");
    expect(comandoParaCargo("  ")).toContain("(informe o cargo)");
    for (const termo of ["ANÁLISE COMPLETA DO EDITAL", "2. ANÁLISE POR DISCIPLINA", "PRIORIDADE:", "Principais focos de preparação:", "INCIDÊNCIA:", "CONTEÚDO PROGRAMÁTICO COMPLETO:", "8. NOTA DE CORTE", "7. CONCLUSÃO ESTRATÉGICA", "sem JSON", "NÃO ENCONTRADO"]) expect(COMANDO_CHATGPT).toContain(termo);
    expect(COMANDO_CHATGPT).not.toContain('"materias"');
  });
});
