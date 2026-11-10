import { prepareLessonUpload } from "./upload-preview";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lessonSchema } from "@/ai/schemas";
import { extractStructure } from "@/domain/content/extract";
import { normalizeContent } from "@/domain/content/normalize";
import { buildLesson, disciplineFrom, itemKey, matchItem, MAX_SECTIONS_PER_MODULE, parseLessonUpload, sectionKind } from "./upload";

const nodesOf = (t: string) => extractStructure(normalizeContent(t).normalized).nodes;
const template = readFileSync("public/modelos/modelo-aula.txt", "utf8");

describe("modelo de aula (upload)", () => {
  it("lê o modelo oficial sem erros e monta a aula no formato do catálogo", () => {
    const p = parseLessonUpload(template);
    expect(p.errors).toEqual([]);
    expect(p.meta).toMatchObject({ title: "Furto (art. 155 do CP)", disciplineMode: "direito_penal", kind: "dispositivo", lawCode: "CP", articles: ["155"], estimatedMinutes: 60 });
    expect(p.meta.aliases).toContain("furto qualificado");
    expect(p.sections.map((s) => s.kind)).toEqual(["introducao", "texto_legal", "pegadinhas", "quadro_comparativo", "resumo"]);
    expect(p.sections[0]!.module).toBe("1. Base do tema");
    expect(p.sections[2]!.module).toBe("2. Aprofundamento");
    expect(p.sections[1]!.bodyMarkdown.startsWith("**Art. 155.**")).toBe(true);
    expect(p.sections[1]!.items).toEqual(["Art. 155", "§ 1º", "§ 4º", "§ 4º, I", "§ 4º, II"]);
    expect(p.questions).toHaveLength(2);
    expect(p.references.map((r) => r.kind)).toEqual(["lei"]);
    expect(p.pending).toEqual([]);

    const nodes = nodesOf(p.sourceText);
    const b = buildLesson(p, nodes);
    expect(b.errors).toEqual([]);
    expect(lessonSchema.safeParse(b.lesson).success).toBe(true);
    // Todos os itens do texto-base ficam cobertos por alguma seção.
    const covered = new Set(b.lesson.sections.flatMap((s) => s.nodeKeys));
    for (const k of b.lesson.taughtNodeKeys) expect(covered.has(k)).toBe(true);
    const [q1, q2] = b.questions;
    expect(q1!.options.find((o) => o.correct)!.label).toBe("A");
    expect(q1!.essential).toBe(true);
    expect(q2!.type).toBe("certo_errado");
    expect(q2!.correctAnswerTrue).toBe(true);
    expect(nodes.find((n) => n.key === q2!.nodeKey)!.path).toBe("Art. 155 › § 1º");
    expect(b.warnings).toEqual([]);
  });

  it("casa itens por caminho, marcador ou título", () => {
    const law = nodesOf("Art. 155. Subtrair coisa alheia móvel:\n§ 4º Se o crime é cometido:\nI - com destruição de obstáculo;\nII - com abuso de confiança;");
    expect(matchItem("Art. 155, § 4º, II", law, ["155"])!.path).toBe("Art. 155 › § 4º › II");
    expect(matchItem("§ 4º, I", law, ["155"])!.path).toBe("Art. 155 › § 4º › I");
    expect(matchItem("art 155", law, ["155"])!.path).toBe("Art. 155");
    const tema = nodesOf("1 Coesão textual\n1.1 Referenciação\n1.2 Conectivos\n2 Coerência");
    expect(matchItem("1.2", tema, [])!.title).toBe("Conectivos");
    expect(matchItem("coerencia", tema, [])!.marker).toBe("2");
    expect(matchItem("Inexistente", tema, [])).toBeNull();
    expect(itemKey("Art. 155 › § 4º › I")).toBe(itemKey("art. 155, §4º, I"));
  });

  it("reconhece tipos de seção e matérias por nomes amigáveis", () => {
    expect(sectionKind("Quadro comparativo")).toBe("quadro_comparativo");
    expect(sectionKind("interpretação da banca")).toBe("interpretacao_banca");
    expect(sectionKind("texto_legal")).toBe("texto_legal");
    expect(sectionKind("mapa mental")).toBe("esquema");
    expect(sectionKind("qualquer")).toBeNull();
    expect(disciplineFrom("Português", null)).toBe("lingua_portuguesa");
    expect(disciplineFrom("Direito Processual Penal", null)).toBe("direito_processual_penal");
    expect(disciplineFrom("", "CPP")).toBe("direito_processual_penal");
    expect(disciplineFrom("Astronomia", null)).toBeNull();
  });

  it("tema com sumário numerado e seções sem 'Itens:' ligadas por menção", () => {
    const txt = [
      "=== AULA ===",
      "Título: Coesão e coerência",
      "Matéria: Língua Portuguesa",
      "Tipo: tema",
      "Objetivo: Reconhecer mecanismos de coesão e coerência textual.",
      "=== TEXTO-BASE ===",
      "1 Coesão textual",
      "1.1 Referenciação",
      "1.2 Conectivos",
      "2 Coerência",
      "=== MÓDULO: Coesão ===",
      "--- SEÇÃO: explicação | O que é coesão ---",
      "A referenciação retoma termos; os conectivos ligam ideias.",
      "--- SEÇÃO: resumo | Revisão ---",
      "Coerência é o sentido global do texto.",
    ].join("\n");
    const p = parseLessonUpload(txt);
    expect(p.errors).toEqual([]);
    expect(p.meta.kind).toBe("tema");
    const nodes = nodesOf(p.sourceText);
    const b = buildLesson(p, nodes);
    const titles = (keys: string[]) => keys.map((k) => nodes.find((n) => n.key === k)!.title);
    expect(titles(b.lesson.sections[0]!.nodeKeys)).toEqual(expect.arrayContaining(["Referenciação", "Conectivos"]));
    expect(titles(b.lesson.sections[1]!.nodeKeys)).toContain("Coerência");
    expect(lessonSchema.safeParse(b.lesson).success).toBe(true);
  });

  it("corrige sozinho o que dá (sem erro) e descarta só a questão sem gabarito válido", () => {
    const txt = [
      "=== AULA ===",
      "Título: X",
      "Matéria: Astronomia",
      "=== MÓDULO: M ===",
      "--- SEÇÃO: inventada | Seção ---",
      "texto",
      "=== QUESTÕES: FÁCIL ===",
      "--- QUESTÃO ---",
      "Enunciado: Qual é a alternativa correta aqui?",
      "A) um",
      "B) dois",
      "Gabarito: F",
      "Justificativa: Porque sim, conforme o texto.",
    ].join("\n");
    const p = parseLessonUpload(txt);
    const w = p.warnings.join("\n");
    expect(p.errors).toEqual([]);
    expect(w).toMatch(/matéria “Astronomia”/);
    expect(w).not.toMatch(/Objetivo|TEXTO-BASE|tipo de seção/);
    expect(w).not.toMatch(/Questão da linha/); // questão sem gabarito válido é descartada sem aviso
    expect(p.meta.objective.length).toBeGreaterThan(5);
    expect(p.sections[0]).toMatchObject({ kind: "explicacao", title: "Seção" });
    expect(p.questions).toHaveLength(0);
  });

  it("seção gigante é dividida em partes (nunca vira erro) e o gabarito não pode ser inventado", () => {
    const para = "Parágrafo de teste com algum conteúdo para encher a seção.\n\n";
    const txt = ["=== AULA ===", "Título: Grande", "Matéria: Direito Penal", "Objetivo: Dominar o tema grande.", "=== TEXTO-BASE ===", "1 Tema", "=== MÓDULO: M ===", "--- SEÇÃO: explicação | Tudo ---", para.repeat(450), "--- SEÇÃO: resumo | Fim ---", "Resumo."].join("\n");
    const p = parseLessonUpload(txt);
    expect(p.errors).toEqual([]);
    const parts = p.sections.filter((s) => s.title.startsWith("Tudo"));
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts.every((s) => s.bodyMarkdown.length <= 10_000)).toBe(true);
    expect(parts[1]!.title).toBe("Tudo (parte 2)");
    expect(p.warnings).toEqual([]);
  });

  it("aceita mais de 30 seções, mais de 100 itens e questões longas, sem cortar nem avisar", () => {
    const secs = Array.from({ length: 45 }, (_, i) => `--- SEÇÃO: explicação | Item ${i + 1} ---\nItens: ${i + 1}\nConteúdo do item ${i + 1}.`).join("\n");
    const base = Array.from({ length: 120 }, (_, i) => `${i + 1} Assunto ${i + 1}`).join("\n");
    const longQ = `Enunciado: ${"Frase longa de enunciado. ".repeat(250)}\nA) um\nB) dois\nGabarito: A\nJustificativa: ${"Justificativa longa. ".repeat(200)}`;
    const txt = ["=== AULA ===", "Título: Enorme", "Matéria: Direito Penal", "Objetivo: Dominar tudo isto.", "=== TEXTO-BASE ===", base, "=== MÓDULO: M ===", secs, "=== QUESTÕES: FÁCIL ===", "--- QUESTÃO ---", longQ].join("\n");
    const p = prepareLessonUpload(txt);
    expect(p.errors).toEqual([]);
    expect(p.warnings).toEqual([]);
    expect(p.built.lesson.sections).toHaveLength(45);
    // 45 seções num módulo só: a aula ganha mais módulos sozinha.
    const mods = [...new Set(p.built.lesson.sections.map((s) => s.module))];
    expect(mods.length).toBe(Math.ceil(45 / MAX_SECTIONS_PER_MODULE));
    expect(mods[1]).toBe("M (parte 2)");
    expect(p.built.lesson.taughtNodeKeys.length).toBeGreaterThan(100);
    expect(p.built.questions[0]!.statement.length).toBeGreaterThan(6000);
    expect(p.built.questions[0]!.justification.length).toBeGreaterThan(4000);
  });

  it("sem módulos no texto, a aula grande é agrupada em módulos numerados", () => {
    const secs = Array.from({ length: 25 }, (_, i) => `--- SEÇÃO: explicação | Parte ${i + 1} ---\nConteúdo ${i + 1}.`).join("\n");
    const p = prepareLessonUpload(["=== AULA ===", "Título: Sem módulos", "Matéria: Direito Penal", "Objetivo: Dominar o tema.", secs].join("\n"));
    expect(p.warnings).toEqual([]);
    expect([...new Set(p.built.lesson.sections.map((s) => s.module))]).toEqual(["Módulo 1", "Módulo 2", "Módulo 3"]);
  });

  it("texto-base vazio: os itens vêm dos códigos citados nas seções (8.1.1, 8.1.2…) e nada é avisado", () => {
    const txt = [
      "=== AULA ===", "Título: Cap. IV", "Matéria: Direito Penal", "Objetivo: Dominar o capítulo.", "=== TEXTO-BASE ===", "",
      "=== MÓDULO: Visão geral ===", "--- SEÇÃO: introdução | Visão geral ---", "Itens: 8.1.1; 8.1.2; 8.1.3", "Texto geral.",
      "--- SEÇÃO: explicação | Detalhe ---", "Itens: 8.1.4", "Texto do detalhe.",
    ].join("\n");
    const p = prepareLessonUpload(txt);
    expect(p.errors).toEqual([]);
    expect(p.warnings).toEqual([]);
    expect(p.nodes.map((n) => n.path)).toEqual(["8.1.1", "8.1.2", "8.1.3", "8.1.4"]);
    expect(p.built.lesson.sections[0]!.nodeKeys).toHaveLength(3);
    expect(p.built.lesson.sections[1]!.nodeKeys).toHaveLength(1);
  });

  it("sem === AULA ===, sem texto-base e com seção fora do módulo: monta tudo a partir das seções", () => {
    const txt = ["--- SEÇÃO: explicação | Conceito ---", "Texto do conceito.", "--- SEÇÃO: resumo | Resumo ---", "Resumo curto."].join("\n");
    const p = prepareLessonUpload(txt);
    expect(p.errors).toEqual([]);
    expect(p.built.lesson.sections).toHaveLength(2);
    expect(p.built.lesson.taughtNodeKeys.length).toBeGreaterThan(0);
    expect(p.warnings).toEqual([]);
  });
});

