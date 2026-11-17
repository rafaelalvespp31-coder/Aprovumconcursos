import type { EstadoDitado } from "./ditado";
import type { ItemDesenho } from "./lousa";

/**
 * Cenas de ensino no quadro, construídas passo a passo enquanto o Mentor fala:
 * MMC/MDC progressivo (a cada "vamos dividir por 2" nasce uma linha), análise sintática (colchetes sob a frase),
 * pirâmide normativa, cadeia (alimentar, causal…) e comparação em colunas com pictogramas (furto × roubo).
 */
type Cor = "grafite" | "vermelho" | "azul" | "verde" | "laranja" | "roxo" | "rosa";
const CICLO: Cor[] = ["azul", "vermelho", "verde", "laranja", "roxo"];
const cw = (tam: number) => tam * 0.56;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tx = (x: number, y: number, s: string, cor: Cor, tam: number, d: number): ItemDesenho => ({ t: "texto", x: Math.max(0, Math.round(x)), y: Math.round(y), s: s.slice(0, 40), cor, tam, d });
const lin = (x1: number, y1: number, x2: number, y2: number, cor: Cor, d: number, seta?: boolean): ItemDesenho => ({ t: "linha", x1: Math.max(0, Math.round(x1)), y1: Math.round(y1), x2: Math.max(0, Math.round(x2)), y2: Math.round(y2), cor, d, seta });
const circ = (cx: number, cy: number, r: number, cor: Cor, d: number): ItemDesenho => ({ t: "circ", cx: Math.max(0, Math.round(cx)), cy: Math.round(cy), r, cor, d });
const ret = (x: number, y: number, w: number, h: number, cor: Cor, d: number): ItemDesenho => ({ t: "ret", x: Math.max(0, Math.round(x)), y: Math.round(y), w: Math.round(w), h: Math.round(h), cor, d });
const parte = (s: string) => s.split(/\s*(?:,|;|\be\b)\s*/i).map((x) => x.trim()).filter(Boolean);

export const ENSINO = new Set(["frase", "sujeito", "predicado", "verbo", "nucleo", "complemento", "adjunto", "camada", "cadeia", "coluna", "pessoa", "vitima", "arma", "objeto", "mmc", "mdc"]);

// ── MMC / MDC progressivo ────────────────────────────────────────────────────────────────────────
export interface Mmc { modo: "mmc" | "mdc"; vals: number[]; x0: number; y0: number; k: number; usados: number[]; pitch: number; feito: boolean; xR: number; yR: number }

function iniciaMmc(e: EstadoDitado, modo: "mmc" | "mdc", resto: string, d: number, it: ItemDesenho[]): boolean {
  const ns = [...new Set([...resto.matchAll(/\d{1,3}/g)].map((m) => Number(m[0])))].filter((n) => n >= 2).slice(0, 3);
  if (ns.length < 2) return false;
  const larg = e.ncols > 1;
  const y = Math.max(e.y, e.ym) + 14;
  e.yL = y; e.yR = y;
  const tam = larg ? 24 : 22, pitch = 40;
  const colx = (i: number) => e.margem + 10 + i * 72;
  const barX = e.margem + ns.length * 72 + 2;
  ns.forEach((n, i) => it.push(tx(colx(i), y + 30, String(n), "azul", tam, d + i * 0.1)));
  it.push(lin(barX, y + 4, barX, y + 30 + 6 * pitch, "grafite", d + 0.2));
  e.mmc = { modo, vals: ns, x0: e.margem, y0: y + 30, k: 0, usados: [], pitch, feito: false, xR: larg ? Math.round(e.W * 0.52) : e.margem, yR: y + 30 };
  e.ym = Math.max(e.ym, y + 30 + 40);
  return true;
}

