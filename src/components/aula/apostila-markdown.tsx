import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ElementContent } from "hast";
import { isRevokedLegalLine } from "@/components/markdown";

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
          p: ({ node, children: c }) =>
            legal && node && isRevokedLegalLine(textOf(node as unknown as ElementContent)) ? <p className="ap-revogado">{c}</p> : <p>{c}</p>,
          blockquote: ({ children: c }) => (legal ? <div className="ap-lei-bloco">{c}</div> : <aside className="ap-callout">{c}</aside>),
          table: ({ children: c }) => (
            <div className="ap-tabela" role="region" aria-label="Tabela" tabIndex={0}>
              <table>{c}</table>
            </div>
          ),
        }}
      >
        {legal ? legalLines(children) : children}
      </ReactMarkdown>
    </div>
  );
}

/** No texto legal cada linha é um dispositivo: mantém as quebras de linha como no PDF. */
function legalLines(md: string): string {
  return md
    .split("\n")
    .map((l) => l.replace(/^>\s?/, ""))
    .filter((l) => l.trim())
    .join("\n\n");
}
