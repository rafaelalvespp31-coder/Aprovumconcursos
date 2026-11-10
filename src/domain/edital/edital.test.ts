import { describe, expect, it } from "vitest";
import { parseEdital, parseProgrammaticText } from "./parser";
import { buildIndex, matchTopic, type CatalogEntry } from "./match";
import { modeOfDiscipline } from "./disciplines";

const PAGES = [
  `EDITAL Nº 01/2026 — POLÍCIA RODOVIÁRIA FEDERAL
1. DAS DISPOSIÇÕES PRELIMINARES
1.1 O concurso destina-se ao provimento de 500 vagas.
2. DA REMUNERAÇÃO
2.1 O subsídio é de R$ 9.000,00.
3. DAS INSCRIÇÕES
3.1 As inscrições ocorrerão de 10 a 30 de março.
O conteúdo programático consta do Anexo II deste edital.`,
  `EDITAL Nº 01/2026 — POLÍCIA RODOVIÁRIA FEDERAL
CRONOGRAMA
Publicação do edital: 01/03. Prova objetiva: 15/06.`,
  `EDITAL Nº 01/2026 — POLÍCIA RODOVIÁRIA FEDERAL
ANEXO II — CONTEÚDO PROGRAMÁTICO
CONHECIMENTOS BÁSICOS
LÍNGUA PORTUGUESA: 1 Compreensão e interpretação de textos. 2 Tipologia textual. 3 Ortografia oficial. 4 Acentuação gráfica.
RACIOCÍNIO LÓGICO
1 Estruturas lógicas. 2 Lógica de argumentação: analogias, inferências, deduções e conclusões.
CONHECIMENTOS ESPECÍFICOS
DIREITO PENAL
1 Princípios básicos.
2 Aplicação da lei penal.
2.1 Princípios da legalidade e da anterioridade.
2.2 Lei penal no tempo e no espaço.
3 Crimes contra o patrimônio.
4 Mecânica quântica avançada.
DIREITO CONSTITUCIONAL
1 Direitos e garantias fundamentais.
1.1 Direitos e deveres individuais e coletivos.`,
  `EDITAL Nº 01/2026 — POLÍCIA RODOVIÁRIA FEDERAL
ANEXO III — MODELO DE REQUERIMENTO
Nome completo: ______`,
];

describe("parseEdital", () => {
  const r = parseEdital(PAGES);
  it("localiza só a seção programática e ignora o resto do edital", () => {
    expect(r.found).toBe(true);
    expect(r.sectionPages?.[0]).toBe(3);
    const names = r.disciplines.map((d) => d.name);
    expect(names).toEqual(["LÍNGUA PORTUGUESA", "RACIOCÍNIO LÓGICO", "DIREITO PENAL", "DIREITO CONSTITUCIONAL"]);
    const all = r.disciplines.flatMap((d) => d.topics.map((t) => t.title)).join(" | ");
    expect(all).not.toMatch(/subs[ií]dio|inscri|vagas|requerimento|cronograma/i);
  });
  it("separa itens colados na mesma linha, com numeração e página", () => {
    const pt = r.disciplines[0]!;
    expect(pt.topics.map((t) => t.code)).toEqual(["1", "2", "3", "4"]);
    expect(pt.topics[0]).toMatchObject({ title: "Compreensão e interpretação de textos", page: 3, depth: 1 });
  });
  it("mantém a hierarquia por numeração", () => {
    const dp = r.disciplines.find((d) => d.name === "DIREITO PENAL")!;
    expect(dp.topics.filter((t) => t.depth === 2).map((t) => t.code)).toEqual(["2.1", "2.2"]);
    expect(dp.mode).toBe("direito_penal");
  });
  it("PDF sem a seção devolve falha clara", () => {
    expect(parseEdital(["Edital sem programa.\n1. Das vagas\n1.1 Cinquenta vagas."]).found).toBe(false);
    expect(parseEdital([""]).found).toBe(false);
  });
  it("conferência manual usa o mesmo leitor", () => {
    const m = parseProgrammaticText("DIREITO PENAL\n1 Crimes contra a vida.\n2 Crimes contra o patrimônio.");
    expect(m.found).toBe(true);
    expect(m.disciplines[0]!.topics).toHaveLength(2);
  });
});

