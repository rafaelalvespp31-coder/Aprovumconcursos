/**
 * Contas armadas no caderno, passo a passo: cada célula sabe em que passo aparece, então a tela escreve a conta
 * aos poucos (primeiro número, sinal, cada algarismo com seu "vai um" ou empréstimo, resultado). Puro: os números
 * entram, o app calcula, nada é inventado. O passo 0 é sempre "armar a conta".
 */
import { worked, type Cell, type Operation, type Row, type Worked } from "./hand-math";

const digits = (n: number) => String(n).split("").map(Number);
const fmt = (n: number) => n.toLocaleString("pt-BR");
const NOME = ["unidades", "dezenas", "centenas", "unidades de milhar", "dezenas de milhar", "centenas de milhar", "milhões", "dezenas de milhão", "centenas de milhão"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const casa = (k: number) => `casa d${k === 6 ? "os" : "as"} ${NOME[k] ?? `ordem ${k + 1}`}`;
const c = (t: string, x: Partial<Cell> = {}): Cell => ({ t, ...x });
const linha = (w: number): Cell[] => Array.from({ length: w }, () => ({ t: "" }));

/**
 * `casas` > 0: os números vêm multiplicados por 10^casas (ex.: 12,5 e 3,25 → 1250 e 325, casas = 2) e a conta é
 * armada com a vírgula alinhada (só soma e subtração).
 */
export function contaCaderno(op: Operation, nums: number[], casas = 0): Worked | null {
  if (!nums.every((n) => Number.isInteger(n) && n >= 0 && Number.isSafeInteger(n))) return null;
  if (casas > 0 && op !== "soma" && op !== "subtracao") return null;
  if (casas > 3) return null;
  switch (op) {
    case "soma": return nums.length >= 2 && nums.length <= 6 ? comVirgula(soma(nums, casas), casas) : null;
    case "subtracao": return nums.length === 2 && nums[0]! >= nums[1]! ? comVirgula(subtracao(nums[0]!, nums[1]!, casas), casas) : null;
    case "multiplicacao": return nums.length === 2 && nums[1]! <= 9999 ? multiplicacao(nums[0]!, nums[1]!) : null;
    case "divisao": return nums.length === 2 && nums[1]! > 0 ? divisao(nums[0]!, nums[1]!) : null;
    case "mmc": case "mdc": case "fatoracao": return fatorar(op, nums);
  }
}

const DEC = ["décimos", "centésimos", "milésimos"];
/** Nome da casa na coluna `i` (da direita), considerando as casas decimais. */
const nomeCol = (i: number, casas: number) => (i < casas ? DEC[casas - 1 - i]! : NOME[i - casas] ?? "ordem");
const fmtD = (n: number, casas: number) => (n / 10 ** casas).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Insere a coluna da vírgula (alinhada em todas as linhas) e acerta os focos. */
function comVirgula(w: Worked | null, casas: number): Worked | null {
  if (!w || casas === 0) return w;
  const nCols = w.rows[0]!.cells.length;
  const pos = nCols - casas;
  w.rows.forEach((r, ri) => {
    const tem = ri > 0; // a linha de "vai um" não leva vírgula
    r.cells.splice(pos, 0, tem ? { t: ",", p: 0 } : { t: "" });
  });
  w.focos = w.focos?.map((f) => f.map(([r, c]) => [r, c >= pos ? c + 1 : c] as [number, number]));
  return w;
}

function soma(nums: number[], casas = 0): Worked | null {
  const total = nums.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) return null;
  const S = (n: number) => String(n).padStart(casas + 1, "0");
  const len = Math.max(...nums.map((n) => S(n).length));
  const w = S(total).length + 1;
  const carryRow = linha(w);
  const res = linha(w);
  const rows: Row[] = [{ cells: carryRow }];
  nums.forEach((n, k) => {
    const r = linha(w);
    const s = S(n);
    s.split("").forEach((d, i) => { r[w - s.length + i] = c(d, { p: 0 }); });
    if (k === nums.length - 1) r[0] = c("+", { p: 0 });
    rows.push({ cells: r, rule: k === nums.length - 1 });
  });
  rows.push({ cells: res });
  const steps = [casas
    ? `Arme a conta: escreva os números um embaixo do outro com a vírgula embaixo da vírgula. Complete com zeros à direita para todos ficarem com ${casas} casa${casas > 1 ? "s" : ""} depois da vírgula. Coloque o sinal + e um traço.`
    : "Arme a conta: escreva os números um embaixo do outro, alinhados pela direita (unidades embaixo de unidades, dezenas embaixo de dezenas), com o sinal + e um traço."];
  const focos: [number, number][][] = [[]];
  let carry = 0;
  for (let i = 0; i < len; i++) {
    const col = nums.filter((n) => S(n).length > i).map((n) => Math.floor(n / 10 ** i) % 10);
    const s = col.reduce((a, b) => a + b, 0) + carry;
    const write = s % 10, out = Math.floor(s / 10), step = i + 1;
    let t = `${i === 0 ? "Vamos começar pela direita. " : ""}${cap(nomeCol(i, casas))}: ${[...col, ...(carry ? [carry] : [])].join(" + ")} = ${s}${carry ? ` (o ${carry} veio da casa anterior)` : ""}. `;
    t += out ? `Escreva ${write} embaixo e "vai ${out}" para a ${i + 1 === casas ? "casa das unidades (depois da vírgula, vem a vírgula e então as unidades)" : casa(i + 1 - casas)}.` : `Escreva ${write} embaixo.`;
    res[w - 1 - i] = c(String(write), { tone: "res", p: step });
    if (out) {
      if (i < len - 1) carryRow[w - 2 - i] = c(String(out), { tone: "vai", p: step });
      else { res[w - 2 - i] = c(String(out), { tone: "res", p: step }); t += ` Não há mais colunas: o ${out} desce para o resultado.`; }
    }
    steps.push(t);
    focos.push([...nums.map((n, k) => [k + 1, w - 1 - i, S(n).length > i] as const).filter((x) => x[2]).map((x) => [x[0], x[1]] as [number, number]), ...(carry ? ([[0, w - 1 - i]] as [number, number][]) : [])]);
    carry = out;
  }
  const f = casas ? (n: number) => fmtD(n, casas) : fmt;
  const exp = nums.map(f).join(" + ");
  return { title: exp, rows, steps, focos, result: `${exp} = ${f(total)}` };
}