describe("texto colado do ChatGPT", () => {
  it("aceita cercas de código, títulos em negrito e marcadores com #", () => {
    const txt = [
      "Claro! Aqui está a aula:",
      "```text",
      "### === AULA ===",
      "**Título:** Coesão textual",
      "**Matéria:** Língua Portuguesa",
      "- **Tipo:** tema",
      "**Objetivo:** Reconhecer mecanismos de coesão.",
      "**=== TEXTO-BASE ===**",
      "1 Referenciação",
      "2 Conectivos",
      "## === MÓDULO: Base ===",
      "**--- SEÇÃO: explicação | O que é ---**",
      "**Atenção:** a referenciação retoma termos.",
      "--- SEÇÃO: resumo | Revisão ---",
      "Conectivos ligam ideias.",
      "=== QUESTÕES: FÁCIL ===",
      "--- QUESTÃO ---",
      "**Enunciado:** A referenciação retoma termos do texto?",
      "**A)** Sim",
      "**B)** Não",
      "**Gabarito:** A",
      "**Justificativa:** Ela retoma termos já citados.",
      "```",
    ].join("\n");
    const p = parseLessonUpload(txt);
    expect(p.errors).toEqual([]);
    expect(p.meta).toMatchObject({ title: "Coesão textual", disciplineMode: "lingua_portuguesa", kind: "tema" });
    expect(p.sections[0]!.bodyMarkdown).toBe("**Atenção:** a referenciação retoma termos.");
    expect(p.questions[0]!.options.map((o) => o.label)).toEqual(["A", "B"]);
    expect(p.questions[0]!.answer).toBe("A");
  });
});

