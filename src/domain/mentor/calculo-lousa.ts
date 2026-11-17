/**
 * Exemplo de matemática da aula → conta desenhada na lousa como um humano resolve: o enunciado, a tabela de dados,
 * o cálculo passo a passo (um "=" embaixo do outro) e a resposta numa caixa. Também vale para MMC/MDC e regra de três.
 */
export interface CasoCalculo { titulo: string; enunciado: string; pergunta?: string; resultado: string }

const limpa = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const cmd = (nome: string, texto: string) => `${nome}: ${/a\.[amdst]\.$/.test(texto) ? texto.trim() : texto.replace(/[.:\s]+$/, "").trim()}`;
const corta = (s: string, n: number) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n) > n * 0.5 ? s.lastIndexOf(" ", n) : n).replace(/[,;:\s]+$/, "") + "…");

/** O texto de resultado tem conta de verdade? (números e operadores) */
export function ehCalculo(resultado: string): boolean {
  const r = limpa(resultado);
  return (r.match(/\d/g) ?? []).length >= 3 && /[=÷×·+−]|\s-\s|\bx\b/.test(r) && /\d\s*[=÷×·+−]|[=÷×·+−]\s*\(?\s*R?\$?\s*\d/.test(r);
}

function dados(texto: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const add = (rot: string, v: string) => { if (!out.some((x) => x[0] === rot)) out.push([rot, v.trim()]); };
  const t = limpa(texto);
  const m1 = /R\$\s*[\d.]+(?:,\d+)?/.exec(t); if (m1) add("Valor", m1[0]);
  const m2 = /\d+(?:,\d+)?\s*%(?:\s*a\.\s?[amdst]\.?)?/.exec(t); if (m2) add("Taxa", m2[0]);
  const m3 = /\b\d+\s*(?:meses|mês|dias|anos|semestres|trimestres)\b/i.exec(t); if (m3) add("Prazo", m3[0]);
  return out;
}

/** Quebra o resultado em linhas de conta, como quem escreve: "J = a × b" e embaixo "= valor". Devolve também a resposta. */
function passos(resultado: string): { contas: string[]; resposta: string } {
  const segs = limpa(resultado).split(/\s*;\s*/).filter(Boolean);
  const contas: string[] = [];
  let resposta = "";
  segs.forEach((seg, i) => {
    const p = seg.split(/\s*=\s*/);
    const ultimo = i === segs.length - 1;
    if (p.length >= 3) {
      contas.push(`${p[0]} = ${p[1]}`);
      p.slice(2, -1).forEach((x) => contas.push(`= ${x}`));
      if (ultimo) resposta = /^[A-Za-zÀ-ú]{1,3}$/.test(p[0]!) ? `${p[0]} = ${p.at(-1)}` : `= ${p.at(-1)}`; else contas.push(`= ${p.at(-1)}`);
    } else if (ultimo) resposta = seg.replace(/\.$/, "");
    else contas.push(seg.replace(/\.$/, ""));
  });
  return { contas, resposta };
}

export function roteiroDeCaso(c: CasoCalculo): string[] | null {
  if (!ehCalculo(c.resultado)) return roteiroDeSituacao(c);
  const enun = limpa(c.enunciado), pergunta = limpa(c.pergunta ?? "");
  const out = [cmd("Título", corta(limpa(c.titulo).replace(/\.$/, ""), 40))];
  const t = norm(`${enun} ${pergunta}`);
  const mm = /\b(mmc|mdc)\b\D{0,30}?(\d{1,3})\D{1,12}?(\d{1,3})/.exec(t);
  if (mm) { out.push(`${mm[1]!.toUpperCase()}: ${mm[2]} e ${mm[3]}`); return out; /* as divisões e o resultado se completam sozinhos no fim */ }
  out.push(cmd("Exemplo", corta(enun, 120)));
  const r3 = /(\d+)\s+([a-zà-ú]+)\s+(?:custam|valem|pesam|levam|rendem|fazem|gastam|produzem)\s+(?:r\$\s*)?(\d+)\s+([a-zà-ú]+)/i.exec(limpa(c.enunciado).toLowerCase());
  const r3b = /(\d+)\s+(?:[a-zà-ú]+\s+)?(?:custam|valem|pesam|levam|rendem|fazem|gastam|produzem)\s+(?:quanto|x)\b/.exec(norm(`${enun} ${pergunta}`));
  if (r3 && r3b) out.push(`${r3[1]} ${r3[2]} custam ${r3[3]} ${r3[4]}`, `${r3b[1]} ${r3[2]} custam quanto`);
  else {
    const d = dados(c.enunciado);
    if (d.length >= 2) { out.push("Tabela: Dado, Valor"); for (const [k, v] of d) out.push(cmd("Linha", `${k}, ${v}`)); if (pergunta) out.push("Linha: Pede, x"); }
  }
  const { contas, resposta } = passos(c.resultado);
  for (const x of contas.slice(0, 7)) out.push(cmd("Conta", corta(x, 60)));
  if (resposta) out.push(cmd("Resposta", corta(resposta, 40)));
  return out.length >= 5 ? out : null;
}

/** "**Caso 1 — Título.** enunciado\n→ resultado" (e blocos ":::exemplo" com Situação/Pergunta/Resposta) → casos. */
export function casosDe(md: string): Array<CasoCalculo & { trecho: string }> {
  const out: Array<CasoCalculo & { trecho: string }> = [];
  for (const m of md.matchAll(/\*\*\s*(Caso\s+\d+[^*]*?)\*\*\s*([^\n]*)\n\s*(?:→|->|⇒)\s*([^\n]+)/g)) {
    out.push({ titulo: m[1]!.replace(/[.\s]+$/, ""), enunciado: m[2]!.trim(), resultado: m[3]!.trim(), trecho: m[0] });
  }
  for (const m of md.matchAll(/:::exemplo[ \t]*\n([\s\S]*?)\n[ \t]*:::/g)) {
    const g = (k: string) => new RegExp(`^\\s*${k}\\s*:\\s*(.*)$`, "im").exec(m[1]!)?.[1]?.trim() ?? "";
    if (g("Situa[çc][ãa]o") && g("Resposta")) out.push({ titulo: "Exemplo", enunciado: g("Situa[çc][ãa]o"), pergunta: g("Pergunta"), resultado: g("Resposta"), trecho: m[0] });
  }
  return out;
}

/** Parágrafo já em texto puro ("Caso 1 — Título. enunciado\n→ resultado"). */
export function casoDeTexto(t: string): CasoCalculo | null {
  const m = /^(Caso\s+\d+[^.\n]*)\.\s*([^\n]*)\n\s*(?:→|->|⇒)\s*(.+)$/s.exec(t.trim());
  return m ? { titulo: m[1]!.trim(), enunciado: m[2]!.trim(), resultado: m[3]!.replace(/\s+/g, " ").trim() } : null;
}

/** Bloco de código da aula com a decomposição simultânea ("12 18 | 2 / 6 9 | 2 / …") → lousa de MMC. */
export function roteiroDeFatoracao(codigo: string): string[] | null {
  const ls = codigo.split("\n").map((l) => l.trim()).filter(Boolean);
  if (ls.length < 3 || !ls.every((l) => /^[\d\s]+\|\s*\d*$/.test(l))) return null;
  const nums = (ls[0]!.split("|")[0]!.match(/\d+/g) ?? []).map(Number);
  if (nums.length < 2 || nums.length > 4) return null;
  const mdc = ls.every((l) => /\|/.test(l)) && false;
  const nome = mdc ? "MDC" : "MMC";
  return [`Título: ${nome} de ${nums.join(" e ")}`, `${nome}: ${nums.join(" e ")}`];
}

/** Parágrafo que pede uma conta simples ("Calcule 345 + 278", "Efetue 84 ÷ 4") → conta armada de professor. */
export function roteiroDeConta(texto: string): string[] | null {
  const t = limpa(texto);
  if (t.length > 160 || !/calcul|efetu|resolv|quanto (?:é|e|vale)|arme/i.test(t)) return null;
  const m = /(\d{1,3}(?:\.\d{3})*|\d{1,6})\s*([+−×÷x·/-])\s*(\d{1,3}(?:\.\d{3})*|\d{1,6})(?![\d,])/.exec(t);
  if (!m) return null;
  const op = m[2] === "+" ? "+" : m[2] === "−" || m[2] === "-" ? "−" : m[2] === "÷" || m[2] === "/" ? "÷" : "×";
  const a = m[1]!.replace(/\./g, ""), b = m[3]!.replace(/\./g, "");
  return ["Título: Conta armada", `Armada: ${a} ${op} ${b}`];
}

const frases = (s: string) => limpa(s).split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú0-9“"])/).map((x) => x.trim()).filter((x) => x.length >= 4);

/** Qualquer exemplo em texto (sem conta) → sequência didática: contexto, passos numerados e a conclusão em destaque. */
export function roteiroDeTexto(titulo: string, texto: string): string[] | null {
  const fs = frases(texto).slice(0, 7);
  if (fs.length < 2) return null;
  const out = [cmd("Título", corta(limpa(titulo).replace(/\.$/, "") || "Exemplo", 40))];
  out.push(cmd("Exemplo", corta(fs[0]!, 150)));
  const meio = fs.slice(1, -1), fim = fs.at(-1)!;
  meio.forEach((f, i) => { out.push(cmd("Caixa", `Passo ${i + 1}`)); out.push(cmd("Item", corta(f, 120))); });
  out.push(cmd(meio.length ? "Destaque" : "Item", corta(fim, 150)));
  return out.length >= 4 ? out : null;
}

/** Bloco "Na prática" (Situação → Pergunta → Resposta) sem conta: fluxo de três quadros ligados por setas. */
export function roteiroDeSituacao(c: CasoCalculo): string[] | null {
  const sit = limpa(c.enunciado), res = limpa(c.resultado);
  if (!sit || !res) return null;
  const out = [cmd("Título", corta(limpa(c.titulo).replace(/\.$/, "") || "Na prática", 40)), "Caixa: Situação", cmd("Item", corta(sit, 130))];
  if (c.pergunta) out.push("Caixa: Pergunta", cmd("Item", corta(limpa(c.pergunta), 120)));
  out.push("Caixa: Resposta", cmd("Destaque", corta(res, 150)));
  return out;
}
