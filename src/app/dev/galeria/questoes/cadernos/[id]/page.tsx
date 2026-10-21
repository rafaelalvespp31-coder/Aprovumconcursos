"use client";

import { useParams } from "next/navigation";
import { NotebookView } from "@/app/(app)/questoes/cadernos/[id]/view";
import { demoFeedback, demoNotebooks, demoQuestions } from "../../../questoes-fixtures";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const n = demoNotebooks.find((x) => x.id === id) ?? demoNotebooks[0]!;
  const vazio = n.available === 0;
  return (
    <NotebookView
      notebook={n}
      questions={vazio ? [] : demoQuestions}
      base="/dev/galeria"
      actions={{
        favorite: async (_id, on) => ({ ok: true, data: on }),
        saveFull: async () => ({ ok: true, data: null }),
        saveNote: async () => ({ ok: true, data: null }),
        report: async () => ({ ok: true, data: null }),
        answer: async (input) => {
          await new Promise((r) => setTimeout(r, 150));
          return { ok: true, data: demoFeedback(input.questionId, input) };
        },
      }}
    />
  );
}