function subtracao(a: number, b: number, casas = 0): Worked {
  const S = (x: number) => String(x).padStart(casas + 1, "0");
  const da = S(a).split("").map(Number), db = S(b).split("").map(Number), n = da.length, w = n + 1;
  const top = linha(w);
  da.forEach((d, i) => { top[w - n + i] = c(String(d), { p: 0 }); });
  const sub = linha(w);
  db.forEach((d, i) => { sub[w - db.length + i] = c(String(d), { p: 0 }); });
  sub[0] = c("−", { p: 0 });
  const resStr = S(a - b);
  const res = linha(w);
  const rows: Row[] = [{ cells: top }, { cells: sub, rule: true }, { cells: res }];
  const steps = [casas
    ? `Arme a conta: o número maior em cima, o menor embaixo, com a vírgula embaixo da vírgula. Complete com zeros à direita para ficarem com ${casas} casa${casas > 1 ? "s" : ""} depois da vírgula. Coloque o sinal − e um traço.`
    : "Arme a conta: o número maior em cima, o menor embaixo, alinhados pela direita (unidades embaixo de unidades), com o sinal − e um traço."];
  const focos: [number, number][][] = [[]];
  const cur = [...da];
  for (let i = 0; i < n; i++) {
    const idx = n - 1 - i;
    const x = cur[idx]!;
    const y = db[db.length - 1 - i] ?? 0;
    const step = i + 1;
    let t: string;
    if (x >= y) {
      t = `${i === 0 ? "Vamos começar pela direita. " : ""}${cap(nomeCol(i, casas))}: ${x} − ${y} = ${x - y}. Escreva ${x - y} embaixo.`;
    } else {
      let j = idx - 1;
      while (j >= 0 && cur[j] === 0) j--;
      const antes = cur[j]!;
      cur[j]! -= 1;
      const meio: number[] = [];
      for (let k = j + 1; k < idx; k++) { cur[k] = 9; meio.push(k); }
      const cj = top[w - n + j]!;
      cj.strike = true; cj.top = String(cur[j]); cj.pa = step; cj.tone = "alert";
      for (const k of meio) { const ck = top[w - n + k]!; ck.strike = true; ck.top = "9"; ck.pa = step; ck.tone = "alert"; }
      const ci = top[w - n + idx]!;
      ci.pre = "1"; ci.pp = step; ci.tone = "alert";
      cur[idx] = x + 10;
      const d = idx - j;
      t = `${i === 0 ? "Vamos começar pela direita. " : ""}${cap(nomeCol(i, casas))}: ${x} é menor que ${y}, então não dá para tirar. `;
      t += d === 1
        ? `Pedimos 1 emprestado da casa vizinha (${nomeCol(i + 1, casas)}), que passa de ${antes} para ${antes - 1}. Aqui o ${x} vira ${x + 10}. `
        : `A casa vizinha (${nomeCol(i + 1, casas)}) está com 0 e não tem o que emprestar; vamos até a casa das ${nomeCol(i + d, casas)}, que passa de ${antes} para ${antes - 1}. Os zeros do caminho viram 9 e aqui o ${x} vira ${x + 10}. `;
      t += `Agora: ${x + 10} − ${y} = ${x + 10 - y}. Escreva ${x + 10 - y} embaixo.`;
    }
    const v = cur[idx]! - y;
    if (i < resStr.length) res[w - 1 - i] = c(String(v), { tone: "res", p: step });
    steps.push(t);
    focos.push([[0, w - 1 - i], [1, w - 1 - i]]);
  }
  const f = casas ? (x: number) => fmtD(x, casas) : fmt;
  return { title: `${f(a)} − ${f(b)}`, rows, steps, focos, result: `${f(a)} − ${f(b)} = ${f(a - b)}` };
}

