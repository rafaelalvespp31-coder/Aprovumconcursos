import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../observability", () => ({ logEvent: vi.fn(async () => undefined) }));

const gerar = vi.fn();
vi.mock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent: gerar }; } }));

import { PAGINA_46 } from "@/domain/edital/fixtures/pc-mg-pagina-46";
import { avancarEspecialista, type EstadoLeitura, type Passo } from "./edital-especialista";

const PAG45 = "4545\n4. DIREITO ADMINISTRATIVO\n4.1 Estado, governo e administração pública. 4.2 Poderes administrativos: poder hierárquico, poder disciplinar, poder regulamentar e poder de polícia.\n5. NOÇÕES DE DIREITO PENAL E PROCESSUAL PENAL\n5.1 Princípios básicos. 5.2 Aplicação da lei penal. 5.2.1 Teoria do crime e das penas.";
const PAG47 = "4747\n7.6.2 Limite e modificadores da responsabilidade penal e capacidade civil. 7.6.3 Repercussões médico-legais dos distúrbios psíquicos.";
const PAG48 = "4848\nANEXO II EXAMES BIOMÉDICOS INVESTIGADOR DE POLÍCIA I CONDIÇÕES CLÍNICAS, SINAIS OU SINTOMAS INCAPACITANTES";
const PAGINAS = [...Array<string>(42).fill("Disposições do edital: inscrições, vagas e provas."), "4343\nANEXO I CONTEÚDO PROGRAMÁTICO INVESTIGADOR DE POLÍCIA I\nCONHECIMENTOS BÁSICOS\n1. LÍNGUA PORTUGUESA\n1.1 Interpretação e compreensão de textos. 1.2 Emprego das classes de palavras e das relações sintáticas.\n2. NOÇÕES DE INFORMÁTICA\n2.1 Conceitos de internet e intranet. 2.2 Navegadores e correio eletrônico.", "4444\n2.3 Segurança da informação e backup de arquivos.\n3. RACIOCÍNIO LÓGICO\n3.1 Estruturas lógicas e lógica de argumentação.", PAG45, PAGINA_46, PAG47, PAG48];

const resp = (o: unknown) => ({ text: JSON.stringify(o) });
const identificacao = (extra: Record<string, unknown> = {}) => resp({ concurso: "Polícia Civil de Minas Gerais", cargos: ["Investigador de Polícia I", "Escrivão de Polícia I"], cargo_usado: "Investigador de Polícia I", pagina_inicio: 43, pagina_fim: 47, disciplinas: [{ nome: "LÍNGUA PORTUGUESA", pagina: 43 }, { nome: "NOÇÕES DE MEDICINA LEGAL", pagina: 46 }], ...extra });

/** Modelo de mentira: separa o trecho por linhas de título em maiúsculas e pela numeração dos itens. */
function lerTrecho(trecho: string) {
  const blocos: Array<{ materia: string | null; texto: string[] }> = [{ materia: null, texto: [] }];
  for (const linha of trecho.split("\n")) {
    const h = /^\d+\.\s+([A-ZÀ-Ú][A-ZÀ-Ú ]{6,})$/.exec(linha.trim());
    if (h) blocos.push({ materia: h[1]!, texto: [] }); else blocos[blocos.length - 1]!.texto.push(linha);
  }
  return {
    blocos: blocos.map((b) => {
      const corrido = b.texto.join(" ").split(/\sANEXO\s/)[0]!; // o modelo de verdade também ignora o anexo seguinte
      const itens = [...corrido.matchAll(/(\d+(?:\.\d+)+)\.?\s+(.+?)(?=\s\d+(?:\.\d+)+\.?\s|$)/g)];
      return { materia: b.materia, topicos: itens.map((m) => ({ codigo: m[1]!, nivel: 1, titulo: m[2]!.replace(/[.;]\s*$/, "").trim() })) };
    }).filter((b) => b.topicos.length || b.materia),
  };
}
const modeloPadrao = async ({ contents }: { contents: string }) => contents.includes("Leia o edital INTEIRO") ? identificacao() : resp(lerTrecho(contents.split("TRECHO:\n")[1] ?? ""));

