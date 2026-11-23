import { describe, expect, it } from "vitest";
import {
  LACUNA_MINIMA, compacto, dividirEmTrechos, limparPagina, montarResultado, montarSecao, partirTrecho, pedidoTrecho, validarIdentificacao, validarTrecho, type Bloco, type TrechoLido,
} from "./especialista";
import { PAGINA_46 } from "./fixtures/pc-mg-pagina-46";

const secao = () => montarSecao([...Array<string>(45).fill(""), PAGINA_46], 46, 46);

/** Modelo de mentira: separa por numeração e por linhas de título em maiúsculas, como o Gemini deve fazer. */
function modeloFalso(texto: string): Bloco[] {
  const blocos: Bloco[] = [];
  let atual: Bloco = { materia: null, topicos: [] };
  const abre = () => { if (atual.topicos.length || atual.materia) blocos.push(atual); };
  for (const linha of texto.split("\n")) {
    const h = /^\d+\.\s+([A-ZÀ-Ú][A-ZÀ-Ú ]{6,})$/.exec(linha.trim());
    if (h) { abre(); atual = { materia: h[1]!, topicos: [] }; continue; }
    // a numeração pode começar no fim da linha anterior: junta tudo e corta nos códigos
    atual.topicos.push({ codigo: null, nivel: 1, titulo: `\u0001${linha}` });
  }
  abre();
  return blocos.map((b) => {
    const corrido = b.topicos.map((t) => t.titulo.slice(1)).join(" ");
    const itens = [...corrido.matchAll(/(\d+(?:\.\d+)+)\.?\s+(.+?)(?=\s\d+(?:\.\d+)+\.?\s|$)/g)];
    return { materia: b.materia, topicos: itens.map((m) => ({ codigo: m[1]!, nivel: 1, titulo: m[2]!.replace(/[.;]\s*$/, "").trim() })) };
  });
}

const ler = (s: ReturnType<typeof secao>, alvo = 900): TrechoLido[] => dividirEmTrechos(s.texto, alvo, 200).map((f) => ({ ...f, blocos: modeloFalso(s.texto.slice(f.ini, f.fim)) }));

describe("preparação do texto", () => {
  it("tira o número da página repetido no começo e mantém o resto", () => {
    expect(limparPagina(PAGINA_46, 46).startsWith("punível.")).toBe(true);
    expect(limparPagina("4545 Civis 4.2.3.1", 45)).toBe("Civis 4.2.3.1");
    expect(limparPagina("4646 e 4646 no meio", 45)).toBe("4646 e 4646 no meio");
  });

  it("compacto ignora acento, pontuação e quebra de linha", () => {
    expect(compacto("Direitos\nHumanos, 1988!")).toBe("direitoshumanos1988");
  });

  it("divide o conteúdo em trechos que cobrem o texto inteiro, em ordem, com sobreposição curta", () => {
    const s = secao();
    const t = dividirEmTrechos(s.texto, 900, 200);
    expect(t.length).toBeGreaterThan(2);
    expect(t[0]!.ini).toBe(0);
    expect(t[t.length - 1]!.fim).toBe(s.texto.length);
    for (let i = 1; i < t.length; i++) {
      expect(t[i]!.ini).toBeLessThanOrEqual(t[i - 1]!.fim); // nada fica sem ser lido
      expect(t[i]!.ini).toBeGreaterThan(t[i - 1]!.ini); // sempre avança
    }
    for (const f of t) expect(f.fim - f.ini).toBeLessThanOrEqual(1_000);
  });

  it("trecho pequeno não é partido; trecho grande vira dois que se cobrem", () => {
    expect(partirTrecho("x".repeat(2000), { ini: 0, fim: 2000 })).toBeNull();
    const txt = Array.from({ length: 500 }, (_, i) => `item ${i}.`).join(" ");
    const [a, b] = partirTrecho(txt, { ini: 0, fim: txt.length })!;
    expect(a.ini).toBe(0);
    expect(b.fim).toBe(txt.length);
    expect(b.ini).toBeLessThanOrEqual(a.fim);
  });
});