/** Aplica o próximo número primo ("vamos dividir por 2"): nasce a linha de baixo e o divisor ganha destaque. */
function aplicaPrimo(e: EstadoDitado, p: number, d: number, it: ItemDesenho[]): boolean {
  const m = e.mmc;
  if (!m || m.feito || m.k >= 6 || !m.vals.some((v) => v > 1 && v % p === 0)) return false;
  const larg = e.ncols > 1, tam = larg ? 24 : 22;
  const colx = (i: number) => e.margem + 10 + i * 72;
  const barX = e.margem + m.vals.length * 72 + 2;
  const y = m.y0 + m.k * m.pitch;
  const todos = m.vals.every((v) => v > 1 && v % p === 0);
  const usa = m.modo === "mmc" || todos;
  if (usa) m.usados.push(p);
  it.push(tx(barX + 16, y, String(p), usa ? "vermelho" : "grafite", tam, d));
  if (usa) it.push(circ(barX + 16 + String(p).length * 6, y - 8, 17, "vermelho", d + 0.1));
  m.vals = m.vals.map((v) => (v > 1 && v % p === 0 ? v / p : v));
  m.vals.forEach((v, i) => it.push(tx(colx(i), y + m.pitch, String(v), "azul", tam, d + 0.2 + i * 0.1)));
  it.push(lin(colx(0) + 12, y + 6, colx(0) + 12, y + m.pitch - tam - 2, "laranja", d + 0.15, true));
  m.k++;
  e.ym = Math.max(e.ym, y + m.pitch + 20);
  if (m.vals.every((v) => v === 1)) finalizaMmc(e, d + 0.8, it);
  return true;
}

function finalizaMmc(e: EstadoDitado, d: number, it: ItemDesenho[]): void {
  const m = e.mmc;
  if (!m || m.feito) return;
  m.feito = true;
  const larg = e.ncols > 1, tam = larg ? 24 : 22;
  const nome = m.modo.toUpperCase(), prod = m.usados.reduce((a, b) => a * b, 1);
  const x = m.xR;
  const y = larg ? m.y0 : m.y0 + (m.k + 1) * m.pitch + 10;
  it.push(tx(x, y, m.usados.length ? m.usados.join(" × ") : "1", "vermelho", tam, d));
  it.push(tx(x, y + 44, `${nome} = ${prod}`, "verde", tam + 6, d + 0.4));
  it.push(ret(x - 8, y + 44 - tam - 10, Math.min(360, `${nome} = ${prod}`.length * cw(tam + 6) + 24), tam + 22, "verde", d + 0.7));
  e.ym = Math.max(e.ym, y + 70);
}

// ── Análise sintática: frase + colchetes ─────────────────────────────────────────────────────────
export interface Frase { s: string; x0: number; y: number; tam: number }
const PAPEL: Record<string, { cor: Cor; nivel: number; rotulo: string }> = {
  sujeito: { cor: "azul", nivel: 0, rotulo: "Sujeito" }, predicado: { cor: "vermelho", nivel: 0, rotulo: "Predicado" },
  nucleo: { cor: "verde", nivel: 1, rotulo: "Núcleo" }, verbo: { cor: "laranja", nivel: 1, rotulo: "Verbo" },
  complemento: { cor: "roxo", nivel: 1, rotulo: "Complemento" }, adjunto: { cor: "rosa", nivel: 1, rotulo: "Adjunto" }, objeto: { cor: "roxo", nivel: 1, rotulo: "Objeto" },
};

function colchete(e: EstadoDitado, papel: string, resto: string, d: number, it: ItemDesenho[]): boolean {
  const f = e.frase, p = PAPEL[papel];
  if (!f || !p || !resto) return false;
  const i = norm(f.s).indexOf(norm(resto));
  if (i < 0) return false;
  const x1 = f.x0 + i * cw(f.tam), x2 = f.x0 + (i + resto.length) * cw(f.tam);
  const y = f.y + 12 + p.nivel * 56;
  it.push({ t: "curva", pts: [[Math.round(x1), y], [Math.round(x1), y + 10], [Math.round((x1 + x2) / 2), y + 10], [Math.round(x2), y + 10], [Math.round(x2), y]], cor: p.cor, d });
  it.push(tx(Math.max(e.margem, (x1 + x2) / 2 - p.rotulo.length * cw(17) / 2), y + 32, p.rotulo, p.cor, 17, d + 0.2));
  e.ym = Math.max(e.ym, y + 44);
  return true;
}

