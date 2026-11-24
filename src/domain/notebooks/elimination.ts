/**
 * Eliminação visual de alternativas (riscar/restaurar) e seleção da resposta pretendida.
 * Puro e local à questão: nada disso vai para o banco; só a alternativa confirmada é enviada.
 */

export interface ChoiceState {
  selected: string | null;
  struck: ReadonlySet<string>;
}

export const initialChoice = (selected: string | null = null): ChoiceState => ({ selected, struck: new Set() });

/** Clique simples: escolhe a alternativa. Alternativa riscada não pode ser escolhida (restaure antes). */
export function selectOption(s: ChoiceState, id: string): ChoiceState {
  if (s.struck.has(id)) return s;
  return { ...s, selected: id };
}

/** Clique/toque duplo: risca ou restaura. Riscar a alternativa escolhida limpa a escolha. */
export function toggleStrike(s: ChoiceState, id: string): ChoiceState {
  const struck = new Set(s.struck);
  if (struck.has(id)) {
    struck.delete(id);
    return { ...s, struck };
  }
  struck.add(id);
  return { selected: s.selected === id ? null : s.selected, struck };
}

/** Só confirma com uma alternativa escolhida e não riscada. */
export const canConfirm = (s: ChoiceState): boolean => s.selected !== null && !s.struck.has(s.selected);

/** Janela em que um segundo clique/toque na mesma alternativa conta como "duplo" (ms). */
export const DOUBLE_TAP_MS = 320;

/**
 * Decide o que um clique significa. O primeiro clique escolhe NA HORA (sem esperar para ver se vem um segundo);
 * se o segundo chegar na mesma alternativa dentro da janela, vira "riscar" (a escolha do primeiro clique é desfeita
 * por toggleStrike). Clique de teclado (detail 0) nunca risca: só escolhe.
 */
export function classifyTap(prev: { id: string; at: number } | null, id: string, at: number, keyboard: boolean): "select-now" | "strike" {
  if (keyboard) return "select-now";
  if (prev && prev.id === id && at - prev.at <= DOUBLE_TAP_MS) return "strike";
  return "select-now";
}

/**
 * Riscar por duplo toque sem perder a escolha anterior: o 1º toque escolheu a alternativa (e trocou a escolha);
 * o 2º risca e devolve a escolha que o aluno tinha antes do duplo (`antes`), se ainda valer.
 */
export function strikeKeeping(s: ChoiceState, id: string, antes: string | null): ChoiceState {
  const t = toggleStrike(s, id);
  if (s.selected === id && antes && antes !== id && !t.struck.has(antes)) return { ...t, selected: antes };
  return t;
}
