import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renderização segura do conteúdo gerado: react-markdown não interpreta HTML bruto
 * (sem rehype-raw), então scripts e atributos perigosos não chegam ao DOM.
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
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