function multiplicacao(a: number, b: number): Worked | null {
  const prod = a * b;
  if (!Number.isSafeInteger(prod)) return null;
  const da = digits(a), db = digits(b), la = da.length;
  const w = Math.max(String(prod).length, la, db.length) + 1;
  const multi = db.length > 1;
  const carryRow = linha(w);
  const aRow = linha(w), bRow = linha(w), resRow = linha(w);
  da.forEach((d, i) => { aRow[w - la + i] = c(String(d), { p: 0 }); });
  db.forEach((d, i) => { bRow[w - db.length + i] = c(String(d), { p: 0 }); });
  bRow[0] = c("×", { p: 0 });
  const rows: Row[] = [{ cells: carryRow }, { cells: aRow }, { cells: bRow, rule: true }];
  const steps = [`Arme a conta: ${fmt(a)} em cima e ${fmt(b)} embaixo, alinhados pela direita, com o sinal × e um traço. Vamos multiplicar cada algarismo de baixo por todos os de cima.`];
  const focos: [number, number][][] = [[]];
  const parciais: number[] = [];
  const partialRows: Row[] = [];
  for (let i = 0; i < db.length; i++) {
    const d = db[db.length - 1 - i]!;
    const prow = multi ? linha(w) : resRow;
    const tone = multi ? undefined : ("res" as const);
    if (multi) { const r: Row = { cells: prow }; partialRows.push(r); rows.push(r); }
    const carryStates: { t: string; p: number; pe?: number }[] = [];
    parciais.push(a * d * 10 ** i);
    if (d === 0) {
      const p0 = steps.length;
      steps.push(`O algarismo da ${casa(i)} é 0. Tudo que se multiplica por 0 dá 0, então esta linha fica só com zeros.`);
      for (let z = 0; z <= i; z++) prow[w - 1 - z] = c("0", { tone: "dim", p: p0 });
      continue;
    }
    if (i > 0) {
      const p0 = steps.length;
      steps.push(`Agora o ${d} está na ${casa(i)}: ele vale ${fmt(d * 10 ** i)}. Antes de multiplicar, escrevemos ${i} zero${i > 1 ? "s" : ""} no fim da linha (andamos ${i} casa${i > 1 ? "s" : ""} para a esquerda).`);
      for (let z = 0; z < i; z++) prow[w - 1 - z] = c("0", { tone: "dim", p: p0 });
    }
    let carry = 0;
    for (let k = 0; k < la; k++) {
      const ak = da[la - 1 - k]!;
      const v = ak * d + carry, wr = v % 10, out = Math.floor(v / 10), step = steps.length;
      const ultimo = k === la - 1;
      let t = `${i === 0 && k === 0 ? "Vamos começar pela direita. Agora multiplicamos " : k === 0 ? "Agora multiplicamos " : ""}${d} × ${ak} = ${ak * d}${carry ? `, mais ${carry} que veio = ${v}` : ""}. `;
      if (!ultimo) t += out ? `Escreva ${wr} e "vai ${out}".` : `Escreva ${wr}.`;
      else t += out ? `Acabaram os algarismos de cima: escreva ${v} inteiro.` : `Escreva ${wr}.`;
      steps.push(t);
      focos[step] = [[1, w - 1 - k], [2, w - 1 - i]];
      prow[w - 1 - i - k] = c(String(wr), { p: step, tone });
      if (!ultimo && out) carryStates.push({ t: String(out), p: step });
      if (!ultimo && out) {
        const col = w - 2 - k;
        const atual = carryRow[col]!;
        atual.tone = "vai";
        atual.alt = [...(atual.alt ?? []), carryStates[carryStates.length - 1]!];
      }
      if (ultimo && out) prow[w - 2 - i - k] = c(String(out), { p: step, tone });
      carry = out;
    }
    // o "vai um" desta linha é apagado quando começa a próxima
    for (const st of carryStates) st.pe = steps.length;
  }
  if (multi) {
    partialRows[partialRows.length - 1]!.rule = true;
    const step = steps.length;
    steps.push(`Agora somamos as linhas: ${parciais.map(fmt).join(" + ")} = ${fmt(prod)}.`);
    String(prod).split("").forEach((d, i) => { resRow[w - String(prod).length + i] = c(d, { tone: "res", p: step }); });
  }
  rows.push({ cells: resRow });
  // o último "vai um" fica; os das linhas anteriores já têm `pe`
  for (let i = 0; i < steps.length; i++) focos[i] ??= [];
  return { title: `${fmt(a)} × ${fmt(b)}`, rows, steps, focos, result: `${fmt(a)} × ${fmt(b)} = ${fmt(prod)}` };
}

