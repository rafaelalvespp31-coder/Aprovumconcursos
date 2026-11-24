/**
 * Aulas antigas trazem as contas escritas em texto ("MMC(12,20)=2²×3×5=60", "72=2³×3²", "12 × 13 = 156"). Aqui cada
 * conta que está sozinha numa linha vira um bloco ```conta/```fracao/```raiz, e o app a mostra no caderno, passo a
 * passo, como um aluno faria à mão. Só converte quando o app refaz a conta e o resultado escrito na aula confere;
 * se algo não bate, o texto fica exatamente como estava. Puro (texto entra, texto sai).
 */
const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const ehPrimo = (n: number) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };

const bloco = (lang: string, corpo: string) => `\`\`\`${lang}\n${corpo}\n\`\`\``;

/** "2²×3" → [2,2,3]. Só aceita primos (com expoente em sobrescrito ou ^). */
function fatoresDe(txt: string): number[] | null {
  const partes = txt.split(/\s*[×x*·]\s*/);
  const out: number[] = [];
  for (const parte of partes) {
    const m = parte.match(/^(\d{1,6})(?:\^(\d{1,2})|([⁰¹²³⁴⁵⁶⁷⁸⁹]{1,2}))?$/);
    if (!m) return null;
    const base = Number(m[1]);
    const exp = m[2] ? Number(m[2]) : m[3] ? Number([...m[3]].map((c) => SUP[c]).join("")) : 1;
    if (!ehPrimo(base) || exp < 1 || exp > 30) return null;
    for (let i = 0; i < exp; i++) out.push(base);
  }
  return out.length ? out : null;
}

/** Último número de uma cadeia "a=b=c" cujos termos são produtos de inteiros ("8×9×5" vale 360). */
function valoresDaCadeia(tail: string): number[] | null {
  const termos = tail.split("=").map((t) => t.trim()).filter(Boolean);
  if (!termos.length) return null;
  const vals: number[] = [];
  for (const t of termos) {
    if (!/^\d+(?:\^\d{1,2}|[⁰¹²³⁴⁵⁶⁷⁸⁹]{1,2})?(?:\s*[×x*]\s*\d+(?:\^\d{1,2}|[⁰¹²³⁴⁵⁶⁷⁸⁹]{1,2})?)*$/.test(t)) return null;
    let v = 1;
    for (const f of t.split(/\s*[×x*]\s*/)) {
      const m = f.match(/^(\d+)(?:\^(\d{1,2})|([⁰¹²³⁴⁵⁶⁷⁸⁹]{1,2}))?$/)!;
      const e = m[2] ? Number(m[2]) : m[3] ? Number([...m[3]].map((c) => SUP[c]).join("")) : 1;
      v *= Number(m[1]) ** e;
    }
    vals.push(v);
  }
  return vals;
}

function mmcMdc(op: "mmc" | "mdc", nums: number[]): number {
  return nums.reduce((a, b) => (op === "mmc" ? (a / gcd(a, b)) * b : gcd(a, b)));
}

/** Simula a tabela de fatoração simultânea e devolve os primos usados (MMC: até todos virarem 1; MDC: só divisores comuns). */
function primosDaTabela(op: "mmc" | "mdc", nums: number[]): number[] {
  const usados: number[] = [];
  let cur = [...nums];
  for (let g = 0; g < 60; g++) {
    if (op === "mmc") {
      if (!cur.some((n) => n > 1)) break;
      const alvo = [...Array(Math.max(...cur) + 1).keys()].find((k) => k >= 2 && ehPrimo(k) && cur.some((n) => n % k === 0))!;
      usados.push(alvo);
      cur = cur.map((n) => (n % alvo === 0 ? n / alvo : n));
    } else {
      const comum = [...Array(Math.min(...cur) + 1).keys()].find((k) => k >= 2 && ehPrimo(k) && cur.every((n) => n % k === 0));
      if (!comum) break;
      usados.push(comum);
      cur = cur.map((n) => n / comum);
    }
  }
  return usados;
}

/** Tabela em texto ("24 36 60 | 2") → bloco mmc/mdc, se a tabela bate com a fatoração simultânea. */
function tabelaParaBloco(linhas: string[]): string | null {
  const rows = linhas.map((l) => l.trim()).filter(Boolean);
  if (rows.length < 2) return null;
  const parsed = rows.map((r) => r.match(/^((?:\d+\s+)*\d+)\s*\|\s*(\d*)$/));
  if (parsed.some((m) => !m)) return null;
  const cols = parsed.map((m) => m![1]!.split(/\s+/).map(Number));
  const primos = parsed.map((m) => (m![2] ? Number(m![2]) : null));
  const n = cols[0]!.length;
  if (n < 2 || n > 6 || cols.some((c) => c.length !== n) || cols[0]!.some((x) => x < 1 || x > 999999)) return null;
  const dado = primos.filter((p): p is number => p !== null);
  for (const op of ["mmc", "mdc"] as const) {
    const esperado = primosDaTabela(op, cols[0]!);
    if (esperado.length === dado.length && esperado.every((p, i) => p === dado[i])) {
      return bloco("conta", `${op} ${cols[0]!.join(" ")}`);
    }
  }
  return null;
}