const CAT: CatalogEntry[] = [
  { id: "c1", title: "Compreensão e interpretação de textos", aliases: ["interpretação de texto"], mode: "lingua_portuguesa", group: "Interpretação", lawCode: null, articles: [] },
  { id: "c2", title: "Acentuação gráfica", aliases: ["acentos"], mode: "lingua_portuguesa", group: "Ortografia", lawCode: null, articles: [] },
  { id: "c3", title: "Lei penal no tempo", aliases: ["irretroatividade da lei penal"], mode: "direito_penal", group: "Aplicação da lei penal", lawCode: null, articles: [] },
  { id: "c4", title: "Lei penal no espaço", aliases: ["territorialidade"], mode: "direito_penal", group: "Aplicação da lei penal", lawCode: null, articles: [] },
  { id: "c5", title: "Receptação", aliases: [], mode: "direito_penal", group: "Crimes contra o patrimônio", lawCode: "CP", articles: ["180"] },
  { id: "c6", title: "Direitos e deveres individuais e coletivos", aliases: ["art. 5º da CF"], mode: "direito_constitucional", group: "Direitos fundamentais", lawCode: null, articles: [] },
  { id: "c7", title: "Tipologia textual", aliases: [], mode: "lingua_portuguesa", group: null, lawCode: null, articles: [] },
];
const idx = buildIndex(CAT);

describe("matchTopic", () => {
  it("correspondência completa por título/sinônimo, na matéria certa", () => {
    const r = matchTopic(idx, "Compreensão e interpretação de textos", "lingua_portuguesa");
    expect(r.status).toBe("completa");
    expect(r.links[0]!.catalogId).toBe("c1");
  });
  it("não liga por uma palavra parecida: assunto inexistente fica sem aula", () => {
    expect(matchTopic(idx, "Mecânica quântica avançada", "direito_penal").status).toBe("nao_encontrado");
    expect(matchTopic(idx, "Ortografia oficial", "lingua_portuguesa").status).not.toBe("completa");
  });
  it("item com vários trechos: parcial quando só parte existe", () => {
    const r = matchTopic(idx, "Lei penal no tempo; Lei penal no espaço; Conflito aparente de normas", "direito_penal");
    expect(r.status).toBe("parcial");
    expect(r.links.map((l) => l.catalogId).sort()).toEqual(["c3", "c4"]);
  });
  it("matéria diferente pesa menos: mesmo título em outra matéria não é completa", () => {
    const r = matchTopic(idx, "Receptação", "direito_constitucional");
    expect(r.status === "completa").toBe(false);
  });
  it("grupo amplo do edital cobre parcialmente pelas aulas do assunto", () => {
    const r = matchTopic(idx, "Crimes contra o patrimônio", "direito_penal");
    expect(["parcial", "conferencia", "completa"]).toContain(r.status);
  });
});

describe("modeOfDiscipline", () => {
  it.each([
    ["LÍNGUA PORTUGUESA", "lingua_portuguesa"],
    ["Direito Processual Penal", "direito_processual_penal"],
    ["Raciocínio Lógico-Matemático", "raciocinio_logico"],
    ["Geografia de Minas Gerais", null],
  ])("%s → %s", (n, m) => expect(modeOfDiscipline(n)).toBe(m));
});

describe("blocos 'Conhecimentos específicos' sem matéria própria", () => {
  const pages = [
    "POLÍCIA PENAL DO ESTADO DO ESPÍRITO SANTO\nCONCURSO PÚBLICO Nº 001/2025\nANEXO III – CONTEÚDO PROGRAMÁTICO\nÉTICA NO SERVIÇO PÚBLICO:\n1. Ética e função pública 1.1 Conceitos de ética. 2. Improbidade Administrativa 4.1 Lei nº 8.429/1992.",
    "POLÍCIA PENAL DO ESTADO DO ESPÍRITO SANTO\nCONCURSO PÚBLICO Nº 001/2025\nCONHECIMENTOS ESPECÍFICOS:\n1. Direitos Humanos 1.1. Conceito e evolução. 1.2. Declaração Universal.\n2. Direito Constitucional\n2.1. Princípios fundamentais. 2.2. Direitos e garantias.\n4. Direito Penal\n4.1. Aplicação da lei penal. 4.2. Teoria do crime.\n5. Direito Processual Penal\n5.1. Princípios do processo penal.",
  ];
  it("separa cada matéria do bloco e não mistura com a anterior", () => {
    const r = parseEdital(pages);
    const names = r.disciplines.map((d) => d.name);
    expect(names).toEqual(expect.arrayContaining(["Direitos Humanos", "Direito Constitucional", "Direito Penal", "Direito Processual Penal"]));
    const ethics = r.disciplines.find((d) => /ÉTICA/.test(d.name))!;
    expect(ethics.topics.every((t) => !/Penal|Constitucional/.test(t.title))).toBe(true);
    const penal = r.disciplines.find((d) => d.name === "Direito Penal")!;
    expect(penal.mode).toBe("direito_penal");
    expect(ethics.topics.at(-1)!.title).not.toMatch(/POLÍCIA/);
    expect(penal.topics.map((t) => t.code)).toEqual(["4.1", "4.2"]);
  });
});