describe("comando padrão APROVUM (modelo Homicídio)", () => {
  it("uma resposta no formato do comando vira os 9 módulos do padrão e 12 questões por nível", async () => {
    const { LESSON_PROMPT } = await import("./chatgpt-prompts");
    expect(LESSON_PROMPT).toContain("=== MÓDULO: Visão geral e lei seca ===");
    const mods: Array<[string, Array<[string, string]>]> = [
      ["Visão geral e lei seca", [["introdução", "Visão geral: o que o art. 155 protege"], ["esquema", "Mapa do art. 155 (bloco por bloco)"], ["texto legal", "Texto legal do art. 155"]]],
      ["O crime de furto", [["conceitos fundamentais", "Tipo penal"], ["explicação", "Dolo"], ["explicação", "Iter criminis"]]],
      ["Formas privilegiadas, qualificadas e majorantes", [["explicação", "Furto privilegiado"], ["explicação", "Qualificadoras"], ["aprofundamento", "Majorantes"]]],
      ["Forma culposa e particularidades", [["explicação", "Não há forma culposa"]]],
      ["Temas da Parte Geral que caem junto", [["aprofundamento", "Concurso de pessoas"], ["aprofundamento", "Erro"]]],
      ["Combinações, crimes próximos e julgamento", [["aprofundamento", "Privilegiado-qualificado"], ["comparação", "Furto × roubo"], ["quadro comparativo", "Furto × crimes próximos"], ["aplicação", "Ação penal e benefícios"]]],
      ["Casos práticos e pegadinhas", [["exemplos", "Casos práticos resolvidos"], ["pegadinhas", "Pegadinhas de prova"], ["exceções", "Exceções e particularidades"]]],
      ["Doutrina, jurisprudência e bancas", [["doutrina", "Como a doutrina explica"], ["jurisprudência", "O que os tribunais têm decidido"], ["interpretação da banca", "Como as bancas cobram o art. 155"]]],
      ["Revisão final", [["resumo", "Resumo para revisão"], ["checklist", "Checklist: você consegue…"]]],
    ];
    const q = (lv: string) =>
      Array.from({ length: 12 }, (_, i) =>
        i % 2
          ? `--- QUESTÃO ---\nTipo: certo ou errado\nItem: § 4º\nEssencial: não\nDificuldade: 2\nEnunciado: Afirmação ${lv} ${i} sobre o furto qualificado.\nGabarito: Certo\nJustificativa: Certo. Explicação da questão ${i}.`
          : `--- QUESTÃO ---\nTipo: múltipla escolha\nItem: 1\nEssencial: sim\nDificuldade: 1\nEnunciado: Questão ${lv} ${i}: o furto consiste em:\nA) subtrair coisa alheia móvel\nComentário: Correta, é o caput.\nB) com violência\nComentário: Errada, é roubo.\nC) apropriar-se\nComentário: Errada, apropriação.\nD) fraude\nComentário: Errada, estelionato.\nE) dano\nComentário: Errada, dano.\nGabarito: A\nJustificativa: O caput define o furto.`,
      ).join("\n\n");
    const txt = [
      "```",
      "=== AULA ===",
      "Título: Furto (CP, art. 155)",
      "Matéria: Direito Penal",
      "Tipo: dispositivo",
      "Lei: CP",
      "Artigos: 155",
      "Sinônimos: furto simples; furto qualificado",
      "Tempo estimado: 90",
      "Objetivo: Dominar o art. 155 do Código Penal.",
      "Resumo: Furto é subtrair coisa alheia móvel.",
      "=== TEXTO-BASE ===",
      "Art. 155 - Subtrair, para si ou para outrem, coisa alheia móvel:",
      "Pena - reclusão, de um a quatro anos, e multa.",
      "§ 1º A pena aumenta-se de um terço, se o crime é praticado durante o repouso noturno.",
      "§ 4º A pena é de reclusão de dois a oito anos, e multa, se o crime é cometido:",
      "I - com destruição ou rompimento de obstáculo à subtração da coisa;",
      "1 Tipo penal: bem jurídico, sujeitos, consumação e classificação",
      "2 Furto qualificado",
      ...mods.flatMap(([m, secs]) => [`=== MÓDULO: ${m} ===`, ...secs.flatMap(([k, t], i) => [`--- SEÇÃO: ${k} | ${t} ---`, i === 0 ? "Itens: Art. 155; 1" : "", `Conteúdo de **${t}**.\n\n> **Pegadinha:** cuidado.\n\n| A | B |\n|---|---|\n| x | y |`])]),
      "=== REFERÊNCIAS ===",
      "Lei: Código Penal, art. 155",
      "Jurisprudência: STJ, Súmula 442",
      "=== A CONFERIR ===",
      "Conferir a redação vigente do § 4º.",
      "=== QUESTÕES: FÁCIL ===",
      q("fácil"),
      "=== QUESTÕES: MÉDIO ===",
      q("médio"),
      "=== QUESTÕES: DIFÍCIL ===",
      q("difícil"),
      "```",
    ].join("\n");
    const p = parseLessonUpload(txt);
    expect(p.errors).toEqual([]);
    expect(new Set(p.sections.map((s) => s.module)).size).toBe(9);
    expect(p.sections).toHaveLength(24);
    const b = buildLesson(p, nodesOf(p.sourceText));
    expect(b.errors).toEqual([]);
    expect(lessonSchema.safeParse(b.lesson).success).toBe(true);
    for (const lv of ["facil", "medio", "dificil"]) expect(b.questions.filter((x) => x.level === lv)).toHaveLength(12);
    expect(b.warnings.some((w) => /pelo menos 10/.test(w))).toBe(false);
  });
});

