/**
 * Organização da aula em módulos (temas): blocos consecutivos de seções.
 * Aulas do catálogo trazem o módulo de cada seção (definido pela equipe);
 * nas demais, os módulos saem do tipo de cada seção (visão geral, lei seca,
 * teoria, prática, revisão), sem mudar a ordem da aula.
 */
export interface ModuleSection {
  id: string;
  kind: string;
  module?: string | null;
}

export interface LessonModule {
  n: number;
  title: string;
  /** Ícone sugerido para o módulo. */
  icon: "livro" | "lei" | "lampada" | "alvo" | "revisoes" | "balanca" | "indice";
  sectionIds: string[];
}

const PHASE: Record<string, { title: string; icon: LessonModule["icon"] }> = {
  inicio: { title: "Visão geral", icon: "indice" },
  lei: { title: "Lei seca", icon: "lei" },
  teoria: { title: "Teoria e conceitos", icon: "livro" },
  juridico: { title: "Doutrina e jurisprudência", icon: "balanca" },
  pratica: { title: "Prática e pegadinhas", icon: "alvo" },
  revisao: { title: "Revisão final", icon: "revisoes" },
};

function phaseOf(kind: string): keyof typeof PHASE {
  if (["objetivo", "conhecimentos_previos", "introducao"].includes(kind)) return "inicio";
  if (kind === "texto_legal") return "lei";
  if (["doutrina", "jurisprudencia"].includes(kind)) return "juridico";
  if (["exemplos", "aplicacao", "pegadinhas", "interpretacao_banca"].includes(kind)) return "pratica";
  if (["flashcards", "resumo", "checklist", "referencias", "proxima_etapa"].includes(kind)) return "revisao";
  return "teoria";
}

/** Ícone pelo nome do módulo (módulos definidos pela equipe). */
function iconFor(title: string): LessonModule["icon"] {
  const t = title.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/revis/.test(t)) return "revisoes";
  if (/pratic|pegadinh|casos|banca/.test(t)) return "alvo";
  if (/lei seca|visao geral/.test(t)) return "indice";
  if (/princip|doutrin|jurisprud|garantia|responsab/.test(t)) return "balanca";
  return "livro";
}

export function groupIntoModules(sections: ModuleSection[]): LessonModule[] {
  const explicit = sections.some((s) => s.module);
  const out: LessonModule[] = [];
  let lastKey: string | null = null;
  let firstSeen = false;
  for (const s of sections) {
    let key: string;
    let title: string;
    let icon: LessonModule["icon"];
    if (explicit) {
      key = s.module || lastKey || "Visão geral";
      title = key;
      icon = iconFor(key);
    } else {
      let p = phaseOf(s.kind);
      // Esquema/mapa logo no início faz parte da visão geral.
      if (!firstSeen && (s.kind === "esquema" || p === "inicio")) p = "inicio";
      else if (p !== "inicio") firstSeen = true;
      key = p;
      title = PHASE[p]!.title;
      icon = PHASE[p]!.icon;
    }
    const last = out.at(-1);
    if (last && lastKey === key) last.sectionIds.push(s.id);
    else out.push({ n: out.length + 1, title, icon, sectionIds: [s.id] });
    lastKey = key;
  }
  // Títulos repetidos (o mesmo tipo de módulo reaparece mais adiante) ganham numeração.
  const seen = new Map<string, number>();
  for (const m of out) {
    const k = (seen.get(m.title) ?? 0) + 1;
    seen.set(m.title, k);
    if (k > 1) m.title = `${m.title} (parte ${k})`;
  }
  return out;
}
