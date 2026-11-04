"use client";

import { useTransition } from "react";
import type { StudentActionResult } from "./actions";

export function RequestsDone({ id, action }: { id: string; action: (id: string) => Promise<StudentActionResult> }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => void (await action(id)))} className="min-h-9 rounded-lg border border-linha px-3 t-tiny font-semibold hover:bg-fundo disabled:opacity-60">
      {pending ? "Salvando…" : "Marcar como atendido"}
    </button>
  );
}