let agora = 0;
const ganchos = () => { const avisos: string[] = []; let salvo: EstadoLeitura | null = null; return { avisos, get salvo() { return salvo; }, g: { salvar: async (e: EstadoLeitura) => { salvo = JSON.parse(JSON.stringify(e)); }, avisar: async (m: string) => { avisos.push(m); } } }; };

beforeEach(() => {
  gerar.mockReset();
  process.env.GEMINI_API_KEY = "k";
  delete process.env.GEMINI_EDITAL_MODEL;
  agora = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => agora);
});
afterEach(() => vi.restoreAllMocks());

describe("avancarEspecialista", () => {
  it("sem chave da IA: não chama o Gemini", async () => {
    delete process.env.GEMINI_API_KEY;
    expect(await avancarEspecialista(PAGINAS, null, null, null, ganchos().g)).toEqual({ tipo: "falhou", motivo: "sem_chave" });
    expect(gerar).not.toHaveBeenCalled();
  });

  it("lê o edital, o conteúdo programático em trechos e entrega as matérias completas (pg. 43–47), sem pegar o anexo seguinte", async () => {
    gerar.mockImplementation(modeloPadrao);
    const h = ganchos();
    const r = await avancarEspecialista(PAGINAS, "Investigador de Polícia I", null, null, h.g);
    expect(r.tipo).toBe("pronto");
    if (r.tipo !== "pronto" || !r.parsed) throw new Error("esperava estrutura");
    const nomes = r.parsed.disciplines.map((d) => d.name);
    expect(nomes).toEqual(["LÍNGUA PORTUGUESA", "NOÇÕES DE INFORMÁTICA", "RACIOCÍNIO LÓGICO", "DIREITO ADMINISTRATIVO", "NOÇÕES DE DIREITO PENAL E PROCESSUAL PENAL", "NOÇÕES DE DIREITOS HUMANOS", "NOÇÕES DE MEDICINA LEGAL"]);
    const medicina = r.parsed.disciplines.find((d) => d.name === "NOÇÕES DE MEDICINA LEGAL")!;
    expect(medicina.topics.some((t) => t.code === "7.6.3" && t.page === 47)).toBe(true); // a página que a leitura antiga perdia
    expect(r.parsed.disciplines.flatMap((d) => d.topics).some((t) => /EXAMES BIOM/i.test(t.title))).toBe(false);
    expect(r.leitura.cobertura).toBeGreaterThan(0.9);
    expect(r.leitura.descartados).toBe(0);
    expect(h.avisos.some((a) => a.includes("págs. 43–48"))).toBe(true); // 47 + 1 de folga
    // a identificação leu o edital inteiro; cada trecho foi pedido sem "pensar" (rápido)
    const cfg = gerar.mock.calls[1]![0].config;
    expect(cfg.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it("em várias chamadas: o orçamento de tempo acaba, o estado é salvo e a chamada seguinte continua de onde parou", async () => {
    gerar.mockImplementation(async (a: { contents: string }) => { agora += 20_000; return modeloPadrao(a); });
    const h = ganchos();
    let passo: Passo = await avancarEspecialista(PAGINAS, "Investigador de Polícia I", null, null, h.g);
    expect(passo.tipo).toBe("continua");
    let chamadas = 1;
    while (passo.tipo === "continua" && chamadas < 20) {
      agora += 1_000;
      passo = await avancarEspecialista(PAGINAS, "Investigador de Polícia I", JSON.parse(JSON.stringify(h.salvo)), null, h.g);
      chamadas++;
    }
    expect(passo.tipo).toBe("pronto");
    expect(chamadas).toBeGreaterThan(1);
    if (passo.tipo === "pronto") expect(passo.parsed!.disciplines.length).toBe(7);
    // a etapa 1 (edital inteiro) foi feita uma só vez
    expect(gerar.mock.calls.filter(([a]) => a.contents.includes("Leia o edital INTEIRO")).length).toBe(1);
  });

  it("auditoria: o que o modelo pulou volta numa releitura e entra na estrutura", async () => {
    let primeira = true;
    gerar.mockImplementation(async (a: { contents: string }) => {
      if (a.contents.includes("Leia o edital INTEIRO")) return identificacao();
      const t = lerTrecho(a.contents.split("TRECHO:\n")[1] ?? "");
      if (primeira && !a.contents.includes("ficou sem classificação")) {
        for (const b of t.blocos) b.topicos = b.topicos.filter((x) => !["6.4", "6.5", "6.6"].includes(x.codigo));
      }
      return resp(t);
    });
    const h = ganchos();
    const r = await avancarEspecialista(PAGINAS, "Investigador de Polícia I", null, null, h.g);
    primeira = false;
    expect(r.tipo).toBe("pronto");
    if (r.tipo !== "pronto" || !r.parsed) throw new Error("esperava estrutura");
    expect(h.avisos.some((a) => a.startsWith("Auditoria:"))).toBe(true);
    const dh = r.parsed.disciplines.find((d) => d.name === "NOÇÕES DE DIREITOS HUMANOS")!;
    expect(dh.topics.map((t) => t.code)).toEqual(["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10"]);
  });

  it("vários cargos e cargo não informado: pede o cargo ao aluno", async () => {
    gerar.mockResolvedValueOnce(identificacao({ disciplinas: [], cargo_usado: null }));
    const r = await avancarEspecialista(PAGINAS, null, null, null, ganchos().g);
    expect(r.tipo === "pronto" && r.precisaCargo).toBe(true);
    expect(r.tipo === "pronto" && r.info.cargos).toEqual(["Investigador de Polícia I", "Escrivão de Polícia I"]);
  });

  it("modelo inexistente: troca para o seguinte e guarda o que funcionou", async () => {
    gerar.mockRejectedValueOnce(new Error("404 model not found")).mockImplementation(modeloPadrao);
    const r = await avancarEspecialista(PAGINAS, "Investigador de Polícia I", null, null, ganchos().g);
    expect(r.tipo).toBe("pronto");
    expect(gerar.mock.calls[0]![0].model).not.toBe(gerar.mock.calls[1]![0].model);
    if (r.tipo === "pronto") expect(r.modelo).toBe(gerar.mock.calls[1]![0].model);
  });

  it("modelo que não aceita desligar o raciocínio: repete sem a opção", async () => {
    gerar.mockRejectedValueOnce(new Error("400 thinking budget is not supported for this model")).mockImplementation(modeloPadrao);
    const r = await avancarEspecialista(PAGINAS, "Investigador de Polícia I", null, null, ganchos().g);
    expect(r.tipo).toBe("pronto");
    expect(gerar.mock.calls[0]![0].model).toBe(gerar.mock.calls[1]![0].model);
    expect(gerar.mock.calls[1]![0].config.thinkingConfig).toBeUndefined();
  });

  it("trecho que nunca responde é dividido em dois; sem como dividir e sem tentativas, falha sem inventar nada", async () => {
    gerar.mockImplementation(async (a: { contents: string }) => a.contents.includes("Leia o edital INTEIRO") ? identificacao() : { text: "isto não é json" });
    const r = await avancarEspecialista(PAGINAS, "Investigador de Polícia I", null, null, ganchos().g);
    expect(r).toEqual({ tipo: "falhou", motivo: "trecho_sem_resposta" });
  });

  it("resposta de identificação inválida repetida: falha (a leitura estrutural assume)", async () => {
    gerar.mockResolvedValue({ text: "isto não é json" });
    const h = ganchos();
    let passo: Passo = await avancarEspecialista(PAGINAS, null, null, null, h.g);
    for (let i = 0; i < 4 && passo.tipo === "continua"; i++) passo = await avancarEspecialista(PAGINAS, null, h.salvo, null, h.g);
    expect(passo).toEqual({ tipo: "falhou", motivo: "sem_resposta" });
  });

  it("o modelo inventou tudo: a cobertura baixa derruba a leitura do especialista", async () => {
    gerar.mockImplementation(async (a: { contents: string }) => a.contents.includes("Leia o edital INTEIRO") ? identificacao() : resp({ blocos: [{ materia: "FÍSICA QUÂNTICA", topicos: [{ codigo: "1", nivel: 1, titulo: "Mecânica quântica aplicada à perícia criminal" }, { codigo: "2", nivel: 1, titulo: "Astrofísica de partículas forenses" }, { codigo: "3", nivel: 1, titulo: "Teoria das cordas e balística" }] }] }));
    const r = await avancarEspecialista(PAGINAS, "Investigador de Polícia I", null, null, ganchos().g);
    expect(r).toEqual({ tipo: "falhou", motivo: "cobertura_baixa" });
  });
});
