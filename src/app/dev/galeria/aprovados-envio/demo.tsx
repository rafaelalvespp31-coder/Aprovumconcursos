"use client";

import { useState } from "react";
import { NewBannerForm } from "@/app/admin/aprovados/banner-forms";

type Got = { nome: string; alt: string; grande: number; pequena: number; tipo: string; dims: string };

/** Galeria: o envio de aprovados do painel da equipe, com uma ação de exemplo que só confere o que o navegador entrega. */
export function DemoEnvio() {
  const [got, setGot] = useState<Got[]>([]);
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <NewBannerForm
        action={async (fd) => {
          const g = fd.get("grande") as File;
          const p = fd.get("pequena") as File;
          const bmp = await createImageBitmap(g);
          const dims = `${bmp.width}x${bmp.height}`;
          bmp.close();
          if (String(fd.get("nome")).startsWith("quebrada")) return { ok: false, error: "Erro de exemplo." };
          setGot((x) => [...x, { nome: String(fd.get("nome")), alt: String(fd.get("alt")), grande: g.size, pequena: p.size, tipo: g.type, dims }]);
          return { ok: true };
        }}
      />
      <ul data-testid="recebidos">{got.map((x, i) => <li key={i}>{`${x.nome}|${x.alt}|${x.dims}|${x.tipo}|${x.grande < 4_000_000 ? "leve" : "pesado"}`}</li>)}</ul>
    </div>
  );
}