describe("completar questões de uma aula catalogada", () => {
  it("lê só os blocos de questões e liga aos itens do texto-base da aula", async () => {
    const { parseQuestionsForTopic } = await import("./upload");
    const nodes = nodesOf("Art. 155 - Subtrair coisa alheia móvel:\n§ 1º A pena aumenta-se de um terço, se durante o repouso noturno.\n1 Tipo penal\n2 Furto noturno");
    const txt = [
      "```",
      "=== QUESTÕES: MÉDIO ===",
      "--- QUESTÃO ---",
      "Tipo: certo ou errado",
      "Item: § 1º",
      "Enunciado: O repouso noturno aumenta a pena do furto em um terço.",
      "Gabarito: Certo",
      "Justificativa: Certo. É o § 1º do art. 155.",
      "=== QUESTÕES: DIFÍCIL ===",
      "--- QUESTÃO ---",
      "Enunciado: Sobre o furto, assinale a correta:",
      "A) admite violência",
      "B) é subtrair coisa alheia móvel",
      "Gabarito: B",
      "Justificativa: Definição do caput.",
      "```",
    ].join("\n");
    const r = parseQuestionsForTopic(txt, nodes, ["155"]);
    expect(r.errors).toEqual([]);
    expect(r.questions.map((q) => q.level)).toEqual(["medio", "dificil"]);
    expect(nodes.find((n) => n.key === r.questions[0]!.nodeKey)!.path).toBe("Art. 155 › § 1º");
    expect(parseQuestionsForTopic("texto qualquer", nodes, ["155"]).errors[0]).toMatch(/Não encontrei questões/);
  });
});

