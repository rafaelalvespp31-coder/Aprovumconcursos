import type { NotebookActions } from "@/app/(app)/questoes/notebooks-card";

const wait = () => new Promise((r) => setTimeout(r, 150));

/** Ações em memória para a galeria (nada é gravado). */
export const demoNotebookActions: NotebookActions = {
  rename: async (_id, title) => {
    await wait();
    return title.trim() ? { ok: true, data: null } : { ok: false, error: "Dê um nome ao caderno." };
  },
  pin: async () => {
    await wait();
    return { ok: true, data: null };
  },
  remove: async () => {
    await wait();
    return { ok: true, data: null };
  },
};
