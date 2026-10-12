"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resolveFlagAction } from "../../actions";
import { dButton } from "../../ui";

export function FlagActions({ flagId, questionId, status }: { flagId: string; questionId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (o: "resolvido" | "descartado" | "em_analise") =>
    start(async () => {
      await resolveFlagAction(flagId, questionId, o);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-2">
      {status === "aberto" && <button disabled={pending} onClick={() => act("em_analise")} className={dButton("discreto")}>Em análise</button>}
      <button disabled={pending} onClick={() => act("resolvido")} className={dButton("secundario")}>Resolvido</button>
      <button disabled={pending} onClick={() => act("descartado")} className={dButton("discreto")}>Descartar</button>
    </div>
  );
}
