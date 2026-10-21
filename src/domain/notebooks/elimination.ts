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

/** Janela para distinguir clique simples de clique/toque duplo (ms). */
export const DOUBLE_TAP_MS = 280;

/**
 * Decide o que um clique significa, sem disparar a seleção no primeiro clique de um duplo:
 * o primeiro clique espera a janela; se vier o segundo na mesma alternativa dentro dela,
 * vira "riscar". Clique de teclado (detail 0) seleciona na hora.
 */
export function classifyTap(prev: { id: string; at: number } | null, id: string, at: number, keyboard: boolean): "select-now" | "wait" | "strike" {
  if (keyboard) return "select-now";
  if (prev && prev.id === id && at - prev.at <= DOUBLE_TAP_MS) return "strike";
  return "wait";
}
