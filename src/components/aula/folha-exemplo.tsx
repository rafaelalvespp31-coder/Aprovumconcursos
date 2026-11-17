"use client";
import type { ReactNode } from "react";
import "./folha-exemplo.css";

const num = (s: string) => { const n = Number(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")); return Number.isFinite(n) && /\d/.test(s) ? n : NaN; };
const fmt = (n: number) => String(Math.round(n * 1e4) / 1e4).replace(".", ",");
const FR = /(\([^()]+\)|[\w.,]+)\/(\([^()]+\)|[\w.,]+)/g;

/** Texto com frações a/b desenhadas empilhadas, como no quadro. */
function Expr({ t }: { t: string }) {
  const out: ReactNode[] = [];
  let ult = 0, k = 0;
  for (const m of t.matchAll(FR)) {
    const i = m.index ?? 0;
    if (i > ult) out.push(<span key={k++}>{t.slice(ult, i)}</span>);
    const tira = (s: string) => s.replace(/^\((.*)\)$/, "$1");
    out.push(<span key={k++} className="fo-fr"><span>{tira(m[1]!)}</span><span>{tira(m[2]!)}</span></span>);
    ult = i + m[0].length;
  }
  if (ult < t.length) out.push(<span key={k++}>{t.slice(ult)}</span>);
  return <span className="fo-expr">{out}</span>;
}

const PRIMOS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];

/** MMC/MDC por decomposição simultânea: colunas de números e, ao lado, o primo que divide. */
function Decomposicao({ nums, mdc }: { nums: number[]; mdc: boolean }) {
  const linhas: { v: number[]; p: number | null }[] = [];
  let atual = [...nums];
  const usados: number[] = [];
  for (let g = 0; g < 12 && atual.some((n) => n > 1); g++) {
    const p = PRIMOS.find((q) => (mdc ? atual.every((n) => n % q === 0) : atual.some((n) => n % q === 0)));
    if (!p) break;
    linhas.push({ v: atual, p });
    usados.push(p);
    atual = atual.map((n) => (n % p === 0 ? n / p : n));
  }
  linhas.push({ v: atual, p: null });
  const res = usados.reduce((a, b) => a * b, 1);
  return (
    <div className="fo-bloco">
      <div className="fo-rotulo">{mdc ? "Dividir só pelos primos que dividem todos" : "Dividir pelos menores primos até chegar em 1"}</div>
      <table className="fo-decomp"><tbody>{linhas.map((l, i) => <tr key={i}>{l.v.map((n, j) => <td key={j}>{n}</td>)}<td className="fo-primo">{l.p ?? ""}</td></tr>)}</tbody></table>
      <div className="fo-eq"><span>{mdc ? "MDC" : "MMC"} = {usados.join(" × ")}</span></div>
      <div className="fo-resp">{mdc ? "MDC" : "MMC"} = {res}</div>
    </div>
  );
}

/** Conta armada: colunas alinhadas, "vai um", linha do resultado; divisão com a chave e a prova. */
function Armada({ expr }: { expr: string }) {
  const m = /(\d+)\s*([+−\-×x·÷/:])\s*(\d+)/.exec(expr);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[3]), op = /\+/.test(m[2]!) ? "+" : /[−-]/.test(m[2]!) ? "−" : /[÷/:]/.test(m[2]!) ? "÷" : "×";
  if (op === "÷") {
    if (!b) return null;
    const q = Math.floor(a / b), r = a % b;
    return (
      <div className="fo-bloco">
        <div className="fo-chave"><span className="fo-dividendo">{a}</span><span className="fo-divisor">{b}</span><span className="fo-vazio" /><span className="fo-quociente">{q}</span></div>
        <p className="fo-seta">Resto: <b>{r}</b></p>
        <div className="fo-resp">Prova: {q} × {b}{r ? ` + ${r}` : ""} = {a}</div>
      </div>
    );
  }
  const r = op === "+" ? a + b : op === "−" ? a - b : a * b;
  const w = Math.max(String(a).length, String(b).length, String(r).length) + 1;
  const pad = (n: number | string) => String(n).padStart(w, " ");
  let vai = "";
  if (op === "+") {
    const A = pad(a), B = pad(b), cs = Array<string>(w).fill(" ");
    let c = 0;
    for (let k = w - 1; k > 0; k--) { const s = (A[k] === " " ? 0 : Number(A[k])) + (B[k] === " " ? 0 : Number(B[k])) + c; c = s >= 10 ? 1 : 0; if (c) cs[k - 1] = "1"; }
    vai = cs.join("");
  }
  const parciais = op === "×" && String(b).length > 1 ? String(b).split("").reverse().map((d, i) => `${a * Number(d)}${"0".repeat(i)}`) : [];
  return (
    <div className="fo-bloco">
      <pre className="fo-armada">{vai.trim() ? `${vai}\n` : ""}{pad(a)}{"\n"}{op}{pad(b).slice(1)}{"\n"}{"─".repeat(w)}{parciais.length ? "\n" + parciais.map((x, i) => pad(x) + (i ? "" : "")).join("\n") + "\n" + "─".repeat(w) : ""}{"\n"}{pad(r)}</pre>
      <div className="fo-resp">RESULTADO: {a} {op} {b} = {r}</div>
    </div>
  );
}
const partes = (s: string) => s.split("|").map((x) => x.trim());

