/**
 * Mapa do Conhecimento (Knowledge Operations): transforma o catálogo publicado (temas por
 * matéria, com o progresso real do aluno) em territórios posicionados num mapa.
 * Puro: sem React e sem Three.js — a cena 3D, o radar e a lista alternativa leem daqui.
 */
import { DISCIPLINE_LABELS, type DisciplineMode } from "@/ai/pedagogy";
import type { ThemeCard } from "@/domain/studies/home";

export type TerritoryIcon = "livro" | "chip" | "cerebro" | "balanca" | "pilar" | "escudo" | "martelo" | "documento" | "grafico" | "alvo";

export interface MapTopic {
  /** Id real do tema do catálogo (catalog_topics.id). */
  id: string;
  title: string;
  questions: number;
  minutes: number;
  /** Estudo do aluno com este tema (null = ainda não começou). */
  study: ThemeCard["study"];
  /** Posição no chão do mapa (x, z), em volta do território. */
  pos: [number, number];
}

export interface Territory {
  /** Código da matéria (DisciplineMode) ou "outras". */
  id: string;
  label: string;
  color: string;
  icon: TerritoryIcon;
  pos: [number, number];
  topics: MapTopic[];
  questions: number;
  started: number;
  done: number;
  /** Média do progresso dos assuntos (não iniciado conta 0); null quando o aluno não começou nada. */
  progress: number | null;
}

export interface KnowledgeMap {
  territories: Territory[];
  totals: { disciplines: number; topics: number; questions: number; started: number; done: number };
}

/** Cor e ícone de cada matéria (vermelho fica para o núcleo e o Direito Penal, como na referência). */
const STYLE: Record<string, { color: string; icon: TerritoryIcon }> = {
  direito_penal: { color: "#FF4545", icon: "escudo" },
  lingua_portuguesa: { color: "#3B82F6", icon: "livro" },
  informatica: { color: "#22D3EE", icon: "chip" },
  matematica: { color: "#22C55E", icon: "cerebro" },
  raciocinio_logico: { color: "#4ADE80", icon: "grafico" },
  direito_constitucional: { color: "#8B5CF6", icon: "pilar" },
  direito_administrativo: { color: "#EAB308", icon: "balanca" },
  direito_processual_penal: { color: "#F97316", icon: "martelo" },
  legislacao_especial: { color: "#E879F9", icon: "documento" },
  conhecimentos_especificos: { color: "#94A3B8", icon: "alvo" },
  outras: { color: "#A1A1AA", icon: "alvo" },
};

/** Estilo (cor e ícone) de uma matéria. */
export function territoryStyle(id: string): { color: string; icon: TerritoryIcon } {
  return STYLE[id] ?? STYLE.outras!;
}

/** Território sem aulas publicadas (aparece no cenário como "em breve", sem números inventados). */
export function emptyTerritory(id: string, pos: [number, number] = [0, 0]): Territory {
  const st = territoryStyle(id);
  return { id, label: DISCIPLINE_LABELS[id as DisciplineMode] ?? "Outras matérias", color: st.color, icon: st.icon, pos, topics: [], questions: 0, started: 0, done: 0, progress: null };
}

const LABEL_TO_MODE = new Map(Object.entries(DISCIPLINE_LABELS).map(([k, v]) => [v, k]));
/** Ordem de destaque: Direito Penal fica à frente do núcleo, como na referência. */
const ORDER = ["direito_penal", "lingua_portuguesa", "direito_constitucional", "informatica", "direito_administrativo", "matematica", "direito_processual_penal", "raciocinio_logico", "legislacao_especial", "conhecimentos_especificos"];

export const CORE_POS: [number, number] = [0, 0];
const RING = 30;

/**
 * Posição de cada território num anel em volta do núcleo, priorizando a metade de frente para a
 * câmera (que olha do sul para o norte). O primeiro fica logo atrás do núcleo, ao centro.
 */
