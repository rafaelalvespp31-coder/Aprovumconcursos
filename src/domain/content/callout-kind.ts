/**
 * Tipo de uma explicação dentro da aula (pegadinha, observação, dica, exemplo…), reconhecido pela
 * palavra que abre o trecho. Cada tipo ganha seu ícone e sua cor na leitura.
 */
export type CalloutKind =
  | "pegadinha" | "atencao" | "observacao" | "dica" | "exemplo" | "importante" | "conceito" | "regra"
  | "excecao" | "prazo" | "pena" | "jurisprudencia" | "doutrina" | "mnemonico" | "resumo" | "comparacao"
  | "lembrar" | "duvida" | "resolucao" | "enunciado" | "fundamento";

const RULES: Array<[CalloutKind, RegExp]> = [
  ["pegadinha", /^(pegadinha|armadilha|cai\s+em\s+prova|como\s+cai|cobrado\s+em\s+prova|erro\s+comum|confus[ãa]o)/i],
  ["atencao", /^(aten[çc][ãa]o|cuidado|alerta|n[ãa]o\s+confunda|n[ãa]o\s+esque[çc]a|perigo)/i],
  ["excecao", /^(exce[çc][ãa]o|exce[çc][õo]es|ressalva|salvo)/i],
  ["observacao", /^(observa[çc][ãa]o|obs\.?|nota|anota[çc][ãa]o|detalhe)/i],
  ["dica", /^(dica|macete|truque|estrat[ée]gia)/i],
  ["mnemonico", /^(mnem[ôo]nico|memoriza[çc][ãa]o|decore|sigla)/i],
  ["exemplo", /^(exemplo|ex\.|caso\s+pr[áa]tico|na\s+pr[áa]tica|situa[çc][ãa]o)/i],
  ["enunciado", /^(enunciado|quest[ãa]o|caso\s+de\s+prova)/i],
  ["resolucao", /^(resolu[çc][ãa]o|gabarito|coment[áa]rio|resposta|conclus[ãa]o)/i],
  ["importante", /^(importante|destaque|essencial|fundamental|ponto\s+central|ponto-chave)/i],
  ["conceito", /^(conceito|defini[çc][ãa]o|o\s+que\s+[ée]|natureza\s+jur[íi]dica)/i],
  ["regra", /^(regra|regra\s+geral|requisitos?|elementos?|hip[óo]teses|condi[çc][õo]es)/i],
  ["prazo", /^(prazo|prazos|prescri[çc][ãa]o|decad[êe]ncia|termo\s+(inicial|final))/i],
  ["pena", /^(pena|penas|san[çc][ãa]o|multa|puni[çc][ãa]o)/i],
  ["jurisprudencia", /^(jurisprud[êe]ncia|s[úu]mula|stf|stj|tema\s+\d|informativo|precedente)/i],
  ["doutrina", /^(doutrina|corrente|posi[çc][ãa]o\s+(doutrin|majorit|minorit)|entendimento)/i],
  ["fundamento", /^(fundamento|base\s+legal|previs[ãa]o\s+legal|lei\s+seca|art\.)/i],
  ["resumo", /^(resumo|em\s+resumo|s[ií]ntese|revis[ãa]o|para\s+fixar|fixa[çc][ãa]o)/i],
  ["comparacao", /^(diferen[çc]a|compara[çc][ãa]o|distin[çc][ãa]o|vers(us|\.)|x\s)/i],
  ["lembrar", /^(lembre|lembrar|n[ãa]o\s+esque[çc]a|guarde)/i],
  ["duvida", /^(d[úu]vida|pergunta|e\s+se)/i],
];

/** Palavra que abre o trecho (ignorando **, #, >, emojis e espaços). */
export function calloutKindOf(text: string): CalloutKind | null {
  const t = text.replace(/^[\s>*_#\-–—•]+/, "").replace(/^[^\p{L}\d]+/u, "");
  for (const [k, re] of RULES) if (re.test(t)) return k;
  return null;
}

/** O texto abre com um rótulo ("Pegadinha:", "Observação —"…) e não é um parágrafo qualquer? */
export function leadingLabelKind(text: string): CalloutKind | null {
  const head = text.trim().slice(0, 60);
  if (!/^[^.!?]{2,45}?\s*[:–—-]\s*\S/.test(head) && !/^[^.!?]{2,45}:$/.test(head)) return null;
  return calloutKindOf(head);
}
