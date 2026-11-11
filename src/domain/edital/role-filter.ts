import { fold } from "./text";

/** Resultado da separação do conteúdo por cargo. */
export interface RoleFilterResult {
  pages: string[];
  /** O edital separa o conteúdo por cargo (achou títulos de cargo)? Sem isso nada é removido. */
  applied: boolean;
  /** Linhas que pertencem só a outros cargos e ficaram de fora. */
  removedLines: number;
  /** Cargo do edital que foi tratado como o escolhido. */
  target: string | null;
}

const ITEM_LINE = /^\s*\d{1,2}(?:\.\d{1,2}){0,3}[.)]?\s+\S/;
const ALL_ROLES = /\b(?:todos os cargos|todos os candidatos|comum a todos|para todos os cargos|conhecimentos? comuns?|cargos? de n[ií]vel (?:superior|m[eé]dio|fundamental|t[eé]cnico) \(?todos)/;
const HEAD_WORD = /^(?:anexo\b|cargos?\b|para o cargo|para os cargos|provas? (?:objetiva )?(?:para|do|dos)|conte[uú]do program[aá]tico (?:para|do|dos)|n[ií]vel\b|[ivx]+\s*[-–.)]\s)/;

function isUpper(line: string): boolean {
  const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 4) return false;
  const up = line.replace(/[^A-ZÀ-Ý]/g, "").length;
  return up / letters.length > 0.8;
}

/** Escolhe, entre os cargos do edital, o que corresponde ao digitado/selecionado (igual, ou um contém o outro). */
export function resolveTarget(role: string, options: readonly string[]): string {
  const r = fold(role);
  const hit = options.find((o) => fold(o) === r) ?? options.find((o) => fold(o).includes(r) || r.includes(fold(o)));
  return hit ?? role;
}

/**
 * Separa o conteúdo do cargo escolhido. Um título de cargo ("CARGO: Motorista", "ANEXO II – GUARDA…")
 * abre um bloco; as linhas dele só valem para os cargos nomeados no título. Blocos de outros cargos saem.
 * Linhas antes do primeiro título de cargo, ou depois de "todos os cargos", são comuns e ficam.
 * Se o edital não traz títulos de cargo, devolve tudo como veio (applied = false) — nada é inventado.
 */
export function filterPagesByRole(pages: readonly string[], role: string, options: readonly string[]): RoleFilterResult {
  const target = resolveTarget(role, options);
  const names = [...new Set([...options, target])].map((o) => ({ name: o, key: fold(o) })).filter((o) => o.key.length >= 4);
  // Cargo mais específico primeiro ("agente administrativo" antes de "agente").
  names.sort((a, b) => b.key.length - a.key.length);
  const tKey = fold(target);

  let current: Set<string> | null = null; // null = comum a todos
  let sawHeading = false;
  let removed = 0;
  const out = pages.map((page) => {
    const kept: string[] = [];
    for (const raw of page.split("\n")) {
      const line = raw.trim();
      if (line && line.length <= 140 && !ITEM_LINE.test(line)) {
        const f = fold(line);
        if (ALL_ROLES.test(f)) {
          current = null;
        } else if (HEAD_WORD.test(f) || isUpper(line) || /:\s*$/.test(line)) {
          const mentioned = new Set<string>();
          let rest = f;
          for (const n of names) {
            if (rest.includes(n.key)) {
              mentioned.add(n.key);
              rest = rest.split(n.key).join(" "); // "agente administrativo" não conta de novo como "agente"
            }
          }
          if (mentioned.size) {
            current = mentioned;
            sawHeading = true;
          }
        }
      }
      if (current && !current.has(tKey)) removed++;
      else kept.push(raw);
    }
    return kept.join("\n");
  });
  if (!sawHeading) return { pages: [...pages], applied: false, removedLines: 0, target };
  return { pages: out, applied: true, removedLines: removed, target };
}
