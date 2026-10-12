import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Element, ElementContent } from "hast";

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

/**
 * Renderização segura do conteúdo gerado: react-markdown não interpreta HTML bruto
 * (sem rehype-raw), então scripts e atributos perigosos não chegam ao DOM.
 * Negrito sai em vermelho-sangue; exemplos e destaques ganham moldura visual.
 */
export function Markdown({ children }: { children: string }) {
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
        strong: ({ children: c }) => <strong className="md-forte">{c}</strong>,
        p: ({ node, children: c }) =>
          isExampleParagraph(node) ? (
            <div className="md-exemplo" data-exemplo>
              <span className="md-exemplo-selo" aria-hidden>💡 Exemplo</span>
              <p>{c}</p>
            </div>
          ) : (
            <p>{c}</p>
          ),
        blockquote: ({ children: c }) => (
          <blockquote className="md-destaque">
            <span className="md-destaque-selo" aria-hidden>❗</span>
            <div>{c}</div>
          </blockquote>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
