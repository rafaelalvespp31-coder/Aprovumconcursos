import { fold } from "./text";

/**
 * Nome da disciplina do edital → matéria do catálogo (slug). Reconhecimento por termos; o que não
 * for reconhecido fica sem matéria (a correspondência então procura em todo o catálogo, com peso menor).
 */
const RULES: Array<[RegExp, string]> = [
  [/\b(lingua portuguesa|portugues|redacao oficial|interpretacao de texto)\b/, "lingua_portuguesa"],
  [/\braciocinio logico\b|\blogica\b/, "raciocinio_logico"],
  [/\bmatematica\b|\bestatistica\b/, "matematica"],
  [/\binformatica\b|\bnocoes de informatica\b|\bseguranca da informacao\b/, "informatica"],
  [/\bdireito constitucional\b|\bconstituicional\b/, "direito_constitucional"],
  [/\bdireito administrativo\b|\badministrativo\b/, "direito_administrativo"],
  [/\bdireito processual penal\b|\bprocesso penal\b/, "direito_processual_penal"],
  [/\bdireito penal\b|\bpenal militar\b/, "direito_penal"],
  [/\blegislacao (especial|penal especial|extravagante|de transito|institucional|especifica)\b|\bdireitos humanos\b|\bestatuto\b|\blegislacao\b/, "legislacao_especial"],
  [/\bconhecimentos (especificos|profissionais)\b|\bnocoes de (criminologia|direito)\b|\bcriminologia\b|\betica\b/, "conhecimentos_especificos"],
];

export function modeOfDiscipline(name: string): string | null {
  const f = fold(name);
  for (const [re, mode] of RULES) if (re.test(f)) return mode;
  return null;
}

/** Palavras que, num título em caixa-alta, indicam uma disciplina (usado no reconhecimento de títulos). */
export const DISCIPLINE_HINT =
  /\b(lingua portuguesa|portugues|raciocinio logico|matematica|estatistica|informatica|direito|legislacao|conhecimentos|nocoes|etica|criminologia|geografia|historia|atualidades|fisica|quimica|biologia|contabilidade|economia|administracao|arquivologia|didatica|pedagogia|ingles|espanhol|redacao|medicina|enfermagem|odontologia|psicologia|servico social|engenharia|tecnologia|banco de dados|programacao|redes|seguranca|inteligencia|policiamento|transito|direitos humanos|primeiros socorros|armamento|tiro)\b/;
