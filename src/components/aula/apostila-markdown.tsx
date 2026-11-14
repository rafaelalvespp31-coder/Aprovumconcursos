import ReactMarkdown from "react-markdown";
import { limparMatematica } from "@/domain/lesson/math-text";
import remarkGfm from "remark-gfm";
import type { ElementContent } from "hast";
import { Children, type ReactNode } from "react";
import { isRevokedLegalLine } from "@/components/markdown";
import { highlightLegal, legalLevel, legalParagraphs, splitLegalLabel } from "@/domain/content/legal-format";

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
export function ApostilaMarkdown({ children, legal = false }: { children: string; legal?: boolean }) {
  return (
    <div className={legal ? "ap-md ap-lei" : "ap-md"}>
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
          h1: ({ children: c }) => <h4 className="ap-md-h">{c}</h4>,
          h2: ({ children: c }) => <h4 className="ap-md-h">{c}</h4>,
          h3: ({ children: c }) => <h4 className="ap-md-h">{c}</h4>,
          h4: ({ children: c }) => <h4 className="ap-md-h">{c}</h4>,
          p: ({ node, children: c }) => {
            if (!legal) return <p>{c}</p>;
            const revoked = !!node && isRevokedLegalLine(textOf(node as unknown as ElementContent));
            return <LegalPara revoked={revoked}>{c}</LegalPara>;
          },
          blockquote: ({ children: c }) => (legal ? <div className="ap-lei-bloco">{c}</div> : <aside className="ap-callout">{c}</aside>),
          table: ({ children: c }) => (
            <div className="ap-tabela" role="region" aria-label="Tabela" tabIndex={0}>
              <table>{c}</table>
            </div>
          ),
        }}
      >
        {legal ? legalParagraphs(children) : limparMatematica(children)}
      </ReactMarkdown>
    </div>
  );
}

/** Um dispositivo da lei: rótulo (Art./§/inciso) à esquerda e texto com as partes-chave coloridas. */
function LegalPara({ children, revoked }: { children: ReactNode; revoked: boolean }) {
  const parts = Children.toArray(children);
  const first = typeof parts[0] === "string" ? (parts[0] as string) : "";
  const plain = parts.every((x) => typeof x === "string") ? parts.join("") : null;
  if (plain !== null && /^Art\.?\s*\d+[^.:]{0,8}:\s*$/i.test(plain.trim())) return <p className="ap-lei-titulo">{plain.trim().replace(/:$/, "")}</p>;
  const sp = first ? splitLegalLabel(first) : null;
  const level = sp ? legalLevel(sp.label) : "texto";
  const body: ReactNode[] = sp ? [sp.rest, ...parts.slice(1)] : parts;
  const rendered = body.map((x, i) =>
    typeof x === "string" && !revoked
      ? highlightLegal(x).map((p, j) => (p.k ? <span key={`${i}-${j}`} className={p.k === "r" ? "ap-hl-r" : "ap-hl-a"}>{p.t}</span> : p.t))
      : x,
  );
  return (
    <p className={`ap-disp ap-disp-${level}${revoked ? " ap-revogado" : ""}`}>
      {sp && <span className="ap-disp-rot">{sp.label}</span>}
      <span className="ap-disp-txt">{rendered}</span>
    </p>
  );
}