describe("exemplos visuais e flashcards no texto colado", () => {
  it("mantém o bloco :::exemplo (tirinha, carimbo, esquema) e a seção de flashcards", async () => {
    const { extractPractice } = await import("@/domain/content/practice");
    const { parseFlashcards } = await import("@/components/flashcards");
    const { LESSON_PROMPT } = await import("./chatgpt-prompts");
    expect(LESSON_PROMPT).toContain("EXEMPLOS VISUAIS");
    expect(LESSON_PROMPT).toContain("--- SEÇÃO: flashcards | Flashcards de revisão ---");
    const txt = [
      "```",
      "=== AULA ===",
      "Título: Coesão textual",
      "Matéria: Língua Portuguesa",
      "Tipo: tema",
      "Objetivo: Reconhecer a referenciação.",
      "=== TEXTO-BASE ===",
      "1 Referenciação",
      "=== MÓDULO: Base ===",
      "--- SEÇÃO: explicação | O que é ---",
      "A referenciação retoma termos.",
      "",
      ":::exemplo",
      "Situação: Ana escreve \"ele\" para retomar \"o réu\".",
      "Pergunta: Que mecanismo é esse?",
      "**Resposta:** Referenciação **pronominal**.",
      'Tirinha: [{"cenario": "escola", "legenda": "Ana revisa o texto", "personagens": [{"p": "professor", "lado": "esq", "pose": "aponta", "humor": "serio"}], "fala": {"quem": 0, "texto": "Quem é ele?"}}]',
      "Carimbo: Coesão ok | ok",
      'Esquema: {"tipo": "fluxo", "passos": [{"rotulo": "Termo citado", "estado": "ok"}, {"rotulo": "Pronome retoma", "estado": "ok"}]}',
      ":::",
      "=== MÓDULO: Revisão final ===",
      "--- SEÇÃO: flashcards | Flashcards de revisão ---",
      "**O que é referenciação?**",
      "→ Retomar termos já citados.",
      "",
      "**Conectivo liga o quê?**",
      "→ **Ideias** e orações.",
      "```",
    ].join("\n");
    const p = parseLessonUpload(txt);
    expect(p.errors).toEqual([]);
    const { cases } = extractPractice(p.sections[0]!.bodyMarkdown);
    expect(cases).toHaveLength(1);
    expect(cases[0]!.strip?.length).toBe(1);
    expect(cases[0]!.stamp).toMatchObject({ tone: "ok" });
    expect(cases[0]!.scheme).toBeTruthy();
    const flash = p.sections.find((s) => s.kind === "flashcards")!;
    expect(parseFlashcards(flash.bodyMarkdown)).toHaveLength(2);
  });
});

