import ReactMarkdown from "react-markdown";
import { limparMatematica } from "@/domain/lesson/math-text";
import remarkGfm from "remark-gfm";
import type { ElementContent } from "hast";
import { Children, type ReactNode } from "react";
import { isRevokedLegalLine } from "@/components/markdown";
import { CalloutIcon, CALLOUT } from "@/components/aula/callout-icon";
import { calloutKindOf, leadingLabelKind } from "@/domain/content/callout-kind";
import { PENA_MARK, highlightLegal, legalLevel, legalParagraphs, splitLegalLabel } from "@/domain/content/legal-format";

function textOf(n: ElementContent | undefined): string {
  if (!n) return "";
  if (n.type === "text") return n.value;
  if (n.type === "element") return n.children.map(textOf).join("");
  return "";
}

/**
 * Markdown da aula com o visual do PDF do APROVUM: negrito preto, listas com marcador
 * quadrado vermelho, listas numeradas em vermelho, tabelas com cabeçalho preto e filete
 * vermelho, citações como caixas cinza com barra vermelha. HTML bruto não é interpretado.
 */
/** Lei seca: o título do assunto ("Art. 2º — Abolitio criminis…") e todos os dispositivos dele (caput, §, incisos) formam UM card só. */
const HEAD_LINE = /^(?:#{1,6}\s+\S|\*\*\s*(?:Art\.?\s*\d|\d+\.)[^*]*\*\*\s*$)/;
function legalGroups(md: string): Array<{ head: string | null; body: string }> {
  const groups: Array<{ head: string | null; body: string[] }> = [{ head: null, body: [] }];
  for (const raw of md.split("\n")) {
    const l = raw.replace(/^>\s?/, "").trim();
    if (HEAD_LINE.test(l)) groups.push({ head: l, body: [] });
    else groups.at(-1)!.body.push(raw);
  }
  return groups.map((g) => ({ head: g.head, body: g.body.join("\n").trim() })).filter((g) => g.head || g.body);
}

export function ApostilaMarkdown({ children, legal = false }: { children: string; legal?: boolean }) {
  if (!legal) return <div className="ap-md"><MdInner legal={false}>{children}</MdInner></div>;
  const groups = legalGroups(children);
  return (
    <div className="ap-md ap-lei">
      {groups.map((g, i) =>
        g.head && g.body ? (
          <section key={i} className="ap-lei-card">
            <MdInner legal>{g.head}</MdInner>
            <div className="ap-lei-corpo"><MdInner legal>{g.body}</MdInner></div>
          </section>
        ) : (
          <MdInner key={i} legal>{g.head ?? g.body}</MdInner>
        ),
      )}
    </div>
  );
}

function MdInner({ children, legal = false }: { children: string; legal?: boolean }) {
  // Quem está no bloco de exemplo/caso (parágrafos em itálico) até o próximo título.
  let mode: "ex" | null = null;
  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children: c }) => {
            const safe = href && /^(https?:|\/)/.test(href) ? href : undefined;
            return (
              <a href={safe} rel="noopener noreferrer nofollow" target={safe?.startsWith("http") ? "_blank" : undefined}>
                {c}
              </a>
            );
          },
          img: () => null,
          h1: ({ children: c }) => { mode = null; return <h4 className="ap-md-h">{c}</h4>; },
          h2: ({ children: c }) => { mode = null; return <h4 className="ap-md-h">{c}</h4>; },
          h3: ({ children: c }) => { mode = null; return <h4 className="ap-md-h">{c}</h4>; },
          h4: ({ node, children: c }) => { mode = /exemplo|caso/i.test(textOf(node as unknown as ElementContent)) ? "ex" : null; return <h4 className="ap-md-h">{c}</h4>; },
          ol: ({ start, children: c }) => (
            <ol start={start ?? undefined} style={start && start > 1 ? { counterReset: `ap-ol ${start - 1}` } : undefined}>{c}</ol>
          ),
          li: ({ node, children: c }) => {
            const t = textOf(node as unknown as ElementContent).trim();
            if (!legal && isHeadingItem(t)) { mode = /exemplo|caso/i.test(t) ? "ex" : null; return <li className="ap-li-titulo">{c}</li>; }
            return <li>{c}</li>;
          },
          p: ({ node, children: c }) => {
            if (!legal) {
              const t = textOf(node as unknown as ElementContent).trim();
              const lk = leadingLabelKind(t);
              if (isLabelLine(t)) return <p className="ap-rotulo">{lk && <CalloutIcon kind={lk} size={13} />}{c}</p>;
              if (lk) return <p className="ap-nota" style={{ ["--tom" as string]: CALLOUT[lk].tone }}><CalloutIcon kind={lk} />{<span className="ap-nota-txt">{c}</span>}</p>;
              return <p className={mode === "ex" ? "ap-ex" : undefined}>{c}</p>;
            }
            const revoked = !!node && isRevokedLegalLine(textOf(node as unknown as ElementContent));
            return <LegalPara revoked={revoked}>{c}</LegalPara>;
          },
          blockquote: ({ node, children: c }) => {
            if (legal) return <div className="ap-lei-bloco">{c}</div>;
            const k = calloutKindOf(textOf(node as unknown as ElementContent).trim());
            if (!k) return <aside className="ap-callout">{c}</aside>;
            return (
              <aside className="ap-callout ap-callout-ico" style={{ ["--tom" as string]: CALLOUT[k].tone }}>
                <CalloutIcon kind={k} size={18} />
                <div className="ap-callout-corpo">{c}</div>
              </aside>
            );
          },
          table: ({ children: c }) => (
            <div className="ap-tabela" role="region" aria-label="Tabela" tabIndex={0}>
              <table>{c}</table>
            </div>
          ),
        }}
      >
        {legal ? legalParagraphs(children) : limparMatematica(children)}
      </ReactMarkdown>
    </>
  );
}

