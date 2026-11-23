import { describe, expect, it } from "vitest";
import { acharAula, comandoDaFalaDoMentor, interpretarComando, perguntaDoMentor, pontuarTitulo, type Candidato } from "./navegacao";

const c = (f: string, ctx = {}) => interpretarComando(f, ctx);

describe("interpretarComando", () => {
  it("abre menus da tela inicial", () => {
    expect(c("Abre os concursos")).toEqual({ tipo: "menu", alvo: "concursos" });
    expect(c("me mostra as matérias por favor")).toEqual({ tipo: "menu", alvo: "materias" });
    expect(c("quero ver as matérias")).toEqual({ tipo: "menu", alvo: "materias" });
  });
  it("vai para qualquer página", () => {
    expect(c("Abre o meu desempenho")).toMatchObject({ tipo: "pagina", rota: "/desempenho" });
    expect(c("me leva para as revisões")).toMatchObject({ tipo: "pagina", rota: "/revisoes" });
    expect(c("vai para o modo jogo")).toMatchObject({ tipo: "pagina", rota: "/quiz" });
    expect(c("abre meu plano de estudo")).toMatchObject({ tipo: "pagina", rota: "/meu-plano-de-estudo" });
    expect(c("abre meu plano")).toMatchObject({ tipo: "pagina", rota: "/plano" });
    expect(c("quero ver os cadernos de questões")).toMatchObject({ tipo: "pagina", rota: "/questoes" });
    expect(c("ir para o perfil")).toMatchObject({ tipo: "pagina", rota: "/perfil" });
    expect(c("volta para a tela inicial")).toBeNull(); // sem verbo de abrir: já está nela
    expect(c("abre a tela inicial")).toMatchObject({ tipo: "pagina", rota: "/painel" });
  });
  it("abre aula por voz", () => {
    expect(c("Abre a aula de MMC")).toEqual({ tipo: "aula", consulta: "mmc" });
    expect(c("quero começar pela aula de regra de três")).toEqual({ tipo: "aula", consulta: "regra de tres" });
    expect(c("começa a aula sobre crase por favor")).toEqual({ tipo: "aula", consulta: "crase" });
    expect(c("quero estudar porcentagem")).toEqual({ tipo: "aula", consulta: "porcentagem" });
    expect(c("pode iniciar a aula de princípios do direito administrativo")).toMatchObject({ tipo: "aula" });
  });
  it("aula sem dizer qual não abre nada (o Mentor pergunta)", () => {
    expect(c("abre uma aula")).toBeNull();
    expect(c("quero estudar")).toBeNull();
  });
  it("concurso: abrir só quando pedir para abrir; estudar para ele é conversa", () => {
    expect(c("abre o concurso da PRF")).toEqual({ tipo: "concurso", consulta: "prf", abrir: true });
    expect(c("quero estudar para o concurso da Polícia Penal")).toEqual({ tipo: "concurso", consulta: "policia penal", abrir: false });
  });
  it("conversa comum e perguntas não navegam", () => {
    expect(c("o que é MMC?")).toBeNull();
    expect(c("me explica a aula de crase")).toBeNull();
    expect(c("como estou indo nas revisões")).toBeNull();
    expect(c("tenho dúvida sobre o desempenho da prova")).toBeNull();
    expect(c("")).toBeNull();
  });
  it("resposta curta à pergunta do Mentor vale como pedido", () => {
    expect(c("Polícia Penal de Minas", { perguntouConcurso: true })).toEqual({ tipo: "concurso", consulta: "policia penal de minas", abrir: false });
    expect(c("MMC", { perguntouAula: true })).toEqual({ tipo: "aula", consulta: "mmc" });
    expect(c("MMC")).toBeNull();
    expect(c("o que a PRF cobra de matemática", { perguntouConcurso: true })).toBeNull();
  });
});

describe("perguntaDoMentor", () => {
  it("detecta as duas perguntas da abertura", () => {
    expect(perguntaDoMentor("Caveira, você quer estudar pra qual concurso? E quer começar pra qual aula?")).toEqual({ concurso: true, aula: true });
    expect(perguntaDoMentor("Fala, Caveira! Na escuta.")).toEqual({ concurso: false, aula: false });
  });
});

