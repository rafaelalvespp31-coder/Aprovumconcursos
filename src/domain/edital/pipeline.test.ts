import { describe, expect, it } from "vitest";
import { parseEdital } from "./parser";
import { filterPagesByRole } from "./role-filter";
import { computePriorities, extractScoring } from "./scoring";
import { detectRoles } from "./info";

const EDITAL = [
  `EDITAL Nº 01/2026 - CONCURSO PÚBLICO
CARGO: GUARDA CIVIL MUNICIPAL
CARGO: AGENTE ADMINISTRATIVO
CARGO: MOTORISTA
Inscrições, vagas e banca organizadora. Candidatos nomeados e posse.
Remuneração e vencimentos conforme a lei.`,
  `QUADRO DE PROVAS
CARGO: GUARDA CIVIL MUNICIPAL
Disciplina | Questões | Peso | Pontos
Língua Portuguesa | 10 | 2,0 | 20
Direito Penal | 20 | 3,0 | 60
CARGO: AGENTE ADMINISTRATIVO
Disciplina | Questões | Peso | Pontos
Língua Portuguesa | 20 | 1,0 | 20
Informática | 20 | 1,0 | 20`,
  `ANEXO I - CONTEÚDO PROGRAMÁTICO
CARGO: GUARDA CIVIL MUNICIPAL
LÍNGUA PORTUGUESA
1. Compreensão e interpretação de textos
2. Ortografia oficial
DIREITO PENAL
1. Princípios do Direito Penal
2. Aplicação da lei penal
CARGO: AGENTE ADMINISTRATIVO
LÍNGUA PORTUGUESA
1. Acentuação gráfica
INFORMÁTICA
1. Conceitos de internet
2. Planilhas eletrônicas
CARGO: MOTORISTA
LEGISLAÇÃO DE TRÂNSITO
1. Código de Trânsito Brasileiro`,
];

describe("edital com vários cargos, do PDF às prioridades", () => {
  const roles = detectRoles(EDITAL);
  it("acha os cargos", () => expect(roles.length).toBeGreaterThanOrEqual(3));
  it("cargo escolhido: só as disciplinas, questões e pesos dele", () => {
    const f = filterPagesByRole(EDITAL, "Guarda Civil Municipal", roles);
    const parsed = parseEdital(f.pages);
    const names = parsed.disciplines.map((d) => d.name);
    expect(names).toEqual(["LÍNGUA PORTUGUESA", "DIREITO PENAL"]);
    const p = computePriorities(names, extractScoring(f.pages, names));
    expect(p.basis).toBe("questoes_x_peso");
    expect(p.total).toBe(80);
    expect(p.rows.find((r) => r.name === "DIREITO PENAL")!.pct).toBe(75);
    expect(p.rows.find((r) => r.name === "LÍNGUA PORTUGUESA")!.questions).toBe(10); // não pega as 20 do Agente Administrativo
  });
  it("trocar de cargo troca tudo: mesma disciplina, números de outro cargo", () => {
    const f = filterPagesByRole(EDITAL, "Agente Administrativo", roles);
    const names = parseEdital(f.pages).disciplines.map((d) => d.name);
    expect(names).toEqual(["LÍNGUA PORTUGUESA", "INFORMÁTICA"]);
    const p = computePriorities(names, extractScoring(f.pages, names));
    expect(p.rows.find((r) => r.name === "LÍNGUA PORTUGUESA")!.questions).toBe(20);
    expect(p.rows.every((r) => r.priority !== null)).toBe(true);
  });
});
