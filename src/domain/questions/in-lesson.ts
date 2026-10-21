/**
 * Menu Questões: só entram as questões que aparecem no texto da própria aula
 * ("questões comentadas" dentro do conteúdo). Regra pura, sem I/O.
 */

/** Minúsculas, sem marcação de Markdown nem pontuação, espaços únicos. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[*_>`"“”‘’]/g, "")
    .replace(/[^a-zà-ú0-9]+/g, " ")
    .trim();
}

// Parágrafos de cabeçalho que o banco põe antes do enunciado e que não estão no texto da aula.
const HEADER = /^(quest[ãa]o autoral|julgue o item|julgue os itens)/i;

/** Enunciado sem os parágrafos de cabeçalho do banco. */
export function coreStatement(statement: string): string {
  return statement
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !HEADER.test(p))
    .join(" ");
}

const KEY = 60;
const OPT_KEY = 40;

/**
 * A questão está no texto da aula quando o início do enunciado aparece nele; na
 * múltipla escolha, também quando ao menos duas alternativas aparecem (o enunciado
 * do banco às vezes recebe o tema na frente, ex.: "Sobre X, assinale…").
 */
export function appearsInLesson(q: { statement: string; options?: string[] }, normalizedLessonText: string): boolean {
  const key = normalizeForMatch(coreStatement(q.statement)).slice(0, KEY).trim();
  // Enunciados genéricos ("Assinale a alternativa correta") são curtos demais para identificar a questão.
  if (key.length >= 35 && normalizedLessonText.includes(key)) return true;
  const opts = (q.options ?? []).map((o) => normalizeForMatch(o).slice(0, OPT_KEY).trim()).filter((o) => o.length >= 12);
  return opts.length >= 2 && opts.filter((o) => normalizedLessonText.includes(o)).length >= 2;
}
