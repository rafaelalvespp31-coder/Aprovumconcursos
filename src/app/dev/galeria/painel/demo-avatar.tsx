"use client";

import { PainelAvatar } from "@/components/avatar/painel-avatar";
import { defaultAvatar, validateAvatar } from "@/domain/avatar/catalog";
import { demoAvatarItems } from "../avatar-fixtures";

/** Galeria: painel (avatar) com dados de exemplo e salvamento em memória. */
export function DemoAvatar({ mannequin }: { mannequin: boolean }) {
  const progress = { level: 27, xp: 1250, levelProgress: 0.62, xpNext: 2000, rank: { position: 12487, total: 40000 } };
  return (
    <PainelAvatar
      name="Rafael Silva"
      initial={{ ...defaultAvatar("m", demoAvatarItems), skin: "muito_clara" }}
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
