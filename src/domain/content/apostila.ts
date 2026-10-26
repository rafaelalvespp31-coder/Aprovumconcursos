/**
 * Aula no formato "apostila" (o mesmo do PDF do APROVUM), dividida em módulos — puro.
 *
 * Os módulos vêm do catálogo (campo `module` de cada seção). Aulas sem módulos (geradas pela
 * IA ou antigas) são agrupadas pelos blocos de estudo (conceito, lei, prática, banca…), na
 * ordem de leitura. Nenhuma seção fica de fora e módulos grandes demais são divididos em partes.
 */
import { BOARD_CARDS, assignSectionsToCards, cardTitle } from "./board";

export interface ApostilaModule<T> {
  /** Título para exibir (sem a numeração "1." que vem do catálogo). */
  title: string;
  sections: T[];
}

/** Máximo de seções por página de módulo: acima disso o módulo vira "parte 1", "parte 2"… */
export const MAX_SECTIONS_PER_MODULE = 8;

export const moduleTitle = (raw: string) => raw.replace(/^\s*(m[óo]dulo\s*)?\d+\s*[.)\-–—:]\s*/i, "").trim() || raw.trim();

function splitLarge<T>(mods: ApostilaModule<T>[]): ApostilaModule<T>[] {
  const out: ApostilaModule<T>[] = [];
  for (const m of mods) {
    if (m.sections.length <= MAX_SECTIONS_PER_MODULE) {
      out.push(m);
      continue;
    }
    const parts = Math.ceil(m.sections.length / MAX_SECTIONS_PER_MODULE);
    const size = Math.ceil(m.sections.length / parts);
    for (let p = 0; p < parts; p++) out.push({ title: `${m.title} (parte ${p + 1} de ${parts})`, sections: m.sections.slice(p * size, (p + 1) * size) });
  }
  return out.filter((m) => m.sections.length);
}

export function groupIntoModules<T extends { id: string; kind: string; module?: string | null }>(sections: readonly T[], opts: { legal?: boolean } = {}): ApostilaModule<T>[] {
  if (!sections.length) return [];
  if (sections.some((s) => s.module && s.module.trim())) {
    const mods: ApostilaModule<T>[] = [];
    let current: ApostilaModule<T> | null = null;
    let currentKey: string | null = null;
    for (const s of sections) {
      const key = s.module?.trim() || null;
      // Seção sem módulo continua no módulo anterior (ou abre "Introdução", se for a primeira).
      if (!current || (key && key !== currentKey)) {
        current = { title: key ? moduleTitle(key) : "Introdução", sections: [] };
        currentKey = key;
        mods.push(current);
      }
      current.sections.push(s);
    }
    return splitLarge(mods);
  }
  const legal = opts.legal ?? true;
  const byCard = assignSectionsToCards([...sections], { legal });
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const mods = order
    .map((n) => ({ title: n === 8 ? "Revisão de questões" : cardTitle(n, legal), sections: byCard.get(n) ?? [] }))
    .filter((m) => m.sections.length);
  // Garante que nenhuma seção se perdeu (por segurança, as que sobrarem vão para o fim).
  const placed = new Set(mods.flatMap((m) => m.sections.map((s) => s.id)));
  const rest = sections.filter((s) => !placed.has(s.id));
  if (rest.length) mods.push({ title: BOARD_CARDS[0].title, sections: [...rest] });
  return splitLarge(mods);
}

/** Páginas da apostila, na ordem: início, módulos, questões, revisão e referências. */
export type ApostilaPage = { kind: "inicio" } | { kind: "modulo"; index: number } | { kind: "questoes" } | { kind: "revisao" };

export function apostilaPages(moduleCount: number): ApostilaPage[] {
  return [{ kind: "inicio" }, ...Array.from({ length: moduleCount }, (_, index) => ({ kind: "modulo" as const, index })), { kind: "questoes" }, { kind: "revisao" }];
}

export const pageKey = (p: ApostilaPage) => (p.kind === "modulo" ? `m${p.index}` : p.kind);