describe("catalogação sem erro (tolerante)", () => {
  it("texto só com questões, sem nenhuma seção, não dá erro: vira uma seção", () => {
    const t = ["=== QUESTÕES: FÁCIL ===", "--- QUESTÃO ---", "Enunciado: A legítima defesa exclui a ilicitude do fato.", "Gabarito: Certo", "Justificativa: Está no art. 23 do Código Penal."].join("\n");
    const p = parseLessonUpload(t);
    expect(p.errors).toEqual([]);
    expect(p.sections.length).toBeGreaterThanOrEqual(1);
    expect(p.questions).toHaveLength(1);
  });
  it("texto solto no bloco de questões vira questão e questão sem justificativa é aproveitada", () => {
    const t = ["=== AULA ===", "Título: T", "=== MÓDULO: M ===", "--- SEÇÃO: explicação | S ---", "texto", "=== QUESTÕES: MÉDIO ===", "O estado de necessidade exige perigo atual?", "Tipo: certo ou errado", "Gabarito: Correto"].join("\n");
    const p = parseLessonUpload(t);
    expect(p.warnings.join("\n")).not.toMatch(/fora de uma questão/);
    expect(p.questions).toHaveLength(1);
    expect(p.questions[0]).toMatchObject({ type: "certo_errado", answer: "certo" });
  });
  it("gabarito 'Letra B' e 'Certo' sem Tipo funcionam", () => {
    const t = ["=== QUESTÕES: DIFÍCIL ===", "--- QUESTÃO ---", "Enunciado: Qual é a alternativa correta sobre o tema?", "A) um", "B) dois", "Gabarito: Letra B", "Justificativa: A segunda está certa, conforme a lei.", "--- QUESTÃO ---", "Enunciado: Todo crime exige conduta humana para existir.", "Gabarito: Certo", "Justificativa: Sem conduta não há fato típico."].join("\n");
    const p = parseLessonUpload(t);
    expect(p.questions.map((q) => q.answer)).toEqual(["B", "certo"]);
  });
});