function RegraDeTres({ a }: { a: string[] }) {
  const [va, vb, vc, na, nb, tipo, concl] = a;
  const A = num(va ?? ""), B = num(vb ?? ""), C = num(vc ?? "");
  const inversa = /inv/i.test(tipo ?? "");
  const ok = [A, B, C].every((n) => Number.isFinite(n)) && A !== 0 && C !== 0;
  const x = ok ? (inversa ? (A * B) / C : (B * C) / A) : NaN;
  return (
    <div className="fo-bloco">
      <div className="fo-rotulo">1 · Organizar os dados</div>
      <table className="fo-tab"><thead><tr><th>{na}</th><th>{nb}</th></tr></thead><tbody>
        <tr><td>{va}</td><td>{vb}</td></tr><tr><td>{vc}</td><td className="fo-x">x</td></tr></tbody></table>
      <p className="fo-seta">{inversa ? "⇅ Grandezas inversamente proporcionais (uma sobe, a outra desce)" : "⇄ Grandezas diretamente proporcionais (as duas sobem juntas)"}</p>
      {ok && (<>
        <div className="fo-rotulo">2 · Montar a proporção</div>
        <div className="fo-eq"><Expr t={inversa ? `${vc}/${va} = ${vb}/x` : `${va}/${vc} = ${vb}/x`} /></div>
        <div className="fo-rotulo">3 · Multiplicar em cruz</div>
        <div className="fo-eq"><Expr t={inversa ? `${vc} · x = ${va} · ${vb}` : `${va} · x = ${vb} · ${vc}`} /></div>
        <div className="fo-eq"><Expr t={inversa ? `x = (${va} · ${vb})/${vc}` : `x = (${vb} · ${vc})/${va}`} /> <span>= <b>{fmt(x)}</b></span></div>
        <div className="fo-resp">RESULTADO: x = {fmt(x)}{concl ? ` — ${concl}` : ""}</div>
      </>)}
    </div>
  );
}

