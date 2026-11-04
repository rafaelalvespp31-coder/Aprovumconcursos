"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus } from "lucide-react";
import type { SkinInfo } from "@/server/services/avatar";

export type SelectSkin = (id: string | null) => Promise<{ ok: boolean; error?: string }>;
const MAX = 3;

/** Até 3 skins do avatar: toque numa para vestir; vagas vazias aparecem conforme o aluno solicita avatares. */
export function SkinsPanel({ skins, select, locked, onRequest }: { skins: SkinInfo[]; select: SelectSkin; locked: boolean; onRequest?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<string | null | undefined>(undefined);
  const activeId = local !== undefined ? local : (skins.find((s) => s.active)?.id ?? null);
  const pick = (id: string | null) => {
    if (id === activeId || pending) return;
    setError(null);
    setLocal(id);
    start(async () => {
      const r = await select(id);
      if (!r.ok) {
        setLocal(undefined);
        setError(r.error ?? "Não foi possível trocar.");
        return;
      }
      router.refresh();
    });
  };
  return (
    <div className="skins" data-testid="skins-painel" role="group" aria-label="Skins do avatar">
      <div className="skins-topo"><span className="skins-rotulo">Skins {skins.length}/{MAX}</span><span className="skins-dica">{locked ? "Avatar personalizado: planos pagos" : "Cada avatar solicitado libera uma skin"}</span></div>
      <div className="skins-lista">
        <button type="button" className="skin skin-padrao" aria-pressed={activeId === null} aria-label="Avatar padrão APROVUM" title="Avatar padrão" onClick={() => pick(null)} data-testid="skin-padrao">
          <span>Padrão</span>
        </button>
        {Array.from({ length: MAX }, (_, i) => {
          const s = skins[i];
          if (s)
            return (
              <button key={s.id} type="button" className="skin" aria-pressed={activeId === s.id} aria-label={`Skin ${i + 1}${activeId === s.id ? " (em uso)" : ""}`} title={`Skin ${i + 1}`} onClick={() => pick(s.id)} data-testid={`skin-${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.thumb} alt="" draggable={false} />
                <span className="skin-nome">Skin {i + 1}</span>
              </button>
            );
          return (
            <button key={`v${i}`} type="button" className="skin skin-vazia" disabled={locked && !onRequest} aria-label={locked ? `Skin ${i + 1}: disponível nos planos pagos` : `Skin ${i + 1} livre — solicite um avatar`} title={locked ? "Planos pagos" : "Solicite um avatar para liberar"} onClick={onRequest} data-testid={`skin-vazia-${i + 1}`}>
              {locked ? <Lock className="size-5" aria-hidden /> : <Plus className="size-6" aria-hidden />}
            </button>
          );
        })}
      </div>
      {error && <span role="alert" className="skins-erro">{error}</span>}
    </div>
  );
}
