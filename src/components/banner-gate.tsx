"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Segura o banner (arte + animações) até a imagem principal e os arquivos das animações
 * (máscaras, texturas) estarem carregados e decodificados; então revela tudo de uma vez,
 * com um fade curto. Enquanto espera, as animações ficam pausadas — assim elas começam
 * junto com a arte, nunca antes. Há um limite de tempo para não esconder o banner para sempre.
 */
export function BannerGate({
  assets,
  className = "",
  style,
  testId,
  children,
}: {
  /** Arquivos usados pelas animações (máscaras, texturas, fundo desfocado). */
  assets: string[];
  className?: string;
  style?: CSSProperties;
  testId?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const key = assets.join("|");

  useEffect(() => {
    let alive = true;
    const done = () => alive && setReady(true);
    const main = ref.current?.querySelector<HTMLImageElement>("img[data-banner-main]");
    const decode = (img: HTMLImageElement) =>
      (img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise<void>((res) => {
        img.addEventListener("load", () => res(), { once: true });
        img.addEventListener("error", () => res(), { once: true });
      })).then(() => img.decode?.().catch(() => undefined));
    const extra = key.split("|").filter(Boolean).map((src) => {
      const img = new Image();
      img.src = src;
      return decode(img);
    });
    const timeout = new Promise<void>((res) => setTimeout(res, 6000));
    Promise.race([Promise.all([main ? decode(main) : Promise.resolve(), ...extra]), timeout]).then(done);
    return () => {
      alive = false;
    };
  }, [key]);

  return (
    <div ref={ref} className={`banner-gate ${className}`} style={style} data-pronto={ready ? "1" : "0"} data-testid={testId}>
      {children}
    </div>
  );
}