describe("só o conteúdo programático", () => {
  it("não deixa o texto depois da seção entrar na última disciplina", () => {
    const r = parseEdital([
      "ANEXO II – CONTEÚDO PROGRAMÁTICO\nLÍNGUA PORTUGUESA:\n1. Interpretação de textos. 2. Ortografia.\nMATEMÁTICA:\n1. Porcentagem. 2. Razão e proporção.\nDAS INSCRIÇÕES\n5.1 O candidato pagará taxa de R$ 120,00 até o dia 10.",
    ]);
    const all = r.disciplines.flatMap((d) => d.topics.map((t) => t.title)).join(" ");
    expect(all).not.toMatch(/taxa|candidato|inscri/i);
    expect(r.disciplines.map((d) => d.name)).toEqual(["LÍNGUA PORTUGUESA", "MATEMÁTICA"]);
  });
});

describe("capítulos do edital não viram disciplinas", () => {
  it("ignora DA PROVA OBJETIVA / DO EXAME MÉDICO e usa o anexo de conteúdo programático", () => {
    const pages = [
      "DA PROVA OBJETIVA\n10.1 A prova objetiva terá 60 questões.\n10.2 Cada questão vale 1 ponto.\nDO TESTE DE APTIDÃO FÍSICA\n11.1 O teste é eliminatório.\nDO EXAME MÉDICO\n12.1 Exame de saúde.",
      "ANEXO II - CONTEÚDO PROGRAMÁTICO\nLÍNGUA PORTUGUESA\n1 Compreensão de textos. 2 Ortografia.\nDIREITO PENAL\n1 Princípios. 2 Crimes contra a pessoa.",
    ];
    const r = parseEdital(pages);
    const names = r.disciplines.map((d) => d.name);
    expect(names).toEqual(["LÍNGUA PORTUGUESA", "DIREITO PENAL"]);
  });
});

describe("edital VUNESP (anexo sem numeração, capítulos numerados no corpo)", () => {
  it("usa o anexo e não os CAPÍTULOS", () => {
    const pages = [
      "CAPÍTULO 10 – DA PONTUAÇÃO FINAL\n10.1 A nota final será a soma.\nCAPÍTULO 11 – DOS CRITÉRIOS DE DESEMPATE E DA CLASSIFICAÇÃO FINAL\n11.1 Critérios.\n8.90. O conteúdo programático do Curso de Formação será organizado nas seguintes áreas.\nCAPÍTULO 12 – DOS RECURSOS\n12.1 Prazo de dois dias.",
      "ANEXO II – CONTEÚDO PROGRAMÁTICO\nLÍNGUA PORTUGUESA\nLeitura e interpretação de textos. Ortografia oficial. Acentuação gráfica. Concordância verbal e nominal.\nMATEMÁTICA\nOperações com números racionais. Razão e proporção. Regra de três.\nCONHECIMENTOS ESPECÍFICOS\nEstatuto da Guarda Civil Municipal. Lei 13.022/2014. Direitos humanos.",
    ];
    const r = parseEdital(pages);
    expect(r.found).toBe(true);
    expect(r.disciplines.map((d) => d.name)).toEqual(["LÍNGUA PORTUGUESA", "MATEMÁTICA", "CONHECIMENTOS ESPECÍFICOS"]);
    expect(r.disciplines[0]!.topics.length).toBeGreaterThanOrEqual(3);
  });
  it("só capítulos = não encontrou (vai para conferência)", () => {
    const r = parseEdital(["CAPÍTULO 10 – DA PONTUAÇÃO FINAL\n10.1 Nota.\n10.2 Soma.\nCAPÍTULO 12 – DOS RECURSOS\n12.1 Prazo."]);
    expect(r.found).toBe(false);
  });
});

describe("looksLikeEdital", () => {
  it("rejeita material de estudo e aceita edital", async () => {
    const { looksLikeEdital } = await import("./parser");
    expect(looksLikeEdital(["Homicídio simples. Art. 121 do Código Penal. Questão: certo ou errado. Gabarito: B. Comentário."])).toBe(false);
    const ed = "EDITAL Nº 01/2026 CONCURSO PÚBLICO. Das inscrições: os candidatos devem... Cargo: Guarda Civil. Vagas: 20. Banca organizadora: Fundação VUNESP. Remuneração. Nomeação e posse. ".repeat(3);
    expect(looksLikeEdital([ed])).toBe(true);
  });
});