// ── Cenas (comparações com pictogramas) ──────────────────────────────────────────────────────────
export interface Cena { x0: number; y0: number; n: number; pessoa?: [number, number]; objeto?: [number, number] }

function cenaDe(e: EstadoDitado): Cena | null {
  if (e.col < 0 || e.col >= e.ncols) return null;
  const x0 = e.margem + e.col * (e.colW + 18);
  let c = e.cenas[e.col];
  if (!c) { c = { x0, y0: e.colY[e.col]!, n: 0 }; e.cenas[e.col] = c; e.colY[e.col] = c.y0 + 118; e.ym = Math.max(e.ym, c.y0 + 118); }
  return c;
}

function pessoa(c: Cena, rotulo: string, cor: Cor, d: number, it: ItemDesenho[]): void {
  const cx = c.x0 + 36 + c.n++ * 92, y = c.y0;
  it.push(circ(cx, y + 16, 12, cor, d), lin(cx, y + 28, cx, y + 62, cor, d + 0.1), lin(cx - 17, y + 42, cx + 17, y + 42, cor, d + 0.2), lin(cx, y + 62, cx - 13, y + 88, cor, d + 0.3), lin(cx, y + 62, cx + 13, y + 88, cor, d + 0.3));
  it.push(tx(Math.max(0, cx - rotulo.length * cw(15) / 2), y + 108, rotulo.slice(0, 14), cor, 15, d + 0.4));
  c.pessoa = [cx, y];
}

function objeto(c: Cena, rotulo: string, d: number, it: ItemDesenho[]): void {
  const cx = c.x0 + 36 + c.n++ * 92, y = c.y0;
  it.push(ret(cx - 16, y + 54, 32, 26, "laranja", d), lin(cx - 8, y + 54, cx - 8, y + 46, "laranja", d + 0.1), lin(cx + 8, y + 54, cx + 8, y + 46, "laranja", d + 0.1), lin(cx - 8, y + 46, cx + 8, y + 46, "laranja", d + 0.1));
  it.push(tx(Math.max(0, cx - rotulo.length * cw(15) / 2), y + 108, rotulo.slice(0, 14), "laranja", 15, d + 0.3));
  c.objeto = [cx, y];
}

