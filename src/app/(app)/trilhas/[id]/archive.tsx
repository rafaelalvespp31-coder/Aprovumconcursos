"use client";

import { useRouter } from "next/navigation";
import { ConfirmAction } from "@/components/interactive";
import { Button } from "@/components/ui";
import { archiveTrailAction } from "./actions";

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
