/**
 * Mapa do Conhecimento (Knowledge Operations): transforma o catálogo publicado (temas por
 * matéria, com o progresso real do aluno) em territórios posicionados num mapa.
 * Puro: sem React e sem Three.js — a cena 3D, o radar e a lista alternativa leem daqui.
 */
import { baseMode, disciplineLabel, disciplineSlugs } from "@/ai/pedagogy";
import type { ThemeCard } from "@/domain/studies/home";
import { groupByTopic, groupKey } from "@/domain/catalog/topic-group";

export type TerritoryIcon = "livro" | "chip" | "monitor" | "cerebro" | "balanca" | "pilar" | "escudo" | "martelo" | "documento" | "grafico" | "alvo";

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
  /** Tópico do edital (4. Ilicitude › 4.1); null = aula avulsa. */
  group: ThemeCard["group"];
}

/** Tópico do edital dentro da matéria: pasta com as aulas dos subtópicos, na ordem. */
export interface TopicFolder {
  key: string;
  title: string;
  code: string | null;
  topics: MapTopic[];
  done: number;
  /** Média do progresso das aulas; null quando o aluno não começou nenhuma. */
  progress: number | null;
}

export interface Territory {
  /** Código da matéria (DisciplineMode) ou "outras". */
  id: string;
  label: string;
  color: string;
  icon: TerritoryIcon;
  pos: [number, number];
  topics: MapTopic[];
  /** Tópicos do edital desta matéria (vazio quando nenhuma aula tem tópico). */
  folders: TopicFolder[];
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
  // Ícones como na arte do campo de batalha: balança (Penal), livro, cérebro, documento, monitor…
  direito_penal: { color: "#FF4545", icon: "balanca" },
  lingua_portuguesa: { color: "#3B82F6", icon: "livro" },
  informatica: { color: "#22D3EE", icon: "monitor" },
  matematica: { color: "#22C55E", icon: "grafico" },
  raciocinio_logico: { color: "#4ADE80", icon: "cerebro" },
  direito_constitucional: { color: "#8B5CF6", icon: "pilar" },
  direito_administrativo: { color: "#EAB308", icon: "martelo" },
  direito_processual_penal: { color: "#F97316", icon: "documento" },
  legislacao_especial: { color: "#E879F9", icon: "documento" },
  conhecimentos_especificos: { color: "#94A3B8", icon: "alvo" },
  outras: { color: "#A1A1AA", icon: "alvo" },
};

/** Estilo (cor e ícone) de uma matéria. */
export function territoryStyle(id: string): { color: string; icon: TerritoryIcon } {
  return STYLE[id] ?? STYLE[baseMode(id)] ?? STYLE.outras!;
}

/** Território sem aulas publicadas (aparece no cenário como "em breve", sem números inventados). */
export function emptyTerritory(id: string, pos: [number, number] = [0, 0]): Territory {
  const st = territoryStyle(id);
  return { id, label: disciplineLabel(id) ?? "Outras matérias", color: st.color, icon: st.icon, pos, topics: [], folders: [], questions: 0, started: 0, done: 0, progress: null };
}

/** Matéria (fixa ou cadastrada pela equipe) pelo nome mostrado no card. */
const modeOfLabel = (label: string): string | undefined => disciplineSlugs().find((m) => m !== "outra" && disciplineLabel(m) === label);
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

function foldersOf(topics: MapTopic[]): TopicFolder[] {
  const out = new Map<string, TopicFolder>();
  for (const t of topics) {
    if (!t.group) continue;
    const key = groupKey(t.group.title);
    const f = out.get(key) ?? { key, title: t.group.title, code: t.group.code, topics: [], done: 0, progress: null };
    f.code = f.code ?? t.group.code;
    f.topics.push(t);
    out.set(key, f);
  }
  return [...out.values()].map((f) => {
    const started = f.topics.filter((t) => t.study).length;
    return { ...f, done: f.topics.filter((t) => t.study?.done).length, progress: started ? Math.round(f.topics.reduce((s, t) => s + (t.study?.pct ?? 0), 0) / f.topics.length) : null };
  });
}

export function buildKnowledgeMap(themes: readonly ThemeCard[]): KnowledgeMap {
  const groups = new Map<string, ThemeCard[]>();
  for (const t of themes) {
    const mode = modeOfLabel(t.discipline) ?? "outras";
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
    // Aulas com tópico primeiro, na ordem do edital (4.1, 4.2…); depois as avulsas, por título.
    const list = groupByTopic([...groups.get(id)!].map((t) => ({ ...t, topicGroup: t.group?.title ?? null, topicGroupCode: t.group?.code ?? null, subtopicCode: t.group?.sub ?? null }))).flatMap((g) => g.items);
    const pos = slots[i]!;
    const tp = topicSlots(pos, list.length);
    const started = list.filter((t) => t.study).length;
    const st = territoryStyle(id);
    const topics: MapTopic[] = list.map((t, k) => ({ id: t.id, title: t.title, questions: t.questions, minutes: t.minutes, study: t.study, pos: tp[k]!, group: t.group ?? null }));
    return {
      id,
      label: id === "outras" ? "Outras matérias" : disciplineLabel(id) ?? list[0]!.discipline,
      color: st.color,
      icon: st.icon,
      pos,
      topics,
      folders: foldersOf(topics),
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
  for (const t of map.territories) for (const topic of t.topics) if (has(`${topic.title} ${t.label} ${topic.group ? `${topic.group.code ?? ""} ${topic.group.title} ${topic.group.sub ?? ""}` : ""}`)) out.push({ kind: "assunto", territory: t, topic });
  return out.slice(0, limit);
}

/** Posição no radar (0..1) a partir do chão do mapa; o norte do mapa fica para cima. */
export function radarPoint(pos: [number, number], radius = RING * 1.25): [number, number] {
  const x = 0.5 + (pos[0] / radius) * 0.5;
  const y = 0.5 + (pos[1] / radius) * 0.5;
  return [Math.min(0.98, Math.max(0.02, x)), Math.min(0.98, Math.max(0.02, y))];
}