describe("edital de Guarda Municipal: bloco compacto seguido de anexos", () => {
  const page = [
    "avaliação para o cargo. Todos os temas englobam também a legislação.",
    "ANEXO II – DO CONTEÚDO PROGRAMÁTICO",
    "ENSINO MÉDIO COMPLETO",
    "CONHECIMENTOS GERAIS",
    "Língua Portuguesa: Leitura e interpretação de textos. Sinônimos e antônimos. Pontuação. Crase. Matemática e Raciocínio Lógico: Situações-problema",
    "envolvendo: adição, subtração e divisão. Porcentagem. Razão e proporção. Regra de três.",
    "CONHECIMENTOS ESPECÍFICOS",
    "Conhecimentos Específicos: Constituição Federal/1988 (arts. 1º ao 6º, 12 ao 14, 37 e 144). Código Penal (Decreto-Lei nº 2.848/1940 – arts. 1º ao 6º, 13 ao 19). Estatuto Geral das Guardas Municipais (Lei Federal nº 13.022/2014). Noções de Primeiros Socorros.",
    "ANEXO III – DO REQUERIMENTO DE INCLUSÃO E USO DO NOME SOCIAL",
  ].join("\n");
  const anexos = "ANEXO V – DO PERFIL PSICOLÓGICO\nCARACTERÍSTICAS/DIMENSÕES:\n1) ADAPTAÇÃO – ADEQUADA\n2) ATENÇÃO - BOA\nDEFINIÇÕES\n1 ADAPTAÇÃO – ADEQUADA Capacidade de adaptar-se às novas situações.\n2 ATENÇÃO - BOA Trata-se da capacidade.";
  it("separa Português e Matemática, mantém lista de leis e ignora o perfil psicológico", () => {
    const r = parseEdital([page, anexos]);
    expect(r.found).toBe(true);
    const names = r.disciplines.map((d) => d.name);
    expect(names).toContain("Língua Portuguesa");
    expect(names).toContain("Matemática e Raciocínio Lógico");
    expect(names).toContain("CONHECIMENTOS ESPECÍFICOS");
    expect(names.join("|")).not.toMatch(/CARACTER|DEFINI/);
    const esp = r.disciplines.find((d) => d.name === "CONHECIMENTOS ESPECÍFICOS")!;
    expect(esp.topics.length).toBe(4);
    expect(esp.topics[1]!.title).toMatch(/^Código Penal \(Decreto-Lei nº 2\.848\/1940/);
  });
});

describe("edital FGV: tabela de provas no corpo e matérias numeradas no anexo", () => {
  const pages = [
    `EDITAL Nº 01/2026 — POLÍCIA CIVIL
3. DAS PROVAS
3.1 A prova objetiva terá 100 questões.
Módulo II – Conhecimentos Específicos (40 questões)
3.2 Os candidatos serão identificados pelos fiscais de sala antes do início.
3.3 A ocorrência será registrada e enviada à comissão.
5. DOS PROGRAMAS
5.1. O conteúdo programático para a Prova Objetiva está indicado no Anexo I.
6. EXAME DE VERIFICAÇÃO DA DEFICIÊNCIA
6.1 O candidato com deficiência deverá comparecer ao exame.`,
    `16.14 Integram o presente Edital os seguintes Anexos:
a) Anexo I - Conteúdo Programático;
b) Anexo II - Exames Biomédicos;
c) Anexo III - Exames Biofísicos;`,
    `ANEXO I
CONTEÚDO PROGRAMÁTICO
INVESTIGADOR DE POLÍCIA I
CONHECIMENTOS BÁSICOS
1. LÍNGUA PORTUGUESA
1.1 Interpretação e compreensão de textos: 1.1.1 Tipos textuais; 1.1.2 Coerência e coesão.
1.2 Conhecimentos linguísticos: 1.2.1 Sintaxe; 1.2.2 Pontuação.
2. RACIOCÍNIO LÓGICO-MATEMÁTICO
2.1. Lógica: proposições, conectivos. 2.2. Conjuntos e suas operações. 2.3. Porcentagem e juros.
CONHECIMENTOS ESPECÍFICOS
3. DIREITO PENAL
3.1 Princípios do direito penal. 3.2 Aplicação da lei penal. 3.3 Crimes contra a pessoa.
4. DIREITO PROCESSUAL PENAL
4.1 Inquérito policial. 4.2 Ação penal. 4.3 Prisões.`,
    `ANEXO II — EXAMES BIOMÉDICOS
O candidato deverá apresentar hemograma completo e raio-X.`,
  ];
  const r = parseEdital(pages);
  it("usa o Anexo de conteúdo programático, não a tabela de provas do corpo", () => {
    expect(r.found).toBe(true);
    expect(r.sectionPages?.[0]).toBeGreaterThanOrEqual(3);
    expect(r.disciplines.map((d) => d.name)).toEqual(["LÍNGUA PORTUGUESA", "RACIOCÍNIO LÓGICO-MATEMÁTICO", "DIREITO PENAL", "DIREITO PROCESSUAL PENAL"]);
  });
  it("nenhuma regra do edital vira assunto", () => {
    const all = r.disciplines.flatMap((d) => d.topics.map((t) => t.title)).join(" | ");
    expect(all).not.toMatch(/fiscais|candidato|hemograma|comiss/i);
    expect(r.disciplines[2]!.topics.length).toBeGreaterThanOrEqual(3);
  });
});

describe("edital sem anexos (só o corpo)", () => {
  const pages = [
    `Edital de Abertura nº 002/2022 — SEAD
1.7 Os conteúdos programáticos da Prova Objetiva encontram-se no Anexo II deste Edital.
INFORMAÇÃO DO CANDIDATO
1. A Prova Objetiva e a Redação terão a duração de 05 (cinco) horas.
2. O candidato deverá comparecer com antecedência.
3. Os candidatos serão identificados pelos fiscais de sala.
4. A ocorrência será enviada à comissão.`,
    `CARGOS
09 Músico – Percussão 421 09 - 09
09 Músico – Flauta 422 03 - 03
TOTAL 54 06 60
A APTIDÃO na Avaliação Psicológica é requisito indispensável para matrícula.
Conhecimentos Específicos
1. O candidato será convocado por edital.
2. Os candidatos deverão comparecer ao local de prova.`,
  ];
  it("não inventa matérias a partir de regras: pede conferência", () => {
    const r = parseEdital(pages);
    expect(r.found).toBe(false);
    expect(r.disciplines).toEqual([]);
  });
});

describe("seção com título numerado e capítulo seguinte", () => {
  const pages = [
    `EDITAL Nº 5/2026
9. DAS INSCRIÇÕES
9.1 As inscrições ocorrerão pela internet.
10. DO CONTEÚDO PROGRAMÁTICO
LÍNGUA PORTUGUESA
1 Interpretação de textos. 2 Ortografia. 3 Pontuação.
DIREITO CONSTITUCIONAL
1 Princípios fundamentais. 2 Direitos e garantias fundamentais.
11. DOS RECURSOS
11.1 O candidato poderá recorrer em até dois dias.
11.2 Os recursos serão julgados pela banca examinadora.`,
  ];
  const r = parseEdital(pages);
  it("lê só até o próximo capítulo do edital", () => {
    expect(r.found).toBe(true);
    expect(r.disciplines.map((d) => d.name)).toEqual(["LÍNGUA PORTUGUESA", "DIREITO CONSTITUCIONAL"]);
    expect(r.disciplines.flatMap((d) => d.topics.map((t) => t.title)).join("|")).not.toMatch(/recorrer|banca/i);
  });
});

describe("matérias do anexo x itens de tabela", () => {
  const pages = [
    `ANEXO III — CONTEÚDOS PROGRAMÁTICOS
CONTROLE E GESTÃO PÚBLICA
• Princípios da gestão pública
• Controle interno e externo
• Accountability e transparência
V – AUSENTE
1 Candidato que não comparecer.
2 Candidato eliminado.
3 Prova prática não realizada.
EXAMES DE APTIDÃO FÍSICA
1 Flexão de braço.
2 Corrida de 12 minutos.
3 Abdominal.
DIREITO ADMINISTRATIVO
1 Poderes da administração. 2 Atos administrativos. 3 Licitações e contratos.`,
  ];
  const r = parseEdital(pages);
  it("mantém a matéria sem numeração e descarta tabela e exames", () => {
    const names = r.disciplines.map((d) => d.name);
    expect(names).toContain("CONTROLE E GESTÃO PÚBLICA");
    expect(names).toContain("DIREITO ADMINISTRATIVO");
    expect(names.join("|")).not.toMatch(/AUSENTE|APTIDÃO/);
  });
});
