"use client";

import { useState } from "react";
import { FeedbackModal } from "@/components/aula/feedback-modal";
import { FeedbackLista, type ItemFeedback } from "@/components/admin/feedback-lista";

/** Galeria de desenvolvimento: dados fictícios, só para conferir o visual (não grava nada). */
const itens: ItemFeedback[] = [
  { id: "1", rating: 5, comment: "Exemplo fictício: gostei da explicação e dos exemplos.", lessonTitle: "Aula de exemplo", subject: "Matéria de exemplo", studentName: "Aluno Fictício", studentEmail: "aluno@exemplo.test", userId: "00000000-0000-0000-0000-000000000000", completedAt: "2026-11-07T12:00:00Z", createdAt: "2026-11-07T13:00:00Z" },
  { id: "2", rating: 2, comment: null, lessonTitle: "Outra aula de exemplo", subject: null, studentName: null, studentEmail: null, userId: null, completedAt: null, createdAt: "2026-11-06T13:00:00Z" },
];

export default function Page() {
  const [open, setOpen] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  return (
    <div className="mx-auto max-w-3xl p-5">
      <button type="button" className="mb-4 rounded-md bg-destaque px-4 py-2 font-semibold text-white" onClick={() => setOpen(true)} data-testid="abrir">Abrir popup</button>
      <pre data-testid="log" className="mb-4 text-xs">{log.join("\n")}</pre>
      <FeedbackModal
        lessonId="00000000-0000-0000-0000-000000000000"
        open={open}
        enviar={async (_l, n, c) => { setLog((x) => [...x, `enviar ${n} "${c}"`]); return { ok: true }; }}
        dispensar={async () => { setLog((x) => [...x, "dispensar"]); return { ok: true }; }}
        onFinish={(r) => { setOpen(false); setLog((x) => [...x, `fim ${r}`]); }}
      />
      <FeedbackLista itens={itens} />
    </div>
  );
}
