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

const GRAFICOS = /^(armada|divis[aã]o|mmc|mdc|cruzar)\s*:/i;
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
export function FolhaExemplo({ roteiro, desenho }: { roteiro: string[]; desenho: (r: string[]) => ReactNode }) {
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
    if (GRAFICOS.test(linha)) { fecha(); blocos.push(<div key={blocos.length} className="fo-desenho">{desenho([`Título: ${titulo}`, linha])}</div>); return; }
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
