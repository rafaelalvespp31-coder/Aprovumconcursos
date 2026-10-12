"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { promoteAction } from "../catalogo/actions";

export function PromoteButton({ lessonId }: { lessonId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secundario" disabled={pending} onClick={() => start(async () => { const r = await promoteAction(lessonId); if (!r.ok) setError(r.error ?? "Falhou."); })}>
        {pending ? "Promovendo…" : "Promover ao catálogo"}
      </Button>
      {error && <p className="t-tiny text-erro" role="alert">{error}</p>}
    </div>
  );
}
