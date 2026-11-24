/** O que o aluno quer responder no Modo Jogo. */
export type TipoPergunta = "todas" | "lacunas" | "vf" | "escolha";

export const TIPOS_PERGUNTA: ReadonlyArray<{ id: TipoPergunta; rotulo: string; dica: string }> = [
  { id: "todas", rotulo: "Tudo misturado", dica: "Frases da lei, verdadeiro ou falso e múltipla escolha" },
  { id: "lacunas", rotulo: "Frases da lei", dica: "Complete as lacunas com a literalidade" },
  { id: "vf", rotulo: "Verdadeiro ou falso", dica: "Julgue a afirmação" },
  { id: "escolha", rotulo: "Múltipla escolha", dica: "Escolha a alternativa correta" },
];

/** Aceita só os valores conhecidos (a escolha chega do navegador); qualquer outra coisa vira "todas". */
export function tipoValido(v: unknown): TipoPergunta {
  return TIPOS_PERGUNTA.some((t) => t.id === v) ? (v as TipoPergunta) : "todas";
}

export const rotuloDoTipo = (t: TipoPergunta) => TIPOS_PERGUNTA.find((x) => x.id === t)?.rotulo ?? "Tudo misturado";
