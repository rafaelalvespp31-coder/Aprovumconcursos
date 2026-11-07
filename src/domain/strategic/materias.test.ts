import { describe, expect, it } from "vitest";
import { materiaOf } from "./materias";

const CE = "Conhecimentos Específicos";
describe("materiaOf", () => {
  it.each([
    ["Código de Processo Penal", "Direito Processual Penal"],
    ["Prisão em flagrante", "Direito Processual Penal"],
    ["Provas e busca e apreensão", "Direito Processual Penal"],
    ["Juizados Especiais", "Direito Processual Penal"],
    ["Código Penal – Crimes contra a pessoa", "Direito Penal (Código Penal)"],
    ["Código Penal – Parte Geral", "Direito Penal (Código Penal)"],
    ["Lei de Drogas – Lei 11.343/2006", "Legislação Penal Especial"],
    ["Lei de Abuso de Autoridade – Lei 13.869/2019", "Legislação Penal Especial"],
    ["Estatuto do Desarmamento – Lei 10.826/2003", "Legislação Penal Especial"],
    ["Constituição Federal – artigo 144", "Direito Constitucional"],
    ["Lei de Improbidade Administrativa", "Direito Administrativo"],
    ["Estatuto Geral das Guardas Municipais – Lei 13.022/2014", "Segurança Pública e Guarda Municipal"],
    ["Sistema Único de Segurança Pública – Lei 13.675/2018", "Segurança Pública e Guarda Municipal"],
    ["Estatuto da Pessoa Idosa", "Estatutos e Proteção de Direitos"],
    ["Código de Trânsito Brasileiro", "Legislação de Trânsito"],
    ["Legislação municipal de Paulínia", "Legislação Municipal"],
    ["Lei Geral de Proteção de Dados – Lei 13.709/2018", "Outras legislações"],
  ])("%s → %s", (title, m) => expect(materiaOf(CE, title)).toBe(m));
  it("não mexe em disciplinas simples", () => {
    expect(materiaOf("Língua Portuguesa", "Classes de palavras")).toBe("Língua Portuguesa");
    expect(materiaOf("Matemática e Raciocínio Lógico", "Sequências lógicas")).toBe("Matemática e Raciocínio Lógico");
  });
});
