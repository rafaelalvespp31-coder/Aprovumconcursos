"use client";

import { BannerSlot } from "@/app/admin/catalogo/banners/banner-slot";

/** Banner próprio da aula na galeria: troca só na tela; nada é gravado. */
export function DemoTopicBanner() {
  return (
    <section aria-labelledby="banner-aula" className="rounded-lg border border-linha p-5">
      <h2 id="banner-aula" className="t-h2">Banner desta aula</h2>
      <BannerSlot
        mode="exemplo-aula"
        label="Homicídio"
        url={null}
        fallbackUrl="/banner-estudo.webp"
        emptyText="Usando o banner da matéria"
        compact
        actions={{
          save: async () => ({ ok: true, url: "/banner-jogo-fundo.webp" }),
          remove: async () => ({ ok: true, url: null }),
        }}
      />
    </section>
  );
}