describe("montarResultado", () => {
  it("lê o trecho real inteiro: todos os itens, sem duplicar os da sobreposição, matéria herdada e profundidade pelo código", () => {
    const s = secao();
    const r = montarResultado(s, ler(s));
    const por = new Map(r.parsed.disciplines.map((d) => [d.name, d]));
    expect([...por.keys()]).toEqual(["Conteúdo programático", "NOÇÕES DE DIREITOS HUMANOS", "NOÇÕES DE MEDICINA LEGAL"]);
    const todos = r.parsed.disciplines.flatMap((d) => d.topics.map((t) => t.code));
    expect(new Set(todos).size).toBe(todos.length); // sem repetição
    expect(por.get("NOÇÕES DE DIREITOS HUMANOS")!.topics.map((t) => t.code)).toEqual(["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10"]);
    expect(por.get("NOÇÕES DE MEDICINA LEGAL")!.topics.some((t) => t.code === "7.3.4")).toBe(true);
    expect(por.get("Conteúdo programático")!.topics.some((t) => t.code === "5.6.8" && t.title.startsWith("Busca e apreensão"))).toBe(true);
    // profundidade relativa à matéria: 6.1 é item principal; 7.1.1 é subitem; 5.2.10 e 5.3 ficam no mesmo nível-base do bloco
    expect(por.get("NOÇÕES DE DIREITOS HUMANOS")!.topics[0]!.depth).toBe(1);
    expect(por.get("NOÇÕES DE MEDICINA LEGAL")!.topics.find((t) => t.code === "7.1.1")!.depth).toBe(2);
    expect(r.descartados).toBe(0);
    expect(r.cobertura).toBeGreaterThan(0.97);
    expect(r.lacunas).toEqual([]);
    expect(r.parsed.sectionPages).toEqual([46, 46]);
    expect(r.parsed.disciplines.every((d) => d.topics.every((t) => t.page === 46))).toBe(true);
  });

  it("tópico que o modelo inventou não existe no edital: é descartado e contado", () => {
    const s = secao();
    const trechos = ler(s);
    trechos[0]!.blocos[0]!.topicos.push({ codigo: "9.9", nivel: 1, titulo: "Balística forense avançada e telepatia investigativa" });
    const r = montarResultado(s, trechos);
    expect(r.descartados).toBe(1);
    expect(r.parsed.disciplines.flatMap((d) => d.topics).some((t) => t.title.includes("telepatia"))).toBe(false);
    expect(r.parsed.warnings.join(" ")).toMatch(/descartado/);
  });

  it("o que o modelo pulou aparece como trecho sem classificação (e a cobertura cai), para a auditoria reler", () => {
    const s = secao();
    const trechos = ler(s);
    // tira do modelo os itens 6.4 a 6.8
    for (const t of trechos) for (const b of t.blocos) b.topicos = b.topicos.filter((x) => !["6.4", "6.5", "6.6", "6.7", "6.8"].includes(x.codigo ?? ""));
    const r = montarResultado(s, trechos);
    expect(r.cobertura).toBeLessThan(0.95);
    expect(r.lacunas.length).toBeGreaterThan(0);
    const texto = r.lacunas.map((l) => l.texto).join(" ");
    expect(texto).toContain("Constituição da República Federativa");
    expect(texto).toContain("Educação e cultura");
    expect(r.lacunas.every((l) => compacto(l.texto).length >= LACUNA_MINIMA)).toBe(true);
    // reler só o que sobrou recupera os itens e fecha a cobertura
    const extra: TrechoLido[] = r.lacunas.map((l) => ({ ini: l.ini, fim: l.fim, blocos: modeloFalso(s.texto.slice(l.ini, l.fim)) }));
    const depois = montarResultado(s, [...trechos, ...extra]);
    expect(depois.cobertura).toBeGreaterThan(0.95);
    const dh = depois.parsed.disciplines.find((d) => d.name === "NOÇÕES DE DIREITOS HUMANOS")!;
    expect(dh.topics.map((t) => t.code)).toEqual(["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10"]);
  });

  it("matéria que reaparece mais adiante no texto é uma só", () => {
    const s = montarSecao(["1. DIREITO PENAL\n1.1 Princípios da legalidade e anterioridade da lei penal.\n2. LÍNGUA PORTUGUESA\n2.1 Interpretação de textos e tipologia textual.\n1. DIREITO PENAL\n1.2 Aplicação da lei penal no tempo e no espaço."], 1, 1);
    const blocos: Bloco[] = [
      { materia: "DIREITO PENAL", topicos: [{ codigo: "1.1", nivel: 1, titulo: "Princípios da legalidade e anterioridade da lei penal" }] },
      { materia: "LÍNGUA PORTUGUESA", topicos: [{ codigo: "2.1", nivel: 1, titulo: "Interpretação de textos e tipologia textual" }] },
      { materia: "Direito Penal", topicos: [{ codigo: "1.2", nivel: 1, titulo: "Aplicação da lei penal no tempo e no espaço" }] },
    ];
    const r = montarResultado(s, [{ ini: 0, fim: s.texto.length, blocos }]);
    expect(r.parsed.disciplines.map((d) => [d.name, d.topics.length])).toEqual([["DIREITO PENAL", 2], ["LÍNGUA PORTUGUESA", 1]]);
  });
});

describe("validação das respostas", () => {
  it("trecho: aceita lista vazia, ignora título curto e repetição imediata", () => {
    expect(validarTrecho('{"blocos":[]}')).toEqual([]);
    expect(validarTrecho("lixo")).toBeNull();
    const b = validarTrecho(JSON.stringify({ blocos: [{ materia: "  Direito  Penal ", topicos: [{ codigo: "1", nivel: 1, titulo: "x" }, { codigo: "1.1", nivel: 2, titulo: "Crimes" }, { codigo: "1.1", nivel: 2, titulo: "Crimes" }] }] }))!;
    expect(b[0]!.materia).toBe("Direito Penal");
    expect(b[0]!.topicos).toEqual([{ codigo: "1.1", nivel: 2, titulo: "Crimes" }]);
  });

  it("identificação: nomes únicos, páginas dentro do PDF, faixa invertida corrigida", () => {
    const i = validarIdentificacao({ cargos: ["Investigador"], pagina_inicio: 46, pagina_fim: 43, disciplinas: [{ nome: "Direito Penal", pagina: 45 }, { nome: "direito  penal", pagina: 46 }, { nome: "Medicina Legal", pagina: 999 }] }, 61)!;
    expect([i.paginaInicio, i.paginaFim]).toEqual([43, 46]);
    expect(i.disciplinas).toEqual([{ nome: "Direito Penal", pagina: 45 }, { nome: "Medicina Legal", pagina: null }]);
  });

  it("o pedido manda ler todos os itens, sem pular, e avisa quando é releitura de trecho sem classificação", () => {
    const p = pedidoTrecho("texto", ["Direito Penal"], "Investigador", false);
    expect(p).toMatch(/TODOS os itens/);
    expect(p).toContain("Investigador");
    expect(pedidoTrecho("texto", [], null, true)).toMatch(/sem classificação/);
  });
});