const NUM = String.raw`\d{1,9}(?:,\d{1,3})?`;
const toNum = (s: string) => Number(s.replace(",", "."));

/** Uma linha sozinha com uma conta escrita → bloco (ou null se não for conta ou o resultado não conferir). */
function linhaParaBloco(bruta: string): { bloco: string; op?: "mmc" | "mdc"; valor?: number; nums?: number[] } | null {
  let s = bruta.trim().replace(/^\*\*(.+)\*\*$/, "$1").replace(/^`(.+)`$/, "$1").replace(/^\$(.+)\$$/, "$1").trim();
  s = s.replace(/[.;]$/, "").trim();
  if (!s || s.length > 90 || !/\d/.test(s)) return null;

  // MMC(12,18) = 2×2×3×3 = 36
  let m = s.match(/^(MMC|MDC|mmc|mdc)\s*\(\s*(\d{1,7}(?:\s*[,;]\s*\d{1,7}){1,5})\s*\)\s*(?:=\s*(.+))?$/);
  if (m) {
    const op = m[1]!.toLowerCase() as "mmc" | "mdc";
    const nums = m[2]!.split(/\s*[,;]\s*/).map(Number);
    if (nums.some((x) => x < 1)) return null;
    const v = mmcMdc(op, nums);
    if (m[3]) {
      const vals = valoresDaCadeia(m[3]);
      if (!vals || vals.some((x) => x !== v)) return null;
    }
    return { bloco: bloco("conta", `${op} ${nums.join(" ")}`), op, valor: v, nums };
  }

  // 72 = 2³ × 3²   |   150 = 2 × 3 × 5 × 5
  m = s.match(/^(\d{2,9})\s*=\s*(\S.*)$/);
  if (m && /[×x*·]|[⁰¹²³⁴⁵⁶⁷⁸⁹^]/.test(m[2]!)) {
    const n = Number(m[1]);
    const f = fatoresDe(m[2]!.trim());
    if (f && f.reduce((a, b) => a * b, 1) === n && !(f.length === 1 && f[0] === n)) return { bloco: bloco("conta", `fatoracao ${n}`) };
  }

  // √144 = 12
  m = s.match(/^√\s*(\d{1,7})\s*=\s*(\d{1,4})$/);
  if (m) {
    const n = Number(m[1]), r = Number(m[2]);
    if (n >= 4 && r * r === n) return { bloco: bloco("raiz", String(n)) };
  }

  // 3/4 + 1/2 = 5/4
  m = s.match(/^(\d{1,3})\s*\/\s*(\d{1,3})\s*([+\-−×x*:÷])\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*=\s*(.+)$/);
  if (m) {
    const [a, b, c, d] = [m[1], m[2], m[4], m[5]].map(Number) as [number, number, number, number];
    if (!b || !d) return null;
    const op = m[3]!;
    let n: number, den: number;
    if (op === "+") { n = a * d + c * b; den = b * d; }
    else if (op === "-" || op === "−") { n = a * d - c * b; den = b * d; }
    else if (op === "×" || op === "x" || op === "*") { n = a * c; den = b * d; }
    else { if (!c) return null; n = a * d; den = b * c; }
    if (n < 0) return null;
    const g = gcd(n, den) || 1;
    const rn = n / g, rd = den / g;
    const ult = m[6]!.split("=").pop()!.trim();
    const f = ult.match(/^(\d{1,6})\s*\/\s*(\d{1,6})$/);
    const ok = f ? Number(f[1]) * rd === rn * Number(f[2]) : /^\d+$/.test(ult) && rd === 1 && Number(ult) === rn;
    if (!ok) return null;
    const corpo = `${a}/${b} ${op === "x" || op === "*" ? "×" : op === ":" ? "÷" : op} ${c}/${d}`;
    return { bloco: bloco("fracao", corpo) };
  }

  // 25 + 13 = 38  |  1,5 + 2,25 = 3,75  |  12 × 13 = 156  |  432 ÷ 12 = 36
  m = s.match(new RegExp(`^(${NUM}(?:\\s*\\+\\s*${NUM}){1,5})\\s*=\\s*(${NUM})$`));
  if (m) {
    const termos = m[1]!.split(/\s*\+\s*/);
    const casas = Math.max(...termos.map((t) => (t.split(",")[1] ?? "").length), (m[2]!.split(",")[1] ?? "").length);
    const esc = (t: string) => { const [i, d = ""] = t.split(","); return Number(i + d.padEnd(casas, "0")); };
    if (termos.reduce((a, t) => a + esc(t), 0) !== esc(m[2]!)) return null;
    return { bloco: bloco("conta", `soma ${termos.join(" ")}`) };
  }
  m = s.match(new RegExp(`^(${NUM})\\s*[−-]\\s*(${NUM})\\s*=\\s*(${NUM})$`));
  if (m) {
    const casas = Math.max(...[m[1]!, m[2]!, m[3]!].map((t) => (t.split(",")[1] ?? "").length));
    const esc = (t: string) => { const [i, d = ""] = t.split(","); return Number(i + d.padEnd(casas, "0")); };
    if (esc(m[1]!) < esc(m[2]!) || esc(m[1]!) - esc(m[2]!) !== esc(m[3]!)) return null;
    return { bloco: bloco("conta", `subtracao ${m[1]} ${m[2]}`) };
  }
  m = s.match(/^(\d{1,9})\s*[×x*]\s*(\d{1,4})\s*=\s*(\d{1,12})$/);
  if (m && Number(m[1]) * Number(m[2]) === Number(m[3])) return { bloco: bloco("conta", `multiplicacao ${m[1]} ${m[2]}`) };
  m = s.match(/^(\d{1,9})\s*[÷:]\s*(\d{1,9})\s*=\s*(\d{1,9})$/);
  if (m && Number(m[2]) > 0 && Number(m[1]) === Number(m[2]) * Number(m[3])) return { bloco: bloco("conta", `divisao ${m[1]} ${m[2]}`) };
  void toNum;
  return null;
}

