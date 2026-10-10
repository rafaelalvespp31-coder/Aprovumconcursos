/**
 * Tipos do motor de decomposição de conteúdo.
 * Este módulo é puro (sem I/O) para poder ser testado de forma determinística.
 */

export const CONTENT_TYPES = ["edital", "materia", "artigo_lei", "tema_livre"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/** Tipos estruturais de nó reconhecidos pela extração. */
export const NODE_KINDS = [
  // Estrutura geral
  "disciplina", // cabeçalho de matéria/disciplina (ex.: "LÍNGUA PORTUGUESA:")
  "grupo", // agrupador romano não jurídico (ex.: "I – Conhecimentos gerais")
  "topico", // item numerado (1, 1.1, 1.1.1...)
  "subtopico", // conceito separado por ";" dentro de um tópico
  "item", // marcador ("-", "•") ou linha livre
  // Estrutura jurídica
  "titulo",
  "capitulo",
  "secao",
  "subsecao",
  "artigo",
  "paragrafo",
  "inciso",
  "alinea",
  "item_legal",
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

/**
 * Nós "contêineres" não têm conteúdo próprio a ensinar: são cobertos quando todos
 * os seus descendentes são cobertos. Todos os demais precisam de referência direta
 * no planejamento — referência a um ancestral NÃO conta como cobertura.
 */
export const CONTAINER_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
  "disciplina",
  "grupo",
  "titulo",
  "capitulo",
  "secao",
  "subsecao",
]);

export const LEGAL_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
  "titulo",
  "capitulo",
  "secao",
  "subsecao",
  "artigo",
  "paragrafo",
  "inciso",
  "alinea",
  "item_legal",
]);

export interface SourceSpan {
  /** Deslocamento inicial (inclusivo) no texto normalizado. */
  start: number;
  /** Deslocamento final (exclusivo) no texto normalizado. */
  end: number;
}

export interface ContentNode {
  /** Chave estável dentro de uma versão do documento (ex.: "N0007"). */
  key: string;
  kind: NodeKind;
  /** Marcador original: "2.1", "Art. 5º", "§ 1º", "IV", "a)". */
  marker: string | null;
  /** Nome normalizado, sem marcador e sem pontuação final. */
  title: string;
  /** Trecho exato do texto normalizado coberto por este nó. */
  sourceText: string;
  span: SourceSpan;
  parentKey: string | null;
  depth: number;
  /** Posição entre os irmãos (0-based). */
  order: number;
  /** Caminho hierárquico legível, ex.: "Língua Portuguesa › 2 › 2.1". */
  path: string;
}

export interface ExtractionResult {
  nodes: ContentNode[];
  /** Trechos com conteúdo que não foram atribuídos a nenhum nó. */
  unassigned: SourceSpan[];
}
