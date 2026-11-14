/**
 * Contas armadas "à mão": o app calcula tudo a partir dos números (a IA só informa os números),
 * então o resultado nunca sai errado. Cada operação devolve uma grade de células (como no caderno)
 * e o passo a passo em português.
 */
export type Operation = "soma" | "subtracao" | "multiplicacao" | "divisao" | "mmc" | "mdc";
export interface Cell { t: string; top?: string; pre?: string; strike?: boolean; tone?: "res" | "dim" | "alert" }
export interface Row { cells: Cell[]; rule?: boolean; /** Coluna (0-based) a partir da qual a linha começa; o resto é vazio. */ gap?: number }
export interface Worked {
  title: string;
  rows: Row[];
  /** Para divisão: divisor e quociente ao lado da grade. */
  side?: { divisor: string; quotient: string };
  /** Para fatoração: coluna dos primos (uma por linha da grade). */
  primes?: string[];
  steps: string[];
  result: string;
}

const digits = (n: number) => String(n).split("").map(Number);
const cell = (t: string, extra: Partial<Cell> = {}): Cell => ({ t, ...extra });
const blank = (): Cell => ({ t: "" });
const pad = (cells: Cell[], w: number): Cell[] => [...Array.from({ length: Math.max(0, w - cells.length) }, blank), ...cells];
const fmt = (n: number) => n.toLocaleString("pt-BR");
const nome = ["unidades", "dezenas", "centenas", "unidades de milhar", "dezenas de milhar", "centenas de milhar", "milhões", "dezenas de milhão", "centenas de milhão"];

export function worked(op: Operation, nums: number[]): Worked | null {
  if (!nums.every((n) => Number.isInteger(n) && n >= 0)) return null;
  switch (op) {
    case "soma": return nums.length >= 2 ? soma(nums) : null;
    case "subtracao": return nums.length === 2 && nums[0]! >= nums[1]! ? subtracao(nums[0]!, nums[1]!) : null;
    case "multiplicacao": return nums.length === 2 && nums[1]! <= 9999 ? multiplicacao(nums[0]!, nums[1]!) : null;
    case "divisao": return nums.length === 2 && nums[1]! > 0 ? divisao(nums[0]!, nums[1]!) : null;
    case "mmc": case "mdc": return nums.length >= 2 && nums.every((n) => n >= 1) ? fatoracao(op, nums) : null;
  }
}

function soma(nums: number[]): Worked {
  const total = nums.reduce((a, b) => a + b, 0);
  const w = String(total).length + 1;
  const ds = nums.map(digits);
  const carries: string[] = Array(w).fill("");
  const steps: string[] = [];
  let carry = 0;
  const len = Math.max(...ds.map((d) => d.length));
  const resDigits: string[] = [];
  for (let i = 0; i < len; i++) {
    const col = ds.map((d) => d[d.length - 1 - i] ?? 0);
    const s = col.reduce((a, b) => a + b, 0) + carry;
    const write = s % 10;
    const out = Math.floor(s / 10);
    steps.push(`${nome[i]![0]!.toUpperCase()}${nome[i]!.slice(1)}: ${[...col, ...(carry ? [carry] : [])].join(" + ")} = ${s}${out ? ` → escreve ${write} e vai ${out}` : ` → escreve ${write}`}.`);
    resDigits.unshift(String(write));
    carry = out;
    if (out) carries[w - 1 - (i + 1)] = String(out);
  }
  if (carry) { resDigits.unshift(String(carry)); steps.push(`Sobrou ${carry}: desce para o resultado.`); }
  const rows: Row[] = [{ cells: carries.map((c) => cell("", { top: c })) }];
  nums.forEach((n, k) => rows.push({ cells: pad(digits(n).map((d) => cell(String(d))), w).map((c, i) => (k === nums.length - 1 && i === 0 ? cell("+") : c)), rule: false }));
  rows[rows.length - 1]!.rule = true;
  rows[rows.length - 1]!.cells[0] = cell("+");
  rows.push({ cells: pad(resDigits.map((d) => cell(d, { tone: "res" as const })), w) });
  return { title: nums.map(fmt).join(" + "), rows, steps, result: `${nums.map(fmt).join(" + ")} = ${fmt(total)}` };
}