/** Roteiro (mesmos comandos da lousa) → folha de material didático em HTML. */
export function FolhaExemplo({ roteiro }: { roteiro: string[] }) {
  const blocos: ReactNode[] = [];
  let titulo = "";
  let tab: { cab: string[]; linhas: string[][] } | null = null;
  let marcos: string[] = [];
  let caixa: { t: string; itens: string[]; dest: string[] } | null = null;
  const fecha = () => {
    if (tab) { const t = tab; blocos.push(<table key={blocos.length} className="fo-tab"><thead><tr>{t.cab.map((c, i) => <th key={i}>{c}</th>)}</tr></thead><tbody>{t.linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}><Expr t={c} /></td>)}</tr>)}</tbody></table>); tab = null; }
    if (marcos.length) { const m = marcos; blocos.push(<ol key={blocos.length} className="fo-tempo">{m.map((x, i) => <li key={i}><Expr t={x} /></li>)}</ol>); marcos = []; }
    if (caixa) { const c = caixa; blocos.push(<div key={blocos.length} className="fo-caixa"><div className="fo-rotulo">{c.t}</div>{c.itens.map((x, i) => <p key={i}><Expr t={x} /></p>)}{c.dest.map((x, i) => <div key={i} className="fo-resp">{x}</div>)}</div>); caixa = null; }
  };
  let grade: string[][] | null = null;
  const fechaGrade = () => { if (grade) { const g = grade; blocos.push(<table key={blocos.length} className="fo-tab"><thead><tr>{g[0]!.map((c, i) => <th key={i}>{c}</th>)}</tr></thead><tbody>{g.slice(1).map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>); grade = null; } };
  roteiro.forEach((linha) => {
    const m = /^([^:]+):\s*(.*)$/.exec(linha);
    if (!m) return;
    const nome = m[1]!.trim().toLowerCase(), corpo = m[2]!.trim();
    if (nome !== "célula" && nome !== "celula") fechaGrade();
    if (/^t[ií]tulo$/.test(nome)) { titulo = corpo; return; }
    if (/^(armada|armar|divis[aã]o)$/.test(nome)) { fecha(); blocos.push(<Armada key={blocos.length} expr={corpo} />); return; }
    if (nome === "mmc" || nome === "mdc") { fecha(); const ns = (corpo.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0).slice(0, 4); if (ns.length >= 2) blocos.push(<Decomposicao key={blocos.length} nums={ns} mdc={nome === "mdc"} />); return; }
    if (nome === "cruzar") return;
    if (nome === "passos") {
      fecha();
      const ls = partes(corpo);
      blocos.push(<ol key={blocos.length} className="fo-passos">{ls.map((l, i) => i === ls.length - 1 && ls.length > 1 ? <li key={i} className="fo-final"><Expr t={l} /></li> : <li key={i}><span className="fo-n">{i + 1}</span><Expr t={l} /></li>)}</ol>);
      return;
    }
    if (nome === "regra de três") { fecha(); blocos.push(<RegraDeTres key={blocos.length} a={partes(corpo)} />); return; }
    if (nome === "grade") { fecha(); grade = [partes(corpo)]; return; }
    if (nome === "célula" || nome === "celula") { grade?.push(partes(corpo)); return; }
    if (nome === "tabela") { fecha(); tab = { cab: corpo.split(",").map((s) => s.trim()), linhas: [] }; return; }
    if (nome === "linha") { tab?.linhas.push(corpo.split(",").map((s) => s.trim())); return; }
    if (nome === "linha do tempo") { fecha(); return; }
    if (nome === "marco") { marcos.push(corpo.replace(/^(\d{3,4})\s*/, "$1 — ")); return; }
    if (nome === "caixa") { fecha(); caixa = { t: corpo, itens: [], dest: [] }; return; }
    if (nome === "item" || nome === "exemplo") { if (caixa) caixa.itens.push(corpo); else blocos.push(<p key={blocos.length}><Expr t={corpo} /></p>); return; }
    if (nome === "destaque" || nome === "resposta") { if (caixa) caixa.dest.push(corpo); else { fecha(); blocos.push(<div key={blocos.length} className="fo-resp">{corpo}</div>); } return; }
    if (nome === "conta") { fecha(); blocos.push(<div key={blocos.length} className="fo-eq"><Expr t={corpo} /></div>); }
  });
  fecha(); fechaGrade();
  if (!blocos.length) return null;
  return (
    <figure className="fo">
      <figcaption className="fo-cab"><span aria-hidden>📐</span> RESOLUÇÃO NO QUADRO{titulo && <b> · {titulo}</b>}</figcaption>
      {blocos}
    </figure>
  );
}
