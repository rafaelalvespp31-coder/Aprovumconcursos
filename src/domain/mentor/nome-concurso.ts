/** Siglas comuns que o aluno digita, mostradas por extenso para ficar claro de qual concurso é o plano. */
const SIGLAS: Record<string, string> = {
  prf: "Polícia Rodoviária Federal",
  pf: "Polícia Federal",
  pcdf: "Polícia Civil do Distrito Federal",
  pmdf: "Polícia Militar do Distrito Federal",
  pmmg: "Polícia Militar de Minas Gerais",
  pcmg: "Polícia Civil de Minas Gerais",
  ppmg: "Polícia Penal de Minas Gerais",
  "pp mg": "Polícia Penal de Minas Gerais",
  "pp-mg": "Polícia Penal de Minas Gerais",
  depen: "Departamento Penitenciário Nacional",
  inss: "Instituto Nacional do Seguro Social",
  trt: "Tribunal Regional do Trabalho",
  trf: "Tribunal Regional Federal",
  tjmg: "Tribunal de Justiça de Minas Gerais",
  cgu: "Controladoria-Geral da União",
  bb: "Banco do Brasil",
  cef: "Caixa Econômica Federal",
};

export function nomeConcurso(texto: string): { nome: string; sigla: string | null } {
  const t = texto.trim().replace(/\s+/g, " ");
  const k = t.toLowerCase().replace(/\./g, "");
  const full = SIGLAS[k];
  return full ? { nome: full, sigla: t.toUpperCase() } : { nome: t, sigla: null };
}