/** Trata os comandos de ensino. Devolve true se consumiu o comando (mesmo sem desenhar). */
export function comandoEnsino(e: EstadoDitado, cmd: string, resto: string, d: number, it: ItemDesenho[]): boolean {
  const larg = e.ncols > 1;
  if (cmd === "mmc" || cmd === "mdc") { iniciaMmc(e, cmd, resto, d, it); return true; }
  if (cmd === "frase") {
    if (!resto) return true;
    const s = resto.slice(0, 60), tam = Math.min(larg ? 30 : 24, Math.floor((e.W - 48) / (s.length * 0.56)));
    const y = Math.max(e.y, e.ym) + 40;
    e.frase = { s, x0: e.margem, y, tam };
    it.push(tx(e.margem, y, s, "grafite", tam, d));
    e.ym = y + 12;
    return true;
  }
  if (cmd in PAPEL && !(cmd === "objeto" && !e.frase)) { colchete(e, cmd, resto, d, it); return true; }
  if (cmd === "camada") {
    if (!resto) return true;
    const k = e.camadas++;
    if (k === 0) e.pirY = Math.max(e.y, e.ym) + 14;
    const w = Math.min(e.W - 2 * e.margem, 130 + k * (larg ? 120 : 60)), x = (e.W - w) / 2, y = e.pirY + k * 50;
    const cor = CICLO[k % 5]!, tam = larg ? 20 : 17, s = resto.slice(0, Math.max(6, Math.floor((w - 16) / cw(tam))));
    it.push(ret(x, y, w, 42, cor, d), tx(x + (w - s.length * cw(tam)) / 2, y + 28, s, cor, tam, d + 0.2));
    e.ym = Math.max(e.ym, y + 54);
    return true;
  }
  if (cmd === "cadeia") {
    const nos = parte(resto).slice(0, 6);
    if (nos.length < 2) return true;
    const porLinha = larg ? 6 : 3, y0 = Math.max(e.y, e.ym) + 14, passoX = (e.W - 2 * e.margem) / Math.min(porLinha, nos.length);
    nos.forEach((n, i) => {
      const r = Math.floor(i / porLinha), c = i % porLinha, cx = e.margem + passoX * c + passoX / 2, cy = y0 + 34 + r * 110, cor = CICLO[i % 5]!;
      it.push(circ(cx, cy, 30, cor, d + i * 0.35), tx(Math.max(0, cx - n.length * cw(16) / 2), cy + 54, n.slice(0, 14), cor, 16, d + i * 0.35 + 0.15));
      if (c < porLinha - 1 && i < nos.length - 1) it.push(lin(cx + 34, cy, cx + passoX - 34, cy, "grafite", d + i * 0.35 + 0.2, true));
    });
    e.ym = y0 + 34 + (Math.ceil(nos.length / porLinha) - 1) * 110 + 76;
    return true;
  }
  if (cmd === "pessoa" || cmd === "vitima") { const c = cenaDe(e); if (c) pessoa(c, resto || (cmd === "vitima" ? "vítima" : "pessoa"), cmd === "vitima" ? "azul" : "vermelho", d, it); return true; }
  if (cmd === "objeto") { const c = cenaDe(e); if (c) objeto(c, resto || "objeto", d, it); return true; }
  if (cmd === "arma") {
    const c = cenaDe(e);
    if (c?.pessoa) { const [x, y] = c.pessoa; it.push(lin(x + 18, y + 40, x + 46, y + 36, "vermelho", d), lin(x + 36, y + 38, x + 36, y + 52, "vermelho", d + 0.1), tx(x + 40, y + 24, "!", "vermelho", 24, d + 0.3)); }
    return true;
  }
  if (cmd === "coluna") return false; // tratada como "caixa" pelo chamador
  return false;
}

/** Frases do professor sem palavra-chave que movem a conta do MMC ("vamos dividir por 2", "agora multiplicamos"). */
export function conversaEnsino(e: EstadoDitado, frase: string, d: number, it: ItemDesenho[]): boolean {
  const m = e.mmc;
  if (!m || m.feito) return false;
  const s = norm(frase);
  if (/\b(multiplic\w*|resultado|produto)\b/.test(s)) { finalizaMmc(e, d, it); return true; }
  const p = /\b(?:por|pelo|com o|come[cç]\w* (?:pelo|por)|proximo (?:primo )?(?:e|eh)? ?o?)\s+(\d{1,2})\b/.exec(s);
  if (p && /\b(divid\w*|divis\w*|primo|vamos|comecar|come[cç]\w*|agora|proximo|depois|vez|novo|novamente|mais)\b/.test(s)) return aplicaPrimo(e, Number(p[1]), d, it);
  return false;
}

/** Fim do turno: fecha o resultado pendente do MMC. */
export function fimEnsino(e: EstadoDitado, it: ItemDesenho[]): void {
  const m = e.mmc;
  if (!m || m.feito) return;
  // o Mentor não narrou todas as divisões: completa a fatoração sozinha, para o quadro nunca ficar pela metade
  for (const p of [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31]) {
    while (!m.feito && m.vals.some((v) => v > 1 && v % p === 0) && m.k < 6) aplicaPrimo(e, p, 0.3 + m.k * 0.5, it);
    if (m.feito) return;
  }
  finalizaMmc(e, 0.3, it);
}
