import { fold } from "@/domain/edital/text";

/**
 * "Conhecimentos Específicos" costuma juntar várias matérias (Código Penal, Processo Penal, leis especiais...).
 * Este classificador separa os assuntos por matéria, só pelo título, de forma determinística.
 * Fora das disciplinas "agrupadoras", a matéria é a própria disciplina.
 */
export const MATERIAS_ESPECIFICAS = [
  "Direito Penal (Código Penal)",
  "Direito Processual Penal",
  "Legislação Penal Especial",
  "Direito Constitucional",
  "Direito Administrativo",
  "Segurança Pública e Guarda Municipal",
  "Estatutos e Proteção de Direitos",
  "Legislação de Trânsito",
  "Legislação Municipal",
  "Outras legislações",
] as const;

const RULES: Array<[RegExp, (typeof MATERIAS_ESPECIFICAS)[number]]> = [
  [/processo penal|prisao em flagrante|provas e busca|busca e apreensao|juizados especiais|inquerito|acao penal/, "Direito Processual Penal"],
  [/codigo penal|parte geral|crimes contra/, "Direito Penal (Código Penal)"],
  [/abuso de autoridade|drogas|tortura|hediondos|maria da penha|7 716|preconceito|desarmamento|lei de armas|organizacao criminosa|lavagem/, "Legislação Penal Especial"],
  [/constituicao federal|direitos e garantias|direitos fundamentais|art(igo)?s? \d/, "Direito Constitucional"],
  [/improbidade|licitac|servidor|ato administrativo|administracao publica/, "Direito Administrativo"],
  [/guardas? municipa|seguranca publica|13 675|13 022|susp\b/, "Segurança Pública e Guarda Municipal"],
  [/crianca|adolescente|idos[ao]|pessoa idosa|igualdade racial|estatuto/, "Estatutos e Proteção de Direitos"],
  [/transito/, "Legislação de Trânsito"],
  [/municipal/, "Legislação Municipal"],
];

const AGRUPADORA = /especific|legislacao|direito|seguranca|profission/;

/** Matéria do assunto: a classificação acima nas disciplinas agrupadoras; senão, o nome da disciplina. */
export function materiaOf(subject: string, title: string): string {
  if (!AGRUPADORA.test(fold(subject))) return subject;
  const t = fold(title);
  for (const [re, m] of RULES) if (re.test(t)) return m;
  return /especific/.test(fold(subject)) ? "Outras legislações" : subject;
}

/** Posição da matéria na ordem didática (penal → processual → especial → constitucional...). */
export const materiaOrder = (m: string) => { const i = (MATERIAS_ESPECIFICAS as readonly string[]).indexOf(m); return i < 0 ? 99 : i; };
