/** Cartão visual de estudo para os exemplos das aulas: título, base legal, regra com palavra-chave, exemplo e "o que cai na prova". */
export type TemaCartao = "direito" | "portugues" | "matematica" | "informatica" | "geral";
export interface DadosCartao {
  titulo: string; base: string | null; palavra: string; regra: string; exemplo: string; pergunta: string | null; tema: TemaCartao; icone: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const limpa = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
const corta = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(" ", n) > n * 0.5 ? s.lastIndexOf(" ", n) : n).replace(/[,;:\s]+$/, "")}…`);

export function temaDe(subject: string | null | undefined, texto = ""): TemaCartao {
  const s = norm(`${subject ?? ""}`);
  if (/matematic|raciocinio|estatistic|financeir/.test(s)) return "matematica";
  if (/portugues|lingua|redacao|literatura/.test(s)) return "portugues";
  if (/informatic|tecnologia|computa|seguranca da informacao/.test(s)) return "informatica";
  if (/direito|constituc|penal|civil|processual|administrativ|tributari|legislacao|eca|ctb|lep|etica/.test(s)) return "direito";
  const t = norm(texto);
  if (/\bart\.|\bcrime|\bpena\b|\blei\b|\bcodigo\b/.test(t)) return "direito";
  return "geral";
}

/** Nome do ícone (lucide) que combina com o assunto do cartão. */
export function iconeDe(titulo: string, tema: TemaCartao): string {
  const t = norm(titulo);
  const por: Array<[RegExp, string]> = [
    [/tempo|vigencia|prazo|prescri|decadenc|temporari|retroativ|ultrativ/, "Hourglass"],
    [/crime|furto|roubo|homicid|pena\b|penal|delito|extors/, "Gavel"],
    [/constituic|direitos fundament|garantia|federal|uniao|estado/, "Landmark"],
    [/licitac|contrato|administr|servidor|improbidade/, "FileText"],
    [/prova|processo|recurso|sentenca|inquerito|audiencia/, "Scale"],
    [/virgula|crase|concord|regencia|oracao|sintax|verbo|acentu|ortograf|pontuac/, "PenLine"],
    [/interpretacao|texto|coesao|coerencia|sentido/, "BookOpen"],
    [/juros|porcent|percent|regra de tres|fracao|mmc|mdc|equac|razao|proporc/, "Calculator"],
    [/rede|internet|seguranca|virus|backup|nuvem|senha/, "ShieldCheck"],
    [/windows|word|excel|planilha|editor|arquivo|pasta|software|hardware/, "Monitor"],
  ];
  for (const [re, ic] of por) if (re.test(t)) return ic;
  return { direito: "Scale", portugues: "PenLine", matematica: "Calculator", informatica: "Monitor", geral: "BookOpen" }[tema];
}

const BASE = /(?:\bart(?:igos?|s?\.?)\s*\d+[ºo°]?(?:-[A-Z])?(?:\s*,?\s*(?:§|caput)\s*\d*[ºo°]?)?(?:\s*,?\s*(?:inc\.|inciso)\s*[IVXL]+)?(?:\s+d[ao]s?\s+(?:CF(?:\/88)?|CP|CPP|CC|CPC|CLT|CTB|ECA|LEP|Lei\s+[\d./]+|Constitui[çc][ãa]o Federal|C[óo]digo\s+[A-ZÀ-Ú][\wà-ú]+(?:\s+[A-ZÀ-Ú][\wà-ú]+)?))?|\bLei\s+(?:n[ºo°.]?\s*)?\d[\d./]*|\bS[úu]mula(?:\s+Vinculante)?\s+\d+|\bCF\/88)/i;

export function baseLegalDe(...textos: string[]): string | null {
  for (const t of textos) { const m = BASE.exec(limpa(t)); if (m) return m[0].replace(/^art(?:igos?|s?\.?)/i, (x) => (/s/i.test(x.slice(-1)) && x.length > 4 ? "Arts." : "Art.")).replace(/\s+/g, " ").trim(); }
  return null;
}

export function palavraChaveDe(...textos: string[]): string | null {
  for (const t of textos) {
    const b = /\*\*([^*]{3,40})\*\*/.exec(t);
    if (b && b[1]!.split(/\s+/).length <= 4) return limpa(b[1]!).replace(/[.:]+$/, "");
  }
  return null;
}

export function montarCartao(o: { subject?: string | null; titulo: string; corpo?: string; situacao: string; pergunta?: string; resposta: string }): DadosCartao {
  const tema = temaDe(o.subject, `${o.titulo} ${o.situacao} ${o.resposta}`);
  const palavra = palavraChaveDe(o.resposta, o.corpo ?? "") ?? corta(limpa(o.titulo).replace(/^\d+[.)]\s*/, ""), 32);
  return {
    titulo: corta(limpa(o.titulo).replace(/^\d+[.)]\s*/, ""), 60),
    base: baseLegalDe(o.resposta, o.situacao, o.corpo ?? "", o.titulo),
    palavra: palavra.toUpperCase(),
    regra: corta(limpa(o.resposta), 230),
    exemplo: corta(limpa(o.situacao), 230),
    pergunta: o.pergunta ? corta(limpa(o.pergunta), 140) : null,
    tema,
    icone: iconeDe(o.titulo, tema),
  };
}

/** Cor do tema de acordo com o ícone escolhido (mesma paleta do cartão). */
export function corDoIcone(icone: string): string {
  if (/PenLine|BookOpen/.test(icone)) return "#e0457b";
  if (icone === "Calculator") return "#0f8f6e";
  if (/Monitor|ShieldCheck/.test(icone)) return "#1f7ae0";
  if (icone === "BookOpen") return "#d9822b";
  return "#6d4aff";
}
