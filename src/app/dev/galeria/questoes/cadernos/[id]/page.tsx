"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { NotebookView } from "@/app/(app)/questoes/cadernos/[id]/view";
import { demoErrorApi, demoFeedback, demoNotebooks, demoQuestions } from "../../../questoes-fixtures";

export default function Page() {
  return (
    <Suspense>
      <Demo />
    </Suspense>
  );
}

function Demo() {
  const { id } = useParams<{ id: string }>();
  // ?retomar=1 simula a volta ao caderno: a 1ª questão já respondida (errada) e a posição na 2ª.
  const retomar = useSearchParams().get("retomar") === "1";
  const n = demoNotebooks.find((x) => x.id === id) ?? demoNotebooks[0]!;
  const vazio = n.available === 0;
  const questions = vazio
    ? []
    : retomar
      ? demoQuestions.map((q, k) => (k === 0 ? { ...q, wrongHere: true, saved: { choice: "o1", fb: demoFeedback(q.id, { optionId: "o1" }) } } : q))
      : demoQuestions;
  return (
    <NotebookView
      notebook={n}
      questions={questions}
      start={retomar ? 1 : 0}
      base="/dev/galeria"
      actions={{
        favorite: async (_id, on) => ({ ok: true, data: on }),
        saveFull: async () => ({ ok: true, data: null }),
        saveNote: async () => ({ ok: true, data: null }),
        report: async () => ({ ok: true, data: null }),
        position: async () => ({ ok: true, data: null }),
        errorsOpen: demoErrorApi.open,
        errorsSave: demoErrorApi.save,
        answer: async (input) => {
          await new Promise((r) => setTimeout(r, 150));
          return { ok: true, data: demoFeedback(input.questionId, input) };
        },
      }}
    />
  );
}