function subtracao(a: number, b: number): Worked {
  const da = digits(a), db = digits(b);
  const w = da.length + 1;
  const top: Cell[] = da.map((d) => cell(String(d)));
  const steps: string[] = [];
  const res: string[] = [];
  const cur = [...da];
  for (let i = 0; i < da.length; i++) {
    const idx = da.length - 1 - i;
    const x = cur[idx]!;
    const y = db[db.length - 1 - i] ?? 0;
    const label = `${nome[i]![0]!.toUpperCase()}${nome[i]!.slice(1)}`;
    if (x >= y) {
      steps.push(`${label}: ${x} − ${y} = ${x - y}.`);
      res.unshift(String(x - y));
    } else {
      // empresta do vizinho à esquerda (pulando zeros)
      let j = idx - 1;
      while (j >= 0 && cur[j] === 0) j--;
      steps.push(`${label}: ${x} é menor que ${y}; pede emprestado → ${x + 10} − ${y} = ${x + 10 - y}.`);
      cur[j]! -= 1;
      for (let k = j + 1; k < idx; k++) cur[k] = 9;
      top[j] = cell(String(da[j]), { strike: true, top: String(cur[j]), tone: "alert" });
      for (let k = j + 1; k < idx; k++) top[k] = cell(String(da[k]), { strike: true, top: "9", tone: "alert" });
      top[idx] = cell(String(da[idx]), { pre: "1", tone: "alert" });
      cur[idx] = x + 10;
      res.unshift(String(x + 10 - y));
    }
  }
  const resStr = String(a - b);
  const resDigits = resStr.split("");
  const rows: Row[] = [
    { cells: pad(top, w) },
    { cells: pad(db.map((d) => cell(String(d))), w).map((c, i) => (i === 0 ? cell("−") : c)), rule: true },
    { cells: pad(resDigits.map((d) => cell(d, { tone: "res" as const })), w) },
  ];
  return { title: `${fmt(a)} − ${fmt(b)}`, rows, steps, result: `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}` };
}

function multiplicacao(a: number, b: number): Worked {
  const prod = a * b;
  const db = digits(b);
  const w = String(prod).length + 1;
  const rows: Row[] = [
    { cells: pad(digits(a).map((d) => cell(String(d))), w) },
    { cells: pad(db.map((d) => cell(String(d))), w).map((c, i) => (i === 0 ? cell("×") : c)), rule: true },
  ];
  const steps: string[] = [];
  const partials: number[] = [];
  for (let i = 0; i < db.length; i++) {
    const d = db[db.length - 1 - i]!;
    const p = a * d;
    partials.push(p * 10 ** i);
    steps.push(`${nome[i]![0]!.toUpperCase()}${nome[i]!.slice(1)} do multiplicador (${d}): ${fmt(a)} × ${d} = ${fmt(p)}${i ? `, andando ${i} casa${i > 1 ? "s" : ""} à esquerda (× ${fmt(10 ** i)}) = ${fmt(p * 10 ** i)}` : ""}.`);
    if (db.length > 1) {
      const s = String(p) + "0".repeat(i);
      const cells = pad(s.split("").map((x, k) => cell(x, k >= s.length - i && i > 0 ? { tone: "dim" as const } : {})), w);
      rows.push({ cells });
    }
  }
  if (db.length > 1) {
    rows[rows.length - 1]!.rule = true;
    steps.push(`Soma das linhas: ${partials.map(fmt).join(" + ")} = ${fmt(prod)}.`);
  } else rows[1]!.rule = true;
  rows.push({ cells: pad(String(prod).split("").map((d) => cell(d, { tone: "res" as const })), w) });
  return { title: `${fmt(a)} × ${fmt(b)}`, rows, steps, result: `${fmt(a)} × ${fmt(b)} = ${fmt(prod)}` };
}