/** Item de lista em CAIXA ALTA e curto ("4. EXEMPLO PRÁTICO"): é título de bloco, não item comum. */
function isHeadingItem(t: string): boolean {
  return t.length > 3 && t.length <= 60 && !/[a-zà-ú]/.test(t) && /[A-ZÀ-Ú]{3}/.test(t);
}
/** Linha curta que só rotula o que vem depois ("Enunciado:", "Resolução:", "ATENÇÃO:"). */
function isLabelLine(t: string): boolean {
  return t.length <= 40 && /^[^.!?]+:$/.test(t);
}

/** Um dispositivo da lei: rótulo (Art./§/inciso) à esquerda e texto com as partes-chave coloridas. */
function LegalPara({ children, revoked }: { children: ReactNode; revoked: boolean }) {
  const parts = Children.toArray(children);
  const first = typeof parts[0] === "string" ? (parts[0] as string) : "";
  const plain = parts.every((x) => typeof x === "string") ? parts.join("") : null;
  if (plain !== null && /^Art\.?\s*\d+[^.:]{0,8}:\s*$/i.test(plain.trim())) return <p className="ap-lei-titulo">{plain.trim().replace(/:$/, "")}</p>;
  const sp = first ? splitLegalLabel(first) : null;
  const level = sp ? legalLevel(sp.label) : "texto";
  const all: ReactNode[] = sp ? [sp.rest, ...parts.slice(1)] : parts;
  // A pena do dispositivo vem depois da marca: vira um bloco dentro do mesmo card.
  const cut = all.findIndex((x) => typeof x === "string" && x.includes(PENA_MARK));
  let body = all;
  let pena: ReactNode[] = [];
  if (cut >= 0) {
    const [before, after] = (all[cut] as string).split(PENA_MARK);
    body = [...all.slice(0, cut), before!.trimEnd()];
    pena = [after!.trimStart(), ...all.slice(cut + 1)];
  }
  const paint = (nodes: ReactNode[], key: string) =>
    nodes.map((x, i) =>
      typeof x === "string" && !revoked
        ? highlightLegal(x).map((p, j) => (p.k ? <span key={`${key}${i}-${j}`} className={p.k === "r" ? "ap-hl-r" : "ap-hl-a"}>{p.t}</span> : p.t))
        : x,
    );
  const rendered = paint(body, "b");
  const penaRendered = pena.length ? paint(pena, "p") : null;
  return (
    <p className={`ap-disp ap-disp-${level}${revoked ? " ap-revogado" : ""}`}>
      {sp && <span className="ap-disp-rot">{sp.label}</span>}
      <span className="ap-disp-txt">{rendered}{penaRendered && <span className="ap-pena">{penaRendered}</span>}</span>
    </p>
  );
}
