"use client";

import { PainelAvatar } from "@/components/avatar/painel-avatar";
import { defaultAvatar, validateAvatar } from "@/domain/avatar/catalog";
import { demoAvatarItems } from "../avatar-fixtures";

/** Galeria: avatar do painel com o manequim de teste (ou o aviso de produção) e salvamento em memória. */
export function DemoAvatar({ mannequin }: { mannequin: boolean }) {
  const progress = { level: 4, xp: 1250, levelProgress: 0.33 };
  return (
    <PainelAvatar
      name="Rafael Silva"
      initial={defaultAvatar("m", demoAvatarItems)}
      saved
      items={demoAvatarItems}
      progress={progress}
      mannequin={mannequin}
      save={async (c) => {
        const v = validateAvatar(c, demoAvatarItems, progress);
        return v.ok ? { ok: true, config: v.config } : { ok: false, error: v.error };
      }}
    />
  );
}