function divisao(a: number, b: number): Worked {
  const da = digits(a);
  const n = da.length;
  const rows: Row[] = [{ cells: da.map((d) => cell(String(d))) }];
  const steps: string[] = [];
  const q: string[] = [];
  let rest = 0;
  let started = false;
  // acha o primeiro trecho do dividendo que comporta o divisor
  let cur = 0;
  for (let i = 0; i < n; i++) {
    cur = cur * 10 + da[i]!;
    if (!started) {
      if (cur < b) { if (i === n - 1) { q.push("0"); steps.push(`${fmt(cur)} é menor que ${fmt(b)}: o quociente é 0 e o resto é ${fmt(cur)}.`); rest = cur; } continue; }
      started = true;
      steps.push(`Comece com ${fmt(cur)} (os primeiros algarismos que comportam o divisor ${fmt(b)}).`);
    } else if (cur < b) {
      steps.push(`Baixe o ${da[i]}: ficou ${fmt(cur)}, menor que ${fmt(b)} → escreve 0 no quociente.`);
    } else {
      steps.push(`Baixe o ${da[i]}: ficou ${fmt(cur)}.`);
    }
    const qd = Math.floor(cur / b);
    const prod = qd * b;
    rest = cur - prod;
    q.push(String(qd));
    steps.push(`${fmt(cur)} ÷ ${fmt(b)} = ${qd} (${qd} × ${fmt(b)} = ${fmt(prod)}); sobra ${fmt(cur)} − ${fmt(prod)} = ${fmt(rest)}.`);
    // linhas de trabalho: produto e resto, alinhados ao fim do trecho (coluna i)
    const place = (txt: string, tone?: Cell["tone"]) => {
      const cells: Cell[] = Array.from({ length: n }, blank);
      txt.split("").forEach((ch, k) => { cells[i - (txt.length - 1 - k)] = cell(ch, tone ? { tone } : {}); });
      return cells;
    };
    rows.push({ cells: place(`−${prod}`.slice(1), "alert").map((c, k, all) => (k === all.findIndex((x) => x.t) - 1 && k >= 0 ? cell("−", { tone: "alert" }) : c)), rule: true });
    const restCells = place(String(rest));
    if (i < n - 1) restCells[i + 1] = cell(String(da[i + 1]), { tone: "dim" });
    rows.push({ cells: restCells });
    cur = rest;
  }
  if (!started && q.length === 0) q.push("0");
  const resto = a % b;
  return {
    title: `${fmt(a)} ÷ ${fmt(b)}`,
    rows,
    side: { divisor: String(b), quotient: q.join("").replace(/^0+(?=\d)/, "") || "0" },
    steps,
    result: `${fmt(a)} ÷ ${fmt(b)} = ${fmt(Math.floor(a / b))}${resto ? ` (resto ${fmt(resto)})` : " (resto 0: divisão exata)"}`,
  };
}

/** Menor primo que divide pelo menos um dos números (>1). */
function smallestPrime(nums: number[]): number | null {
  for (let p = 2; p <= Math.max(...nums); p++) {
    if (!isPrime(p)) continue;
    if (nums.some((n) => n > 1 && n % p === 0)) return p;
  }
  return null;
}
const isPrime = (n: number) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };

function fatoracao(op: "mmc" | "mdc", nums: number[]): Worked {
  const rows: Row[] = [{ cells: nums.map((n) => cell(String(n))) }];
  const primes: string[] = [];
  const used: number[] = [];
  const common: number[] = [];
  let cur = [...nums];
  const steps: string[] = [];
  let guard = 0;
  while (cur.some((n) => n > 1) && guard++ < 60) {
    const p = smallestPrime(cur)!;
    const all = cur.every((n) => n % p === 0);
    cur = cur.map((n) => (n % p === 0 ? n / p : n));
    primes.push(String(p));
    used.push(p);
    if (all) common.push(p);
    steps.push(`Divida por ${p}${op === "mmc" ? ` (o menor primo que divide algum deles; quem não divide é repetido)` : all ? " (divide todos: é fator comum)" : " (não divide todos: só conta para o MMC)"}.`);
    rows.push({ cells: cur.map((n) => cell(String(n), n === 1 ? { tone: "dim" as const } : {})) });
  }
  primes.push("");
  const picked = op === "mmc" ? used : common;
  const value = picked.reduce((a, b) => a * b, 1);
  const label = op.toUpperCase();
  steps.push(op === "mmc" ? `${label}: multiplique todos os primos da coluna da direita.` : `${label}: multiplique só os primos que dividiram todos os números ao mesmo tempo${common.length ? "" : " (nenhum: MDC = 1)"}.`);
  return {
    title: `${label}(${nums.join(", ")})`,
    rows,
    primes,
    steps,
    result: `${label}(${nums.join(", ")}) = ${picked.length ? picked.join(" × ") + " = " : ""}${fmt(value)}`,
  };
}
