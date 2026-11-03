"use client";

import { useState } from "react";
import { CustomAvatar } from "@/app/admin/avatares/custom-avatar";
import { AvatarStage } from "@/components/avatar/avatar-stage";
import type { Portrait } from "@/components/avatar/portraits";
import { defaultAvatar } from "@/domain/avatar/catalog";
import { standardFigureRect } from "@/domain/avatar/custom";
import { demoAvatarItems } from "../avatar-fixtures";

/**
 * Galeria: o fluxo da equipe (preparar a arte) e o resultado que o aluno vê (mesmo palco,
 * mesma animação), sem enviar nada — as camadas ficam só no navegador.
 */
export function DemoCustomAvatar() {
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="rounded-lg bg-white p-4 text-black">
        <CustomAvatar
          requestId="00000000-0000-4000-8000-0000000000aa"
          hasCustom={!!portrait}
          remove={async () => (setPortrait(null), { ok: true })}
          save={async (_id, fd) => {
            const p = JSON.parse(String(fd.get("params")));
            setPortrait({
              src: URL.createObjectURL(fd.get("arte") as File),
              lids: URL.createObjectURL(fd.get("palpebras") as File),
              ...p,
              backdrop: { src: "/avatar/ui/palco-fundo.webp", w: 562, h: 840, figure: standardFigureRect(p.aspect, p.centerX) },
            });
            return { ok: true };
          }}
        />
      </div>
      <div className="relative aspect-[562/840] overflow-hidden rounded-lg" style={{ background: "url(/home/painel-fundo.webp) 50% 18% / 260% auto" }} data-testid="demo-palco-personalizado">
        {portrait && <AvatarStage key={portrait.src} config={defaultAvatar("f", demoAvatarItems)} items={demoAvatarItems} portrait={portrait} transparent className="!absolute inset-0 !h-full !w-full !bg-transparent" />}
      </div>
    </div>
  );
}
