import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Element, ElementContent } from "hast";
import { practiceToMarkdown } from "@/domain/content/practice";

function textOf(n: ElementContent | undefined): string {
  if (!n) return "";
  if (n.type === "text") return n.value;
  if (n.type === "element") return n.children.map(textOf).join("");
  return "";
}

/** Parágrafo que começa com "**Exemplo…**" vira um destaque visual próprio. */
function isExampleParagraph(node: Element | undefined): boolean {
  const first = node?.children.find((c) => !(c.type === "text" && !c.value.trim()));
  return !!first && first.type === "element" && first.tagName === "strong" && /^\s*(exemplo|ex\.|caso)\b/i.test(textOf(first));
}

/** Linha de texto legal revogada (ex.: "VI - (revogado pela Lei…)", "§ 7º (Revogado)"). */
export function isRevokedLegalLine(text: string): boolean {
  const t = text.trim();
  return /^(art\.?\s*\d|§|par[áa]grafo|[IVXLC]+\s*[-–—.]|[a-z]\)|\d+[.)]\s)/i.test(t) && /\brevogad[oa]s?\b/i.test(t);
}

/** No texto legal, cada linha vira um parágrafo próprio (para marcar só a linha revogada). */
function splitLegalLines(md: string): string {
  return md.replace(/^(>[^\n]*\S[^\n]*)\n(?=>\s*\S)/gm, "$1\n>\n");
}

/**
 * Renderização segura do conteúdo gerado: react-markdown não interpreta HTML bruto
 * (sem rehype-raw), então scripts e atributos perigosos não chegam ao DOM.
 * Negrito sai em vermelho-sangue; exemplos e destaques ganham moldura visual.
 */
export function Markdown({ children, legal = false }: { children: string; legal?: boolean }) {
  return (
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
        li: ({ node, children: c }) =>
          node && isRevokedLegalLine(textOf(node as unknown as ElementContent)) ? (
            <li className="md-revogado" title="Dispositivo revogado">
              <span className="md-revogado-selo">Revogado</span>
              <span className="md-revogado-texto">{c}</span>
            </li>
          ) : (
            <li>{c}</li>
          ),
        strong: ({ children: c }) => <strong className="md-forte">{c}</strong>,
        p: ({ node, children: c }) =>
          node && isRevokedLegalLine(textOf(node as unknown as ElementContent)) ? (
            <p className="md-revogado" title="Dispositivo revogado">
              <span className="md-revogado-selo">Revogado</span>
              <span className="md-revogado-texto">{c}</span>
            </p>
          ) : isExampleParagraph(node) ? (
            <div className="md-exemplo" data-exemplo>
              <span className="md-exemplo-selo" aria-hidden>💡 Exemplo</span>
              <p>{c}</p>
            </div>
          ) : (
            <p>{c}</p>
          ),
        blockquote: ({ children: c }) =>
          legal ? (
            <blockquote className="md-lei">{c}</blockquote>
          ) : (
          <blockquote className="md-destaque">
            <span className="md-destaque-selo" aria-hidden>❗</span>
            <div>{c}</div>
          </blockquote>
          ),
      }}
    >
      {legal ? splitLegalLines(children) : practiceToMarkdown(children)}
    </ReactMarkdown>
  );
}