describe("acharAula", () => {
  const lista: Candidato[] = [
    { id: "1", titulo: "MMC e MDC", origem: "catalogo" },
    { id: "2", titulo: "Regra de três simples e composta", origem: "catalogo" },
    { id: "3", titulo: "Crase", origem: "catalogo" },
    { id: "4", titulo: "Crase: casos facultativos", origem: "catalogo" },
    { id: "5", titulo: "Porcentagem", origem: "aluno" },
    { id: "6", titulo: "Porcentagem", origem: "catalogo" },
    { id: "7", titulo: "Princípios do Direito Administrativo", origem: "catalogo" },
    { id: "8", titulo: "Atos Administrativos", origem: "catalogo" },
  ];
  it("pontua por palavras, com plural e sem acento", () => {
    expect(pontuarTitulo("regra de tres", "Regra de três simples e composta")).toBeGreaterThan(0.9);
    expect(pontuarTitulo("atos administrativo", "Atos Administrativos")).toBeGreaterThan(0.9);
    expect(pontuarTitulo("geometria", "Crase")).toBe(0);
  });
  it("acha uma aula e prefere a do aluno quando o título é igual", () => {
    expect(acharAula("mmc", lista)).toMatchObject({ tipo: "um", escolhido: { id: "1" } });
    expect(acharAula("regra de três", lista)).toMatchObject({ tipo: "um", escolhido: { id: "2" } });
    expect(acharAula("porcentagem", lista)).toMatchObject({ tipo: "um", escolhido: { id: "5", origem: "aluno" } });
    expect(acharAula("crase", lista)).toMatchObject({ tipo: "um", escolhido: { id: "3" } });
  });
  it("sem correspondência devolve nenhum; empate de aulas diferentes pergunta", () => {
    expect(acharAula("geometria espacial", lista)).toEqual({ tipo: "nenhum" });
    expect(acharAula("administrativo", lista)).toMatchObject({ tipo: "varios" });
  });
});

describe("acharAula com títulos reais do catálogo", () => {
  const reais: Candidato[] = ["Mínimo Múltiplo Comum (MMC)", "Emprego do sinal indicativo de crase", "Conceito e cálculo de porcentagem", "Porcentagem aplicada à resolução de problemas", "Regra de três composta", "Regra de três simples", "Conceito de razão e proporção", "Aplicações práticas de razão, proporção e proporcionalidade", "Princípios básicos do Direito Penal", "Princípios constitucionais do Direito Penal", "Ética, princípios e valores"].map((titulo, i) => ({ id: String(i), titulo, origem: "catalogo" as const }));
  it("abre direto quando só uma aula bate", () => {
    expect(acharAula("mmc", reais)).toMatchObject({ tipo: "um", escolhido: { titulo: "Mínimo Múltiplo Comum (MMC)" } });
    expect(acharAula("crase", reais)).toMatchObject({ tipo: "um", escolhido: { titulo: "Emprego do sinal indicativo de crase" } });
    expect(acharAula("regra de três simples", reais)).toMatchObject({ tipo: "um", escolhido: { titulo: "Regra de três simples" } });
    expect(acharAula("razão e proporção", reais)).toMatchObject({ tipo: "um", escolhido: { titulo: "Conceito de razão e proporção" } });
  });
  it("pergunta qual quando há mais de uma", () => {
    expect(acharAula("porcentagem", reais)).toMatchObject({ tipo: "varios" });
    expect(acharAula("regra de três", reais)).toMatchObject({ tipo: "varios" });
    expect(acharAula("princípios do direito penal", reais)).toMatchObject({ tipo: "varios" });
  });
});

describe("comandoDaFalaDoMentor (rede de segurança)", () => {
  it("o Mentor dizendo que está abrindo vale como comando", () => {
    expect(comandoDaFalaDoMentor("Já abro a aula de MMC. Bons estudos!")).toEqual({ tipo: "aula", consulta: "mmc" });
    expect(comandoDaFalaDoMentor("Abrindo a aula de regra de três simples.")).toEqual({ tipo: "aula", consulta: "regra de tres simples" });
    expect(comandoDaFalaDoMentor("Abrindo as matérias.")).toEqual({ tipo: "menu", alvo: "materias" });
    expect(comandoDaFalaDoMentor("Claro, abrindo o seu desempenho.")).toMatchObject({ tipo: "pagina", rota: "/desempenho" });
  });
  it("oferta, pergunta ou explicação não abre nada", () => {
    expect(comandoDaFalaDoMentor("Posso abrir a aula de MMC se você quiser.")).toBeNull();
    expect(comandoDaFalaDoMentor("Quer que eu abra a aula de crase?")).toBeNull();
    expect(comandoDaFalaDoMentor("O MMC é o menor múltiplo comum entre dois números.")).toBeNull();
    expect(comandoDaFalaDoMentor("")).toBeNull();
  });
});
