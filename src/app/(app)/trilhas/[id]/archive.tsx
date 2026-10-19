"use client";

import { useRouter } from "next/navigation";
import { ConfirmAction } from "@/components/interactive";
import { Button } from "@/components/ui";
import { callAction } from "@/components/safe-action";
import { archiveTrailAction, deleteTrailAction } from "./actions";

export function DeleteTrail({ trailId }: { trailId: string }) {
  const router = useRouter();
  return (
    <ConfirmAction
      trigger="Excluir estudo"
      title="Excluir este estudo de vez?"
      description="Aulas, questões, respostas, progresso, revisões, anotações e PDF deste estudo serão apagados permanentemente. Não dá para desfazer. Se quiser só tirá-lo da frente, use Arquivar."
      confirmLabel="Excluir definitivamente"
      onConfirm={async () => {
        const r = await callAction(() => deleteTrailAction(trailId), (m) => alert(m));
        if (!r) return;
        if (!r.ok) {
          alert(r.error ?? "Não foi possível excluir.");
          return;
        }
        router.push("/trilhas");
        router.refresh();
      }}
    />
  );
}

export function ArchiveTrail({ trailId, archived }: { trailId: string; archived: boolean }) {
  const router = useRouter();
  if (archived) {
    return (
      <Button variant="secundario" onClick={async () => { await archiveTrailAction(trailId, false); router.refresh(); }}>
        Reativar trilha
      </Button>
    );
  }
  return (
    <ConfirmAction
      trigger="Arquivar estudo"
      title="Arquivar este estudo?"
      description="Ele sai do painel, das questões e das revisões, mas nada é apagado. Você pode reativá-lo a qualquer momento em Estudos arquivados."
      confirmLabel="Arquivar"
      onConfirm={async () => {
        await archiveTrailAction(trailId, true);
        router.push("/trilhas");
      }}
    />
  );
}
