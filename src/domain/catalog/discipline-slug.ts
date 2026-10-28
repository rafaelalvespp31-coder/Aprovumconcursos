/** Nome sem acento e em minúsculas (para comparar nomes de matérias). */
export const foldName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Identificador estável de uma matéria a partir do nome ("Direitos Humanos" → "direitos_humanos"). */
export function disciplineSlug(label: string): string {
  return foldName(label)
    .replace(/[^a-z]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
}