/** Linha de apoio que só repete o valor já mostrado no bloco: "MMC = 2×2×3×3", "MMC = 8×9×5 = 360". */
function repeteResultado(linha: string, op: "mmc" | "mdc", valor: number, nums: number[]): boolean {
  const t = linha.trim().replace(/\.$/, "");
  const comNumeros = t.match(/^(MMC|MDC)\s*\(\s*([\d\s,;]+)\)\s*=\s*(.+)$/i);
  if (comNumeros) {
    if (comNumeros[1]!.toLowerCase() !== op) return false;
    const lista = comNumeros[2]!.split(/\s*[,;]\s*/).filter(Boolean).map(Number);
    if (lista.length !== nums.length || lista.some((x, k) => x !== nums[k])) return false;
    const vals = valoresDaCadeia(comNumeros[3]!);
    return !!vals && vals.every((v) => v === valor);
  }
  const m = t.match(/^(MMC|MDC)\s*=\s*(.+)$/i);
  if (!m || m[1]!.toLowerCase() !== op) return false;
  const vals = valoresDaCadeia(m[2]!);
  return !!vals && vals.every((v) => v === valor);
}

const ABRE_PRODUTO = /^(multiplicando|multiplique|multiplicamos|multiplicação)\b[^.]*:\s*$/i;

export function converterCalculosEmTexto(md: string): string {
  if (!md || !/\d/.test(md)) return md;
  const linhas = md.split("\n");
  const out: string[] = [];
  let i = 0;
  let ult: { op: "mmc" | "mdc"; valor: number; nums: number[]; restam: number } | null = null;
  const vazia = (l: string | undefined) => l === undefined || l.trim() === "";

  while (i < linhas.length) {
    const l = linhas[i]!;
    // cercas de código: só as tabelas de fatoração simultânea são convertidas; o resto passa intacto
    const cerca = l.match(/^(\s*)```\s*(text|txt)?\s*$/i);
    if (cerca) {
      const fim = linhas.findIndex((x, k) => k > i && /^\s*```\s*$/.test(x));
      if (fim === -1) { out.push(...linhas.slice(i)); break; }
      const conv = cerca[2] !== undefined || !l.trim().slice(3) ? tabelaParaBloco(linhas.slice(i + 1, fim)) : null;
      if (conv) {
        out.push(conv);
        const nums = conv.split("\n")[1]!.split(" ");
        const op = nums[0] as "mmc" | "mdc";
        const lista = nums.slice(1).map(Number);
        ult = { op, valor: mmcMdc(op, lista), nums: lista, restam: 8 };
      } else out.push(...linhas.slice(i, fim + 1));
      i = fim + 1;
      continue;
    }
    if (/^\s*```/.test(l)) { // outra cerca (com linguagem): copia até fechar
      const fim = linhas.findIndex((x, k) => k > i && /^\s*```\s*$/.test(x));
      out.push(...linhas.slice(i, fim === -1 ? undefined : fim + 1));
      if (fim === -1) break;
      i = fim + 1;
      continue;
    }

    const sozinha = !vazia(l) && vazia(linhas[i - 1]) && vazia(linhas[i + 1]) && !/^\s*([>#|:-]|\d+[.)]\s)/.test(l) && !/^\s*:::/.test(l);
    if (ult && !vazia(l)) {
      if (repeteResultado(l, ult.op, ult.valor, ult.nums)) { i++; continue; }
      if (ABRE_PRODUTO.test(l.trim())) {
        // "Multiplicando os fatores utilizados:" só some se o que vem depois era repetição do bloco
        let k = i + 1;
        while (k < linhas.length && vazia(linhas[k])) k++;
        if (k < linhas.length && repeteResultado(linhas[k]!, ult.op, ult.valor, ult.nums)) { i++; continue; }
      }
      ult.restam--;
      if (ult.restam <= 0 || /^\s*\*\*/.test(l)) ult = null;
    }

    const r = sozinha ? linhaParaBloco(l) : null;
    if (r) {
      out.push(r.bloco);
      ult = r.op ? { op: r.op, valor: r.valor!, nums: r.nums!, restam: 8 } : null;
    } else out.push(l);
    i++;
  }
  return out.join("\n");
}