export function territorySlots(n: number): Array<[number, number]> {
  if (n <= 0) return [];
  // Composição da referência: um território logo atrás do núcleo e os demais espalhados pelas
  // laterais e em profundidade (fundo, meio e frente), deixando o centro da tela para o núcleo.
  const fixed: Array<[number, number]> = [
    [0, -26],
    [-36, -24],
    [38, -26],
    [-31, 2],
    [40, 0],
    [-23, 24],
    [46, 22],
    [-54, -8],
    [10, -44],
    [-56, 26],
  ];
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    if (i < fixed.length) out.push(fixed[i]!);
    else {
      const a = ((i - fixed.length) / Math.max(1, n - fixed.length)) * Math.PI * 2;
      out.push([Math.sin(a) * RING * 2.2, -Math.cos(a) * RING * 2.2]);
    }
  }
  return out;
}

/** Assuntos em volta do território (meia-lua voltada para o núcleo). */
export function topicSlots(center: [number, number], n: number): Array<[number, number]> {
  // Anel completo em volta do território: os assuntos ficam visíveis de qualquer lado.
  const out: Array<[number, number]> = [];
  const r = 8 + Math.min(5, n * 0.35);
  const start = Math.atan2(-center[0], -center[1]) + Math.PI; // começa do lado oposto ao núcleo
  for (let i = 0; i < n; i++) {
    const a = start + (i / Math.max(1, n)) * Math.PI * 2;
    out.push([center[0] + Math.sin(a) * r, center[1] + Math.cos(a) * r]);
  }
  return out;
}

export function buildKnowledgeMap(themes: readonly ThemeCard[]): KnowledgeMap {
  const groups = new Map<string, ThemeCard[]>();
  for (const t of themes) {
    const mode = LABEL_TO_MODE.get(t.discipline) ?? "outras";
    const g = groups.get(mode) ?? [];
    g.push(t);
    groups.set(mode, g);
  }
  const ids = [...groups.keys()].sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const slots = territorySlots(ids.length);
  const territories = ids.map((id, i): Territory => {
    const list = [...groups.get(id)!].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    const pos = slots[i]!;
    const tp = topicSlots(pos, list.length);
    const started = list.filter((t) => t.study).length;
    const st = STYLE[id] ?? STYLE.outras!;
    return {
      id,
      label: id === "outras" ? "Outras matérias" : DISCIPLINE_LABELS[id as DisciplineMode] ?? list[0]!.discipline,
      color: st.color,
      icon: st.icon,
      pos,
      topics: list.map((t, k) => ({ id: t.id, title: t.title, questions: t.questions, minutes: t.minutes, study: t.study, pos: tp[k]! })),
      questions: list.reduce((s, t) => s + t.questions, 0),
      started,
      done: list.filter((t) => t.study?.done).length,
      progress: started ? Math.round(list.reduce((s, t) => s + (t.study?.pct ?? 0), 0) / list.length) : null,
    };
  });
  return {
    territories,
    totals: {
      disciplines: territories.length,
      topics: themes.length,
      questions: territories.reduce((s, t) => s + t.questions, 0),
      started: territories.reduce((s, t) => s + t.started, 0),
      done: territories.reduce((s, t) => s + t.done, 0),
    },
  };
}

export type SearchHit = { kind: "materia"; territory: Territory } | { kind: "assunto"; territory: Territory; topic: MapTopic };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9§ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Busca no catálogo real: matérias e assuntos (todas as palavras precisam aparecer). */
export function searchMap(map: KnowledgeMap, query: string, limit = 8): SearchHit[] {
  const words = norm(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const has = (s: string) => {
    const n = norm(s);
    return words.every((w) => n.includes(w));
  };
  const out: SearchHit[] = [];
  for (const t of map.territories) if (has(t.label)) out.push({ kind: "materia", territory: t });
  for (const t of map.territories) for (const topic of t.topics) if (has(`${topic.title} ${t.label}`)) out.push({ kind: "assunto", territory: t, topic });
  return out.slice(0, limit);
}

/** Posição no radar (0..1) a partir do chão do mapa; o norte do mapa fica para cima. */
export function radarPoint(pos: [number, number], radius = RING * 1.25): [number, number] {
  const x = 0.5 + (pos[0] / radius) * 0.5;
  const y = 0.5 + (pos[1] / radius) * 0.5;
  return [Math.min(0.98, Math.max(0.02, x)), Math.min(0.98, Math.max(0.02, y))];
}