function divisao(a: number, b: number): Worked {
  const da = digits(a), n = da.length;
  const rows: Row[] = [{ cells: da.map((d) => c(String(d), { p: 0 })) }];
  const steps = [`Arme a chave: o dividendo (${fmt(a)}) fica dentro e o divisor (${fmt(b)}) fora, à esquerda da barra. O quociente vai aparecer embaixo do divisor.`];
  const q: { t: string; p: number }[] = [];
  let rest = 0, started = false, cur = 0;
  let baixado: Cell | null = null;
  for (let i = 0; i < n; i++) {
    cur = cur * 10 + da[i]!;
    if (!started) {
      if (cur < b) {
        if (i === n - 1) { steps.push(`${fmt(cur)} é menor que ${fmt(b)}: o quociente é 0 e o resto é ${fmt(cur)}.`); q.push({ t: "0", p: steps.length - 1 }); rest = cur; }
        continue;
      }
      started = true;
      steps.push(`Comece com ${fmt(cur)}: são os primeiros algarismos que comportam o divisor ${fmt(b)}.`);
    } else if (cur < b) {
      steps.push(`Baixe o ${da[i]}: ficou ${fmt(cur)}, que é menor que ${fmt(b)}. Então escreva 0 no quociente.`);
    } else {
      steps.push(`Baixe o ${da[i]}: ficou ${fmt(cur)}.`);
    }
    if (baixado) baixado.p = steps.length - 1;
    const qd = Math.floor(cur / b), prod = qd * b;
    rest = cur - prod;
    const sB = steps.length;
    steps.push(`${fmt(cur)} ÷ ${fmt(b)} = ${qd}, porque ${qd} × ${fmt(b)} = ${fmt(prod)}. Escreva ${qd} no quociente, ${fmt(prod)} embaixo e subtraia: ${fmt(cur)} − ${fmt(prod)} = ${fmt(rest)}.`);
    q.push({ t: String(qd), p: sB });
    const place = (txt: string, extra: Partial<Cell>): Cell[] => {
      const cells: Cell[] = linha(n);
      txt.split("").forEach((ch, k) => { cells[i - (txt.length - 1 - k)] = c(ch, { p: sB, ...extra }); });
      return cells;
    };
    const prodCells = place(String(prod), { tone: "alert" });
    const first = prodCells.findIndex((x) => x.t);
    if (first > 0) prodCells[first - 1] = c("−", { p: sB, tone: "alert" });
    rows.push({ cells: prodCells, rule: true });
    const restCells = place(String(rest), {});
    baixado = null;
    if (i < n - 1) { baixado = c(String(da[i + 1]), { tone: "dim", p: 9999 }); restCells[i + 1] = baixado; }
    rows.push({ cells: restCells });
    cur = rest;
  }
  if (baixado) baixado.p = steps.length - 1;
  const resto = a % b;
  const quot = q.length ? q : [{ t: "0", p: 0 }];
  return {
    title: `${fmt(a)} ÷ ${fmt(b)}`,
    rows,
    side: { divisor: String(b), quotient: quot.map((x) => x.t).join("").replace(/^0+(?=\d)/, "") || "0" },
    quotientCells: quot,
    steps,
    result: `${fmt(a)} ÷ ${fmt(b)} = ${fmt(Math.floor(a / b))}${resto ? ` (resto ${fmt(resto)})` : " (resto 0: divisão exata)"}`,
  };
}

/** MMC/MDC: usa a fatoração simultânea de hand-math e marca em que passo cada linha e cada primo aparecem. */
function fatorar(op: "mmc" | "mdc" | "fatoracao", nums: number[]): Worked | null {
  const w = worked(op, nums);
  if (!w) return null;
  w.rows.forEach((r, ri) => r.cells.forEach((cell) => { cell.p = ri; }));
  const lista = nums.join(" e ");
  const abre = nums.length === 1 ? `Escreva o número ${lista} e trace uma barra à direita: é ali que vão aparecer os números primos.` : `Escreva os números lado a lado (${lista}) e trace uma barra à direita: é ali que vão aparecer os números primos.`;
  return { ...w, steps: [abre, ...w.steps] };
}
